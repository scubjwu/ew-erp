# EW ERP Daily To-Do

This is the rolling daily planning and action-item tracker for EW ERP.

Use this file for:

- today's execution priorities
- active and blocked work
- action items created from conversations
- carried-forward work that still needs a next step

Do not use this file as the source of truth for:

- system architecture
- schema design
- module workflow specifications
- milestone completion status

## Template

Copy this section for each working day.

```md
## Date: YYYY-MM-DD

### Today's priorities

- [ ] Priority 1
- [ ] Priority 2
- [ ] Priority 3

### Action Items from conversations

- [ ] Topic:
  - Status: Planned
  - Source conversation/topic:
  - Owner:
  - Next concrete step:

### In Progress

- [ ] Item

### Blocked

- [ ] Item
  - Blocker:
  - Owner:
  - Next check:

### Done

- [x] Item

### Carry Forward to next day

- [ ] Item
  - Status: Carried Forward
  - Source conversation/topic:
  - Owner:
  - Next concrete step:
```

## Date: 2026-03-31

### Today's priorities

- [x] Sync docs to today's delivered system truth from git commits
- [x] Separate system-level truth, module-level truth, and daily action items
- [x] Classify all unfinished items as `Deferred` or `Carried Forward`

### Action Items from conversations

- [x] Topic: Create global system design and ramp-up doc
  - Status: Done
  - Source conversation/topic: In-repo system design doc
  - Owner: Codex + user
  - Next concrete step: N/A

- [x] Topic: Create initial module docs for System Codes and Partners
  - Status: Done
  - Source conversation/topic: Module documentation setup
  - Owner: Codex + user
  - Next concrete step: N/A

- [x] Topic: Add links from global doc to module docs and introduce daily action-item tracking
  - Status: Done
  - Source conversation/topic: Daily doc and AI resolution rule
  - Owner: Codex
  - Next concrete step: N/A

- [x] Topic: Sync docs to `2026-03-31` commit reality for `System Codes`, `Partners`, and `Customers`
  - Status: Done
  - Source conversation/topic: Automation doc sync from today's commits
  - Owner: Codex
  - Next concrete step: N/A

- [ ] Topic: Verify the new basic-info and customers public-write migrations on a freshly reset local DB
  - Status: Carried Forward
  - Source conversation/topic: `2026-03-31` schema and RLS changes
  - Owner: User + Codex
  - Next concrete step: Run `npm run db:reset` and smoke-test create/edit flows for container number rules and customers

- [ ] Topic: Decide the replacement data model for `Vendors` after removing `suppliers`
  - Status: Carried Forward
  - Source conversation/topic: Partners module delivery follow-up
  - Owner: User + Codex
  - Next concrete step: Choose whether a future vendor workflow should use a dedicated `vendors` table or remain scaffold-only until redesign

- [x] Topic: Decide whether future vendor tables and other new partner tables must survive local reset
  - Status: Done
  - Source conversation/topic: Seed coverage planning for Partners
  - Owner: User + Codex
  - Next concrete step: N/A

- [ ] Topic: Replace the remaining partner placeholder routes with real CRUD scopes or explicitly keep them scaffold-only
  - Status: Deferred
  - Source conversation/topic: Partners module maturity planning
  - Owner: User
  - Next concrete step: Prioritize `Lessee`, `Lessor`, `Material Vendors`, and `Container Owners`

- [ ] Topic: Decide whether customer legacy email/depot fields should be normalized to match the delivered UI
  - Status: Deferred
  - Source conversation/topic: `2026-03-31` customer form and schema mapping review
  - Owner: User + Codex
  - Next concrete step: Decide whether `Primary Contact Email` should keep mapping to `purchasing_emails[0]` and whether `depot_info` stays out of scope

### In Progress

- [ ] None

### Blocked

- [ ] None

### Done

- [x] Global living design doc created
- [x] System Codes module doc created
- [x] Partners module doc created
- [x] System doc synced to canonical `/partners` routing and delivered `Container Number Rules`
- [x] System Codes module doc synced to current RLS baseline and container-number-rule references
- [x] Partners module doc synced to current customer fields and current route reality
- [x] Partners and system docs synced to the current customer UI/schema mapping reality

