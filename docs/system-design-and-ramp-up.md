# EW ERP System Design and Ramp-Up

## Purpose

This document is the living system design, workflow, and onboarding reference for the EW ERP codebase.

Its job is to keep engineers, designers, and operators on the same page about:

- what is actually delivered today
- how the current system is structured
- which implementation patterns are considered standard
- where database and workflow truth lives
- how local development and reset safety work
- what the current milestone plan and target system shape are

This document must be updated whenever a milestone is completed or when a material system truth changes.

## Current System Design and Workflow

### Product shape today

The application is a Next.js App Router ERP frontend backed by Supabase/Postgres.

Current top-level modules:

- `System Codes`
- `Partners`
- `Inventory`
- `System Settings`

Current landing route:

- `/` redirects to `/basic-info`
- in the UI, `/basic-info` is presented as `System Codes`

### Delivered reality vs target state

Current delivery reality:

- `System Codes` is the most complete and stable module in the repository
- `Container Number Rules` is now a first-class delivered `System Codes` page with dedicated list/search/form/view wiring
- `Partners Center` now exists at `/partners` as the canonical partner entry
- `Customers` is the most complete implementation under `Partners`
- legacy `/customers`, `/customers/new`, and `/customers/[id]` routes now redirect to `/partners/customers...`
- other partner modules are scaffolded in navigation and route structure, but most are not yet full CRUD pages
- inventory database design is materially ahead of inventory frontend delivery

Target state:

- the system should become a connected ERP, not a collection of unrelated CRUD pages
- master data, partners, inventory, operations, and finance should eventually share one aligned workflow and terminology model

### Module workflow pattern

#### System Codes

`System Codes` is the current CRUD reference standard.

Typical pattern:

1. route page under `app/basic-info/.../page.tsx`
2. server-side actions in the matching `actions.ts`
3. dashboard/list component under `components/basic-info/`
4. create/edit/view dialogs
5. RLS and public-write policy coverage in migrations
6. seed export and verify support when local reset persistence is required

Delivered `System Codes` areas include:

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

Current system-level truth added on `2026-03-31`:

- `types/basic-info.ts` is now the main business-facing naming map for `System Codes`
- core `System Codes` tables have a unified public-write/RLS baseline in migrations
- `Container Number Rules` now follows the standard `route -> actions -> dashboard -> dialogs -> migrations -> seeds` pattern

#### Partners

`Partners` has the correct high-level IA and route structure, but implementation maturity is uneven.

Current reality:

- `Partners Center` is delivered at `/partners` with card navigation and count lookups
- `Customers`: delivered and usable
- `Customers` now lives canonically under `/partners/customers`
- `Customers` schema now includes region linkage, secondary-language company name, contact person, assigned sales, and certificate links
- `Customers` UI is currently centered on contact, credit, and certificate maintenance; legacy customer schema fields such as `depot_info` are not part of the delivered form flow
- `Vendors` now has a delivered list page, create flow, detail page, edit page, and CSV export on top of the standalone `vendors` schema
- `Material Vendors`, `Lessees`, and `Container Owners` now have dedicated standalone partner tables and attachment-link child tables in migrations
- those four categories now also have seed-backed test data for local development and reset survival
- `Material Vendors` now has a delivered list page, create flow, detail page, edit page, and CSV export on top of the standalone `material_vendors` schema
- `Lessees` now has a delivered list page, create flow, detail page, edit page, and CSV export on top of the standalone `lessees` schema
- `Container Owners` now has a delivered list page, create flow, detail page, edit page, and CSV export on top of the standalone `container_owners` schema
- `Lessor` remains route-level scaffold only

`Customers` and `Vendors` are the current reference implementations for partner-style CRUD.

#### Inventory

Inventory currently has two realities that engineers must keep distinct:

1. Current UI reality
- the current `Inventory Command Center` still reads and updates the legacy `inventory` table

2. Target workflow reality
- the long-term inventory model is event-driven around:
  - `container`
  - `container_event`
  - `yard_record`
  - related transfer / lease / sale business tables

This distinction is critical. Current UI behavior must not be treated as proof of the target inventory workflow.

