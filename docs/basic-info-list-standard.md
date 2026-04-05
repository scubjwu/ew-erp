# Basic Info List Standard

All Basic Info list pages must follow this performance and interaction standard.

## Data Loading

- Use server-side pagination for the main list query.
- Use server-side filtering for all applied search conditions.
- Never load the full table into the browser on initial page load.
- Default backend ordering should use the page's primary business key when possible.
  - Example: `company_name_en`, `region_code`, `city_code`

## Sorting

- Table header sorting should follow the same sorting mode used by the page query contract.
- For delivered `System Codes` pages, sorting now follows the applied page query and should stay aligned with export output.
- Do not mix current-page-only sorting and query-backed sorting within the same page pattern.
- Default sort should still follow the page's primary business key when practical.

## Search

- Search toolbar keeps fields grouped together and places `Search` / `Reset` as a stable right-aligned action group.
- Text search uses fuzzy matching on the server for applied filters.
- Search suggestions are lightweight, field-specific queries limited to a small result set.
- Suggestions support keyboard up/down navigation.
- Selecting a suggestion fills the input only. It must not automatically execute search.
- Search executes only when the user clicks `Search` or presses `Enter` after suggestions are closed.

## Table Layout

- Do not show a leading `No.` index column.
- Use sticky table headers.
- Freeze the first business column on the left.
- Keep the `Actions` column fixed on the far right when row actions exist.
- Use compact row height and text-link style actions.
- Keep empty and loading states inside the table body.

## Dialogs

- Dialogs must adapt to viewport size.
- Large forms scroll inside the dialog instead of overflowing the screen.
