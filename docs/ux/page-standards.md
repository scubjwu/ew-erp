# EW ERP Page Standards

## Purpose

This document defines the standard UX behavior for the main page types used across EW ERP.

Use it when implementing or reviewing:

- center pages
- list pages
- detail pages
- create and edit flows
- tabbed sections and child-record surfaces
- empty, loading, and error states

## Global Rules

- Reuse delivered patterns before introducing new ones.
- Use business-facing English labels unless business requirements explicitly say otherwise.
- Keep layouts compact, stable, and optimized for repetitive daily use.
- Group information by business meaning instead of raw schema order.
- Preserve consistent action placement across modules.
- Unless a module-specific rule overrides it, future pages should follow the delivered `Purchase` page interaction baseline.

## Center Page Standard

Center pages should include:

- a clear business-facing title
- a concise explanation of the module purpose
- cards or sections that route users into real tasks
- useful counts when those counts help users choose where to go

Center pages should avoid:

- dead-end cards
- multiple action buttons per card unless there is a strong reason
- mixing delivered and placeholder sections without visible distinction

## List Page Standard

List pages are the default working surface for delivered ERP modules.

They should include:

- compact ERP-style toolbar layout
- server-side filtering for applied search conditions
- server-side pagination for the main dataset
- sticky headers
- a right-sticky `Actions` column when row actions exist
- lightweight row actions such as `View` and `Edit`
- export based on the active business filter context
- sorting for every visible list column
- consistent alignment:
  - text left
  - quantities centered
  - amounts right

They should avoid:

- leading `No.` index columns
- oversized inline row action buttons
- auto-running search when a suggestion is selected
- making users relearn search and reset behavior on each module
- mixing status or other business data into the `Actions` column

## Search and Filter Standard

- Search should run on explicit submit such as `Search` or `Enter`.
- Search fields should default to autocomplete/dropdown when the user is choosing from a bounded business value set.
- Search autocomplete should support fuzzy matching, keyboard up/down navigation, `Enter` selection, and `Escape` close.
- Selecting a suggestion should populate the input only.
- Only selected autocomplete suggestions count as active filter values.
- Search and reset controls should remain in a stable, predictable position.
- Default list-page pattern places `Search` and `Reset` as a right-aligned action group below or beside the filter fields, depending on density.
- Filter ordering should follow business usage frequency, not implementation convenience.
- `Quick Filter` should sit on its own row above the main search filters when present.
- `Search Filters` should support collapse.
- Collapse behavior should follow the delivered `Purchase` rule:
  - `Search` success collapses
  - `Reset` does not collapse
  - `Quick Filter` does not collapse
- Collapsed filter areas must show a compact single-line active-filter summary.

## Sorting Standard

- Backend default order should follow the main business key when practical.
- Every visible list column should expose a sortable header.
- Do not switch between local sorting and server sorting arbitrarily inside one page pattern.
- Status columns are not exceptions; if visible in the list, they should also sort.

## Detail Page Standard

Detail pages should:

- present a stable business read view
- surface key summary fields early
- separate lower-level child records from the top-level summary
- use tabs only when they reduce cognitive load rather than hide essential information

When a detail page becomes too dense:

- split lower-level records into subordinate routes
- keep the parent detail page readable

## Create and Edit Standard

- Create, edit, and view layouts should remain structurally aligned where practical.
- Required fields should be marked clearly.
- Readonly or system-derived fields should look intentionally locked.
- Save and cancel actions should remain easy to find and consistent across modules.
- Form action areas should stay visually attached to the form they control unless there is a strong workflow reason to separate them.
- Sticky treatment is optional, not the default. Use it only when a long form clearly benefits from persistent actions.
- If sticky treatment is used, it must stay inside the main content column and use a clear background and boundary.
- Large forms should scroll internally rather than overflow the viewport.

## Tabbed Detail Standard

Use tabs when:

- the page has clearly different business groups
- the user benefits from focused sections
- the first tab can act as a strong default summary

Do not use tabs when:

- the content would be clearer as one short page
- tabs hide critical fields users need to compare side by side

## Child Records and Attachments Standard

- Child tables and attachments should be presented as part of the parent task, not as unexplained technical substructures.
- If child records have their own complex workflow, give them a drill-down route.
- Attachment actions should use clear business labels and visible state feedback.

## State Standard

### Empty states

- explain what data is absent
- show the next useful action
- avoid generic blank placeholders

### Loading states

- preserve layout shape where possible
- avoid dramatic layout jumping

### Error states

- explain the business impact in readable language
- suggest the next useful action when possible

### Success feedback

- confirm the business result
- avoid purely technical success wording

## Review Checklist

When reviewing a new or changed page, check:

1. whether the page type is obvious
2. whether the primary task is clear within a few seconds
3. whether search, filter, sort, and export behavior matches repo standards
4. whether the maturity of the feature is represented honestly
5. whether the page reuses an existing delivered pattern where appropriate
6. whether collapsed search areas preserve context through an active-filter summary
7. whether code-first fields remain consistent across list, detail, and filter surfaces
8. whether the success, empty, loading, and error states are usable
