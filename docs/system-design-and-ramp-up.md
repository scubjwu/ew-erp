# EW ERP System Design and Ramp-Up

## Purpose

This document is the living system design, workflow, and onboarding reference for the EW ERP codebase.

Its job is to keep engineers, designers, and operators aligned on:

- what is actually delivered today
- which routes and modules are real versus scaffold-only
- how data, schema, and workflow truth are organized
- how local reset-safe development works
- which UI and testing patterns are now considered standard

This document must be updated whenever delivered module scope, schema truth, or workflow truth changes materially.

## Current System Design and Workflow

### Product shape today

The application is a `Next.js` App Router ERP frontend backed by `Supabase/Postgres`.

Current user-visible navigation groups in [`components/erp/erp-app-shell.tsx`](/Users/palaya/Documents/ew-erp/components/erp/erp-app-shell.tsx):

- `Purchase`
- `Sales`
- `Dispatch`
- `Depot Inventory`
- `In-Transit Inventory`
- `Partners`
- `System Codes`
- `System Settings`

Current landing route:

- `/` redirects to `/basic-info`
- in the UI, `/basic-info` is presented as `System Codes`

Important current routing truth:

- `Purchase` has a delivered root route at `/purchase` that redirects to `/purchase/po-management`
- `Dispatch` is a delivered navigation group with delivered child routes, but there is currently no standalone `/dispatch` landing page
- `Sales` currently exists in navigation metadata only; there is no delivered `/sales` route family in the repository yet

### Delivered reality vs target state

Current delivery reality:

- `System Codes` remains the most mature CRUD reference module
- `Partners` is now mostly delivered, with `Customers`, `Vendors`, `Material Vendors`, `Lessees`, and `Container Owners` all live as dedicated page families
- `Lessor` remains the only partner section that is still placeholder-only
- `Purchase` is a delivered transaction module centered on `PO Management`
- `Dispatch` now has delivered `One Way Planning` and `Dispatch Release Management` route families
- `Depot Inventory` is now a real operational module with:
  - container list
  - dispatch availability summary
  - sales availability summary
- legacy `Inventory Command Center` still exists, but it remains distinct from the newer depot-inventory and dispatch-driven workflow

Target state:

- the system should become a connected ERP, not a collection of unrelated CRUD pages
- master data, partners, inventory, purchase, dispatch, and finance should eventually share one aligned workflow and terminology model

## Delivered Module Map

### System Codes

Business-facing route family: `/basic-info`

Delivered areas:

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

Implementation pattern:

1. route page under `app/basic-info/.../page.tsx`
2. server-side actions in matching `actions.ts`
3. dashboard/list components under `components/basic-info/`
4. create/edit/view dialogs
5. migration-managed schema, grants, and RLS
6. seed export and verify coverage where reset survival matters

Primary references:

- [`docs/modules/system-codes.md`](/Users/palaya/Documents/ew-erp/docs/modules/system-codes.md)
- [`types/basic-info.ts`](/Users/palaya/Documents/ew-erp/types/basic-info.ts)
- [`lib/supabase/basic-info-api.ts`](/Users/palaya/Documents/ew-erp/lib/supabase/basic-info-api.ts)

### Partners

Business-facing route family: `/partners`

Delivered areas:

- Customers
- Vendors
- Material Vendors
- Lessee
- Container Owners

Scaffold-only area:

- Lessor

Current partner delivery truth:

- legacy `/customers*` routes redirect into `/partners/customers*`
- each delivered standalone partner master table now has its own route family, list, create, view, edit, and export flow
- delivered partner pages follow the same broad list/search/export/form pattern as `System Codes`, but with richer detail pages and attachment flows

Primary references:

- [`docs/modules/partners.md`](/Users/palaya/Documents/ew-erp/docs/modules/partners.md)
- [`types/partners.ts`](/Users/palaya/Documents/ew-erp/types/partners.ts)
- [`lib/supabase/partners-api.ts`](/Users/palaya/Documents/ew-erp/lib/supabase/partners-api.ts)

### Purchase

Business-facing route family: `/purchase`

Current route truth:

- `/purchase` redirects to `/purchase/po-management`
- `/purchase/po-management` is the delivered management page
- delivered child routes include:
  - `/purchase/po-management/[id]`
  - `/purchase/po-management/[id]/edit`
  - `/purchase/po-management/new`
  - `/purchase/po-management/[id]/items/[itemId]/containers`

Current delivery truth:

- management, detail, create, and edit flows are delivered
- purchase editing is governed by delivered `purchaseType + orderStatus` permission rules
- finance-support fields and derived sync with `purchase_finance_record` are part of the delivered workflow
- container-level editing and bulk update are delivered inside the purchase route family

Primary references:

- [`docs/modules/purchase.md`](/Users/palaya/Documents/ew-erp/docs/modules/purchase.md)
- [`types/purchase.ts`](/Users/palaya/Documents/ew-erp/types/purchase.ts)
- [`app/purchase/po-management/actions.ts`](/Users/palaya/Documents/ew-erp/app/purchase/po-management/actions.ts)

### Dispatch

Business-facing route family: delivered child routes under `/dispatch`

Current route truth:

- there is no standalone `/dispatch` landing page
- delivered route families are:
  - `/dispatch/one-way-planning`
  - `/dispatch/dispatch-release`

Current delivery truth:

- `One Way Planning` has delivered management, detail, create, edit, and import routes
- `Dispatch Release Management` has delivered management, detail, create, and edit routes
- dispatch create/edit flows are tightly coupled to depot availability buckets and one-way-plan conversion state

Primary references:

- [`docs/modules/dispatch.md`](/Users/palaya/Documents/ew-erp/docs/modules/dispatch.md)
- [`types/one-way-planning.ts`](/Users/palaya/Documents/ew-erp/types/one-way-planning.ts)
- [`types/dispatch-release.ts`](/Users/palaya/Documents/ew-erp/types/dispatch-release.ts)
- [`app/dispatch/actions.ts`](/Users/palaya/Documents/ew-erp/app/dispatch/actions.ts)
- [`app/dispatch/one-way-planning/actions.ts`](/Users/palaya/Documents/ew-erp/app/dispatch/one-way-planning/actions.ts)

### Depot Inventory And Legacy Inventory

The repository now contains two different inventory-facing surfaces that engineers must keep separate.

Delivered operational route family: `/depot-inventory`

Delivered depot-inventory routes:

- `/depot-inventory`
- `/depot-inventory/summary-for-dispatch`
- `/depot-inventory/sales-availability`

Legacy route family:

- `/inventory/center`

Current distinction:

- `Depot Inventory` is the active operational bridge between purchase, depot stock, dispatch availability, and sales availability
- `Inventory Command Center` still exists as a separate legacy surface and should not be treated as the workflow truth for newer purchase/dispatch work

Primary references:

- [`docs/modules/inventory.md`](/Users/palaya/Documents/ew-erp/docs/modules/inventory.md)
- [`app/depot-inventory/actions.ts`](/Users/palaya/Documents/ew-erp/app/depot-inventory/actions.ts)
- [`types/depot-inventory.ts`](/Users/palaya/Documents/ew-erp/types/depot-inventory.ts)

### System Settings

Business-facing route family: `/settings`

Current delivered area:

- `User Management` under `/settings/users`

Current delivery truth:

- `System Settings` currently acts as a small admin module rather than a broad settings platform
- `User Management` follows the list/create/view/edit pattern and depends on the business `users` table rather than direct auth-user administration

## Frontend And Backend Interaction Pattern

Current system interaction mostly follows this pattern:

1. route page
   - entrypoint under `app/.../page.tsx`
2. dashboard or list component
   - module UI under `components/...`
3. server actions or module API
   - list/search/export commonly lives in `actions.ts`
   - module overview counts commonly live in `lib/supabase/*-api.ts`
4. Supabase access
   - server-side client for query-heavy read flows
   - browser-side client for CRUD flows that use current public-write and RLS coverage
5. schema and persistence support
   - migrations define tables, policies, constraints, triggers, and derivation rules
   - seeds and reset-safe scripts preserve selected business data across local resets
6. canonical routing
   - legacy routes may redirect into a newer module-owned family
   - current example: `/customers*` resolves under `/partners/customers*`

## Current Database And Schema Truth

### Core repository schema sources

- [`db/supabase/migrations/`](/Users/palaya/Documents/ew-erp/db/supabase/migrations)
- [`db/full_schema.sql`](/Users/palaya/Documents/ew-erp/db/full_schema.sql)
- [`db/remote_full_schema.sql`](/Users/palaya/Documents/ew-erp/db/remote_full_schema.sql)

### Current table families that matter most to application work

Master data:

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
- `ral_color_codes`

Partners and settings:

- `customers`
- `customer_certificate_links`
- `users`
- `vendors`
- `vendor_attachment_links`
- `material_vendors`
- `material_vendor_attachment_links`
- `lessees`
- `lessee_attachment_links`
- `container_owners`
- `container_owner_attachment_links`

Purchase and dispatch-facing workflow:

- `purchase_order`
- `purchase_order_item`
- `purchase_order_container`
- `purchase_order_item_attachment_links`
- `purchase_order_material_type`
- `purchase_finance_record`
- `one_way_plan`
- `transfer_order`
- `transfer_order_attachment_links`
- `container`

Important current schema facts reflected in code:

- `financial_exchange_rate` is now a first-class system-maintained table with a delivered UI under `System Codes`
- `one_way_plan` is a delivered workflow table used by `Dispatch`
- `container.yom` now exists in the repo migration history and is consumed by purchase and depot-inventory code paths
- `ral_color_codes` is an enforced lookup used in purchase and dispatch-related flows, even though it is not maintained through a dedicated `System Codes` page

## Local Development, Reset Safety, And Testing

Current local development workflow is centered on local `Supabase`.

Primary references:

- [`README.md`](/Users/palaya/Documents/ew-erp/README.md)
- [`docs/testing-requirements.md`](/Users/palaya/Documents/ew-erp/docs/testing-requirements.md)
- [`docs/daily-regression-log.md`](/Users/palaya/Documents/ew-erp/docs/daily-regression-log.md)

Reset-safe workflow truth:

- `npm run db:reset` exports selected business data into managed seed files before reset
- seed order is controlled in [`db/supabase/config.toml`](/Users/palaya/Documents/ew-erp/db/supabase/config.toml)
- export and verify logic lives in:
  - [`scripts/export_basic_info_seeds.py`](/Users/palaya/Documents/ew-erp/scripts/export_basic_info_seeds.py)
  - [`scripts/verify_basic_info_seeds.py`](/Users/palaya/Documents/ew-erp/scripts/verify_basic_info_seeds.py)

Current reset-safe seed coverage includes:

- core `System Codes` master data
- `users`
- delivered partner master-data tables and attachment tables
- purchase tables
- `one_way_plan`

Testing truth:

- the shared daily gate is still `npm run test:regression`
- purchase also has targeted vitests and purchase-specific browser coverage requirements
- delivered modules with schema, seed, or RLS changes must be evaluated through both code-level tests and reset-safe verification

## Current System-Level Truth Added On `2026-05-25`

- repository navigation now reflects a broader system than the older docs described:
  - `Purchase`
  - `Dispatch`
  - `Depot Inventory`
  - legacy `In-Transit Inventory`
  - `Partners`
  - `System Codes`
  - `System Settings`
  - scaffold-only `Sales`
- `Dispatch` is no longer just schema-prep work; the repository contains delivered `One Way Planning` and `Dispatch Release Management` routes, dashboards, builders, and actions
- `Depot Inventory` is now the active availability and operational stock surface that connects purchase output to dispatch and sales planning
- `Partners` delivery has advanced beyond the older docs: all partner categories except `Lessor` now have dedicated delivered page families
- `financial_exchange_rate` and `container.yom` are now part of the repository's concrete schema and code paths
- newer workflow truth should be read from route files, actions, type definitions, and module docs rather than assuming the older ramp-up narrative is still complete

## UI Standards

Canonical UX planning and design rules are defined in [`docs/ux/ux-principles.md`](/Users/palaya/Documents/ew-erp/docs/ux/ux-principles.md).

Supporting UX references are:

- [`docs/ux/README.md`](/Users/palaya/Documents/ew-erp/docs/ux/README.md)
- [`docs/ux/information-architecture.md`](/Users/palaya/Documents/ew-erp/docs/ux/information-architecture.md)
- [`docs/ux/task-flows.md`](/Users/palaya/Documents/ew-erp/docs/ux/task-flows.md)
- [`docs/ux/page-standards.md`](/Users/palaya/Documents/ew-erp/docs/ux/page-standards.md)

Current UI standards that show up repeatedly in delivered modules:

- compact ERP-style list pages
- sticky headers and sticky action columns where useful
- business-code-forward display in management tables
- server-driven list/search/filter/export flows
- dialog-driven CRUD for master data
- form-page-driven CRUD for larger transactional workflows
- autocomplete-heavy filter and input patterns in purchase, dispatch, and depot inventory

All future plan, design, and development work should follow the UX principles together with the current module docs and route-level implementation truth.