### Frontend and backend interaction pattern

Current system interaction is mostly built on this pattern:

1. route page
- entrypoint under `app/.../page.tsx`

2. dashboard or list component
- module UI under `components/...`

3. server actions or module API
- list/search/export often live in `actions.ts`
- center-page count APIs live in `lib/supabase/*-api.ts`

4. Supabase access
- server-side client for paginated read flows
- browser-side client for dialog/form CRUD flows that rely on RLS and current public-write policies

5. schema and persistence support
- migrations define schema and permissions
- seeds protect local reset persistence for selected master-data tables

6. canonical module routing
- legacy routes may redirect into the current module-owned route family
- current example: customer routes resolve under `/partners/customers`

### Current system-level truth added on `2026-04-01`

- legacy `suppliers` is no longer the intended source of truth for the partner vendor domain
- `vendors`, `material_vendors`, `lessees`, and `container_owners` each now have dedicated master tables plus dedicated attachment-link child tables
- those new partner master-data tables follow the same broad baseline pattern of indexes, `set_updated_at()` triggers, and public read/write RLS coverage used elsewhere in master data
- attachment-link child tables for those partner categories also allow public delete, matching expected document-maintenance workflows
- seed-backed local test data now exists for the four new partner tables, their attachment-link tables, and supporting `users` rows required by FK references
- the system therefore treats those partner categories as schema-and-seed ready, but not yet UI-delivered

### Current system-level truth added on `2026-04-02`

- `public.users` remains UUID-keyed; user-facing code should now use `user_code` rather than trying to reinterpret the UUID primary key
- `public.users` now includes management-facing fields for `status`, `phone`, `department`, `job_title`, `last_login_at`, and `remarks`
- `user_code` now follows a controlled 6-character format of two uppercase letters plus four digits
- `email` is now nullable in the business `users` table so user-management workflows are not blocked on email availability
- `System Settings` now has a delivered `User Management` page family under `/settings/users`
- `User Management` follows the standard list/create/view/edit pattern with server-side filtering, CSV export, and tabbed detail pages
- local `db reset` seed export now includes `users`, so locally created user records can survive reset after the export step runs
- local `db reset` seed export also now includes `vendors`, `material_vendors`, `lessees`, `container_owners`, and their attachment-link tables, so newly created partner master-data records can survive reset after the export step runs
- `Basic Info` dashboards are now part of the required `test:regression:ui` gate, so dashboard-level regressions are no longer limited to partners and settings

## UI Standards

### List page standards

All new list pages should follow these rules unless there is a stronger business reason not to.

- use compact ERP-style density
- do not show a leading `No.` index column
- use sticky table headers
- freeze the first business column when useful
- prefer text-link style row actions over large inline action buttons
- prefer `View / Edit` over `Delete` unless delete is explicitly required
- keep empty and loading states inside the table body
- keep toolbar spacing and card layout aligned with delivered pages

### Search standards

Current agreed search behavior:

- use server-side filtering for applied search conditions
- use server-side pagination for main list data
- use current-page local sorting for UI-only column sorting
- keep search toolbar compact and ERP-style
- provide search suggestions only where they materially help the workflow
- suggestion dropdowns must render above sticky headers and table chrome
- selecting a suggestion fills the input only; it does not auto-run search
- search should run when the user clicks `Search` or presses `Enter`
- search and reset button placement should follow delivered production pages

### Sorting standards

- backend default ordering should use the main business key when practical
- frontend table-header sorting should not trigger a new DB fetch unless the page is intentionally designed that way
- initial local sort state should align with backend default ordering where possible

### Dialog and form standards

All dialogs and forms should:

- adapt to viewport size
- scroll inside the dialog when the content is long
- visually align create, edit, and view modes where practical
- clearly mark required fields with `*`
- render readonly or system-controlled fields as visibly locked
- group fields by business meaning rather than raw DB layout

### Dashboard and center page standards

Center pages such as `System Codes` and `Partners` should:

