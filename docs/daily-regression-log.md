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
