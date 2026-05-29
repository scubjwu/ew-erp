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
- Financial Exchange Rates
- Container Number Rules

## Current Design And Workflow

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
2. server-side query and export logic in matching `actions.ts`
3. dashboard/list component under `components/basic-info/`
4. form dialog and view dialog components under `components/basic-info/`
5. type definitions under `types/`
6. migration-backed schema, RLS, and public-write coverage under `db/supabase/migrations/`
7. seed export and verify coverage if local reset survival is expected

### Center-page workflow

Current center-page flow:

- route: [`app/basic-info/page.tsx`](/Users/palaya/Documents/ew-erp/app/basic-info/page.tsx)
- count API: [`lib/supabase/basic-info-api.ts`](/Users/palaya/Documents/ew-erp/lib/supabase/basic-info-api.ts)
- UI: [`components/basic-info/basic-info-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/basic-info/basic-info-dashboard.tsx)
- metadata and labels: [`types/basic-info.ts`](/Users/palaya/Documents/ew-erp/types/basic-info.ts)

The center page counts rows by table name and displays business-facing cards, not implementation internals.

## Current Delivery Status

Delivered reference pages:

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
- Financial Exchange Rates
- Container Number Rules

Reality check:

- `System Codes` is still the strongest delivered CRUD module in the repository
- implementation maturity is high across the delivered sections, but engineers should still verify page-specific action wiring and child-table behavior in code
- `financial_exchange_rate` is now a real delivered section, not just a backend table

## Data And Schema Surface

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
- `financial_exchange_rate`
- `container_number_rules`

Closely related lookup table that affects current workflows:

- `ral_color_codes`

Current permission truth:

- browser/public write flows are expected to work for the main delivered system-code tables through migration-managed grants and RLS policies
- `depot_attachment_links` and `depot_additional_costs` remain child-table exceptions that also require delete coverage
- `financial_exchange_rate` is part of the delivered browser-write surface

Important migration references for the current baseline:

- [`db/supabase/migrations/20260331083000_container_size_codes_public_write_fix.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260331083000_container_size_codes_public_write_fix.sql)
- [`db/supabase/migrations/20260331091000_container_number_rules_public_write.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260331091000_container_number_rules_public_write.sql)
- [`db/supabase/migrations/20260331094500_basic_info_public_write_unified_fix.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260331094500_basic_info_public_write_unified_fix.sql)
- [`db/supabase/migrations/20260510143000_dispatch_release_financial_exchange_rates_step1.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260510143000_dispatch_release_financial_exchange_rates_step1.sql)
- [`db/supabase/migrations/20260510161000_financial_exchange_rate_public_policies.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260510161000_financial_exchange_rate_public_policies.sql)
- [`db/supabase/migrations/20260510173000_financial_exchange_rate_start_from_currency_expansion.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260510173000_financial_exchange_rate_start_from_currency_expansion.sql)

Related schema sources:

- [`db/supabase/migrations/`](/Users/palaya/Documents/ew-erp/db/supabase/migrations)
- [`db/full_schema.sql`](/Users/palaya/Documents/ew-erp/db/full_schema.sql)
- [`db/remote_full_schema.sql`](/Users/palaya/Documents/ew-erp/db/remote_full_schema.sql)

## Local Reset And Seed Coverage

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

Important current note:

- `financial_exchange_rate` is delivered in UI, but it is not currently part of the managed local seed list in [`db/supabase/config.toml`](/Users/palaya/Documents/ew-erp/db/supabase/config.toml)
- engineers touching `financial_exchange_rate` should treat reset-safe persistence expectations explicitly rather than assuming it behaves like the older seed-backed basic-info tables

Seed workflow references:

- [`scripts/export_basic_info_seeds.py`](/Users/palaya/Documents/ew-erp/scripts/export_basic_info_seeds.py)
- [`scripts/verify_basic_info_seeds.py`](/Users/palaya/Documents/ew-erp/scripts/verify_basic_info_seeds.py)
- [`db/supabase/seeds/`](/Users/palaya/Documents/ew-erp/db/supabase/seeds)

## UI And Interaction Standards For This Module

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

- [`docs/basic-info-list-standard.md`](/Users/palaya/Documents/ew-erp/docs/basic-info-list-standard.md)

## Required Regression Coverage

Delivered editable `System Codes` pages are part of the required daily regression gate:

- `npm run test:regression`

Current `System Codes` coverage inside that workflow includes:

- dashboard-level UI regression coverage for the delivered `Basic Info` center and section dashboards
- route availability for current non-inventory `System Codes` pages
- create and edit through the same local browser-write path used by the delivered pages
- child-table write checks for `company_bank_accounts`, `depot_additional_costs`, and `depot_attachment_links`
- declared search-filter coverage
- reset-equivalent recovery to the unfiltered result set
- filtered export data-source validation
- representative reset-safe persistence assertions across the delivered seed-backed basic-info tables
- verification that seed export captures new local rows before reset and that those rows still exist after reset
- cleanup of temporary regression rows after the run

Regression execution records do not belong in this module doc. Use [`docs/daily-regression-log.md`](/Users/palaya/Documents/ew-erp/docs/daily-regression-log.md) for regression failures, fixes, reruns, and commit history. Keep [`docs/daily-todo.md`](/Users/palaya/Documents/ew-erp/docs/daily-todo.md) for planning and carry-forward items only.

## Reference Implementations

Use these as first-open references:

- center page:
  - [`app/basic-info/page.tsx`](/Users/palaya/Documents/ew-erp/app/basic-info/page.tsx)
  - [`components/basic-info/basic-info-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/basic-info/basic-info-dashboard.tsx)
- metadata and section map:
  - [`types/basic-info.ts`](/Users/palaya/Documents/ew-erp/types/basic-info.ts)
- company-information reference:
  - [`app/basic-info/companies/page.tsx`](/Users/palaya/Documents/ew-erp/app/basic-info/companies/page.tsx)
  - [`app/basic-info/companies/actions.ts`](/Users/palaya/Documents/ew-erp/app/basic-info/companies/actions.ts)
  - [`components/basic-info/company-profiles-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/basic-info/company-profiles-dashboard.tsx)
- financial exchange rates:
  - [`app/basic-info/financial-exchange-rates/page.tsx`](/Users/palaya/Documents/ew-erp/app/basic-info/financial-exchange-rates/page.tsx)
  - [`app/basic-info/financial-exchange-rates/actions.ts`](/Users/palaya/Documents/ew-erp/app/basic-info/financial-exchange-rates/actions.ts)
  - [`components/basic-info/financial-exchange-rates-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/basic-info/financial-exchange-rates-dashboard.tsx)
- container number rules:
  - [`app/basic-info/container-number-rules/page.tsx`](/Users/palaya/Documents/ew-erp/app/basic-info/container-number-rules/page.tsx)
  - [`app/basic-info/container-number-rules/actions.ts`](/Users/palaya/Documents/ew-erp/app/basic-info/container-number-rules/actions.ts)
  - [`components/basic-info/container-number-rules-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/basic-info/container-number-rules-dashboard.tsx)

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
- UI section assumed to be reset-safe without matching seed coverage

### Naming inconsistency

Symptom:

- page label, center card, metadata, or tab name do not match

Usual causes:

- one location updated without updating the rest of the naming surface

### Lookup-table confusion

Symptom:

- engineers assume every supporting lookup under `public` should have a `System Codes` page

Usual cause:

- workflow-support lookup tables such as `ral_color_codes` are treated as if they were user-maintained master-data sections
