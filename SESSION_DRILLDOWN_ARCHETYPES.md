# Session drilldown archetypes

The session detail page (`app/sessions/[id]/page.tsx`) currently renders one
layout for all six `SessionMode`s, with the only mode-awareness being "hide the
dispersion plot on Course rounds". But each mode was captured with a different
*intent*, so the drilldown should answer a different question in each case.

This doc characterises that. **Status: built** — the session detail page
(`app/sessions/[id]/page.tsx`) now routes by mode to one of the drilldowns
below. See "Implementation" at the foot.

## Principle

Drive the drilldown off **intent**, not mode count. The six modes collapse into
**three templates**. Pick the template by what the golfer was trying to do, then
let the headline metric and hero follow from that.

## The six modes, by aim

| Mode | What the golfer was doing | Question the drilldown answers | Headline metric |
|---|---|---|---|
| **Range** | Free hitting, multiple clubs | "Is my swing/bag in good shape?" | Consistency + dispersion |
| **Practice** | Focused work on a club/shot | "Am I grooving this club?" | Per-club consistency & trend |
| **Target Range** | Hitting to a chosen carry/target | "Did I hit my number, on line?" | Proximity to intended distance |
| **Combine** | Standardised skills test across distances | "What did I score, where's the gap?" | Combine score vs benchmark |
| **Closest to Pin** | Proximity game | "Best shot? How close on average?" | Closest shot + avg proximity |
| **Course** | Playing holes for score | "What did I shoot, and why?" | Score vs par + GIR/fairways |

## The three templates

### ① Diagnostic — Range, Practice
The **current** view is already correct here. Dispersion is the anchor;
consistency + club gapping + trend-vs-baseline is the story. No target, no score.
- *Practice* should lean harder on the single-club trend, since the intent is
  grooving one club rather than surveying the bag.
- Needs no new data.

### ② Target / scored — Target Range, Combine, Closest to Pin
Shared idea: **intent vs result.** The hero stops being a dispersion centroid and
becomes *proximity to a target*.
- **Target Range** → distance-control table: per shot, Δ from target carry,
  left/right bias, % of shots within tolerance.
- **Combine** → a *scorecard*: per-station (distance) score, best/worst station,
  vs prior combines + a benchmark band. Dispersion is irrelevant here.
- **Closest to Pin** → ranked leaderboard of shots by proximity, make-rate inside
  circles (inside 10/20 ft), winning shot pinned with its video.

### ③ On-course — Course
The opposite of a range view: hole-by-hole scorecard, fairways hit / GIR, scoring
by club category, approach proximity. Already hides dispersion. This is a
scorecard, not a metrics dump.

## Data-model gaps (what a build would require)

`lib/types.ts` has no concept of *intent* today. The diagnostic template needs
nothing new; the other two require enrichment:

- **Target distance** per shot or session → enables Target Range / Closest to Pin
  proximity. Missing.
- **Station / combine score** → enables the Combine scorecard. Missing.
- **Hole number** on `Shot` → enables Course hole-by-hole. Only the aggregate
  `CourseInfo` (par / strokes / holesPlayed) exists today.

Note: `Closest to Pin` is a defined `SessionMode` but does not appear in the
generated mock data yet.

## Implementation

`app/sessions/[id]/page.tsx` keeps the shared header (title, meta, share/
export) and routes the body by `session.mode` to a drilldown component:

| Mode | Component | Hero |
|---|---|---|
| Range, Practice | `DiagnosticDrilldown` | Session score donut |
| Target Range | `TargetRangeDrilldown` | Avg proximity + on-target % + miss bias |
| Combine | `CombineDrilldown` | Combine score donut + station scorecard |
| Closest to Pin | `ClosestToPinDrilldown` | Closest shot (ft) + inside-circle counts |
| Course | `CourseDrilldown` | Final score vs par + hole-by-hole scorecard |

Data model (`lib/types.ts`): `Shot.targetCarry` (target-based modes),
`Shot.hole` + `CourseInfo.holes: HoleResult[]` (course). Generated in
`lib/mockData.ts` (Combine stations, target tagging, hole scorecard).
Reads computed in `lib/stats.ts`: `shotProximity`, `targetRangeResult`,
`combineResult`, `closestToPinResult`, `courseScorecard`.

### Follow-ups not yet done
- Practice still uses the plain diagnostic view — could lean harder on the
  single-club trend since that's the intent.
- The coach **share** page (`app/share/[id]`) still shows the diagnostic
  view for every mode — it should mirror these archetypes too.
