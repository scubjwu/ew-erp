# Partners Module

## Purpose

This document tracks the current design, workflow, schema surface, implementation status, and maintenance rules for the `Partners` module.

The `Partners` module is the system area for customer, vendor, leasing, ownership, and related counterparty management.

## Scope

Current `Partners` areas:

- Customers
- Vendors
- Lessee
- Lessor
- Material Vendors
- Container Owners

Route family:

- `/partners`

## Current Design And Workflow

### Module shape

The module has two layers:

1. center page
   - a card-based overview at `/partners`
   - business-facing descriptions and counts by partner category
2. section pages
   - one route per partner category
   - most sections are now fully delivered page families

### Current implementation reality

The module is now mostly delivered.

Current state:

- `Partners Center` is delivered as the module entry page
- `Customers` is a delivered CRUD flow under `/partners/customers`
- legacy `/customers*` routes redirect into `/partners/customers*`
- `Vendors`, `Material Vendors`, `Lessees`, and `Container Owners` each have delivered list/create/view/edit flows
- those standalone partner categories each have dedicated master tables and attachment child tables
- those delivered partner tables and child tables are also part of the reset-safe local workflow
- `Lessor` still remains placeholder-only with no dedicated data model or CRUD flow yet

### Current workflow pattern

For active partner CRUD pages, the working pattern is:

1. center page card links to a section route
2. section route fetches initial data on the server
3. dashboard handles list, filters, pagination, and export
4. form or detail page workflow handles create/edit/view
5. schema and permissions are provided by migrations
6. seed coverage is added when local reset survival is required

At the moment, `Customers`, `Vendors`, and `Material Vendors` are the strongest concrete references for the pattern inside `Partners`.

## Center Page

Current center-page references:

- route: [`app/partners/page.tsx`](/Users/palaya/Documents/ew-erp/app/partners/page.tsx)
- count API: [`lib/supabase/partners-api.ts`](/Users/palaya/Documents/ew-erp/lib/supabase/partners-api.ts)
- UI: [`components/partners/partners-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/partners/partners-dashboard.tsx)
- metadata and section map: [`types/partners.ts`](/Users/palaya/Documents/ew-erp/types/partners.ts)

Important implementation notes:

- `types/partners.ts` now maps all delivered partner categories except `Lessor` to count-backed table names
- the center page still mixes active CRUD categories with the scaffold-only `Lessor` section

## Section Status

| Section | Current route state | Current data state | Status |
| --- | --- | --- | --- |
| Customers | Active page family with list/create/view/edit | Backed by `customers` and `customer_certificate_links` | Delivered |
| Vendors | Active page family with list/create/view/edit | Backed by `vendors` and `vendor_attachment_links` | Delivered |
| Lessee | Active page family with list/create/view/edit | Backed by `lessees` and `lessee_attachment_links` | Delivered |
| Lessor | Placeholder page | No delivered CRUD flow yet | Scaffold Only |
| Material Vendors | Active page family with list/create/view/edit | Backed by `material_vendors` and `material_vendor_attachment_links` | Delivered |
| Container Owners | Active page family with list/create/view/edit | Backed by `container_owners` and `container_owner_attachment_links` | Delivered |

## Customers Workflow

### Current status

`Customers` remains the strongest current delivered business CRUD flow in the repository.

Current references:

- route: [`app/partners/customers/page.tsx`](/Users/palaya/Documents/ew-erp/app/partners/customers/page.tsx)
- server actions: [`app/customers/actions.ts`](/Users/palaya/Documents/ew-erp/app/customers/actions.ts)
- dashboard: [`components/customers/customers-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/customers/customers-dashboard.tsx)
- types: [`types/customer.ts`](/Users/palaya/Documents/ew-erp/types/customer.ts)

### Current behavior

Current delivered customer behavior includes:

- server-side search
- server-side pagination
- CSV export
- customer detail fetch
- region join support
- form-driven editing for customer ID, status, company names, region, contact fields, credit setup, and certificate links
- customer certificate-link support
- canonical `View` and `Edit` flows under `/partners/customers/[id]` and `/partners/customers/[id]/edit`

Current search behavior note:

- simple search still targets company name
- advanced syntax also accepts `customer_id:` and `customerid:` aliases for `customer_custom_id`

Current UI-to-schema mapping note:

- the UI label `Primary Contact Email` currently writes to the legacy `customers.purchasing_emails[0]` field
- `ops_emails` and `finance_emails` are edited as comma-separated text inputs and stored as arrays
- `depot_info` still exists in the customer schema, but depot rows are not part of the delivered customer form anymore

## Standalone Partner Master Tables

The non-customer partner categories now use dedicated standalone tables rather than reviving legacy supplier structures.

Delivered route families:

- [`app/partners/vendors`](/Users/palaya/Documents/ew-erp/app/partners/vendors)
- [`app/partners/material-vendors`](/Users/palaya/Documents/ew-erp/app/partners/material-vendors)
- [`app/partners/lessee`](/Users/palaya/Documents/ew-erp/app/partners/lessee)
- [`app/partners/container-owners`](/Users/palaya/Documents/ew-erp/app/partners/container-owners)

Current delivery truth:

- each delivered category supports server-side filtering, pagination, `View/Edit`, and CSV export
- detail/edit pages include richer sections for business profile, settlement, and attachments where applicable
- each delivered standalone category has repo seed data for local reset-safe development

