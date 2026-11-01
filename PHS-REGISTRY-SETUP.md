# HalalBridge PHS Registry — Setup and Verification Guide

## What this adds
- A structured registry for certification bodies, companies, products, ingredients, product-specific critical ingredients, certificates, and evidence sources.
- A public search view and search function that return only published, verified product-level records.
- Admin-only write access protected by the existing `is_halalbridge_admin()` role function and Row Level Security.
- A product record layout showing product name/number, company, country, basic and critical ingredients, certification body, certificate number/scope, issue/expiry dates, current status, and source links.

## Required setup
1. Create/configure the HalalBridge Supabase project.
2. Run `supabase/schema.sql` first if it has not already been run. This creates the admin role function used by the PHS policies.
3. Run `supabase/phs-schema.sql` in the same Supabase SQL Editor.
4. Configure `admin-config.js` with the Supabase Project URL and browser-safe anon/publishable key. Never put a service-role key or database password in browser files.
5. Sign in as an authorised HalalBridge administrator and load verified records into the PHS tables. The current admin dashboard does not yet include PHS record-management screens; initial data entry/import must be performed securely in Supabase or through a later admin module.
6. Test the public search using product name, brand, product number, barcode, or company name.

## Important verification rules
- A certification body's presence in the directory does not certify every product made by companies in its country or scope.
- A product may show **Verified Halal** only when a product-specific published certificate record is verified, the certificate is active and not expired, the certification body record is verified and recognised/limited-scope, and the product and company records are verified and published.
- A certificate covering only a company/site or a broad product group must not be linked to an individual product unless the certificate scope/evidence actually covers it.
- Store the official source URL, certificate file or verification URL, date checked, and evidence notes for every published record.
- Expired, suspended, withdrawn, unverified, and not-found records must never be displayed as currently Verified Halal.
- Critical ingredient flags must be product-specific and supported by formulation/specification evidence. Do not infer them from generic ingredient risk lists alone.
- If a product has no verified record, the search result must say **No verified product record found**. It must not infer Halal or Haram.

## Global coverage limitation
There is no single complete, universally authoritative public database of every Halal certification body, every certified company, and every product in every country. Recognition lists and accreditation scopes differ by regulator, market, standard, and date. The registry therefore starts empty by design: do not seed it with guessed names, scraped logos, or assumed approvals. Build coverage through official regulator/accreditor recognition lists, certification-body certificate verification portals, and direct documentary evidence from certificate holders. Track source and last-checked date, and review records periodically.

## AI analysis
The current public page performs structured database search and displays the verified record fields. It does **not** yet call an AI model. AI-generated explanations require a secure server-side endpoint and an approved AI provider/API credential; that credential must never be placed in `research.html` or any browser JavaScript. When added, AI should summarise only the retrieved evidence, cite the source records, explain missing/expired/scope-limited evidence, and never independently decide Halal/Haram.

## Current deployment boundary
The SQL migration has to be run in Supabase and `admin-config.js` must be configured before live product searches can return records. Until then, the public page will clearly report that the registry is not connected.
