# EW ERP Daily Regression Log

This is the rolling daily regression execution log for EW ERP.

Use this file for:

- daily regression run history
- bug findings from regression
- root cause and fix notes
- post-fix verification results
- commit history for regression-driven fixes
- retrospective notes about recurring failure patterns

Do not use this file as the source of truth for:

- daily execution priorities
- general project action items
- system architecture
- schema design
- module workflow specifications

Use [`/Users/palayapan/Documents/ew-erp/docs/daily-todo.md`](/Users/palayapan/Documents/ew-erp/docs/daily-todo.md) for planning and carry-forward work. Use this file for regression execution records.

## How To Use

Run daily regression in this order:

```bash
cd /Users/palayapan/Documents/ew-erp
npm run db:start
npm run dev:local
npm run db:reset
npm run test:regression
```

If the local app is not running on port `3000`, run the gate with an explicit base URL:

```bash
cd /Users/palayapan/Documents/ew-erp
EW_ERP_BASE_URL=http://localhost:3001 npm run test:regression
```

Daily regression rules:

- log every regression failure before or during the fix
- fix one bug or one coherent bug batch at a time
- rerun regression after each fix batch
- record root cause, changed files, and fix summary for every resolved bug
- record the exact regression command used, including `EW_ERP_BASE_URL` when needed
- commit fixes only after the regression gate is green
- if anything remains unresolved, record owner and next step before ending the day

Status vocabulary:

- `Open`
- `In Progress`
- `Fixed`
- `Verified`
- `Deferred`

## Date: 2026-04-03

### Environment

- App URL: `http://localhost:3002`
- Branch: `main`
- Commit before fixes: `36e579e0b96d9b3bfcafd5a58d326b2e1b5c92c5`

### Regression Run

- Command: `npm run db:reset`
- Result: Pass
- Summary metrics: seed export and verification passed; local Supabase reset completed successfully
- Command: `npm run test:regression`
- Result: Fail
- Summary metrics: `test:regression:ui` passed (`16/16`); `scripts/run_local_regression.mjs` failed before route checks because `http://127.0.0.1:3000` was not reachable from this automation environment
- Command: `EW_ERP_BASE_URL=http://localhost:3002 npm run test:regression`
- Result: Fail
- Summary metrics: `test:regression:ui` passed (`16/16`); local route probe still failed because sandboxed Node HTTP access to the local app returned `fetch failed`
- Command: `EW_ERP_BASE_URL=http://localhost:3002 npm run test:regression`
- Result: Pass
- Summary metrics: `test:regression:ui` passed (`16/16`); local regression passed (`routes_checked: 43`, `data_checks: 51`); reset-safe regression passed (`reset_safe_checks: 25`)

### Bugs Found

- [x] Bug ID: REG-2026-04-03-01
  - Module/Page: Regression harness / local app reachability
  - Failing step: `scripts/run_local_regression.mjs` initial app URL availability check
  - Symptom / error: regression output surfaced low-signal `fetch failed` for the local app URL
  - Severity: Medium
  - Owner: Codex
  - Status: Fixed

### Fix Log

- [x] Bug ID: REG-2026-04-03-01
  - Root cause: the automation sandbox could not open local HTTP connections to the Next.js dev server, and the regression harness reported the raw transport error instead of a clear local-reachability diagnosis
  - Files changed: `scripts/run_local_regression.mjs`, `scripts/run_reset_safe_regression.mjs`
  - Fix summary: added explicit local-endpoint reachability diagnostics so failures now explain that the regression must be rerun from a shell/session with local network access instead of stopping at `fetch failed`
  - Regression added / updated: updated harness failure messaging for app URL and local Supabase API readiness checks
  - Status: Verified

### Verification After Fix

- [x] Verification item: full gate rerun after harness update
  - Commands rerun: `EW_ERP_BASE_URL=http://localhost:3002 npm run test:regression`
  - Result: partial pass; `test:regression:ui` passed (`16/16`), and the failure now reports an actionable local-network-access message
  - Residual risk: browser-path CRUD and route availability checks in `run_local_regression.mjs` remain unverified until the same command is rerun from a non-sandboxed local shell
- [x] Verification item: reset-safe regression after harness update
  - Commands rerun: `npm run test:regression:reset-safe`
  - Result: pass (`reset_safe_checks: 25`)
  - Residual risk: none beyond the unresolved local app HTTP-access limitation above
- [x] Verification item: full regression rerun with local network access
  - Commands rerun: `EW_ERP_BASE_URL=http://localhost:3002 npm run test:regression`
  - Result: pass (`16/16` UI tests, `43` routes checked, `51` data checks, `25` reset-safe checks)
  - Residual risk: no new regression found in the current delivered scope

### Commits