Important migration references:

- [`db/supabase/migrations/20260401130000_create_vendors.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260401130000_create_vendors.sql)
- [`db/supabase/migrations/20260401133000_create_material_vendors.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260401133000_create_material_vendors.sql)
- [`db/supabase/migrations/20260401140000_create_lessees.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260401140000_create_lessees.sql)
- [`db/supabase/migrations/20260401143000_create_container_owners.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260401143000_create_container_owners.sql)

## Data And Schema Surface

Current active partner tables:

- `customers`
- `customer_certificate_links`
- `vendors`
- `vendor_attachment_links`
- `material_vendors`
- `material_vendor_attachment_links`
- `lessees`
- `lessee_attachment_links`
- `container_owners`
- `container_owner_attachment_links`

Supporting lookup and reference tables already used by delivered partner pages:

- `region_codes`
- `users`

Current schema truth for the standalone partner tables:

- `vendors.vendor_code` uses the `S[A-Z0-9]{5}` format, requires `region_id` and `assigned_buyer_id`, and constrains `category` to `Container`
- `material_vendors.vendor_code` uses the `^[A-Z]{2}[0-9]{4}$` format, tracks `material_category`, optional `pic_user_id`, `is_default_vendor`, and enforces one non-deleted default vendor per material category
- `lessees.lessee_code` uses the `B[A-Z0-9]{5}` format and allows nullable `region_id` and `pic_user_id`
- `container_owners.container_owner_code` uses the `O[A-Z0-9]{5}` format and keeps `address`, `region_id`, `country`, and `pic_user_id` nullable
- all four master tables carry settlement-related fields, `Normal/Blocked/Deleted` status constraints, `set_updated_at()` triggers, and public select/insert/update policies
- all four attachment-link child tables support cascade delete from their parent row and public select/insert/update/delete policies

Schema truth lives in:

- [`db/supabase/migrations/`](/Users/palaya/Documents/ew-erp/db/supabase/migrations)
- [`db/full_schema.sql`](/Users/palaya/Documents/ew-erp/db/full_schema.sql)
- [`db/remote_full_schema.sql`](/Users/palaya/Documents/ew-erp/db/remote_full_schema.sql)

## Local Reset And Seed Coverage

Currently seed-covered partner tables include:

- `customers`
- `customer_certificate_links`
- `users` rows used by partner FK references
- `vendors`
- `vendor_attachment_links`
- `material_vendors`
- `material_vendor_attachment_links`
- `lessees`
- `lessee_attachment_links`
- `container_owners`
- `container_owner_attachment_links`

Current seed workflow references:

- [`scripts/export_basic_info_seeds.py`](/Users/palaya/Documents/ew-erp/scripts/export_basic_info_seeds.py)
- [`scripts/verify_basic_info_seeds.py`](/Users/palaya/Documents/ew-erp/scripts/verify_basic_info_seeds.py)

Important note:

- customer and all currently delivered standalone partner categories are now covered by the reset-safe export / verify / restore workflow
- whenever a new partner child table is introduced, it must be added to the same workflow in the same change

## Required Smoke-Test Coverage

Every delivered `Partners` CRUD page must complete smoke testing before it is marked done.

Required coverage:

- list route loads successfully after `npm run db:reset`
- `new` route loads successfully
- `view` route loads successfully for a real row
- `edit` route loads successfully for a real row
- create succeeds through the same browser-write path used by the page
- edit succeeds through the same browser-write path used by the page
- each declared search field produces at least one positive match
- `Reset` restores the unfiltered result set after a filtered search
- filtered export uses the same filters as the list page
- attachment child-table writes are verified when the page owns attachments
- temporary smoke-test rows are cleaned up unless intentionally promoted into managed seed data

For current delivered partner pages, this applies to:

- `Customers`
- `Vendors`
- `Material Vendors`
- `Lessees`
- `Container Owners`

Those partner pages are also part of the local daily regression command:

- `npm run test:regression`

Within that workflow, partner coverage currently includes:

- dashboard-level UI regression coverage
- route availability for list / new / view / edit
- create and edit through the local browser-write path
- attachment child-table writes
- declared search filters
- reset-equivalent unfiltered recovery
- filtered export data-source validation
- reset-safe persistence regression for partner master-data tables and attachment tables
- verification that partner rows are exported into managed seed files before reset and restored after reset
- cleanup of temporary regression rows after the run

Regression execution records do not belong in this module doc. Use [`docs/daily-regression-log.md`](/Users/palaya/Documents/ew-erp/docs/daily-regression-log.md) for regression failures, fix summaries, verification reruns, and regression-related commit history. Keep [`docs/daily-todo.md`](/Users/palaya/Documents/ew-erp/docs/daily-todo.md) for planning and carry-forward items only.

## UI And Interaction Standards For This Module

`Partners` should follow the same core list/search/form standards as `System Codes`, but with partner-specific business structure.

Current module rules:

- use business-facing English titles
- align center-page card design with delivered `System Codes` style
- use form pages rather than cramped dialogs for larger partner records
- keep `View` and `Edit` as the standard primary row actions
- treat attachment maintenance as part of the delivered business workflow where the table owns attachments

## Remaining Gap

The current gap inside `Partners` is now narrow:

- `Lessor` is still route-level scaffold only

Engineers should not assume a lessor data model already exists just because the center page and nav reserve the category.
