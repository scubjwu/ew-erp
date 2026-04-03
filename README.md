# EW ERP

## Local Development

Use the local Supabase stack by default. This keeps migrations, RLS, and the UI pointed at the same database.

### One-time setup

```bash
npm install
```

### Fixed local dev flow

Terminal 1:

```bash
cd /Users/palayapan/Documents/ew-erp
npm run db:start
npm run db:reset
```

Terminal 2:

```bash
cd /Users/palayapan/Documents/ew-erp
npm run dev:local
```

Open [http://localhost:3000](http://localhost:3000).

### Daily commands

Switch `.env.local` to local Supabase:

```bash
npm run env:local
```

Switch `.env.local` back to the hosted Supabase project:

```bash
npm run env:remote
```

Start the local Supabase stack:

```bash
npm run db:start
```

Replay all local migrations into the local database:

```bash
npm run db:reset
```

This command first snapshots current local basic-info data, customers, `users`, and the standalone partner master-data tables into seed files, then resets the local database.

### Required smoke test after new page delivery

When a new CRUD page is created, do not stop at route rendering.

Minimum required local verification after `npm run db:reset`:

- list / new / view / edit routes load successfully
- create and edit succeed through the same browser-write path used by the page
- every declared search field is checked with at least one positive match
- `Reset` restores the unfiltered result set
- filtered export is verified against the same filters used by the list page
- attachment child-table writes are checked when the page owns attachments
- temporary smoke-test data is cleaned up unless it is intentionally moved into managed seed files

This is a standing rule for all newly delivered editable pages.

### Daily regression

Use this flow for daily regression on delivered editable pages:

Terminal 1:

```bash
cd /Users/palayapan/Documents/ew-erp
npm run db:start
```

Terminal 2:

```bash
cd /Users/palayapan/Documents/ew-erp
npm run dev:local
```

Terminal 3:

```bash
cd /Users/palayapan/Documents/ew-erp
npm run db:reset
npm run test:regression
```

If `next dev` is not running on port `3000`, run the daily gate with an explicit base URL:

```bash
cd /Users/palayapan/Documents/ew-erp
EW_ERP_BASE_URL=http://localhost:3001 npm run test:regression
```

Current `npm run test:regression` coverage includes:

- dashboard-level UI regression coverage through `npm run test:regression:ui` for:
  - `System Codes Center`
  - `Company Information`
  - `Region Codes`
  - `City Codes`
  - `Depot Codes`
  - `Expense Codes`
  - `Condition Codes`
  - `Container Number Rules`
  - `Operation Price Configs`
  - `Size Codes`
  - `Type Codes`
  - `User Management`
  - `Vendors`
  - `Material Vendors`
  - `Lessees`
  - `Container Owners`
- route availability for all current non-inventory pages
- create and edit through the local browser-write path for:
  - `User Management`
  - `Customers`
  - `Vendors`
  - `Material Vendors`
  - `Lessees`
  - `Container Owners`
- attachment child-table writes where applicable
- search coverage for declared filters on current delivered editable page families
- reset-equivalent recovery to unfiltered results
- filtered export data-source validation
- reset-safe persistence regression for:
  - representative `Basic Info` restore coverage across company profile, region, city, depot, financial code, condition, size, type, container-number-rule, and operation-price seed tables
  - `users`
  - `vendors`
  - `material_vendors`
  - `lessees`
  - `container_owners`
  - and their attachment child tables
- verification that exported local seed files really contain the newly created records before reset
- verification that those records still exist after `supabase db reset`
- temporary regression data cleanup after the run

Treat the local regression command as the required daily gate for the currently delivered editable pages.

If you want a clean reset without overwriting seed files:

```bash
npm run db:reset:fresh
```

Start Next.js against local Supabase:

```bash
npm run dev:local
```

Start Next.js against remote Supabase:

```bash
npm run dev:remote
```

### Important rule

After switching between `env:local` and `env:remote`, restart the Next.js dev server. `next dev` only reads `.env.local` on startup.
