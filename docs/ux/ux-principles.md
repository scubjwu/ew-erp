# EW ERP UX Principles

## Purpose

This document is the canonical UX rule set for EW ERP.

Use it to keep planning, design, and implementation aligned on:

- what kind of ERP experience this system is intentionally delivering
- how new flows should be structured before UI work starts
- which interaction patterns should be reused instead of reinvented
- how delivery maturity must be represented in navigation and page states

This document is not a replacement for system-design, module, schema, or testing docs.
It defines the product and interaction rules that those implementations must follow.

## Product Shape

EW ERP is currently a master-data-first ERP that is gradually expanding into connected transaction workflows.

Current product reality:

- `System Codes` is the interaction and CRUD reference standard
- `Partners` is the next most mature business module
- `Purchase` is now transitioning from read-oriented management into an incremental transaction workflow beginning with Create PO delivery
- `Inventory` still contains legacy UI behavior and must not be treated as the future workflow model

Design and planning must reflect delivered reality, not aspirational future scope.

## Core UX Principles

### 1. Efficiency over decoration

The product is an internal business system.
Design should optimize for fast scanning, low-friction editing, and repeatable daily work rather than visual flourish.

Apply this by default:

- compact layouts
- dense but readable tables
- short labels
- direct actions near the data they affect
- minimal interaction steps for common maintenance tasks

### 2. Reuse before invention

New pages should copy delivered interaction patterns from `System Codes`, `Customers`, and other mature surfaces before introducing new page structures or control behavior.

Do not create a new pattern when an existing delivered pattern already solves the same problem.

### 3. User task over table structure

Pages should be shaped around the user's task, not raw schema grouping.

Prefer:

- business-facing page names
- fields grouped by business meaning
- flows that support search -> inspect -> edit -> verify

Avoid exposing implementation detail such as raw table names, internal join mechanics, or developer-oriented labels.

### 4. Honest delivery status

Navigation must not imply that every visible section is equally delivered.

If a route is placeholder-only, scaffold-only, or otherwise incomplete, the UI must make that state legible instead of presenting it as a finished business tool.

Do not use navigation, cards, or empty list shells to create false confidence about feature readiness.

### 5. Business language first

Use business-facing English labels by default.

Prefer business codes or short operational labels where those are the language users actually work with.
If the system intentionally displays business codes instead of descriptive names, that choice should be consistent across list, detail, and filter surfaces.

### 6. Consistency across modules

Similar page types should behave the same way across `System Codes`, `Partners`, `Purchase`, and `Settings`.

This includes:

- search trigger behavior
- filter placement
- pagination position
- row action style
- detail navigation patterns
- create/edit/view structure
- empty, loading, and error states

Current delivered baseline from `Purchase` should now be treated as the default reference for future transaction-oriented page behavior, especially for:

- sticky form action bars
- right-sticky `Actions` columns in list pages
- sortable visible list columns
- autocomplete-first search fields with keyboard selection
- collapsible search filters with compact active-filter summaries

### 7. Progressive workflow maturity

When a module is not yet a full end-to-end transaction flow, design it according to its current maturity.

Current expected framing:

- `System Codes`: maintenance workflows
- `Partners`: partner master-data workflows
- `Purchase`: management, drill-down, and staged transaction workflows; create/edit must expand incrementally by delivered milestone, not by assumed future scope
- `Inventory`: transitional surface, not a future-source workflow reference

Do not design future-state transaction assumptions into current pages unless the implementation plan explicitly supports them.

Current planning rule:

- prefer delivered `Purchase` interaction patterns over legacy `Inventory` behavior when choosing the baseline for new transaction-oriented pages

## Planning Rules

Every new module plan or major page change should answer these questions before implementation starts:

1. what user role is this for
2. what primary task is the page enabling
3. whether the page is a center page, list page, detail page, or form workflow
4. whether the feature is delivered, partial, placeholder, or legacy/transitional
5. which existing delivered page is the reference pattern
6. what happens after the primary action succeeds

