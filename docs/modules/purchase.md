# Purchase Module

## Purpose

This document tracks the current design, workflow, schema surface, implementation status, and maintenance rules for the `Purchase` module.

`Purchase` is the repository's primary delivered transaction module.

## Scope

Business-facing route family:

- `/purchase`

Current routing truth:

- `/purchase` redirects to `/purchase/po-management`

Delivered purchase routes:

- `/purchase/po-management`
- `/purchase/po-management/new`
- `/purchase/po-management/[id]`
- `/purchase/po-management/[id]/edit`
- `/purchase/po-management/[id]/items/[itemId]/containers`

## Current Design And Workflow

### Module shape

The delivered purchase flow has five major surfaces:

1. management page
   - server-side filtering, sorting, pagination, summary cards, and export
2. detail page
   - purchase-order, item, and finance detail at the order level
3. create page
   - full purchase-order creation with item and container support
4. edit page
   - status-aware editing with field-level workflow restrictions
5. container drill-down
   - item container detail and editing support

### Current implementation pattern

The current purchase pattern is:

1. route page under `app/purchase/po-management/...`
2. query, persistence, export, and derived-sync logic in `actions.ts`
3. page-level forms and dashboards under `components/purchase/`
4. behavior and workflow constraints expressed in [`types/purchase.ts`](/Users/palaya/Documents/ew-erp/types/purchase.ts)
5. migration-backed schema and status logic in `db/supabase/migrations/`
6. seed export, seed verify, reset-safe regression, and purchase-specific tests

## Current Delivery Status

Delivered behavior includes:

- management list with filters, sorting, pagination, and CSV export
- PO detail page
- create purchase order
- edit purchase order
- item-line create and delete
- container-level editing
- per-item paginated container editing
- bulk update by container number
- purchase-type and order-status edit permissions
- finance-support fields and synced `purchase_finance_record` behavior

Delivered management filters include:

- vendor
- location
- color
- size/type
- condition
- order-date range
- PO status
- quick date filters

## Data And Schema Surface

Primary purchase tables:

- `purchase_order`
- `purchase_order_item`
- `purchase_order_container`
- `purchase_order_item_attachment_links`
- `purchase_order_material_type`
- `purchase_finance_record`

Important current workflow relationships:

- purchase records feed depot inventory availability
- purchase item and container data feed dispatch release selection
- purchase code paths now read and write `container.yom`
- purchase color handling depends on `ral_color_codes`

Important migration references:

- [`db/supabase/migrations/20260403124500_purchase_phase1_db.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260403124500_purchase_phase1_db.sql)
- [`db/supabase/migrations/20260405114500_purchase_submit_container_editor.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260405114500_purchase_submit_container_editor.sql)
- [`db/supabase/migrations/20260419150000_purchase_non_factory_release_by_item.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260419150000_purchase_non_factory_release_by_item.sql)
- [`db/supabase/migrations/20260426170000_purchase_and_transfer_attachment_links.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260426170000_purchase_and_transfer_attachment_links.sql)
- [`db/supabase/migrations/20260525203000_container_yom.sql`](/Users/palaya/Documents/ew-erp/db/supabase/migrations/20260525203000_container_yom.sql)

## Key Workflow Truth

Important current workflow truth reflected in code:

- `Purchase` is not read-only; create, submit, edit, and partial-cancel behavior are already part of the delivered module
- order editing depends on `purchaseType + orderStatus`
- factory and non-factory flows do not share exactly the same lifecycle constraints
- the main detail page intentionally stops at item level and uses a child route for container detail
- finance-support behavior is part of the module, not an afterthought

## Local Reset And Seed Coverage

Current purchase seed coverage includes:

- `purchase_order`
- `purchase_order_item`
- `purchase_order_item_attachment_links`
- `purchase_order_container`
- `purchase_order_material_type`
- `purchase_finance_record`

Primary reset-safe references:

- [`db/supabase/config.toml`](/Users/palaya/Documents/ew-erp/db/supabase/config.toml)
- [`scripts/export_basic_info_seeds.py`](/Users/palaya/Documents/ew-erp/scripts/export_basic_info_seeds.py)
- [`scripts/verify_basic_info_seeds.py`](/Users/palaya/Documents/ew-erp/scripts/verify_basic_info_seeds.py)
- [`scripts/run_reset_safe_regression.mjs`](/Users/palaya/Documents/ew-erp/scripts/run_reset_safe_regression.mjs)

## Required Testing Coverage

Changes to delivered purchase behavior should expect, at minimum:

- targeted purchase vitests
- `npm run test:regression`
- `npm run db:reset` when schema, seeds, RLS, or reset-sensitive behavior changes
- `npm run test:regression:reset-safe` for purchase reset-safe changes

Important current rule:

- a green shared regression gate does not replace targeted purchase tests for touched create/edit/query behavior

Primary testing references:

- [`docs/testing-requirements.md`](/Users/palaya/Documents/ew-erp/docs/testing-requirements.md)
- [`__tests__/purchase-orders-dashboard.test.tsx`](/Users/palaya/Documents/ew-erp/__tests__/purchase-orders-dashboard.test.tsx)
- [`__tests__/purchase-order-detail.test.tsx`](/Users/palaya/Documents/ew-erp/__tests__/purchase-order-detail.test.tsx)
- [`__tests__/purchase-query-helpers.test.ts`](/Users/palaya/Documents/ew-erp/__tests__/purchase-query-helpers.test.ts)

## Reference Implementations

- management page: [`app/purchase/po-management/page.tsx`](/Users/palaya/Documents/ew-erp/app/purchase/po-management/page.tsx)
- actions: [`app/purchase/po-management/actions.ts`](/Users/palaya/Documents/ew-erp/app/purchase/po-management/actions.ts)
- dashboard: [`components/purchase/purchase-orders-dashboard.tsx`](/Users/palaya/Documents/ew-erp/components/purchase/purchase-orders-dashboard.tsx)
- create form: [`components/purchase/purchase-order-create-form.tsx`](/Users/palaya/Documents/ew-erp/components/purchase/purchase-order-create-form.tsx)
- detail view: [`components/purchase/purchase-order-detail.tsx`](/Users/palaya/Documents/ew-erp/components/purchase/purchase-order-detail.tsx)
- container workflow: [`components/purchase/purchase-item-containers-view.tsx`](/Users/palaya/Documents/ew-erp/components/purchase/purchase-item-containers-view.tsx)