- [ ] Commit:
  - SHA:
  - Message:
  - Scope: no commit created in this run; regression gate is green and any later commit can reference this verification

### Retrospective Notes

- Pattern: sandboxed automation can reset the database and run non-HTTP checks, but browser-path regression scripts that fetch the local app may fail even when `next dev` is running
- Tooling gap: the local regression harness previously hid the actionable cause behind a generic transport error
- Follow-up hardening item: keep the improved reachability diagnostics so future automation runs fail with actionable messages if localhost access is unavailable again

### Additional Run: 2026-04-03 03:34 PDT

- Environment note: this automation run successfully completed `npm run db:reset`, but `npm run db:start` still cannot inspect Docker through `/Users/palayapan/.docker/run/docker.sock` from the sandboxed session
- App URL attempted: `http://localhost:3003`
- Commit before run: `99063d88cc34a4bcd89f05eff0cae5c80bb8775b`
- Command: `npm run db:start`
- Result: Fail
- Summary metrics: blocked by Docker socket access denial in the automation environment before service inspection
- Command: `npm run db:reset`
- Result: Pass
- Summary metrics: seed export passed, seed verification passed, and `supabase db reset` finished successfully on `main`
- Command: `EW_ERP_BASE_URL=http://localhost:3003 npm run test:regression`
- Result: Fail
- Summary metrics: `test:regression:ui` passed (`16/16`); `scripts/run_local_regression.mjs` stopped before route/data checks because this automation session could not reach `http://localhost:3003` and surfaced the expected actionable localhost-access message
- Bug note: no new product regression was identified; the failure matched the already-known sandbox localhost-access limitation
- Verification note: regression harness messaging remains correct and actionable for this environment-level failure mode
- Next step: rerun `EW_ERP_BASE_URL=http://localhost:3003 npm run test:regression` from a non-sandboxed local shell/session if full route/data coverage is required for this commit
- Commit note: no code changes and no commit created in this automation run

### Additional Run: 2026-04-03 08:40 PDT

- Environment note: `npm run db:start` remains blocked by Docker socket access denial in the sandboxed automation session, but existing local services were already available with Supabase listening on `54321` and `next dev` listening on `3001`
- App URL attempted: `http://localhost:3001`
- Commit before run: `a71a7100aefe49ee81bc0235867a9855b58eeb78`
- Command: `npm run db:start`
- Result: Fail
- Summary metrics: blocked by permission denial while connecting to `/Users/palayapan/.docker/run/docker.sock`
- Command: `npm run db:reset`
- Result: Pass
- Summary metrics: seed export passed, seed verification passed, and `supabase db reset` finished successfully on `main`
- Command: `EW_ERP_BASE_URL=http://localhost:3001 npm run test:regression`
- Result: Pass
- Summary metrics: `test:regression:ui` passed (`16/16`); local regression passed (`routes_checked: 43`, `data_checks: 51`); reset-safe regression passed (`reset_safe_checks: 25`)
- Bug note: no new product regression was identified in this run
- Verification note: full required regression gate is green against the active local dev server on port `3001`
- Commit note: no code changes and no commit created in this automation run

### Additional Run: 2026-04-03 Purchase Seed Reset-Safe Follow-Up

- Environment note: this run extended reset-safe persistence coverage to the new Purchase database tables and hardened the reset-safe tooling around local Supabase reset behavior
- Tables added to reset-safe coverage: `purchase_order`, `purchase_order_item`, `purchase_order_container`, `purchase_order_material_type`, `purchase_finance_record`
- Commands rerun:
  - `npm run db:reset`
  - `python3 scripts/export_basic_info_seeds.py`
  - `python3 scripts/verify_basic_info_seeds.py`
  - `npm run test:regression:reset-safe`
- Result: Pass
- Summary metrics: Purchase seed export passed, Purchase seed verification passed, and reset-safe regression passed with `reset_safe_checks: 30`
- Problems found during the rollout:
  - new Purchase seed files were initially missing from `db/supabase/config.toml` `sql_paths`, so reset did not restore them
  - historical Purchase tables initially lacked public write coverage, so reset-safe fixture creation failed with `42501 permission denied`
  - `purchase_order_container` was initially missing execution-layer fields required by realistic fixture creation
  - `purchase_finance_record` is trigger-derived from `purchase_order`, so naive seed replay caused duplicate-key failures until the seed was made idempotent
  - retrying reset through full `npm run db:reset` after a local Supabase `502` could wipe newly exported Purchase fixture seeds by re-exporting an empty post-reset state
- Fix summary:
  - added Purchase seed files to export and verify scripts
  - added Purchase seed files to `db/supabase/config.toml` load order
  - extended reset-safe regression to create and restore Purchase fixtures
  - added Purchase RLS/grants for local browser-write parity
  - added missing `purchase_order_container` execution fields
  - made `purchase_finance_record` seed replay idempotent
  - changed reset-safe tooling to default to `npm run db:reset` while preserving Purchase seed files across fallback/reset retry paths
