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
- `Vendors` now has a delivered list/create/view/edit flow on top of the standalone `vendors` schema
- `Material Vendors`, `Lessees`, and `Container Owners` now have dedicated standalone master-data tables and attachment child tables in migrations
- those four categories also now have repo seed data and attachment seed rows for local development
- `Material Vendors` now has a delivered list/create/view/edit flow on top of the standalone `material_vendors` schema
- `Lessees` now has a delivered list/create/view/edit flow on top of the standalone `lessees` schema
- `Container Owners` now has a delivered list/create/view/edit flow on top of the standalone `container_owners` schema
- `Lessor` still remains placeholder-only with no dedicated table yet

### Current workflow pattern

For active partner CRUD pages, the working pattern is:

1. center page card links to a section route
2. section route fetches initial data on the server
3. dashboard handles list, filters, pagination, and export
4. form workflow handles create/edit/view
5. schema and permissions are provided by migrations
6. seed coverage is added when local reset survival is required

At the moment, `Customers` and `Vendors` are the strongest delivered references for this pattern inside `Partners`.

## Center Page

Current center-page references:

- route: [`app/partners/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/page.tsx)
- count API: [`lib/supabase/partners-api.ts`](/Users/palayapan/Documents/ew-erp/lib/supabase/partners-api.ts)
- UI: [`components/partners/partners-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/partners/partners-dashboard.tsx)
- metadata and section map: [`types/partners.ts`](/Users/palayapan/Documents/ew-erp/types/partners.ts)

Important implementation note:

- `types/partners.ts` now maps both `Customers` and `Vendors` to count-backed table names
- the center page still mixes active CRUD categories with the remaining scaffold-only `Lessor` section

## Section Status

| Section | Current route state | Current data state | Status |
| --- | --- | --- | --- |
| Customers | Active page | Backed by `customers` and `customer_certificate_links` | Delivered |
| Vendors | Active page family with list/create/view/edit | Backed by `vendors`, `vendor_attachment_links`, and repo seed data | Delivered |
| Lessee | Active page family with list/create/view/edit | Backed by `lessees`, `lessee_attachment_links`, and repo seed data | Delivered |
| Lessor | Placeholder page | No delivered CRUD flow yet | Scaffold Only |
| Material Vendors | Active page family with list/create/view/edit | Backed by `material_vendors`, `material_vendor_attachment_links`, and repo seed data | Delivered |
| Container Owners | Active page family with list/create/view/edit | Backed by `container_owners`, `container_owner_attachment_links`, and repo seed data | Delivered |

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

`Vendors` is now an active partner CRUD surface built on a dedicated standalone schema foundation.

Current route:

- [`app/partners/vendors/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/page.tsx)
- [`app/partners/vendors/new/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/new/page.tsx)
- [`app/partners/vendors/[id]/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/[id]/page.tsx)
- [`app/partners/vendors/[id]/edit/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/[id]/edit/page.tsx)

Current state:

- `vendors` and `vendor_attachment_links` now exist as the source-of-truth schema foundation
- the list page now supports server-side filtering, pagination, `View/Edit`, and CSV export
- detail/edit pages now use tabbed sections for basic info, bank information, settlement, and attachments
- repo seed data now includes sample vendor rows plus attachment rows for local reset-safe page development
- vendor workflow now builds on the standalone schema instead of reviving legacy `suppliers`

Prepared schema references:

- [`db/supabase/migrations/20260401130000_create_vendors.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations/20260401130000_create_vendors.sql)
- [`db/supabase/migrations/20260401133000_create_material_vendors.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations/20260401133000_create_material_vendors.sql)
- [`db/supabase/migrations/20260401140000_create_lessees.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations/20260401140000_create_lessees.sql)
- [`db/supabase/migrations/20260401143000_create_container_owners.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations/20260401143000_create_container_owners.sql)

Prepared seed references:

- [`db/supabase/seeds/20260401_partner_master_users.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds/20260401_partner_master_users.sql)
- [`db/supabase/seeds/20260401_partner_master_vendors.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds/20260401_partner_master_vendors.sql)
- [`db/supabase/seeds/20260401_partner_master_vendors_attachment_links.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds/20260401_partner_master_vendors_attachment_links.sql)
- [`db/supabase/seeds/20260401_partner_master_material_vendors.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds/20260401_partner_master_material_vendors.sql)
- [`db/supabase/seeds/20260401_partner_master_material_vendors_attachment_links.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds/20260401_partner_master_material_vendors_attachment_links.sql)
- [`db/supabase/seeds/20260401_partner_master_lessees.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds/20260401_partner_master_lessees.sql)
- [`db/supabase/seeds/20260401_partner_master_lessees_attachment_links.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds/20260401_partner_master_lessees_attachment_links.sql)
- [`db/supabase/seeds/20260401_partner_master_container_owners.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds/20260401_partner_master_container_owners.sql)
- [`db/supabase/seeds/20260401_partner_master_container_owners_attachment_links.sql`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds/20260401_partner_master_container_owners_attachment_links.sql)

### Risk

There is currently a gap between partner IA and delivered partner CRUD coverage.

Engineers must not assume that a visible route under `/partners` means the workflow, data model, and seed behavior are fully delivered.

## Placeholder Sections

Current placeholder routes:

