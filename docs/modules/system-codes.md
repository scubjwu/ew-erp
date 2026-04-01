# System Codes Module

## Purpose

This document tracks the current design, workflow, schema surface, implementation status, and maintenance rules for the `System Codes` module.

`System Codes` is the repository's current master-data reference standard. New CRUD pages should copy this module's established interaction and delivery patterns before introducing new conventions.

## Scope

`System Codes` is the business-facing name for the route family under `/basic-info`.

Current scope includes:

- Company Information
- Region Codes
- City Codes
- Depot Codes
- Expense Codes
- Revenue Codes
- Condition Codes
- Size Codes
- Type Codes
- Operation Price Configs
- Container Number Rules

## Current Design and Workflow

### Module shape

The module has two layers:

1. center page
- a card-based overview page at `/basic-info`
- shows business-facing descriptions and record counts

2. section pages
- one page per master-data area
- typically implemented as list/search/create/edit/view CRUD flows

### Current implementation pattern

The standard pattern for an active `System Codes` page is:

1. route page under `app/basic-info/<section>/page.tsx`
2. server-side query and export logic in `app/basic-info/<section>/actions.ts`
3. dashboard/list component under `components/basic-info/`
4. form dialog and view dialog components under `components/basic-info/`
5. type definitions under `types/`
6. migration-backed schema, RLS, and public-write coverage under `db/supabase/migrations/`
7. seed export and verify coverage if local reset survival is expected

### Center-page workflow

Current center-page flow:

- route: [`app/basic-info/page.tsx`](/Users/palayapan/Documents/ew-erp/app/basic-info/page.tsx)
- count API: [`lib/supabase/basic-info-api.ts`](/Users/palayapan/Documents/ew-erp/lib/supabase/basic-info-api.ts)
- UI: [`components/basic-info/basic-info-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/basic-info/basic-info-dashboard.tsx)
- metadata and labels: [`types/basic-info.ts`](/Users/palayapan/Documents/ew-erp/types/basic-info.ts)

The center page counts rows by table name and displays business-facing cards, not implementation internals.

## Current Delivery Status

### Delivered reference pages

These areas are treated as current delivered master-data flows or current reference implementations:

- Company Information
- Region Codes
- City Codes
- Depot Codes
- Expense Codes
- Revenue Codes
- Condition Codes
- Size Codes
- Type Codes
- Operation Price Configs
- Container Number Rules

### Reality check

`System Codes` is the strongest delivered module in the repository, but engineers should still verify page-specific behavior in code and migrations before assuming every section has identical maturity.

When in doubt, use the company, region, city, and related active dashboards and actions as the concrete truth.

## Data and Schema Surface

Current active `System Codes` tables include:

- `company_profiles`
- `company_bank_accounts`
- `region_codes`
- `cities`
- `depots`
- `depot_attachment_links`
- `depot_additional_costs`
- `cost_codes`
- `revenue_codes`
- `container_condition_codes`
- `container_size_codes`
- `container_type_codes`
- `operation_price_configs`
- `container_number_rules`

Related schema sources:

- [`db/supabase/migrations/`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations)
- [`db/full_schema.sql`](/Users/palayapan/Documents/ew-erp/db/full_schema.sql)
- [`db/remote_full_schema.sql`](/Users/palayapan/Documents/ew-erp/db/remote_full_schema.sql)

## Local Reset and Seed Coverage

`System Codes` is tightly coupled to the local seed/reset workflow.

Current seed-covered `System Codes` tables include:

- `company_profiles`
- `company_bank_accounts`
- `region_codes`
- `cities`
- `depots`
- `depot_attachment_links`
- `depot_additional_costs`
- `cost_codes`
- `revenue_codes`
- `container_condition_codes`
- `container_size_codes`
- `container_type_codes`
- `container_number_rules`
- `operation_price_configs`

Seed workflow references:

- [`scripts/export_basic_info_seeds.py`](/Users/palayapan/Documents/ew-erp/scripts/export_basic_info_seeds.py)
- [`scripts/verify_basic_info_seeds.py`](/Users/palayapan/Documents/ew-erp/scripts/verify_basic_info_seeds.py)
- [`db/supabase/seeds/`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds)

Engineers must update seed coverage when introducing a new `System Codes` table or when adding reset-sensitive child data to an existing table.

## UI and Interaction Standards for This Module

`System Codes` is the current UI standard-setter for master-data pages.

The module standard is:

- compact ERP-style list pages
- sticky headers
- first business column frozen where useful
- server-side filtering and pagination
- current-page-only UI sorting
- text-link style row actions
- responsive dialogs with internal scrolling
- business-facing English titles and descriptions

Module-specific supporting standard:

- [`docs/basic-info-list-standard.md`](/Users/palayapan/Documents/ew-erp/docs/basic-info-list-standard.md)

## Reference Implementations

Use these as first-open references:

- center page:
  - [`app/basic-info/page.tsx`](/Users/palayapan/Documents/ew-erp/app/basic-info/page.tsx)
  - [`components/basic-info/basic-info-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/basic-info/basic-info-dashboard.tsx)
- metadata and section map:
  - [`types/basic-info.ts`](/Users/palayapan/Documents/ew-erp/types/basic-info.ts)
- active CRUD page wiring:
  - [`app/basic-info/companies/page.tsx`](/Users/palayapan/Documents/ew-erp/app/basic-info/companies/page.tsx)
  - [`app/basic-info/companies/actions.ts`](/Users/palayapan/Documents/ew-erp/app/basic-info/companies/actions.ts)
  - [`components/basic-info/company-profiles-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/basic-info/company-profiles-dashboard.tsx)

## Common Failure Modes

### RLS and public-write drift

Symptom:

- list loads but create or update fails with permission errors

Usual causes:

- migration not applied locally or remotely
- browser/public write policy added for one table but not the related child table

### Reset persistence gaps

Symptom:

- records disappear after `npm run db:reset`

Usual causes:

- table missing from seed scripts
- child table missing from seed scripts
- FK restore order not handled correctly

### Naming inconsistency

Symptom:

- page label, center card, metadata, or tab name do not match

Usual causes:

- one location updated without updating the rest of the module naming surface

### Section drift

Symptom:

- one `System Codes` page behaves unlike the rest of the module

Usual causes:

- new implementation invented custom patterns instead of copying the existing module standard

## How To Extend This Module

When adding a new `System Codes` page:

1. define the table and workflow first
2. add the migration and required permissions
3. add the route page
4. add `actions.ts` for list/search/export behavior
5. add dashboard/list UI
6. add form and view dialogs
7. add seed coverage if reset survival is expected
8. align titles, descriptions, and card metadata
9. update the global doc if the module scope or milestone status changed
10. update this module doc if schema surface, standards, or reference implementations changed

## Current Gaps and Risks

- some sections may still need polish for export completeness, consistency, or permission alignment
- any schema expansion in reset-sensitive tables can break local persistence if seed scripts are not updated at the same time
- engineers may incorrectly assume every `/basic-info` path is equally mature without checking the actual route and action implementation

## Maintenance Rules

Update this document when:

- a new `System Codes` section becomes active
- a section changes workflow materially
- seed coverage changes
- naming conventions change
- a new page becomes the preferred reference implementation

Daily execution planning does not belong in this module doc. Track day-by-day work and unresolved action items in [`docs/daily-todo.md`](/Users/palayapan/Documents/ew-erp/docs/daily-todo.md).

## Changelog

- `2026-03-31` — Initial `System Codes` module document created.