- Follow-up rule recorded in system doc: every new editable table must now be wired into migration, seed export, seed verify, seed load order, reset-safe fixture creation, restore assertions, and full regression in the same change

### Additional Run: 2026-04-03 Purchase Milestone 1 and 2 Verification

- Environment note: Purchase top-level navigation, management page, detail page, and item-container read-only subpage were verified against the active local dev server after Milestone 1 and Milestone 2 delivery
- App URL attempted: `http://localhost:3001`
- Commands rerun:
  - `EW_ERP_BASE_URL=http://localhost:3001 npm run test:regression`
  - `./node_modules/.bin/vitest run __tests__/purchase-orders-dashboard.test.tsx __tests__/purchase-order-detail.test.tsx __tests__/purchase-query-helpers.test.ts`
- Result: Pass
- Summary metrics:
  - full regression passed with Purchase route coverage included
  - local regression reached `routes_checked: 47` and `data_checks: 53`
  - Purchase unit tests passed
- Verification note:
  - `PO Management` sorting, filtering, export, and code-only display rules were confirmed
  - `PO Detail` was confirmed to stop at item level
  - `View Containers` route was confirmed to show container-level records separately

### Additional Run: 2026-04-03 RAL Color Lookup and Reset-Safe Verification

- Environment note: this run completed the static `RAL` color lookup rollout and validated both local reset safety and Purchase test fixtures against the final user-provided code list
- Commands rerun:
  - `npm run db:reset`
  - `./node_modules/.bin/vitest run __tests__/purchase-orders-dashboard.test.tsx __tests__/purchase-order-detail.test.tsx __tests__/purchase-query-helpers.test.ts`
  - `npm run test:regression:reset-safe`
- Result: Pass
- Summary metrics:
  - local `ral_color_codes` table restored with `66` rows after reset
  - Purchase tests passed (`10/10`)
  - reset-safe regression passed with `reset_safe_checks: 32`
- Problems found during the rollout:
  - initial static seed and demo/test fixtures used mixed color formats and values outside the final user-approved `RAL` list
  - reset-safe verification initially failed because the script asserted a color code that did not exist in the final static table
- Fix summary:
  - normalized `ral_color_codes` seed to the final no-space format such as `RAL1000`
  - normalized Purchase demo seeds, Purchase tests, and reset-safe Purchase fixtures to valid seeded `RAL` codes only
  - updated reset-safe assertions to check the delivered static table contents directly
- Verification note:
  - `public.ral_color_codes` is now migration-backed, seed-backed, reset-safe, and ready to be promoted through the normal remote migration/seed flow

### Additional Run: 2026-04-04 05:27 PDT

- Environment note: `npm run db:start` remains blocked by Docker socket access denial in the automation sandbox, but existing local services were usable; Supabase was already listening on `54321`, and this run started `next dev` locally on `3000`
- App URL attempted: `http://localhost:3000`
- Commit before run: `7e1c01a3d06d077e269750c4e4c1915030e737b6`
- Command: `npm run db:start`
- Result: Fail
- Summary metrics: blocked by permission denial while connecting to `/Users/palayapan/.docker/run/docker.sock`
- Command: `npm run db:reset`
- Result: Pass
- Summary metrics: seed export passed, seed verification passed, and `supabase db reset` finished successfully on `main`
- Command: `npm run test:regression`
- Result: Pass
- Summary metrics: `test:regression:ui` passed (`16/16`); local regression passed (`routes_checked: 47`, `data_checks: 53`); reset-safe regression passed (`reset_safe_checks: 32`)
- Bug note: no new product regression was identified in this run
- Verification note: full required regression gate is green against the active local dev server on port `3000`
- Commit note: no code changes and no commit created in this automation run

## Template

Copy this section for each regression day.

```md
## Date: YYYY-MM-DD

### Environment

- App URL:
- Branch:
- Commit before fixes:

### Regression Run

- Command:
- Result: Pass / Fail
- Summary metrics:

### Bugs Found

- [ ] Bug ID:
  - Module/Page:
  - Failing step:
  - Symptom / error:
  - Severity:
  - Owner:
  - Status:

### Fix Log

- [ ] Bug ID:
  - Root cause:
  - Files changed:
  - Fix summary:
  - Regression added / updated:
  - Status:

### Verification After Fix

- [ ] Verification item:
  - Commands rerun:
  - Result:
  - Residual risk:

### Commits

- [ ] Commit:
  - SHA:
  - Message:
  - Scope:

### Retrospective Notes

- Pattern:
- Tooling gap:
- Follow-up hardening item:
```