- use business-facing English titles
- show short business descriptions, not developer notes
- avoid exposing raw table names, field counts as implementation detail, or developer readiness labels
- use clickable cards instead of per-card action buttons
- show business-facing record counts where useful
- keep icon, title, and description alignment visually consistent

### Copy-before-invent rule

New pages should copy delivered `System Codes` and `Customers` interaction patterns before introducing new layout or workflow conventions.

### UI language rule

Even though this document is English-first, English business names remain the standard for the UI unless business requirements explicitly say otherwise.

## Local Development Workflow

### Default local development flow

Use the local Supabase stack by default so the UI, migrations, RLS, and reset workflow all point to the same database.

One-time setup:

```bash
npm install
```

Local environment:

```bash
npm run env:local
```

Start local Supabase:

```bash
npm run db:start
```

Replay local migrations and restore seed-backed data:

```bash
npm run db:reset
```

Start Next.js against local Supabase:

```bash
npm run dev:local
```

Switch back to remote Supabase:

```bash
npm run env:remote
npm run dev:remote
```

### Important environment rule

After switching between `env:local` and `env:remote`, restart the Next.js dev server. `next dev` reads `.env.local` on startup.

### Reset workflow

`npm run db:reset` is not just a schema reset command.

Current behavior:

1. export current local seed-covered data into SQL seed files
2. verify that seed coverage is safe and consistent
3. run `supabase db reset`
4. rebuild the local database from migrations
5. restore seed-backed data automatically

### Why the seed workflow exists

The seed workflow exists to protect local development data across `supabase db reset`.

It does not replace remote persistence.

Local persistence safety currently depends on:

- migration coverage
- seed export coverage
- seed verification behavior
- seed load order for FK relationships

From this point forward, any newly created business table that is expected to be edited locally must be added in the same change to:

- `scripts/export_basic_info_seeds.py`
- `scripts/verify_basic_info_seeds.py`
- `db/supabase/config.toml` seed load order

Reset-safe persistence is now the default requirement for new editable local tables. It is not a later cleanup step.

### Key local commands

- `npm install`
- `npm run env:local`
- `npm run env:remote`
- `npm run db:start`
- `npm run db:reset`
- `npm run db:reset:fresh`
- `npm run dev:local`
- `npm run dev:remote`
- `npm run test`
- `npm run test:crm`

## Repo Map

### Main directories

- [`README.md`](/Users/palayapan/Documents/ew-erp/README.md)
  - local setup and command reference
- [`app/`](/Users/palayapan/Documents/ew-erp/app)
  - route entrypoints, page metadata, server actions
- [`components/`](/Users/palayapan/Documents/ew-erp/components)
  - dashboards, dialogs, and module UI logic
- [`lib/supabase/`](/Users/palayapan/Documents/ew-erp/lib/supabase)
  - shared Supabase clients and module-level data helpers
- [`types/`](/Users/palayapan/Documents/ew-erp/types)
  - shared TS types and module metadata
- [`db/supabase/migrations/`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations)
  - schema, RLS, and behavior history
- [`db/supabase/seeds/`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds)
  - reset-restored seed data
- [`scripts/`](/Users/palayapan/Documents/ew-erp/scripts)
  - seed export/verify helpers and import/export utilities
- [`docs/`](/Users/palayapan/Documents/ew-erp/docs)
  - implementation standards and living system documentation

### Recommended reading path for ramp-up

When ramping into an area, read in this order:

1. route page in `app/.../page.tsx`
2. main dashboard or form component in `components/...`
3. `actions.ts` or module API helper
4. related TS types
5. related migrations
6. seed coverage if the page creates local master data expected to survive reset

## Source of Truth Rules

### Schema truth

Database truth lives in:

- migrations
- the actual applied DB schema state

Do not treat screenshots, remembered UI behavior, or old notes as schema truth.

### UI truth

Current UI conventions should follow delivered production-style pages, especially `System Codes` and `Customers`.

Do not treat one-off experiments or placeholder pages as UI standards.

### Workflow truth

Business workflow truth should follow the current database workflow model, especially for inventory.

If current UI behavior conflicts with current DB design, engineers must resolve that conflict explicitly instead of assuming the UI is correct.

