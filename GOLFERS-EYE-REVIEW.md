# R-Cloud — Golfer's Eye Review

> Running notes from using R-Cloud like I just walked off the range. Written as a
> golfer, not a developer: "I'd want / I don't get / this is wrong." Organised to
> match the Friday template so it doubles as talk prep.

---

## First impression (before I knew anything)

I open it after a range session and the first question in my head is simple:
**"Did I hit it better today, yes or no?"**

- The home page looks sharp and serious — it feels like *my golf*, not like a gadget readout. Good. That's the brief, and it lands.
- But there's a *lot* on the first screen: a welcome banner, an "insight," 30-day stats, a trend chart, bag-at-a-glance, "where you stand," recent sessions, personal bests. My eye doesn't know where to rest. I want **one** answer at the top — "today was better/worse, here's the one reason why" — then let me dig.
- The thing I actually stared at first was **Bag at a glance** (how far I hit each club). That's the most "golfer" thing on the page. It should probably be even more front-and-centre.

---

## What works (genuinely landed for me)

1. **Bag at a glance / distance ladder.** This is the question every golfer asks — "how far do I hit each club?" Clear, visual, mine.
2. **The Sessions calendar heatmap.** Reads like a streak tracker. It quietly nudges me to practise more. Golfers are suckers for streaks — keep this.
3. **Dispersion plot (Performance → Bag).** "Where do my shots actually go" is *the* range question. Dots + average rings is exactly right.
4. **"How the round broke down" (session detail).** The birdie/par/bogey/double bar is instantly readable. I get my round in one glance.
5. **Shot Review video with stats on the edges + draw tools.** Watching the swing back with numbers around it, and being able to draw a swing-plane line, feels pro. This is a highlight.

---

## What doesn't (confusing, boring, or wrong — with examples)

1. **The Sessions list mixes two opposite scoring scales. (Biggest one.)**
   A course round shows **93** (strokes — *lower is better*). A range session shows **68** (a 0–100 grade — *higher is better*). Same list, same styling, opposite directions. As a golfer I read "93 vs 68" and think the 68 round was worse, when it's not even the same kind of number. **Fix:** label the range grade clearly (e.g. "Session grade 68/100") and visually separate it from a strokes score, or don't put a single number on range sessions at all.

2. **"Vs the typical 20-handicap" — who said I'm a 20?**
   Home's "Where you stand" and Performance's strokes-gained both compare me to a 20-handicap I never set. If I'm a 5 it's discouraging-by-accident; if I'm a 25 it's flattering nonsense. **I want to compare to *my own past self* first, and to a handicap *I* set.**

3. **Strokes gained is pro language with no "so what."**
   "+2.4 strokes/round" is a great number for me, but my dad (45, plays off 18) will not know what it means. Add one plain line: *"You'd shoot ~2 shots lower than a typical 20-handicap mostly because of your driver."*

4. **No short game. At all.**
   It's all full-swing launch-monitor data. But golf is won inside 100 yards. There's no putting, no chipping, no up-and-down tracking. For "is this about my golf?" — half my golf is missing.

5. **No takeaway / "what do I do next?"**
   It tells me *what happened* beautifully but never *what to work on*. After a session I want one sentence: "Next time, work on start-line with the driver." Right now I have to figure that out myself.

6. **Numbers with no reference.** The session-detail tiles (+22, 22%, 43%, 27) and the 30-day stats don't tell me if a number is good. Good vs bad needs a benchmark or a colour I trust.

---

## The language test (Solid / Variable / Tight / Wide)

- **Tight / Wide** — yes, I get these immediately. That's left-right dispersion. Keep.
- **Solid / Variable** — here's the trap: to a golfer **"solid" means *I flushed it*** (centre-face contact), not "my distances repeat." When I see "Solid" I think strike quality, not consistency. **"Variable"** is also a bit clinical.
  - Suggestion: for *distance consistency* use **Consistent / Streaky** (or Repeatable / Scattered). Save **Solid** for *strike quality*, where golfers already use that word.
- "Decent distance" pill — vague. Decent vs what? Tell me "longer than 80% of your 7-irons" or "right in your normal range."

**The one number per session type — and is it easy to find?**
- *Range / diagnostic:* my dispersion (consistency). Findable now, good.
- *Course round:* my score + GIR. Score is clear; GIR is buried in tiny tiles.
- *Scored session:* my score vs my best. The 0–100 grade is there but, per above, it collides with strokes.

---

## Practice modes (do they match how golfers actually practice?)

The split — **diagnostic** (find what's broken), **scored** (compete with yourself), **on-course** — is honestly close to how I practise. But:

- **Missing: short game / putting practice.** This is the big gap.
- **Missing: a warm-up / "just hitting balls" mode** that doesn't grade me. Sometimes I don't want a score; I want to loosen up.
- **Missing: block vs random.** Real improvement comes from random practice (different club every ball). A mode that forces/tracks that would be genuinely coach-approved.
- The names are fine, but I'd want to *pick the mode up front* and have the app coach me through it, not just label it afterward.

---

## Shot Review — what I wish the screen told me next to the clip

The video + edge stats + draw tools are great. Watching it back, here's what's missing:

- **A plain-English diagnosis of *this* shot.** Not just "Face -4°, Path +2°" — tell me *"this one leaked right: face open to your path at impact."*
- **Compare to my good one.** Let me pin my best 7-iron of the day and play it next to a bad one. That side-by-side is how golfers actually learn.
- **What to feel / fix.** One coaching cue tied to the miss.
- **Tag the shot** (flush / thin / fat / push / pull) so I can filter "show me my fat ones."

---

## If it were mine — the one thing I'd fix first

**Fix the Sessions scoring confusion** (strokes vs 0–100 grade looking identical). It's the first screen I scan to answer "how am I doing," and right now it actively misleads me. Cheap to fix, high trust payoff.

Right behind it: **let me set my handicap/goal and compare to my past self**, and **give me a one-line "work on this next" takeaway.**

---

## Ideas worth building (sandbox wishlist)

Ranked by how much a golfer would care:

1. **"Work on this next" takeaway card** — one focus + one drill, derived from the session data. Turns data into coaching.
2. **My handicap & goals setup** — so every comparison is personal (vs past me / vs my target), not a generic 20.
3. **Short game & putting tab** — even simple: putts/round, up-and-down %, proximity from 50/100 yds.
4. **My Bag reference / yardage book** — clean printable gapping with overlap/gap warnings ("your 4i and 5i carry the same — gap problem").
5. **Session notes** — a free-text "feels/swing thoughts" box per session. Every golfer keeps these.
6. **Shot tags + plain-English shot diagnosis in Shot Review.**
7. **Goal lines on trend charts** — "you're 4 yards from your driver goal."

---

*Daily sign-off habit (per the brief): end each day with a screenshot + one question to Nathan.*
