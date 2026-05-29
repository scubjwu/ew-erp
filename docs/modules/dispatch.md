# Dispatch Module

## Purpose

This document tracks the current design, workflow, schema surface, implementation status, and maintenance rules for the `Dispatch` module.

`Dispatch` is now a delivered workflow area rather than just a future schema concept.

## Scope

Delivered child route families under `/dispatch`:

- `/dispatch/one-way-planning`
- `/dispatch/dispatch-release`

Important current routing truth:

- there is no standalone `/dispatch` landing page yet

## Current Design And Workflow

### Module shape

The delivered dispatch area has two connected workflows:

1. `One Way Planning`
   - demand/planning records with create, edit, detail, import, and conversion-aware management
2. `Dispatch Release Management`
   - operational release workflow built from depot availability buckets and purchase-source inventory

### Current workflow relationship

Current dispatch workflow is connected to the rest of the system like this:

1. purchase creates source stock and availability context
2. depot-inventory summary routes expose dispatchable buckets
3. one-way plans represent planning demand and conversion state
4. dispatch release create/edit flows select buckets, lessees, and container sets
5. release persistence writes dispatch-facing order data and revalidates related depot and planning surfaces

## One Way Planning

Delivered one-way-planning routes:

- `/dispatch/one-way-planning`
- `/dispatch/one-way-planning/new`
- `/dispatch/one-way-planning/[id]`
- `/dispatch/one-way-planning/[id]/edit`
- `/dispatch/one-way-planning/import`

Current delivery truth:

- management page is delivered
- create, detail, edit, and import flows are delivered
- plan status, conversion status, and release-source behavior are first-class concepts in code

Primary references:

- [`app/dispatch/one-way-planning/page.tsx`](/Users/palaya/Documents/ew-erp/app/dispatch/one-way-planning/page.tsx)
- [`app/dispatch/one-way-planning/actions.ts`](/Users/palaya/Documents/ew-erp/app/dispatch/one-way-planning/actions.ts)
- [`components/dispatch/one-way-planning-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/dispatch/one-way-planning-dashboard.tsx)
- [`types/one-way-planning.ts`](/Users/palaya/Documents/ew-erp/types/one-way-planning.ts)

## Dispatch Release Management

Delivered dispatch-release routes:

- `/dispatch/dispatch-release`
- `/dispatch/dispatch-release/create`
- `/dispatch/dispatch-release/[id]`
- `/dispatch/dispatch-release/[id]/edit`

Current delivery truth:

- management page is delivered
- detail page is delivered
- create and edit flows are delivered
- release creation is driven by depot-dispatch availability buckets and optional one-way-plan context
- dispatch release flows depend on lessee options, source purchase items, currency handling, and selected-container persistence

Primary references:

- [`app/dispatch/dispatch-release/page.tsx`](/Users/palaya/Documents/ew-erp/app/dispatch/dispatch-release/page.tsx)
- [`app/dispatch/dispatch-release/create/page.tsx`](/Users/palaya/Documents/ew-erp/app/dispatch/dispatch-release/create/page.tsx)
- [`app/dispatch/dispatch-release/[id]/edit/page.tsx`](/Users/palaya/Documents/ew-erp/app/dispatch/dispatch-release/[id]/edit/page.tsx)
- [`app/dispatch/actions.ts`](/Users/palaya/Documents/ew-erp/app/dispatch/actions.ts)
- [`components/dispatch/dispatch-release-builder.tsx`](/Users/palaya/Documents/ew-erp/components/dispatch/dispatch-release-builder.tsx)
- [`types/dispatch-release.ts`](/Users/palaya/Documents/ew-erp/types/dispatch-release.ts)

## Data And Schema Surface

Primary dispatch-facing tables currently visible in repo workflows:

- `one_way_plan`
- `transfer_order`
- `transfer_order_attachment_links`
- `financial_exchange_rate`

Important current schema relationships:

- `one_way_plan` is linked to `lessees`, `depots`, `cities`, size/type/condition codes, and optional `ral_color_codes`
- dispatch release logic depends on purchase-source rows and depot availability views of container stock
- currency conversion and finance display logic depend on `financial_exchange_rate`

Important migration references:

- [`db/supabase/migrations/20260512100000_one_way_plan_milestone1.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260512100000_one_way_plan_milestone1.sql)
- [`db/supabase/migrations/20260517142000_one_way_plan_depot_nullable.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260517142000_one_way_plan_depot_nullable.sql)
- [`db/supabase/migrations/20260517170000_one_way_plan_conversion_fields.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260517170000_one_way_plan_conversion_fields.sql)
- [`db/supabase/migrations/20260517193000_one_way_plan_machine_type.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260517193000_one_way_plan_machine_type.sql)
- [`db/supabase/migrations/20260426153000_transfer_order_dispatch_release_fields.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260426153000_transfer_order_dispatch_release_fields.sql)
- [`db/supabase/migrations/20260510143000_dispatch_release_financial_exchange_rates_step1.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260510143000_dispatch_release_financial_exchange_rates_step1.sql)

## Related Module Dependencies

Dispatch is tightly coupled to:

- `Depot Inventory`
  - availability buckets and selectable containers
- `Purchase`
  - source purchase orders and items
- `System Codes`
  - conditions, size/type, depots, cities, exchange rates
- `Partners`
  - lessees and related partner references

## Testing And Verification Notes

When touching dispatch behavior, engineers should not assume route existence alone proves the workflow is safe.

At minimum, verify:

- management route load
- create/edit/detail route load
- bucket selection and source-context prefill behavior when touched
- related depot-inventory or one-way-plan revalidation when touched

If a change affects schema, seed expectations, or cross-module bucket math, treat it as a broader workflow change rather than a local page tweak.