### Local persistence truth

If a delivered local CRUD page is expected to survive `npm run db:reset`, it must be represented in:

- seed export
- seed verification
- seed restore/load order

If a new editable table is introduced for normal local development, the implementation is incomplete until all three are updated.

### Milestone truth

Milestone status truth lives in this document, not in chat history, memory, or assumption.

## Naming / Terminology Map

Current naming that may confuse new engineers:

- `Basic Info` is presented in the UI as `System Codes`
- `Customers` belongs under `Partners`
- `/customers*` is now a legacy route surface that redirects to `/partners/customers*`
- `City Logistics Information Management` was renamed to `City Codes`
- `Container Types` was renamed to `Type Codes`
- `Expense Code` and `Revenue Code` pages use business-facing plural naming in the UI

### Inventory terminology note

Inventory currently uses two terms that must not be conflated:

- legacy/current UI table: `inventory`
- target inventory model: `container`, `container_event`, `yard_record`, and related business tables

### Alignment rule

User-facing names, route titles, navigation labels, and terminology in this document must stay aligned. When one changes, the others should be reviewed.

## Common Failure Modes

### RLS or permission errors

Typical symptom:

- `42501 permission denied`
- create or save works on one table but fails on another

Usual causes:

- missing or unapplied migration for browser/public write permissions
- local DB or remote DB is behind current migrations

### Empty pages after reset

Typical symptom:

- UI loads, but shows `0 results`

Usual causes:

- page reads before restored data is visible and needs refresh
- table is not covered by seeds
- local DB was rebuilt and there was no seed data to restore

### Seed verification failure

Typical symptom:

- `db:seed:verify-basic-info` stops `db:reset`

Usual causes:

- local truth and seed truth diverged in an unsafe way
- export logic is incomplete
- table mapping changed but the scripts were not updated
- new seed files were added manually, but export / verify automation has not yet been expanded to manage the same tables

### Data lost after reset

Typical symptom:

- local records disappear after `npm run db:reset`

Usual causes:

- table not included in seed export and verify
- child table not included
- seed order incorrect for FK dependencies

### Schema and code drift

Typical symptom:

- UI expects a field, join, or policy that does not exist in the current DB

Usual causes:

- code written against a later migration that was not applied
- code written from memory instead of reading current migrations

### Inventory model confusion

Typical symptom:

- new inventory work is built on legacy `inventory` assumptions while target logic is defined around `container/container_event/yard_record`

Usual causes:

- not separating current UI reality from target system design
- using legacy UI behavior as workflow truth

## How To Add A New CRUD Page

Use this standard sequence unless there is a strong reason to deviate.

1. define the target table and source-of-truth workflow first
2. confirm whether the page belongs to an existing module and naming pattern
3. add or update migrations if schema, indexes, RLS, or public-write policies are required
4. add the route page under `app/...`
5. add `actions.ts` or a module API helper for list/search/export logic
6. add the dashboard/list component
7. add create/edit/view dialogs or detail pages
8. add export if the page is business-facing and export is expected
9. add reset-safe seed coverage in the same change for any new editable local table
10. run the required smoke-test suite on a migrated local database
11. validate naming, search behavior, pagination behavior, and reset survival
12. update this document if the page changes system truth, milestone status, or conventions

### Reference implementation rule

For new master-data pages, copy the delivered `System Codes` and `Customers` patterns first. These are the repository's current implementation standards.

### Required smoke-test suite

Every new CRUD page must complete a local smoke test before it is called delivered.

Required execution order:

1. run `npm run db:reset`
2. verify the list route loads successfully
3. verify the `new` route loads successfully
4. verify the `view` route loads successfully for a real seeded or newly created row
5. verify the `edit` route loads successfully for a real seeded or newly created row
6. verify create succeeds through the same browser-write path the page actually uses
7. verify edit succeeds through the same browser-write path the page actually uses
8. if the page owns child attachment or link tables, verify those child rows are created or updated correctly
9. verify every declared search field with at least one positive match
10. verify `Reset` restores the unfiltered result set after a filtered search
11. verify filtered export uses the same filters as the list page
12. if export includes attachment-derived data, verify those attachment rows are present in the export data source
13. clean up temporary smoke-test rows unless they are intentionally promoted into managed seed data
14. record the completed coverage in `docs/daily-todo.md`

