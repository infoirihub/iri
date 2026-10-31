# HalalBridge Internal Admin System

## What is included
- `admin.html`, `admin.css`, `admin.js`: responsive, login-protected request dashboard.
- `admin-config.js`: browser-safe Supabase project configuration placeholders.
- `supabase/schema.sql`: database tables, status constraints and row-level security policies.

## Important deployment/security note
The public website is hosted on GitHub Pages. GitHub Pages is static hosting and does not provide a secure server-side database or private admin authentication. The dashboard therefore uses Supabase Auth + Postgres Row Level Security (RLS).

**Never place a Supabase `service_role` key, database password, SMTP password or other secret in any website JavaScript file.** The Supabase anon/publishable key is intended for browser use only when RLS is correctly enabled.

## Setup steps
1. Create a Supabase project for HalalBridge.
2. Open Supabase SQL Editor and run all of `supabase/schema.sql`.
3. In Supabase Authentication > Users, create the first administrator account using a dedicated business email.
4. Copy that Auth user's UUID. In SQL Editor run:
   ```sql
   insert into public.admin_profiles (id, role)
   values ('AUTH-USER-UUID', 'admin');
   ```
5. Copy the Project URL and anon/publishable key from Supabase Project Settings > API.
6. Add those two public values to `admin-config.js`. Do not add a service_role key.
7. The public laboratory-testing form now inserts lab requests into `lab_testing_requests` when the Supabase settings are configured. It also sends the existing email notification through FormSubmit. Non-laboratory enquiries continue using the email route only.
8. The admin dashboard will be available at `/iri/admin.html` after deployment.

## Current implementation boundary
This is the dashboard and database-security foundation. It will not show or save public website submissions until the Supabase project is configured and the public enquiry form is connected to the database. The existing email enquiry route remains separate until that integration is completed and tested.

## Request lifecycle
- New public submission: `Pending`
- Team checks request and laboratory scope: `Under Review`
- Coordination with the selected laboratory: `In Process`
- Testing coordination closed: `Completed`
- Request cannot be handled / declined: `Rejected`

Internal notes are visible only to authorised administrators. Applicants cannot read or alter request status or internal notes through the public website.
