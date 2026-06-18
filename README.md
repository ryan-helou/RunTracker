# RunTracker

A live splitting tracker for Wii speedruns — **New Super Mario Bros. Wii**,
**Mario Kart Wii**, and **Mario Party 9**. Pick a game and category, run a
single continuous timer, tap your bound key at the end of every level/track, and
watch each segment land **green when you're ahead** of your personal best and
**red when you're behind**. Every run is saved to your account.

Built with **Next.js (App Router) + React + TypeScript**, **Neon Postgres**, and
a small custom username/password auth layer. Designed to deploy on **Vercel**.

---

## Features

- **Continuous RTA timer** — one monotonic clock; each split records the
  cumulative time and the per-segment time is derived from it (LiveSplit model).
- **Pace vs. Personal Best** — per-split ± deltas (green ahead / red behind), a
  live overall delta on the main clock, **gold-split** highlighting for new best
  segments, live **Best Possible Time** (current pace + golds for the rest) with
  possible-save-vs-PB, **Sum of Best**, and a per-category **attempt counter**.
- **Game feel** — synthesized **sound cues** (split / gold / new-PB / reset) with
  a mute toggle, **fullscreen focus mode**, and **double-tap reset** so an
  accidental keypress can't nuke a run.
- **Auto-split (beta — NSMBW + Mario Kart Wii)** — listens to the game audio and
  splits automatically when it hears the level-clear sound. **NSMBW works with
  zero calibration** via a built-in spectral fingerprint of the course-clear /
  castle-clear jingles (`scripts/build-default-templates.mjs`); other games learn
  the sound from a quick one-time calibration. Robust detection (DTW + adaptive
  noise-floor + onset gating) runs on an AudioWorklet so it keeps working while
  you're focused on the game. Capture via an audio input (capture card / virtual
  device) or a browser tab. Manual key stays as a backup.
- **Rebindable keys** — bind *any* physical key to Split, Undo, Skip,
  Pause/Resume, and Reset (stored per browser).
- **During-run controls** — start, split, skip a split, undo (step back / re-open
  a finished run), pause/resume, reset.
- **Post-run editing** — fix mis-timed splits, toggle skipped/completed, add a
  note, or delete a run.
- **Name-only accounts** — type your name and you're in (created on first use,
  no password). Private run history, PBs computed per category. Up to ~5 users,
  all on Neon's free tier.

## Stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js 16 (App Router), React 19, TypeScript     |
| Styling        | Tailwind CSS v4 (custom dark "arcade" theme)      |
| Database       | Neon Postgres (`@neondatabase/serverless`)        |
| Auth           | name-only sign-in + signed JWT session cookie (jose)|
| Hosting        | Vercel                                            |

---

## Local setup

### 1. Create a Neon database

1. Sign up at <https://console.neon.tech> and create a project.
2. Open **Connection Details** and copy the **pooled** connection string
   (the host contains `-pooler`). It looks like:
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require`

### 2. Configure environment

`.env.local` already exists with a generated `AUTH_SECRET`. Paste your Neon
string into it:

```bash
DATABASE_URL="postgresql://...-pooler...sslmode=require"
AUTH_SECRET="<already generated for you>"
```

### 3. Create the tables

```bash
npm run db:push
```

This applies [`src/lib/schema.sql`](src/lib/schema.sql) (idempotent).

### 4. Run it

```bash
npm run dev
```

Open <http://localhost:3000>, create an account, pick a category, and hit Start.

---

## Deploying to Vercel

1. Push this repo to GitHub and **Import** it in Vercel.
2. In the Vercel project, add the **Neon** integration (Marketplace) or set the
   environment variables manually:
   - `DATABASE_URL` — your Neon pooled connection string
   - `AUTH_SECRET` — generate with `openssl rand -hex 32`
3. Deploy. Run `npm run db:push` once against the production database (locally,
   with `DATABASE_URL` pointed at prod) to create the tables.

---

## How the timer works

- The clock is **real-time (RTA)** and monotonic (`performance.now()`).
- Pressing **Split** records the current cumulative time. The segment time is
  `cumulative − previous cumulative`. Pressing Split on the final split finishes
  the run.
- **Personal Best** is the lowest *completed* total for that category; its
  cumulative splits are the comparison line. **Gold segments** are your best-ever
  time for each individual split across all runs; their sum is the **Sum of Best**.

## Project layout

```
src/
  app/
    api/auth/{register,login,logout,me}/route.ts   # auth endpoints
    api/runs/route.ts, api/runs/[id]/route.ts      # run CRUD
    api/comparison/route.ts                        # PB + gold computation
    play/[game]/[category]/page.tsx                # live run screen
    runs/[id]/page.tsx                             # post-run editor
    dashboard/page.tsx, login, register, page.tsx
  components/                                       # UI (RunScreen, etc.)
  hooks/useRunEngine.ts, useHotkey.ts, useKeybindings.ts
  lib/catalog.ts                                    # games / categories / splits
  lib/{db,auth,comparison,runs,format,keys,types}.ts
scripts/migrate.mjs                                 # `npm run db:push`
```

## Categories & splits

Game/category/split definitions live in [`src/lib/catalog.ts`](src/lib/catalog.ts).
Only categories with **2+ splits** are included (single individual levels are
intentionally excluded). Mario Kart Wii cup/track data is final; NSMBW and Mario
Party 9 routes are being reconciled against speedrun.com research and may be
expanded.
