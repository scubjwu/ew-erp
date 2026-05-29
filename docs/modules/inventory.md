# Inventory Modules

## Purpose

This document records the current truth for the repository's two inventory-facing surfaces:

- delivered `Depot Inventory`
- legacy `In-Transit Inventory`

These two surfaces should not be treated as interchangeable.

## Current Scope

### Depot Inventory

Delivered route family:

- `/depot-inventory`
- `/depot-inventory/summary-for-dispatch`
- `/depot-inventory/sales-availability`

### Legacy In-Transit Inventory

Legacy route:

- `/inventory/center`

## Current Design And Workflow

### Depot Inventory

`Depot Inventory` is the active operational inventory module.

Delivered surfaces:

1. container list
   - route: [`app/depot-inventory/page.tsx`](/Users/palaya/Documents/ew-erp/app/depot-inventory/page.tsx)
2. dispatch availability summary
   - route: [`app/depot-inventory/summary-for-dispatch/page.tsx`](/Users/palaya/Documents/ew-erp/app/depot-inventory/summary-for-dispatch/page.tsx)
3. sales availability summary
   - route: [`app/depot-inventory/sales-availability/page.tsx`](/Users/palaya/Documents/ew-erp/app/depot-inventory/sales-availability/page.tsx)

Current delivery truth:

- depot inventory is already part of the live workflow between purchase output and dispatch/sales planning
- summary pages are grouped operational views rather than copies of the raw container list
- depot inventory code now reads newer workflow fields including `yom`

Primary references:

- [`app/depot-inventory/actions.ts`](/Users/palaya/Documents/ew-erp/app/depot-inventory/actions.ts)
- [`components/depot-inventory/depot-inventory-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/depot-inventory/depot-inventory-dashboard.tsx)
- [`components/depot-inventory/depot-dispatch-summary-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/depot-inventory/depot-dispatch-summary-dashboard.tsx)
- [`components/depot-inventory/depot-sales-availability-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/depot-inventory/depot-sales-availability-dashboard.tsx)

### Legacy In-Transit Inventory

`Inventory Command Center` still exists at [`app/inventory/center/page.tsx`](/Users/palaya/Documents/ew-erp/app/inventory/center/page.tsx).

Current truth:

- it remains a large legacy UI surface
- it should not be treated as the workflow truth for newer purchase, depot-inventory, or dispatch work
- engineers must distinguish between "legacy inventory UI behavior" and "current operational availability behavior"

Primary references:

- [`components/inventory/inventory-command-center.tsx`](/Users/palaya/Documents/ew-erp/components/inventory/inventory-command-center.tsx)

## Data And Workflow Truth

Important current distinction:

- `Depot Inventory` is the active read model for on-yard operational availability
- legacy `Inventory Command Center` is still supported UI, but not the reference model for newer dispatch-aware workflow changes

Current workflow dependencies:

- purchase feeds depot inventory
- depot inventory feeds dispatch availability and sales availability
- dispatch consumes depot inventory buckets and selectable containers

## Schema Notes

Current repo code reflects a more modern workflow centered on:

- `container`
- purchase-derived container state
- dispatch-aware availability summaries

Important current schema fact:

- `container.yom` exists in repo migrations and is surfaced through newer depot-inventory code paths

Relevant migration reference:

- [`db/supabase/migrations/20260525203000_container_yom.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260525203000_container_yom.sql)

## Engineering Guidance

When working in inventory-adjacent code:

- do not assume `/inventory/center` represents the latest business workflow
- check whether the feature belongs to legacy inventory, depot inventory, purchase, or dispatch before editing
- if a change affects dispatch availability or sales availability, inspect `app/depot-inventory/actions.ts` before touching UI components alone
