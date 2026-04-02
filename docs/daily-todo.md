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

- [ ] Topic: Decide whether future vendor tables and other new partner tables must survive local reset
  - Status: Deferred
  - Source conversation/topic: Seed coverage planning for Partners
  - Owner: User
  - Next concrete step: Confirm reset-survival requirement before extending seed export and verify scripts

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

- [ ] Decide whether any future vendor table should be added to reset-safe seed coverage
  - Status: Deferred
  - Source conversation/topic: Partner data persistence scope
  - Owner: User
  - Next concrete step: Confirm whether future vendor data must survive local reset before changing seed tooling

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