### Daily regression workflow

Delivered editable pages should also be covered by the repeatable daily regression workflow.

Current required command sequence:

1. `npm run db:start`
2. `npm run dev:local`
3. `npm run db:reset`
4. `npm run test:regression`

If `next dev` is running on a non-default port, the regression command should be run with `EW_ERP_BASE_URL` set to that origin so the route checks hit the real local app instance.

Daily regression execution records belong in [`/Users/palayapan/Documents/ew-erp/docs/daily-regression-log.md`](/Users/palayapan/Documents/ew-erp/docs/daily-regression-log.md). That file is the canonical record for bug findings, fix summaries, verification reruns, and commit history produced by regression work. [`/Users/palayapan/Documents/ew-erp/docs/daily-todo.md`](/Users/palayapan/Documents/ew-erp/docs/daily-todo.md) should only carry planning, blocked items, and next steps.

Current `npm run test:regression` covers:

- dashboard-level UI regression coverage for current `System Codes` dashboards plus delivered editable partner/settings pages
- route availability for all current non-inventory pages
- create and edit through the same local browser-write path used by:
  - `Region Codes`
  - `City Codes`
  - `Company Information`
  - `Expense Codes`
  - `Revenue Codes`
  - `Condition Codes`
  - `Container Number Rules`
  - `Operation Price Configs`
  - `Size Codes`
  - `Type Codes`
  - `Depot Codes`
  - `User Management`
  - `Customers`
  - `Vendors`
  - `Material Vendors`
  - `Lessees`
  - `Container Owners`
- child-table writes where applicable, including `company_bank_accounts`, `depot_additional_costs`, `depot_attachment_links`, and the delivered partner attachment tables
- search coverage for declared filters on the delivered editable page families already wired into regression, including the current `Basic Info` CRUD families
- reset-equivalent recovery to the unfiltered result set
- filtered export data-source validation
- representative `Basic Info` reset-safe restore assertions across company profile, region, city, depot, financial code, condition, size, type, container-number-rule, and operation-price seed tables, plus zero-row assertions for empty managed child tables
- reset-safe persistence regression for `users`, `vendors`, `material_vendors`, `lessees`, `container_owners`, and their attachment child tables
- verification that seed export captures newly created local rows before reset
- verification that those rows still exist after `supabase db reset`
- cleanup of temporary regression rows after the run

Required daily regression loop:

1. run the regression gate
2. log failures in `docs/daily-regression-log.md`
3. fix one bug or one coherent bug batch at a time
4. record root cause, changed files, and fix summary
5. rerun the gate
6. commit fixes only after the gate is green

## Definition of Done For New Master-Data Pages

A page is not done until:

- the list page follows current UI standards
- create, edit, and view flows work
- export exists if the page is business-facing
- RLS and write permissions are verified
- local seed persistence is added in the same change for any new editable local table
- `npm run db:reset` does not silently lose intended local data
- route and navigation labels match the terminology map
- server-side filtering and pagination conventions are followed
- schema, policy, and seed coverage are reflected in this document when introduced
- user-facing naming is consistent and English-first unless business requirements explicitly say otherwise
- the required smoke-test suite has been completed after `npm run db:reset`
- search, reset, and filtered export have been explicitly verified instead of inferred from page rendering
- temporary smoke-test data has been removed or intentionally converted into managed seed data

## Plans and Target State

### Current delivery baseline

Current stable baseline:

- `System Codes` is the main delivered master-data center
- `Container Number Rules` is part of the delivered `System Codes` baseline
- `Partners Center` exists and `Customers` is active
- dedicated standalone partner schema foundations now exist for `vendors`, `material_vendors`, `lessees`, and `container_owners`
- those four partner categories also have repo seed data for local page development and attachment testing
- local reset and seed workflow are part of normal development
- inventory schema work is ahead of inventory frontend delivery

### Target ERP state