- [`app/partners/lessor/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/lessor/page.tsx)
- shared placeholder UI: [`components/partners/partner-section-placeholder.tsx`](/Users/palayapan/Documents/ew-erp/components/partners/partner-section-placeholder.tsx)

These routes establish navigation and future module boundaries, but they are not reference implementations for delivered CRUD behavior.

## Data and Schema Surface

Current active or prepared partner tables:

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

Current `2026-04-01` schema truth for the new standalone partner tables:

- `vendors.vendor_code` uses the `S[A-Z0-9]{5}` format, requires `region_id` and `assigned_buyer_id`, and currently constrains `category` to `Container`
- `material_vendors.vendor_code` uses the `^[A-Z]{2}[0-9]{4}$` format, tracks `material_category`, optional `pic_user_id`, `is_default_vendor`, and enforces one non-deleted default vendor per material category
- `lessees.lessee_code` uses the `B[A-Z0-9]{5}` format and allows nullable `region_id` and `pic_user_id`
- `container_owners.container_owner_code` uses the `O[A-Z0-9]{5}` format and keeps `address`, `region_id`, `country`, and `pic_user_id` nullable
- all four master tables carry settlement-related fields, `Normal/Blocked/Deleted` status constraints, `set_updated_at()` triggers, and public select/insert/update policies
- all four attachment-link child tables support cascade delete from their parent row and public select/insert/update/delete policies
Related lookup tables already used or likely to be used:

- `region_codes`
- `users`

Schema truth lives in:

- [`db/supabase/migrations/`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations)
- [`db/full_schema.sql`](/Users/palayapan/Documents/ew-erp/db/full_schema.sql)
- [`db/remote_full_schema.sql`](/Users/palayapan/Documents/ew-erp/db/remote_full_schema.sql)

## Local Reset and Seed Coverage

Currently seed-covered partner tables include:

- `customers`
- `customer_certificate_links`
- `users` test rows used by new partner FK seeds
- `vendors`
- `vendor_attachment_links`
- `material_vendors`
- `material_vendor_attachment_links`
- `lessees`
- `lessee_attachment_links`
- `container_owners`
- `container_owner_attachment_links`

Current seed workflow references:

- [`scripts/export_basic_info_seeds.py`](/Users/palayapan/Documents/ew-erp/scripts/export_basic_info_seeds.py)
- [`scripts/verify_basic_info_seeds.py`](/Users/palayapan/Documents/ew-erp/scripts/verify_basic_info_seeds.py)

Important note:

- customer and the standalone partner master-data tables are now covered by the reset-safe export / verify / restore workflow
- partner child tables must be added to the same workflow in the same change whenever new attachment or detail tables are introduced

## Required Smoke-Test Coverage

Every new `Partners` CRUD page must complete smoke testing before it is marked delivered.

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
- temporary smoke-test rows are cleaned up unless they are intentionally promoted into managed seed data

For current delivered partner pages, the expected smoke-test set is:

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
- reset-safe persistence regression for partner master-data tables and their attachment tables
- verification that partner rows are exported into managed seed files before reset and restored after reset
- cleanup of temporary regression rows after the run

## UI and Interaction Standards for This Module

`Partners` should follow the same core list/search/dialog standards as `System Codes`, but with partner-specific business structure.

Current module rules:

- use business-facing English titles
- align center-page card design with delivered `System Codes` style
- for new partner CRUD pages, use `Customers` and `Vendors` as the internal reference implementations
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
- vendor CRUD:
  - [`app/partners/vendors/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/page.tsx)
  - [`app/partners/vendors/new/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/new/page.tsx)
  - [`app/partners/vendors/[id]/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/[id]/page.tsx)
  - [`app/partners/vendors/[id]/edit/page.tsx`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/[id]/edit/page.tsx)
  - [`app/partners/vendors/actions.ts`](/Users/palayapan/Documents/ew-erp/app/partners/vendors/actions.ts)
  - [`components/vendors/vendors-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/vendors/vendors-dashboard.tsx)
  - [`components/vendors/vendor-form.tsx`](/Users/palayapan/Documents/ew-erp/components/vendors/vendor-form.tsx)
  - [`types/vendor.ts`](/Users/palayapan/Documents/ew-erp/types/vendor.ts)

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

- assuming repo seed files and seed automation are already perfectly aligned for the new partner tables
- creating a new partner table or child table without also adding it to export, verify, and `db/supabase/config.toml`

### Schema ahead of UI

Symptom:

- partner routes exist, and dedicated tables exist, but CRUD pages are still placeholders

Usual causes:

- schema work and UI work are currently moving at different speeds

## How To Extend This Module

When building a new active partner section:

1. define whether it is a true new partner type or a view of an existing partner table
2. define the workflow and table ownership clearly
3. add or update migrations and permissions
4. replace the placeholder route with a real page flow
5. add actions/API, dashboard, dialogs, and export as needed
6. add reset-safe seed coverage in the same change for any new editable partner table or child table
7. run the required smoke-test suite after `npm run db:reset`
8. update the center-page counts and metadata if table mapping changes
9. update the global doc if overall delivery status changes
10. update this module doc with the new section status and references

## Current Gaps and Risks

- `Customers` is mature enough to guide implementation, but the rest of the module is not yet uniform
- partner categories may eventually need clearer modeling boundaries than route-only separation
- the new standalone partner tables can drift from future page requirements if UI contracts are not defined before CRUD work starts
- placeholder routes can create false confidence about delivery completeness
- center-page metadata and placeholder copy can drift from migration truth unless `types/partners.ts` and route descriptions are updated together

## Maintenance Rules

Update this document when:

- a placeholder partner section becomes a real CRUD flow
- partner tables or relationships change materially
- seed coverage expands beyond customer-related tables
- reset-safe export / verify / load-order rules change for partner tables or child tables
- reset-safe regression scope changes for partner tables or child tables
- the recommended partner reference implementation changes
- milestone status for the module changes
- smoke-test expectations or completed partner-page verification status changes

Daily execution planning does not belong in this module doc. Track day-by-day work and unresolved action items in [`docs/daily-todo.md`](/Users/palayapan/Documents/ew-erp/docs/daily-todo.md).

## Changelog

- `2026-03-31` — Initial `Partners` module document created.
- `2026-04-01` — Added schema-ready standalone partner tables and seed data for `vendors`, `material_vendors`, `lessees`, and `container_owners`; documented the remaining placeholder-page and metadata drift until CRUD delivery starts.
- `2026-04-02` — Delivered the `container_owners` page family with list/create/view/edit, tabbed detail layout, and CSV export; updated module status to show only `Lessor` as scaffold-only.
