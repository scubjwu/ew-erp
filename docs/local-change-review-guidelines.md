# EW ERP Local Change Review Guidelines

## Purpose

This document is the canonical review standard for local uncommitted changes in the EW ERP repository.

Use it to keep local change review:

- focused on real engineering risk
- grounded in current repo truth
- consistent in severity and output format
- explicit about testing coverage expectations

For the canonical testing bar itself, use [`/Users/palayapan/Documents/ew-erp/docs/testing-requirements.md`](/Users/palayapan/Documents/ew-erp/docs/testing-requirements.md). This review guide explains how to evaluate coverage in a review; the testing-requirements doc defines what developers were required to run before review.

## Review Goals

Local change review should prioritize finding issues that can materially break delivered behavior or repository safety.

Reviewers should look for:

- correctness bugs
- data integrity risks
- permission or RLS regressions
- reset-safe seed and restore gaps
- type and schema contract mismatches
- regression coverage gaps

Reviewers should not elevate style preferences, formatting opinions, or speculative refactors above concrete risk.

All findings must be grounded in current code, migrations, docs, scripts, and delivered workflow reality rather than memory or assumed intent.

## Review Scope

Default scope for local review:

1. read the relevant docs first
2. inspect `git status` and review only uncommitted changes
3. inspect the directly impacted upstream and downstream code paths
4. stop expansion once the risk boundary is understood

Scope rules:

- do not review unrelated historical debt as if it were part of the current change
- do not expand into the full repo without a concrete risk signal
- do inspect adjacent schema, trigger, seed, test, and type wiring when the change touches those areas

## Severity Rules

- `P0`: data loss, security exposure, outage, or a change that can make the system materially unusable
- `P1`: clear bug, broken contract, or high-probability regression in delivered or intended behavior
- `P2`: meaningful but conditional risk, incomplete rollout wiring, or a defect that requires a narrower trigger condition
- `P3`: low-risk improvement, missing non-blocking coverage, or a follow-up that should be tracked but should not block the change by itself

Severity must reflect impact, not effort.

## Required Review Checks

Every local review should check the following whenever relevant to the changed area:

- migration correctness and idempotency
- database constraints, foreign keys, derived-record behavior, and trigger integrity
- public-write grants, RLS coverage, and child-table parity
- seed export, seed verify, reset-safe restore wiring, and seed load order when reset-sensitive tables are involved
- type, DTO, Supabase payload, and database column naming consistency
- current doc truth alignment when the change updates workflow, terminology, or delivered scope
- testing and regression coverage for the changed behavior

## Testing Coverage Rule

Every review must explicitly assess whether the changed behavior is covered by current automated tests, regression scripts, or another repeatable verification path already used by the repo.

Reviewers should check the submitted testing evidence against [`/Users/palayapan/Documents/ew-erp/docs/testing-requirements.md`](/Users/palayapan/Documents/ew-erp/docs/testing-requirements.md), not against personal expectation or habit.

Coverage review rules:

- if coverage exists and is appropriate, note it briefly when it supports the review conclusion
- if coverage is missing but the change is otherwise acceptable, raise the gap as a `P3`
- if missing coverage prevents confidence in correctness, or hides a likely regression, escalate the finding to `P1` or `P2` based on impact
- do not hide a testing gap inside summary prose; call it out explicitly when it matters
- if a required targeted test from the testing-requirements doc was not run, treat that as a real coverage gap rather than assuming the shared regression gate was sufficient

Examples of coverage that should be considered:

- `vitest` coverage for delivered UI and data-mapping behavior
- regression harness coverage in `scripts/run_local_regression.mjs`
- reset-safe coverage in `scripts/run_reset_safe_regression.mjs`
- seed export and verification coverage
- targeted smoke tests for delivered CRUD flows
- required targeted module tests such as `npm run test:crm` for customer-form changes and the dedicated Purchase vitests for delivered Purchase UI/query changes

## Output Format

Review output must present findings first.

For each finding, include:

- severity
- file and line reference
- the concrete problem
- why it can fail
- the trigger condition or affected path

Ordering rules:

- order findings by severity first
- keep overviews and summaries brief
- only after findings, list assumptions, open questions, or residual risks
- if no actionable findings exist, say `no findings` explicitly

## Project-Specific Review Checklist

Use this checklist when the changed area touches the corresponding subsystem:

- purchase, partners, or system-code migrations: verify schema, RLS, grants, seed export, seed verify, seed load order, and reset-safe restore wiring together
- trigger-derived tables such as finance records: verify insert/update/delete side effects and conflict handling
- business-facing row types and DTOs: verify singular/plural naming, snake_case/camelCase mapping, and nullability against actual schema responses
- delivered CRUD pages: verify search, pagination, create/edit flows, export paths, and reset or restore expectations where required
- docs-affecting changes: verify `docs/system-design-and-ramp-up.md`, module docs, and daily tracking docs still reflect current truth

## Non-Goals

The following should not become primary findings unless they create concrete product or maintenance risk:

- formatting-only nits
- naming preference without contract impact
- speculative cleanup ideas
- unrelated historical type errors or lint debt

Use follow-up notes sparingly and keep them clearly separated from blocking findings.
