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

## Current Design and Workflow

### Module shape

The module has two layers:

1. center page
- a card-based overview at `/partners`
- business-facing descriptions and counts by partner category

2. section pages
- one route per partner category
- current implementation maturity varies significantly by section

### Current implementation reality

The current module is not uniformly delivered.

Current state:

- `Partners Center` is now delivered as the module entry page
- `Customers` is the main active and usable partner CRUD flow
- legacy `/customers*` routes now redirect into `/partners/customers*`
- `Vendors` is currently placeholder-level and does not have an active backing master-data table
- `Lessee`, `Lessor`, `Material Vendors`, and `Container Owners` currently use placeholder pages

### Current workflow pattern

For active partner CRUD pages, the working pattern is:

1. center page card links to a section route
2. section route fetches initial data on the server
3. dashboard handles list, filters, pagination, and export
4. form workflow handles create/edit/view
5. schema and permissions are provided by migrations
6. seed coverage is added when local reset survival is required

At the moment, `Customers` is the only strong delivered reference for this pattern inside `Partners`.

## Center Page

Current center-page references:

- route: [`app/partners/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/page.tsx)
- count API: [`lib/supabase/partners-api.ts`](/Users/palayapan/Documents/ew-erp/lib/supabase/partners-api.ts)
- UI: [`components/partners/partners-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/partners/partners-dashboard.tsx)
- metadata and section map: [`types/partners.ts`](/Users/palayapan/Documents/ew-erp/types/partners.ts)

Important implementation note:

- some partner categories do not yet have a backing table configured in `types/partners.ts`
- the center page therefore mixes real counts and scaffold-only categories
- the current real count-backed partner card is `Customers`

## Section Status

| Section | Current route state | Current data state | Status |
| --- | --- | --- | --- |
| Customers | Active page | Backed by `customers` and `customer_certificate_links` | Delivered |
| Vendors | Placeholder page | No active backing master-data table | Scaffold Only |
| Lessee | Placeholder page | No delivered CRUD flow yet | Scaffold Only |
| Lessor | Placeholder page | No delivered CRUD flow yet | Scaffold Only |
| Material Vendors | Placeholder page | No delivered CRUD flow yet | Scaffold Only |
| Container Owners | Placeholder page | No delivered CRUD flow yet | Scaffold Only |

## Customers Workflow

### Current status

`Customers` is the strongest current delivered business CRUD flow in the repository.

Current references:

- route: [`app/partners/customers/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/customers/page.tsx)
- server actions: [`app/customers/actions.ts`](/Users/palayapan/Documents/ew-erp/app/customers/actions.ts)
- dashboard: [`components/customers/customers-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/customers/customers-dashboard.tsx)
- types: [`types/customer.ts`](/Users/palayapan/Documents/ew-erp/types/customer.ts)

### Current behavior

Current delivered customer behavior includes:

- server-side search
- server-side pagination
- CSV export
- customer detail fetch
- region join support
- form-driven editing for customer ID, status, company names, region, contact fields, credit setup, and certificate links
- customer certificate link support
- canonical `View` and `Edit` flows under `/partners/customers/[id]` and `/partners/customers/[id]/edit`

Current search behavior note:

- simple search still targets company name
- advanced syntax now also accepts `customer_id:` and `customerid:` aliases for `customer_custom_id`

Current UI-to-schema mapping note:

- the UI label `Primary Contact Email` currently writes to the legacy `customers.purchasing_emails[0]` field
- `ops_emails` and `finance_emails` are edited as comma-separated text inputs and stored as arrays
- `depot_info` still exists in the customer schema, but depot rows are not part of the delivered customer form anymore

### Current schema surface

Main customer tables:

- `customers`
- `customer_certificate_links`
- related lookup table: `region_codes`

Current customer field truth added on `2026-03-31`:

- `customers.contact_person`
- `customers.assigned_sales`
- `customers.company_name_other_language`
- `customers.region_id`
- `customers.purchasing_emails[0]` is the current storage target for the UI's `Primary Contact Email`
- `customers.depot_info` remains schema-level legacy data, not current delivered form scope
- `customer_certificate_links.link_url`

Important migrations include:

- [`db/supabase/migrations/20260331123000_customers_ui_fields.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations/20260331123000_customers_ui_fields.sql)
- [`db/supabase/migrations/20260331124500_customers_fields_and_public_write.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations/20260331124500_customers_fields_and_public_write.sql)
- [`db/supabase/migrations/20260331140000_customers_region_and_certificates.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations/20260331140000_customers_region_and_certificates.sql)

## Vendors Surface

### Current status

`Vendors` is not yet a delivered CRUD page and currently does not have an active backing master-data table.

Current route:

- [`app/partners/vendors/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/page.tsx)

Current state:

- route placeholder exists
- no active backing table should be treated as source of truth for vendor CRUD
- future vendor delivery needs a deliberate data-model decision before UI work resumes