The long-term target is one connected ERP covering:

- master data management
- partner management
- inventory lifecycle management
- operational document workflows
- finance and billing support
- reporting and operational dashboards

The intended final state is not a set of isolated CRUD pages. It is a system where master data, partners, inventory, operations, and commercial workflows share one aligned source of truth.

### Milestone roadmap

#### Milestone 1: Stabilize System Codes

Status: `In Progress`

Goal:

- keep `System Codes` as the reference standard for CRUD pages

Modules and tables:

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

Done criteria:

- all delivered pages follow the same UI rules
- export behavior is complete where expected
- RLS and write permissions are consistent
- seed coverage protects intended local data

Notes and risks:

- new fields and child tables can silently break reset persistence if scripts are not updated

#### Milestone 2: Finish Partners

Status: `Planned`

Goal:

- bring partner modules to the same quality bar as `Customers`

Modules and tables:

- `customers`
- `vendors`
- `vendor_attachment_links`
- `material_vendors`
- `material_vendor_attachment_links`
- `lessees`
- `lessee_attachment_links`
- `container_owners`
- `container_owner_attachment_links`

Done criteria:

- `Vendors`, `Lessee`, `Lessor`, `Material Vendors`, and `Container Owners` all have a defined workflow and appropriate CRUD coverage
- naming and navigation stay aligned with the center page
- seed and permission behavior are explicit where needed

Notes and risks:

- only `Lessor` still lacks route-level CRUD delivery on the partner side
- partner categories may need explicit modeling instead of route-only differentiation

#### Milestone 3: Inventory UI Migration Strategy

Status: `Planned`

Goal:

- explicitly decide whether to keep extending the legacy `inventory` UI or migrate the UI toward the event-driven inventory model

Modules and tables:

- `inventory`
- `container`
- `container_event`
- `yard_record`
- transfer / lease / sale business tables

Done criteria:

- inventory source-of-truth workflow is documented and accepted
- UI implementation follows that workflow rather than fighting it
- legacy assumptions are removed or clearly isolated

Notes and risks:

- this is the highest workflow-risk area in the current system

#### Milestone 4: Operations Workflows

Status: `Planned`

Goal:

- build operational document workflows on top of stable inventory and partner foundations

Modules and tables:

- transfer
- lease
- sale
- related business cost and revenue records

Done criteria:

- key operational documents have clear creation, transition, and completion workflows
- inventory state changes are consistent with operations flows

Notes and risks:

- this should not start from unstable inventory assumptions

#### Milestone 5: Finance and Reporting Support

Status: `Planned`

Goal:

- add finance, billing, and reporting layers on top of stable operational truth

Modules and tables:

- revenue and cost support tables
- finance records
- reporting views and exports

Done criteria:

- finance-facing outputs reference stable business truth
- business exports and reporting workflows are consistent across modules

Notes and risks:

- finance and reports should not become a second source of truth for operational state

## Additional Ramp-Up Notes

- `Customers` is the strongest current reference implementation for a delivered business CRUD flow
- `System Codes` is the strongest current reference implementation for repeated master-data patterns
- `Vendors`, `Material Vendors`, `Lessees`, and `Container Owners` now have dedicated standalone partner tables and delivered CRUD page flows
- `User Management` now provides the first delivered `System Settings` CRUD surface on top of the expanded `users` table
- the current inventory UI still depends heavily on the legacy `inventory` table
- inventory target design is broader and more normalized than the current UI suggests
- test coverage exists, but it is currently concentrated around customer flows rather than the full system
- local reset safety depends on seed scripts, not just migrations
- when adding fields to seed-covered tables, engineers should review export and verify scripts in the same change
- when creating a new editable table, engineers should also update `db/supabase/config.toml` seed load order in the same change
- when delivering a new CRUD page, engineers should not stop at route rendering; they must also run create, edit, search, reset, and filtered-export smoke tests
- when a new editable table or child table is added to reset-safe seed coverage, the reset-safe regression workflow should be extended in the same change

## Current Delivery Snapshot

