-- HalalBridge Product Halal Status (PHS) registry
-- Run AFTER supabase/schema.sql in the Supabase SQL Editor.
-- No product is labelled Halal solely because its company or CB appears in this registry.
-- Publish only product-specific records supported by current, verifiable evidence.

create table if not exists public.phs_certification_bodies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  acronym text,
  country text not null,
  website_url text,
  accreditation_authority text,
  recognition_status text not null default 'unverified'
    check (recognition_status in ('recognised','limited_scope','suspended','not_recognised','unverified')),
  recognition_scope text,
  official_source_url text,
  source_checked_at date,
  verification_status text not null default 'unverified'
    check (verification_status in ('verified','unverified','under_review','rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legal_name, country)
);

create table if not exists public.phs_companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trading_name text,
  country text not null,
  website_url text,
  registration_number text,
  source_url text,
  verification_status text not null default 'unverified'
    check (verification_status in ('verified','unverified','under_review','rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists phs_companies_name_idx on public.phs_companies using gin (to_tsvector('simple', legal_name || ' ' || coalesce(trading_name,'')));

create table if not exists public.phs_products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.phs_companies(id) on delete restrict,
  product_name text not null,
  brand_name text,
  product_number text,
  barcode_gtin text,
  country_of_origin text not null,
  product_category text,
  product_description text,
  ingredients_declared text,
  source_url text,
  source_document_name text,
  verification_status text not null default 'unverified'
    check (verification_status in ('verified','unverified','under_review','rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists phs_products_name_idx on public.phs_products using gin (to_tsvector('simple', product_name || ' ' || coalesce(brand_name,'') || ' ' || coalesce(product_number,'') || ' ' || coalesce(barcode_gtin,'')));

create table if not exists public.phs_ingredients (
  id uuid primary key default gen_random_uuid(),
  ingredient_name text not null,
  e_number text,
  source_category text,
  halal_risk_level text not null default 'unknown'
    check (halal_risk_level in ('low','medium','high','unknown')),
  shariah_assessment text,
  technical_notes text,
  source_url text,
  verification_status text not null default 'unverified'
    check (verification_status in ('verified','unverified','under_review','rejected')),
  created_at timestamptz not null default now()
);
create unique index if not exists phs_ingredients_name_e_number_idx
  on public.phs_ingredients (lower(ingredient_name), coalesce(e_number,''));

create table if not exists public.phs_product_ingredients (
  product_id uuid not null references public.phs_products(id) on delete cascade,
  ingredient_id uuid not null references public.phs_ingredients(id) on delete restrict,
  is_critical boolean not null default false,
  declared_order integer,
  product_specific_evidence text,
  assessment_status text not null default 'unverified'
    check (assessment_status in ('verified','unverified','under_review','rejected')),
  primary key (product_id, ingredient_id)
);

create table if not exists public.phs_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null,
  certification_body_id uuid not null references public.phs_certification_bodies(id) on delete restrict,
  company_id uuid not null references public.phs_companies(id) on delete restrict,
  product_id uuid references public.phs_products(id) on delete restrict,
  scope text not null,
  issue_date date,
  expiry_date date,
  certificate_status text not null default 'under_review'
    check (certificate_status in ('active','expired','suspended','withdrawn','under_review')),
  verification_status text not null default 'unverified'
    check (verification_status in ('verified','unverified','under_review','rejected')),
  certificate_url text,
  official_verification_url text,
  evidence_checked_at date,
  publication_status text not null default 'draft'
    check (publication_status in ('draft','published','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists phs_certificates_number_idx on public.phs_certificates (certificate_number);
create index if not exists phs_certificates_product_idx on public.phs_certificates (product_id);
create index if not exists phs_certificates_company_idx on public.phs_certificates (company_id);

create table if not exists public.phs_evidence_sources (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('certification_body','company','product','ingredient','certificate')),
  entity_id uuid not null,
  source_type text not null,
  source_title text,
  source_url text not null,
  issuing_authority text,
  publication_date date,
  accessed_at timestamptz not null default now(),
  evidence_notes text,
  checked_by uuid references auth.users(id),
  verification_status text not null default 'unverified'
    check (verification_status in ('verified','unverified','under_review','rejected'))
);
create index if not exists phs_evidence_entity_idx on public.phs_evidence_sources(entity_type, entity_id);

-- Product-specific public record. Only published records with verified product/company
-- and a verified, published certificate from a verified CB are eligible for public search.
create or replace view public.phs_public_search as
select
  p.id as product_id,
  p.product_name,
  p.brand_name,
  p.product_number,
  p.barcode_gtin,
  p.country_of_origin,
  p.product_category,
  p.ingredients_declared,
  co.legal_name as company_name,
  co.trading_name as company_trading_name,
  co.country as company_country,
  cb.legal_name as certification_body,
  cb.acronym as certification_body_acronym,
  cb.country as certification_body_country,
  cert.certificate_number,
  cert.scope as certificate_scope,
  cert.issue_date,
  cert.expiry_date,
  cert.certificate_status,
  cert.official_verification_url,
  cert.certificate_url,
  cert.evidence_checked_at,
  case
    when cert.certificate_status = 'suspended' then 'Suspended'
    when cert.certificate_status = 'withdrawn' then 'Withdrawn'
    when cert.expiry_date is not null and cert.expiry_date < current_date then 'Expired'
    when cert.certificate_status = 'active'
      and cert.verification_status = 'verified'
      and cb.verification_status = 'verified'
      and cb.recognition_status in ('recognised','limited_scope')
      and cert.expiry_date >= current_date then 'Verified Halal'
    else 'Verification Required'
  end as halal_status,
  coalesce((
    select string_agg(i.ingredient_name || case when i.e_number is not null then ' (' || i.e_number || ')' else '' end, ', ' order by pi.declared_order nulls last, i.ingredient_name)
    from public.phs_product_ingredients pi join public.phs_ingredients i on i.id = pi.ingredient_id
    where pi.product_id = p.id and pi.assessment_status = 'verified' and i.verification_status = 'verified'
  ), p.ingredients_declared) as basic_ingredients,
  (
    select string_agg(i.ingredient_name || case when i.e_number is not null then ' (' || i.e_number || ')' else '' end, ', ' order by i.ingredient_name)
    from public.phs_product_ingredients pi join public.phs_ingredients i on i.id = pi.ingredient_id
    where pi.product_id = p.id and pi.is_critical = true
  ) as critical_ingredients,
  p.source_url as product_source_url,
  coalesce(cert.official_verification_url, cert.certificate_url) as verification_source
from public.phs_products p
join public.phs_companies co on co.id = p.company_id
join public.phs_certificates cert on cert.product_id = p.id and cert.company_id = co.id
join public.phs_certification_bodies cb on cb.id = cert.certification_body_id
where p.publication_status = 'published'
  and p.verification_status = 'verified'
  and co.publication_status = 'published'
  and co.verification_status = 'verified'
  and cert.publication_status = 'published'
  and cert.verification_status = 'verified'
  and cb.publication_status = 'published'
  and cb.verification_status = 'verified';

-- RLS: all PHS source tables are private to HalalBridge admins.
do $$
declare t text;
begin
  foreach t in array array['phs_certification_bodies','phs_companies','phs_products','phs_ingredients','phs_product_ingredients','phs_certificates','phs_evidence_sources']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "HalalBridge admins manage %I" on public.%I', t, t);
    execute format('create policy "HalalBridge admins manage %I" on public.%I for all to authenticated using ((select public.is_halalbridge_admin())) with check ((select public.is_halalbridge_admin()))', t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

grant select on public.phs_public_search to anon, authenticated;


-- Search endpoint used by the public PHS interface. It returns only the
-- published, verified product-level records exposed by the view above.
create or replace function public.phs_search_products(search_term text)
returns setof public.phs_public_search
language sql
stable
security invoker
set search_path = ''
as $$
  select v.*
  from public.phs_public_search v
  where nullif(trim(search_term), '') is not null
    and concat_ws(' ', v.product_name, v.brand_name, v.product_number,
      v.barcode_gtin, v.company_name, v.company_trading_name,
      v.company_country, v.country_of_origin, v.certificate_number)
      ilike '%' || replace(replace(trim(search_term), '%', '\\%'), '_', '\\_') || '%'
  order by v.product_name
  limit 30;
$$;
grant execute on function public.phs_search_products(text) to anon, authenticated;
