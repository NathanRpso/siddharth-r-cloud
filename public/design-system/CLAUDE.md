# Rapsodo Design System

This folder is a self-contained Rapsodo design system. When building UI for any Rapsodo product, follow the rules, tokens, and components defined here **before** inventing new patterns.

> **For AI agents (Claude Code, etc.):** read this entire file, then skim `reference/` for the visual spec of any component before implementing. All tokens live in `tokens.css` — import it once at your app's entry, don't redefine values.

---

## Folder layout

```
rapsodo-design-system/
├── CLAUDE.md                  ← you are here
├── README.md                  ← human-facing overview + how to install
├── tokens.css                 ← THE source of truth: colors, type, spacing, shadows, motion
├── fonts/                     ← Barlow (7 weights) + Acumin Pro ExtraCondensed (display)
├── assets/
│   ├── icons/
│   │   ├── stroke/            ← 102 line icons (Heroicons-style, 24×24, currentColor stroke)
│   │   ├── metric/            ← 15 sport-metric glyphs (launch angle, spin rate, etc.)
│   │   └── store/             ← App Store / Google Play / Galaxy Store badges
│   ├── logos/                 ← Wordmark + R-mark + sport lockups (baseball/golf/softball)
│   │   └── fig/               ← Raw export variants (sport marks, champions lockup)
│   └── brand/                 ← Decorative SVGs (dot-grid, plus-grid, circles)
└── reference/                 ← Rendered HTML component gallery
    ├── index.html             ← Hub — open this to browse
    ├── buttons.html           ├── forms.html        ├── feedback.html
    ├── controls.html          ├── modals.html       ├── dropdowns.html
    ├── navigation.html        ├── avatars.html      ├── bullets.html
    ├── date-picker.html       ├── product-cards.html
    ├── colors.html            ├── typography.html   ├── spacing-radii-shadows.html
    ├── iconography.html       └── logos-and-brand.html
```

---

## How to use this system

### 1. Install tokens and fonts

Copy `tokens.css` and the `fonts/` folder into your app. Import tokens **once** at the root (e.g. in `app/globals.css`, `src/index.css`, `_app.tsx`, or equivalent):

```css
@import "./rapsodo-design-system/tokens.css";
```

`tokens.css` defines `@font-face` rules for Barlow and Acumin — **keep the `fonts/` folder adjacent** to `tokens.css` at the path `./fonts/*.ttf|otf` (or adjust the URLs inside `tokens.css` to match your asset pipeline).

### 2. Use CSS custom properties, not raw values

Always reference tokens by variable. Do not hard-code hex values, pixel sizes, or shadows.

```css
/* ✅ Good */
.cta {
  background: var(--rap-red);
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

/* ❌ Bad — bypasses the system */
.cta { background: #CD1B32; padding: 12px 20px; border-radius: 8px; }
```

### 3. Consult `reference/` before building components

Every major component has a rendered HTML page with the exact markup, spacing, states, and interactions. **Read the source of the reference file** for the component you need — don't guess.

Examples:
- Building a form? → `reference/forms.html`
- Need a modal? → `reference/modals.html`
- Adding an alert or toast? → `reference/feedback.html`

---

## Design tokens — quick reference

Full list lives in `tokens.css`. This is the critical subset.

### Brand colors
| Token | Value | Use |
|---|---|---|
| `--rap-red` | `#CD1B32` | Primary action, focus, brand accent |
| `--rap-red-hover` | `#B81729` | Hover state for primary |
| `--rap-red-dark` | `#A41E22` | Deep brand (pressed, dark backgrounds) |
| `--rap-black` | `#000000` | Inverse surfaces, dark hero |
| `--rap-white` | `#FFFFFF` | Base surface |

### Sport accents (use sparingly — only when product is sport-specific)
| Token | Value | Product |
|---|---|---|
| `--sport-baseball` | `#2B73DF` | Baseball (cobalt) |
| `--sport-golf` | `#1BE377` | Golf (vivid green) |
| `--sport-softball` | `#F5E907` | Softball (bright yellow) |

Each sport has a 400/500/700/900 ramp — see `tokens.css`.