| Area | Current state | Status |
| --- | --- | --- |
| System Codes center | Main delivered master-data center | Delivered |
| Company / Region / City / Depot / financial code pages | Active CRUD reference pages | Delivered |
| Customers | Active partner CRUD reference page | Delivered |
| Vendors | Active partner CRUD page with list, detail tabs, edit flow, and CSV export | Delivered |
| Material Vendors | Active partner CRUD page with list, detail tabs, edit flow, and CSV export | Delivered |
| Lessees | Active partner CRUD page with list, detail tabs, edit flow, and CSV export | Delivered |
| Container Owners | Active partner CRUD page with list, detail tabs, edit flow, and CSV export | Delivered |
| Lessor | Route structure exists, detailed CRUD not built | Scaffold Only |
| Inventory schema | Event-driven target model exists in DB design | Schema Ahead of UI |
| Inventory UI | Command center exists but still leans on legacy `inventory` | Partially Delivered |
| System Settings | `User Management` delivered under `/settings/users`; broader settings surface still limited | Partially Delivered |

## Reference Implementations

Open these first when you need a working example:

- center-page overview pattern:
  - [`app/basic-info/page.tsx`](/Users/palayapan/Documents/ew-erp/app/basic-info/page.tsx)
  - [`lib/supabase/basic-info-api.ts`](/Users/palayapan/Documents/ew-erp/lib/supabase/basic-info-api.ts)
