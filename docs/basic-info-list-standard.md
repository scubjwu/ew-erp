# Basic Info List Standard

All Basic Info list pages must follow this performance and interaction standard.

## Data Loading

- Use server-side pagination for the main list query.
- Use server-side filtering for all applied search conditions.
- Never load the full table into the browser on initial page load.
- Default backend ordering should use the page's primary business key when possible.
  - Example: `company_name_en`, `region_code`, `city_code`

## Sorting

- Table header sorting is UI-only and applies to the current page rows already loaded in memory.
- Do not trigger a new database request when the user clicks a sortable column header.
- Initial local sort state should match the backend default ordering for the first page.

## Search

- Search toolbar stays in a single compact ERP-style row when space allows.
- Text search uses fuzzy matching on the server for applied filters.
- Search suggestions are lightweight, field-specific queries limited to a small result set.
- Suggestions support keyboard up/down navigation.
- Selecting a suggestion fills the input only. It must not automatically execute search.
- Search executes only when the user clicks `Search` or presses `Enter` after suggestions are closed.

## Table Layout

- Do not show a leading `No.` index column.
- Use sticky table headers.
- Freeze the first business column on the left.
- Use compact row height and text-link style actions.
- Keep empty and loading states inside the table body.

## Dialogs

- Dialogs must adapt to viewport size.
- Large forms scroll inside the dialog instead of overflowing the screen.