### Carry Forward to next day

- [ ] Verify new RLS and public-write migrations after `npm run db:reset`
  - Status: Carried Forward
  - Source conversation/topic: `2026-03-31` migration rollout
  - Owner: User + Codex
  - Next concrete step: Smoke-test `System Codes` and `Partners > Customers` create/edit flows

- [ ] Decide whether `Vendors` should be rebuilt after removing `suppliers`
  - Status: Carried Forward
  - Source conversation/topic: Partners delivery sequence
  - Owner: User + Codex
  - Next concrete step: Define the future vendor data model before restarting UI work

### Deferred

- [x] Decide whether any future vendor table should be added to reset-safe seed coverage
  - Status: Done
  - Source conversation/topic: Partner data persistence scope
  - Owner: User + Codex
  - Next concrete step: N/A

- [ ] Decide which placeholder partner sections should become real modules next
  - Status: Deferred
  - Source conversation/topic: Partners roadmap
  - Owner: User
  - Next concrete step: Pick the next partner workflow after `Vendors`

- [ ] Decide whether the customer schema should be normalized to match the delivered contact/certificate UI
  - Status: Deferred
  - Source conversation/topic: Customer legacy field cleanup
  - Owner: User + Codex
  - Next concrete step: Choose whether to rename/remap `purchasing_emails` usage and formally retire `depot_info` from active customer maintenance

## Date: 2026-04-01

### Today's priorities

- [x] Define standalone replacement partner master-data tables after removing legacy `suppliers`
- [x] Create schema migrations for `vendors`, `material_vendors`, `lessees`, and `container_owners`
- [x] Add test-data seeds for the new partner master-data tables and attachment tables
- [x] Re-sync docs to the final `2026-04-01` git truth after the partner seed-data follow-up commit

### Action Items from conversations

- [x] Topic: Create standalone partner tables instead of reviving `suppliers`
  - Status: Done
  - Source conversation/topic: Partner master-data redesign
  - Owner: Codex + user
  - Next concrete step: N/A

- [x] Topic: Add test data so future partner pages can be built against realistic records
  - Status: Done
  - Source conversation/topic: Seed data for new partner master-data tables
  - Owner: Codex
  - Next concrete step: N/A

- [x] Topic: Sync docs to the final `2026-04-01` partner schema-and-seed reality
  - Status: Done
  - Source conversation/topic: Automation doc sync from today's commits
  - Owner: Codex
  - Next concrete step: N/A

- [ ] Topic: Apply the new partner migrations and seeds to a local database
  - Status: Carried Forward
  - Source conversation/topic: New partner master-data schema rollout
  - Owner: User + Codex
  - Next concrete step: Run `supabase db push`, then `supabase db reset`, and verify the new tables, attachment rows, and FK user seeds exist locally

- [ ] Topic: Build the first CRUD page on top of the new partner schema
  - Status: Carried Forward
  - Source conversation/topic: Partner module implementation sequencing
  - Owner: User + Codex
  - Next concrete step: Pick whether `vendors`, `material_vendors`, `lessees`, or `container_owners` should be the first delivered page

- [ ] Topic: Align partner center metadata and placeholder copy with the new schema truth
  - Status: Carried Forward
  - Source conversation/topic: `2026-04-01` doc sync and partner metadata drift
  - Owner: User + Codex
  - Next concrete step: Update `types/partners.ts` and placeholder route descriptions so `Vendors` no longer claims it lacks master-data backing

- [x] Topic: Validate whether the new partner seed files are fully covered by export / verify tooling
  - Status: Done
  - Source conversation/topic: Seed automation alignment review
  - Owner: Codex
  - Next concrete step: N/A

### In Progress

- [ ] None

### Blocked

- [ ] None

### Done

