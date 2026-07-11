# Vehicle Inventory Management System

A full-stack fleet inventory tracker for field crews. Vehicles are loaded with stock items before a trip; unused items are returned on arrival. The system tracks stock levels and reconciles each trip atomically.

## Tech Stack

- **Next.js** (App Router) + TypeScript
- **Supabase** (Postgres) for the database
- **Tailwind CSS** for styling
- **React** `useState` / `useEffect` + native `fetch` (no external state libraries)

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

## Local Setup

### 1. Clone and install

```bash
cd vehicle-inventory
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only — never expose to the browser) |

Find these in the Supabase dashboard under **Project Settings → API**.

### 3. Run database migrations

Apply the SQL migrations to your Supabase database. You can use either method:

**Option A — Supabase CLI**

```bash
supabase db push
```

**Option B — SQL Editor (manual)**

Open the Supabase SQL Editor and run each file in order:

1. `supabase/migrations/001_schema.sql`
2. `supabase/migrations/002_rls.sql`
3. `supabase/migrations/003_rpcs.sql`

### 4. Seed the database

```bash
npm run seed
```

This populates:

- 8 items (2 below reorder threshold)
- 3 vehicles
- 1 open trip (3 line items)
- 2 returned trips (one fully used, one partial return)

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the dashboard.

## Project Structure

```
vehicle-inventory/
├── supabase/migrations/   # Postgres schema, RLS, and RPC functions
├── scripts/seed.ts        # Database seed script
├── src/
│   ├── types.ts           # Shared TypeScript interfaces
│   ├── lib/supabase.ts    # Server-side Supabase client
│   └── app/
│       ├── dashboard/     # Overview: trips out + low-stock items
│       ├── items/         # Inventory management
│       ├── vehicles/      # Fleet management
│       ├── trips/         # Trip list, create, detail, return
│       └── api/           # REST API route handlers
└── README.md
```

## Design Decisions

### Why `trip_lines` is normalized

Each trip can carry multiple items, and each item's taken/returned quantities must be tracked independently. A normalized `trip_lines` table (one row per item per trip) avoids duplicating item data and makes it straightforward to query per-item usage across trips.

### How atomicity is achieved

Trip creation and returns involve multiple writes (insert trip, insert lines, update stock). These run inside Postgres RPC functions (`create_trip`, `return_trip`) called via `supabase.rpc()`. If any validation fails (e.g. insufficient stock), the entire transaction rolls back — stock levels never end up in an inconsistent state.

### Row Level Security

RLS is enabled on all tables with fully open policies. This is intentional for the assessment scope (no auth). In production, these would be replaced with user- or role-scoped policies, and the service role key would be restricted to admin operations.

## API Overview

| Endpoint | Methods | Description |
|---|---|---|
| `/api/items` | GET, POST | List / create items |
| `/api/items/[id]` | GET, PUT, DELETE | Read / update / delete (delete blocked if on open trip) |
| `/api/vehicles` | GET, POST | List / create vehicles |
| `/api/vehicles/[id]` | PUT | Update vehicle |
| `/api/trips` | GET, POST | List (filter `?status=out\|returned`) / create via RPC |
| `/api/trips/[id]` | GET | Trip detail with computed `qty_used` |
| `/api/trips/[id]/return` | POST | Process returns via RPC |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run seed` | Populate database with sample data |
| `npm run lint` | Run ESLint |