### Neutrals (10-stop ramp)
`--neutral-0` (white) → `--neutral-950` (near-black). Use role-based aliases where possible:
- `--text-primary` / `--text-secondary` / `--text-tertiary` / `--text-disabled` / `--text-inverse`
- `--surface-0` / `--surface-1` / `--surface-2` / `--surface-3` / `--surface-inverse`
- `--border-subtle` / `--border-default` / `--border-strong` / `--border-focus`

### Semantic
`--success` `#16A34A` · `--warning` `#F59E0B` · `--danger` `#DD393A` · `--info` `#2B73DF`
Each has a matching `-bg` token for tinted backgrounds.

### Typography
**Two families, intentional division of labor:**

- **Display — `--font-display`** → `"Acumin Pro ExtraCondensed", "Barlow Condensed", sans-serif`
  Italic, bold, uppercase. For hero headlines, section titles, marketing. **All `<h1>`–`<h6>` default to this** (see `tokens.css` base reset).
- **Body — `--font-sans`** → `"Barlow", system-ui, sans-serif`
  UI text, paragraphs, labels, buttons. Weights 100–800 available.

**Display scale:** `--display-xxl` (96) · `-xl` (72) · `-lg` (56) · `-md` (40) · `-sm` (32) · `-xs` (24)
**Text scale:** `--text-2xl` (24) · `-xl` (20) · `-lg` (18) · `-md` (16) · `-sm` (14) · `-xs` (12) · `-2xs` (10)

**Utility classes** (defined in `tokens.css`, safe to use directly):
`.type-display-xxl` `.type-display-xl` `.type-display-lg` `.type-display-md` `.type-display-sm`
`.type-h1` `.type-h2` `.type-h3` `.type-h4`
`.type-body-lg` `.type-body` `.type-body-sm`
`.type-label` `.type-label-sm` `.type-eyebrow` `.type-caption` `.type-mono`

### Spacing (4px base)
`--space-0` (0) · `-1` (4) · `-2` (8) · `-3` (12) · `-4` (16) · `-5` (20) · `-6` (24) · `-8` (32) · `-10` (40) · `-12` (48) · `-16` (64) · `-20` (80) · `-24` (96) · `-32` (128)

### Radii
`--radius-xs` (2) · `-sm` (4) · `-md` (8, buttons) · `-lg` (12) · `-xl` (16) · `-2xl` (24, cards) · `-3xl` (40, large panels) · `-pill` (9999)

### Shadows
`--shadow-xs` · `-sm` · `-md` · `-lg` · `-xl` (downward)
`--shadow-up-sm` · `-up-md` · `-up-lg` (upward — dropdowns, floating toolbars)
`--ring-brand` (focus glow on brand) · `--ring-focus` (focus ring on info)

### Motion
`--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)` · `--ease-in-out` `cubic-bezier(0.65, 0, 0.35, 1)`
`--dur-fast` (120ms) · `--dur-base` (200ms) · `--dur-slow` (320ms)

---

## Using assets

### Logos (`assets/logos/`)
- `rapsodo-wordmark.svg` — default company wordmark (horizontal)
- `rapsodo-wordmark-compact.svg` — tight layouts
- `rapsodo-r-mark.svg` / `rapsodo-bigR.svg` — icon-only mark (favicon, avatar)
- `rapsodo-baseball-*.svg` / `rapsodo-golf-*.svg` / `rapsodo-softball-*.svg` — sport lockups (stacked + text variants)
- `rapsodo-mlm-pro.svg` — MLM2PRO product mark
- `fig/` — raw export variants (rarely needed)

**Minimum clear space:** equal to the height of the "R" in the wordmark. See `reference/logos-and-brand.html`.

### Icons (`assets/icons/`)

**`stroke/` — UI icons** (Heroicons-style, 24×24 viewbox, currentColor stroke)
Inline as `<img>` or paste the SVG for color control. 102 icons available — `arrow-*`, `check`, `chevron-*`, `x`, `search`, `menu`, `user`, `bell`, `cog`, `trash`, `pencil`, etc.

```html
<!-- Via img (simple, but no color control) -->
<img src="/assets/icons/stroke/chevron-right.svg" width="20" height="20" alt=""/>

<!-- Inline SVG (can recolor with currentColor) -->
<svg class="icon"><use href="/assets/icons/stroke/chevron-right.svg#icon"/></svg>
```