- [x] Added migration to remove legacy `suppliers` and its `purchase_order.supplier_id` dependency
- [x] Added standalone `vendors` and `vendor_attachment_links` schema
- [x] Added standalone `material_vendors` and `material_vendor_attachment_links` schema
- [x] Added standalone `lessees` and `lessee_attachment_links` schema
- [x] Added standalone `container_owners` and `container_owner_attachment_links` schema
- [x] Added partner master-data test-data seeds and minimal FK-safe user seeds
- [x] Synced system and partners docs to the new schema-ready partner model
- [x] Synced docs again after the partner seed-data follow-up commit clarified local reset test-data coverage

### Carry Forward to next day

- [ ] Apply and verify the new partner master-data migrations locally
  - Status: Carried Forward
  - Source conversation/topic: Partner schema rollout
  - Owner: User + Codex
  - Next concrete step: Run `supabase db push` and `supabase db reset`, then inspect the four new partner tables, attachment tables, and supporting user rows

- [ ] Choose the first partner page to build on top of the new tables
  - Status: Carried Forward
  - Source conversation/topic: Partner delivery sequence after schema setup
  - Owner: User + Codex
  - Next concrete step: Select one of `vendors`, `material_vendors`, `lessees`, or `container_owners` for the first CRUD implementation

- [ ] Update partner center metadata and placeholder copy to match schema reality
  - Status: Done
  - Source conversation/topic: Partner doc sync follow-up
  - Owner: Codex
  - Next concrete step: N/A

## Date: 2026-04-02

### Today's priorities

- [x] Replace the placeholder `Vendors` route with a real CRUD page family
- [x] Match the depot-style list/detail presentation for `Vendors`
- [x] Add CSV export for `Vendors`
- [x] Deliver the `Material Vendors` page family using the same pattern as `Vendors`
- [x] Deliver the `Lessee` page family using the same pattern as `Vendors`
- [x] Deliver the `Container Owners` page family using the same pattern as `Vendors`
- [x] Expand the `users` schema for upcoming User Management work
- [x] Deliver the first `System Settings` CRUD page family for `User Management`
- [x] Fix `users` browser-write permission gap for local User Management create/edit
- [x] Add `users` to the reset-safe seed export workflow
- [x] Add standalone partner master-data tables to the reset-safe seed export workflow

### Action Items from conversations

- [x] Topic: Deliver the first real page on top of the new standalone partner schema
  - Status: Done
  - Source conversation/topic: Build Vendors UI on top of the new `vendors` table
  - Owner: Codex
  - Next concrete step: N/A

- [ ] Topic: Verify the new `Vendors` page against a local database with the latest migrations and seeds applied
  - Status: Carried Forward
  - Source conversation/topic: Vendors UI delivery
  - Owner: User + Codex
  - Next concrete step: Run `supabase db push`, `supabase db reset`, then smoke-test list/create/view/edit/export for `/partners/vendors`

- [x] Topic: Pick the next schema-ready partner page to implement
  - Status: Done
  - Source conversation/topic: Partner delivery sequence after Vendors
  - Owner: User + Codex
  - Next concrete step: N/A

- [x] Topic: Deliver the `Material Vendors` page family on top of the new `material_vendors` table
  - Status: Done
  - Source conversation/topic: Build Material Vendors UI using the Vendors format
  - Owner: Codex
  - Next concrete step: N/A

- [x] Topic: Deliver the `Lessee` page family on top of the new `lessees` table
  - Status: Done
  - Source conversation/topic: Build Lessee UI using the Vendors format
  - Owner: Codex
  - Next concrete step: N/A

- [x] Topic: Deliver the `Container Owners` page family on top of the new `container_owners` table
  - Status: Done
  - Source conversation/topic: Build Container Owners UI using the Vendors format
  - Owner: Codex
  - Next concrete step: N/A

- [x] Topic: Expand `public.users` for User Management preparation
  - Status: Done
  - Source conversation/topic: Extend the existing `users` table before building User Management
  - Owner: Codex
  - Next concrete step: N/A

- [x] Topic: Deliver `User Management` under `System Settings`
  - Status: Done
  - Source conversation/topic: Build the main and detail pages for managing users
  - Owner: Codex
  - Next concrete step: N/A

