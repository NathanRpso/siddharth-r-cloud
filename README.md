# New R-Cloud Prototype

A reimagining of [Rapsodo R-Cloud](https://r-cloud.rapsodo.com/) as an
insights-first golf data platform. Built to explore what R-Cloud could feel
like if it led with what the golfer should *do* with their numbers — not just
the numbers themselves.

> **All data in this prototype is mocked.** A seeded RNG generates ~52 weeks of
> realistic 20-handicap sessions and shots so the surfaces have something
> credible to render. Nothing connects to a real launch monitor.

## What's in here

- **Home** (`/`) — Hero insight + 30-day quick stats, trend chart, bag preview,
  percentile bands, recent sessions, personal bests.
- **Sessions** (`/sessions`) — Card-based list with Session Score badges and
  All / Practice / Courses filtering.
- **Session Detail** (`/sessions/[id]`) — Big 0-100 Session Score with delta
  vs the prior session, metric tiles, highlight cards (Cleanest Strike,
  Longest Drive, Straightest, Fastest Ball), narrative takeaways, and a
  Saw improvement / Needs improvement diagnostic toggle.
- **Performance** (`/performance`) — Tabbed view across Bag, Strokes Gained,
  Accuracy, and Metrics.
- **Shot Review** (`/shot-review`) — Side-by-side video tile comparison for
  outlier-flagged shots.
- **Coach Share** (`/share/[id]`) — Read-only session view designed to be
  forwarded outside the app.
- **Profile** (`/profile`) — Persona / device / venue summary.

## Guiding principles

1. **Hardware-as-metadata.** There is no MLM2PRO vs MLM toggle. The device
   is a per-shot field, not a top-level navigation axis.
2. **Plain English over std-dev.** End-user copy says
   *Solid / Variable / Tight / Wide* — never σ, percentile, or coefficient
   of variation.
3. **Insights anchored to data.** Every narrative card carries a concrete
   eyebrow with the numbers behind the claim, so the takeaway doesn't feel
   pulled out of thin air.
4. **DS where it fits.** Uses the [Rapsodo Design System](https://design.rapsodo.com)
   tokens, icons, typography, and components by default. Deviates intentionally
   on consumer surfaces (Hero card, Highlight cards) where DS is too quiet.

## Persona

Alex Carter — UK, RH, 20+ handicap, mix of indoor (Lineworks Studio /
Putterz Mayfair) and outdoor (Smythe Park Golf Club) sessions, MLM2PRO
primary device with some legacy MLM history.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind + Rapsodo Design System tokens (`design-system/` under `public/`)
- Recharts for trend / dispersion / percentile charts
- Static export (`output: 'export'`) for GitLab Pages deploy

## New to git?

See [GIT_EXPLAINED.md](./GIT_EXPLAINED.md) for a crash course on how
this repo is meant to be worked on — clone, branch, commit, push,
merge — written for someone using Claude Code as their main editor.

## Running locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Building for deploy

```bash
npm run build
```

This produces a static export in `out/` ready for any static host.

## Deploy

Pushes to `main` deploy to GitLab Pages via `.gitlab-ci.yml`.