- master-data CRUD pattern:
  - [`app/basic-info/companies/actions.ts`](/Users/palayapan/Documents/ew-erp/app/basic-info/companies/actions.ts)
  - [`components/basic-info/company-profiles-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/basic-info/company-profiles-dashboard.tsx)
- partner CRUD pattern:
  - [`app/customers/actions.ts`](/Users/palayapan/Documents/ew-erp/app/customers/actions.ts)
  - [`components/customers/customers-dashboard.tsx`](/Users/palayapan/Documents/ew-erp/components/customers/customers-dashboard.tsx)
- seed-covered reset workflow:
  - [`scripts/export_basic_info_seeds.py`](/Users/palayapan/Documents/ew-erp/scripts/export_basic_info_seeds.py)
  - [`scripts/verify_basic_info_seeds.py`](/Users/palayapan/Documents/ew-erp/scripts/verify_basic_info_seeds.py)

## Doc Maintenance Rules

This file should be updated when:

- a milestone is completed
- schema truth changes materially
- naming or workflow conventions change
- a scaffold-only module becomes active
- a new page becomes part of the reference implementation standard
- reset-safe seed coverage expands to new tables or child tables
- smoke-test expectations or required verification scope changes

Maintenance expectations:

- do not wait for a large rewrite; make small truth-preserving updates
- prefer current code and migrations over memory
- update milestone status in the same change when a milestone materially advances
- if a migration changes workflow assumptions, update the workflow sections, not only the schema notes
- if a page is marked delivered, its smoke-test coverage should already be recorded in `docs/daily-todo.md`
- if a page family is part of the daily regression scope, the command and expected coverage should stay current in `README.md` and this document

## Module Docs

The current module-level truth lives in:

- [`docs/modules/system-codes.md`](/Users/palayapan/Documents/ew-erp/docs/modules/system-codes.md)
- [`docs/modules/partners.md`](/Users/palayapan/Documents/ew-erp/docs/modules/partners.md)

Global vs module documentation rule:

- this global document tracks cross-module system truth, shared standards, and milestone status
- module documents track module-specific workflow, schema notes, references, risks, and delivery status
- daily execution planning does not belong in module docs; it belongs in the rolling daily tracker

### Global doc vs module doc rule

The documentation model for this repository is:

- one global system document for cross-module truth
- one module document for each module that becomes materially implemented

This global document should maintain:

- system-wide architecture
- shared workflow rules
- UI standards
- local development workflow
- source-of-truth rules
- naming and terminology alignment
- milestone roadmap and cross-module delivery status
- current delivery snapshot across the whole ERP

Module documents should be created when a module becomes active implementation work or reaches a meaningful delivery milestone.

Each module document should maintain:

- module purpose and scope
- module-specific workflow
- module-specific table and schema notes
- key routes, components, and actions
- module-specific failure modes
- known gaps and pending work
- module milestone status and changelog

### Module doc creation guideline

Create a dedicated module document when:

- a scaffold-only module begins real implementation
- a module gains enough workflow complexity that the global doc would become noisy
- a module has workflow, schema, or operational rules that need deeper explanation than the global doc should carry

Recommended examples:

- `docs/modules/system-codes.md`
- `docs/modules/partners.md`
- `docs/modules/inventory.md`
- future module docs for operations, finance, or settings when those modules become real implementation surfaces

### Update policy

When a change lands:

- update the global doc if the change affects system-wide truth, delivery status, standards, or roadmap
- update the module doc if the change affects module workflow, schema expectations, references, or milestone status
- update both if the change affects both module truth and overall system truth

Preferred maintenance pattern:

- finish the module work
- update the relevant module doc in the same change when practical
- reflect the resulting milestone or delivery-state change in the global doc

### Daily Planning and Action-Item Tracking

The canonical rolling daily tracker is:

- [`docs/daily-todo.md`](/Users/palayapan/Documents/ew-erp/docs/daily-todo.md)

This daily tracker is used for:

- day-by-day planning
- active execution priorities
- unresolved or carried-forward action items from conversations
- short operational status tracking

This daily tracker is not used for:

- system architecture truth
- schema source of truth
- module design documentation
- milestone status truth

### Daily tracker states

Items in the daily tracker should use these states:

- `Planned`
- `In Progress`
- `Blocked`
- `Done`
- `Carried Forward`

### AI definition

In this repository, `AIs` means `Action Items`.

### Conversation action-item resolution rule

Every conversation-generated action item must end in exactly one of these states:

- `Resolved`
- `Deferred`
- `Carried Forward`

Rules:

- no conversation should be treated as cleanly closed while it contains unclassified action items
- if an action item is not resolved in the same conversation, it must be recorded in the daily tracker
- every carried-forward action item in the daily tracker must include:
  - source conversation or topic
  - owner
  - next concrete step

### When to update the daily tracker

Update the rolling daily tracker when:

- a conversation creates new action items
- planned work for the day changes materially
- an item becomes blocked
- an item is completed
- an item must be carried forward to the next day

### Relationship between docs

Use the three document layers like this:

- global doc: cross-system truth and milestone status
- module docs: module truth and module delivery state
- daily tracker: daily plan and action-item execution status

## Canonical Paths

These paths anchor current system truth:

- [`/Users/palayapan/Documents/ew-erp/README.md`](/Users/palayapan/Documents/ew-erp/README.md)
- [`/Users/palayapan/Documents/ew-erp/app`](/Users/palayapan/Documents/ew-erp/app)
- [`/Users/palayapan/Documents/ew-erp/components`](/Users/palayapan/Documents/ew-erp/components)
- [`/Users/palayapan/Documents/ew-erp/lib/supabase`](/Users/palayapan/Documents/ew-erp/lib/supabase)
- [`/Users/palayapan/Documents/ew-erp/types`](/Users/palayapan/Documents/ew-erp/types)
- [`/Users/palayapan/Documents/ew-erp/db/supabase/migrations`](/Users/palayapan/Documents/ew-erp/db/supabase/migrations)
- [`/Users/palayapan/Documents/ew-erp/db/supabase/seeds`](/Users/palayapan/Documents/ew-erp/db/supabase/seeds)
- [`/Users/palayapan/Documents/ew-erp/scripts`](/Users/palayapan/Documents/ew-erp/scripts)

## Changelog

- `2026-03-31` — Initial in-repo living system design and ramp-up document created from current codebase, schema, seed workflow, and external onboarding doc.
- `2026-04-01` — Added standalone partner schema foundations and test-data seeds for `vendors`, `material_vendors`, `lessees`, and `container_owners`; updated system truth to mark them schema-ready but not page-delivered.
- `2026-04-02` — Delivered the new `/partners/vendors` CRUD surface with Depot-style list/detail presentation, tabbed vendor detail/edit pages, and CSV export.
