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