### Risk

There is currently a gap between partner IA and delivered partner CRUD coverage.

Engineers must not assume that a visible route under `/partners` means the workflow, data model, and seed behavior are fully delivered.

## Placeholder Sections

Current placeholder routes:

- [`app/partners/lessee/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/lessee/page.tsx)
- [`app/partners/lessor/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/lessor/page.tsx)
- [`app/partners/material-vendors/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/material-vendors/page.tsx)
- [`app/partners/container-owners/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/container-owners/page.tsx)
- shared placeholder UI: [`components/partners/partner-section-placeholder.tsx`](/Users/palayapan/Documents/ew-erp/components/partners/partner-section-placeholder.tsx)

These routes establish navigation and future module boundaries, but they are not reference implementations for delivered CRUD behavior.

## Data and Schema Surface

Current active or prepared partner tables:

- `customers`
- `customer_certificate_links`
Related lookup tables already used or likely to be used:

- `region_codes`

Schema truth lives in:

- [`db/supabase/migrations/`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations)
- [`db/full_schema.sql`](/Users/palayapan/Documents/ew-erp/db/full_schema.sql)
- [`db/remote_full_schema.sql`](/Users/palayapan/Documents/ew-erp/db/remote_full_schema.sql)

## Local Reset and Seed Coverage

Currently seed-covered partner tables include:

- `customers`
- `customer_certificate_links`

Current seed workflow references:

- [`scripts/export_basic_info_seeds.py`](/Users/palayapan/Documents/ew-erp/scripts/export_basic_info_seeds.py)
- [`scripts/verify_basic_info_seeds.py`](/Users/palayapan/Documents/ew-erp/scripts/verify_basic_info_seeds.py)

Important note:

- partner seed coverage is currently customer-focused
- new partner tables should not be assumed reset-safe unless seed coverage is explicitly added

## UI and Interaction Standards for This Module

`Partners` should follow the same core list/search/dialog standards as `System Codes`, but with partner-specific business structure.

Current module rules:

- use business-facing English titles
- align center-page card design with delivered `System Codes` style
- for new partner CRUD pages, use `Customers` as the internal reference implementation
- do not use placeholder pages as design standards

## Reference Implementations

Open these first:

- center page:
  - [`app/partners/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/page.tsx)
  - [`components/partners/partners-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/partners/partners-dashboard.tsx)
- customer CRUD:
  - [`app/partners/customers/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/customers/page.tsx)
  - [`app/partners/customers/new/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/customers/new/page.tsx)
  - [`app/partners/customers/[id]/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/customers/[id]/page.tsx)
  - [`app/partners/customers/[id]/edit/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/customers/[id]/edit/page.tsx)
  - [`app/customers/actions.ts`](/Users/palayapan/Documents/ew-erp/app/customers/actions.ts)
  - [`components/customers/customers-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/customers/customers-dashboard.tsx)
  - [`types/customer.ts`](/Users/palayapan/Documents/ew-erp/types/customer.ts)

## Common Failure Modes

### Category vs table confusion

Symptom:

- engineers assume every partner category already has a dedicated table and full workflow

Usual causes:

- reading the center page IA as implementation truth

### Customers-only assumptions

Symptom:

- engineers generalize customer behavior to all partner types

Usual causes:

- `Customers` is currently mature while other sections are not

### Seed coverage assumptions

Symptom:

- new partner data disappears after `npm run db:reset`

Usual causes:

- only customer-focused partner tables are currently seed-covered

### Schema ahead of UI

Symptom:

- vendor route exists, but there is no active vendor master-data table behind it

Usual causes:

- schema work and UI work are currently moving at different speeds

## How To Extend This Module

When building a new active partner section:

1. define whether it is a true new partner type or a view of an existing partner table
2. define the workflow and table ownership clearly
3. add or update migrations and permissions
4. replace the placeholder route with a real page flow
5. add actions/API, dashboard, dialogs, and export as needed
6. decide whether local reset persistence is required and add seed coverage if it is
7. update the center-page counts and metadata if table mapping changes
8. update the global doc if overall delivery status changes
9. update this module doc with the new section status and references

## Current Gaps and Risks

- `Customers` is mature enough to guide implementation, but the rest of the module is not yet uniform
- partner categories may eventually need clearer modeling boundaries than route-only separation
- `Vendors` may drift if the route remains visible before its target data model is formally defined
- placeholder routes can create false confidence about delivery completeness

## Maintenance Rules

Update this document when:

- a placeholder partner section becomes a real CRUD flow
- partner tables or relationships change materially
- seed coverage expands beyond customer-related tables
- the recommended partner reference implementation changes
- milestone status for the module changes

Daily execution planning does not belong in this module doc. Track day-by-day work and unresolved action items in [`docs/daily-todo.md`](/Users/palayapan/Documents/ew-erp/docs/daily-todo.md).

## Changelog

- `2026-03-31` — Initial `Partners` module document created.