If a proposal cannot answer those questions clearly, it is not ready for implementation.

## Information Architecture Rules

- Top-level navigation should reflect business domains, not engineering ownership.
- Center pages should orient users and route them into tasks, not act as generic card galleries.
- Canonical routes should be explicit; legacy routes may redirect, but should not remain parallel sources of truth.
- Drill-down depth should be intentional and tied to business hierarchy.
- Placeholder sections should be visually and verbally distinguishable from delivered sections.

## Page-Type Rules

### Center pages

Center pages should:

- explain what the module is for
- show concise descriptions
- expose useful counts where they aid navigation
- route users into real tasks quickly

Center pages should not:

- expose raw implementation status as developer jargon
- overuse decorative cards with no clear next action
- mix delivered and placeholder sections without clear distinction

### List pages

List pages are the default ERP working surface.

They should prioritize:

- fast scanning
- server-backed filtering and pagination where needed
- compact toolbars
- lightweight row actions
- quick access to detail and edit flows

### Detail pages

Detail pages should:

- present a stable read view
- group information by business meaning
- separate high-level summary from lower-level records
- avoid mixing all child data into one unreadable surface

If lower-level records are complex, use drill-down routes instead of overloading the main detail page.

### Create and edit flows

Create and edit flows should:

- keep field ordering aligned with business logic
- keep readonly/system fields visibly non-editable
- preserve consistent layout between create, edit, and view where practical
- reduce avoidable mode switching or page jumping

## State and Feedback Rules

- Empty states should explain what is missing and what the next useful action is.
- Loading states should preserve layout stability.
- Error states should be actionable and business-readable.
- Search suggestion behavior must remain lightweight and non-destructive.
- Success feedback should confirm the business result, not only the technical action.

## Anti-Patterns

The following are not acceptable by default:

- designing from tables instead of tasks
- introducing a new page interaction pattern without a clear need
- exposing placeholder routes as if they are finished tools
- mixing legacy workflow assumptions into new module design
- making users relearn search, filter, or row actions on every module
- using developer vocabulary in primary UI copy

## Relationship to Other Docs

Use this document together with:

- system truth: [`/Users/palayapan/Documents/ew-erp/docs/system-design-and-ramp-up.md`](/Users/palayapan/Documents/ew-erp/docs/system-design-and-ramp-up.md)
- module truth: [`/Users/palayapan/Documents/ew-erp/docs/modules/system-codes.md`](/Users/palayapan/Documents/ew-erp/docs/modules/system-codes.md), [`/Users/palayapan/Documents/ew-erp/docs/modules/partners.md`](/Users/palayapan/Documents/ew-erp/docs/modules/partners.md)
- UX doc index: [`/Users/palayapan/Documents/ew-erp/docs/ux/README.md`](/Users/palayapan/Documents/ew-erp/docs/ux/README.md)
- information architecture: [`/Users/palayapan/Documents/ew-erp/docs/ux/information-architecture.md`](/Users/palayapan/Documents/ew-erp/docs/ux/information-architecture.md)
- task flows: [`/Users/palayapan/Documents/ew-erp/docs/ux/task-flows.md`](/Users/palayapan/Documents/ew-erp/docs/ux/task-flows.md)
- page standards: [`/Users/palayapan/Documents/ew-erp/docs/ux/page-standards.md`](/Users/palayapan/Documents/ew-erp/docs/ux/page-standards.md)
- page interaction baseline: [`/Users/palayapan/Documents/ew-erp/docs/basic-info-list-standard.md`](/Users/palayapan/Documents/ew-erp/docs/basic-info-list-standard.md)
- testing and verification: [`/Users/palayapan/Documents/ew-erp/docs/testing-requirements.md`](/Users/palayapan/Documents/ew-erp/docs/testing-requirements.md)

When these documents interact:

- `system-design-and-ramp-up.md` defines current delivered system truth
- module docs define module-specific truth and scope
- this document defines the UX principles that future planning and implementation must follow
- testing docs define how changed behavior must be verified