- [ ] Topic: Verify the new `Container Owners` page against a local database with the latest migrations and seeds applied
  - Status: Carried Forward
  - Source conversation/topic: Container Owners UI delivery
  - Owner: User + Codex
  - Next concrete step: Smoke-test list/create/view/edit/export for `/partners/container-owners`

- [ ] Topic: Verify the expanded `users` schema and seed data on a local database
  - Status: Carried Forward
  - Source conversation/topic: User Management schema preparation
  - Owner: User + Codex
  - Next concrete step: Run `supabase db push` or `supabase db reset`, then confirm `user_code`, `status`, the new management fields, and reset-exported user rows exist in `public.users`

- [ ] Topic: Verify the new `User Management` page against a local database with the latest migrations applied
  - Status: Carried Forward
  - Source conversation/topic: User Management UI delivery
  - Owner: User + Codex
  - Next concrete step: Smoke-test list/create/view/edit/export for `/settings/users`

- [x] Topic: Restore `users` table write grants required by browser-based User Management CRUD
  - Status: Done
  - Source conversation/topic: `permission denied for table users` during Create New User
  - Owner: Codex
  - Next concrete step: N/A

- [x] Topic: Make `users` survive local `db reset` by adding it to the export/verify seed workflow
  - Status: Done
  - Source conversation/topic: Newly created users disappearing after `db reset`
  - Owner: Codex
  - Next concrete step: N/A

- [x] Topic: Make standalone partner master-data records survive local `db reset`
  - Status: Done
  - Source conversation/topic: Preserve `vendors`, `material_vendors`, `lessees`, and `container_owners` after reset
  - Owner: Codex
  - Next concrete step: N/A

### In Progress

- [ ] None

### Blocked

- [ ] None

### Done

- [x] Added `vendors` list page with depot-style search, table layout, and pagination
- [x] Added vendor detail/new/edit route family under `/partners/vendors`
- [x] Added tabbed vendor form for basic info, bank information, settlement, and attachments
- [x] Added vendor CSV export
- [x] Updated partner center metadata so `Vendors` is count-backed
- [x] Synced system and partners docs to the delivered `Vendors` UI
- [x] Added `material_vendors` list page with search on vendor code, legal company name, material category, and default-vendor flag
- [x] Added material-vendor detail/new/edit route family under `/partners/material-vendors`
- [x] Added tabbed material-vendor form for basic info, bank information, settlement, and attachments
- [x] Added material-vendor CSV export
- [x] Updated partner center metadata and tab titles so `Material Vendors` is count-backed and route-aware
- [x] Added `lessees` list page with search on lessee code, legal company name, and region
- [x] Added lessee detail/new/edit route family under `/partners/lessee`
- [x] Added tabbed lessee form for basic info, bank information, settlement, and attachments
- [x] Added lessee CSV export
- [x] Updated partner center metadata and tab titles so `Lessee` is count-backed and route-aware

### Carry Forward to next day

- [ ] Smoke-test the delivered `Vendors` page against a migrated local database
  - Status: Carried Forward
  - Source conversation/topic: Vendors CRUD rollout
  - Owner: User + Codex
  - Next concrete step: Apply migrations and seeds locally, then test `/partners/vendors`

- [ ] Choose the next partner CRUD page
  - Status: Carried Forward
  - Source conversation/topic: Partners rollout after Vendors
  - Owner: User + Codex
  - Next concrete step: Select `container_owners` or return to `lessor`

- [ ] Smoke-test the delivered `Material Vendors` page against a migrated local database
  - Status: Carried Forward
  - Source conversation/topic: Material Vendors CRUD rollout
  - Owner: User + Codex
  - Next concrete step: Apply migrations and seeds locally, then test `/partners/material-vendors`

- [ ] Smoke-test the delivered `Lessee` page against a migrated local database
  - Status: Carried Forward
  - Source conversation/topic: Lessee CRUD rollout
  - Owner: User + Codex
  - Next concrete step: Apply migrations and seeds locally, then test `/partners/lessee`

### Deferred

- [x] Validate whether the new partner seed files are managed by export / verify automation or should remain repo-static
  - Status: Done
  - Source conversation/topic: Partner reset-safety tooling follow-up
  - Owner: Codex
  - Next concrete step: N/A