**`metric/` — Sport metric glyphs** (filled, 48×48, for stat displays)
`launch-angle`, `ball-speed`, `spin-rate`, `apex`, `carry`, `smash-factor`, `club-speed`, `club-path`, `angle-of-attack`, `spin-axis`, `descent-angle`, `launch-direction`, `shot-type`, `side-carry`, `total-carry`.

**`store/` — App store badges** (use at official size/spacing)
`app-store.svg`, `google-play.svg`, `galaxy-store.svg`, plus `available-on.svg` and `get-it-on.svg` eyebrow labels.

### Brand decorative (`assets/brand/`)
`dot-grid.svg`, `plus-grid.svg`, `circles-1/2/3.svg` — use as background patterns on hero sections, marketing modules. See usage in `reference/buttons.html` (plus-grid behind CTA card).

---

## Component rules

### Buttons
- **Primary:** `background: var(--rap-red)`, `color: white`, `padding: 12px 20px`, `border-radius: var(--radius-md)`, `letter-spacing: var(--tracking-cta)` (0.07em), uppercase, weight 600.
- **Secondary:** transparent bg, 1px solid `var(--border-default)`, `color: var(--text-primary)`.
- **Ghost:** no bg or border, `color: var(--rap-red)`.
- **Destructive:** `background: var(--danger)`.
- **Sport variants:** swap `--rap-red` for the sport token (`--sport-baseball`, etc.) when inside a sport-specific product surface.

Full examples: `reference/buttons.html`.

### Forms
- Input height 44px (`--space-11`-ish — use `padding: 10px 14px`), radius `--radius-md`.
- Border: `--border-default` default, `--rap-red` on focus with `box-shadow: var(--ring-brand)`.
- Labels: `.type-label` above input, `--text-secondary` helper text below.
- Error: `--danger` border + helper text.

Full examples: `reference/forms.html`.

### Cards
- Radius `--radius-2xl` (24px) — the signature Rapsodo card radius.
- Padding `--space-6` minimum.
- Shadow `--shadow-sm` at rest, `--shadow-md` on hover.
- Dark-surface cards (common in product UI): `background: var(--neutral-900)`, `color: white`, 1px border `var(--neutral-800)`.

### Headings
Headings default to `--font-display` (Acumin, italic, bold, uppercase) via the base reset in `tokens.css`. If you want a non-display heading (e.g. a card title that feels more like UI than marketing), explicitly apply `.type-h2`/`.type-h3`/etc. which switch to Barlow + sentence case.

---

## Do / Don't

✅ **Do**
- Import `tokens.css` once at the root; reference variables everywhere else.
- Use `--font-display` (italic uppercase) for hero and section headlines — it's the signature.
- Use neutral ramp + one accent color per surface. Sport colors are accents, not backgrounds.
- Keep Rapsodo Red as the *single* action color. Other colors communicate status only.
- Cards at `--radius-2xl` (24px). Buttons at `--radius-md` (8px).

❌ **Don't**
- Hard-code hex values or pixel sizes. Always use tokens.
- Mix sport colors (don't put golf green next to baseball blue unless intentionally cross-sport).
- Use the display font for body text or long paragraphs — it's italic uppercase, it will hurt to read.
- Use emoji in product UI — use icons from `assets/icons/stroke/`.
- Invent new shadow recipes — pick from the `--shadow-*` ladder.

---

## Framework mapping

These rules apply across React, Vue, SwiftUI, native — the tokens are CSS, but the values are universal.

**React + Tailwind:** extend Tailwind's theme to read from the CSS custom properties, or translate the token values into `tailwind.config.js`. Import `tokens.css` once for the font-faces + custom properties.

**CSS-in-JS / styled-components:** access tokens via `var(--rap-red)` in template literals. Don't duplicate values into a JS theme object — let CSS be the source of truth.

**SwiftUI / native:** translate `tokens.css` into a `Tokens.swift` (or equivalent) by hand. Keep names aligned (`Colors.rapRed`, `Spacing.space4`).

---

## Provenance

This system was reconstructed from an internal Rapsodo Figma file (`03. Base.fig`). Where the source values were ambiguous, reasonable production-grade defaults were chosen (notably the neutral ramp stops and shadow recipes). The Acumin Pro ExtraCondensed font is the source-of-truth display face; Barlow Condensed Italic is a documented fallback.

Questions, gaps, or mismatches with current Figma? File against the design-system owner. Do not silently drift.
