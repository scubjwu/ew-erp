# EW ERP Testing Requirements

## Purpose

This document is the canonical testing requirement for all EW ERP development work.

Use it to decide:

- what tests are mandatory before a change is considered done
- which extra tests are required for a touched module or workflow
- when a green shared regression gate is not enough
- what testing evidence must be recorded in review, handoff, or regression notes

This document defines the minimum required testing bar. Teams may run more coverage, but they must not run less.

## Core Rule

A change is not done when the code compiles, the page renders, or one manual click path looks correct.

A change is only done when all of the following are true:

1. the touched behavior has a repeatable verification path
2. the required automated tests and regression commands for that change have been run
3. any missing coverage has been explicitly called out and accepted as a follow-up
4. docs and workflow truth remain aligned with the delivered behavior

## Required Testing Layers

Every meaningful change must be evaluated across these layers when relevant:

1. unit or component behavior
- UI logic
- field mapping
- query-helper logic
- conditional rendering

2. module regression behavior
- list/search/pagination/export behavior
- create/edit/view route availability
- browser-write parity through the same Supabase/RLS path used by the app

3. reset-safe and seed behavior
- seed export
- seed verify
- seed load order
- restore after `supabase db reset`

4. workflow-specific verification
- the real touched path for the changed feature
- not just a nearby path that happens to stay green

## Required Baseline For Every Change

Unless there is a documented exception, every change must satisfy the following baseline:

1. run the smallest targeted automated tests that directly cover the touched code
2. run `npm run test:regression` if the change affects any delivered page, route, schema, seed, RLS policy, export path, or shared query/data helper
3. run `npm run db:reset` if the change affects migrations, seeds, RLS, or reset-sensitive data behavior
4. verify the touched route or workflow manually if the changed behavior is primarily UI wiring and no adequate automated browser-path test exists yet

If a developer skips any applicable item above, the change is not ready to call done.

## Module-Specific Requirements

### System Codes

Changes under delivered `System Codes` page families must run:

- `npm run test:regression`
- `npm run db:reset` when migrations, RLS, seed files, or reset-sensitive tables are touched

If the change affects dialog or form wiring not directly covered by current regression scripts, the developer must also manually verify create, edit, search, reset, and filtered export on the touched page.

### Customers

Changes to customer form behavior, field mapping, validation, or detail/edit flow must run:

- `npm run test:crm`
- `npm run test:regression`

If the change affects customer schema, seed behavior, or reset-sensitive supporting tables, also run:

- `npm run db:reset`

### Vendors, Material Vendors, Lessees, Container Owners, Users

Changes to delivered partner/settings CRUD page families must run:

- `npm run test:regression`

If the change affects complex edit-page wiring, tab behavior, attachment handling, or form serialization that is not directly covered by current automated tests, the developer must also manually verify the touched create/edit/detail flow.

### Purchase

Changes to delivered Purchase UI, query, detail, create, or edit behavior must run:

- `./node_modules/.bin/vitest run __tests__/purchase-orders-dashboard.test.tsx __tests__/purchase-order-detail.test.tsx __tests__/purchase-query-helpers.test.ts`
- `npm run test:regression`

If the touched behavior is in a Purchase create/edit path whose critical user flow is not yet covered by adequate browser-path automation, the developer must also manually verify the touched route and record what was exercised.

Changes to Purchase schema, derived finance sync, seeds, reset-safe behavior, or RAL lookup behavior must also run:

- `npm run db:reset`
- `npm run test:regression:reset-safe`

Important current rule:

- Purchase targeted vitests are required even though they are not yet included in the shared `npm run test:regression` command
- starting with Milestone 3, Purchase is no longer treated as a read-only exception when applying testing requirements

### Inventory

Inventory is not the target model for future Purchase work, but any code change to current inventory UI must still include a repeatable verification path.

At minimum:

- run the smallest targeted automated tests that exist for the touched area
- manually verify the touched inventory route and affected behavior

If no automated coverage exists, the lack of coverage must be called out explicitly in review.

## New Table Or Schema Change Requirements

Any change that introduces or materially changes an editable table, child table, or trigger-derived business table must include all relevant verification in the same change:

1. `npm run db:reset`
2. `python3 scripts/export_basic_info_seeds.py`
3. `python3 scripts/verify_basic_info_seeds.py`
4. `npm run test:regression:reset-safe`
5. `npm run test:regression`

The change is incomplete if any reset-sensitive table is added without updating:

- seed export
- seed verify
- seed load order
- reset-safe fixture creation
- restore assertions

## Shared Regression Gate

Current shared gate:

```bash
npm run test:regression
```

Current coverage inside that gate includes:

- dashboard-level vitest coverage for delivered `System Codes` dashboards and delivered partner/settings dashboards
- route and datasource regression coverage in `scripts/run_local_regression.mjs`
- reset-safe restore coverage in `scripts/run_reset_safe_regression.mjs`

Current limitation:

- a green shared gate does not replace targeted tests for touched `Customers` form behavior or delivered `Purchase` UI/query behavior

Developers must not treat `npm run test:regression` as the only required command when they touch one of those areas.

## Manual Verification Requirement

Manual verification is required when either of the following is true:

- the touched behavior is primarily UI wiring and there is no adequate automated browser-path coverage yet
- the change modifies a user-facing workflow whose critical path is not exercised by the existing automated suite

Manual verification should be specific. Do not write vague notes such as `smoke tested`.

Good verification notes include:

- touched route
- action performed
- expected result observed

## Coverage Gaps And Exceptions

If coverage is missing, the developer must classify it explicitly:

- `Accepted temporary gap`: the change is otherwise safe, but current automation does not yet cover the path
- `Blocking gap`: the missing test leaves correctness too uncertain to merge safely

Rules:

- non-blocking gaps must be recorded as follow-up work
- blocking gaps must be fixed before the change is considered done
- do not hide missing coverage inside summary prose

## Required Evidence In Handoffs And Reviews

Every implementation handoff, review summary, or regression note for code changes should state:

- commands run
- whether they passed or failed
- what manual verification was done
- any remaining testing gap

Short example:

```md
Testing:
- `npm run test:crm`
- `npm run test:regression`
- Manual: verified `/partners/customers/[id]/edit` saves primary contact email into `purchasing_emails[0]`
- Residual gap: no browser E2E coverage for customer certificate-link editing yet
```

## Definition Of Done

A change is not done until:

- required targeted tests have been run
- required regression and reset-safe commands have been run when applicable
- touched workflows without adequate automation have been manually verified
- missing coverage has been called out explicitly
- relevant docs are updated when workflow or system truth changed
