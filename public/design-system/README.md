# Rapsodo Design System

A self-contained bundle of Rapsodo's design tokens, fonts, icons, logos, and component references. Drop into any codebase to use as the foundation for Rapsodo product UI.

## What's inside

- **`tokens.css`** — All design tokens (colors, typography, spacing, shadows, motion) as CSS custom properties. The single source of truth.
- **`fonts/`** — Barlow (7 weights) + Acumin Pro ExtraCondensed (display). Licensed assets; do not redistribute outside Rapsodo.
- **`assets/icons/`** — 102 UI icons + 15 sport-metric icons + store badges.
- **`assets/logos/`** — Rapsodo wordmark, R-mark, and sport lockups (baseball / golf / softball / MLM2PRO / Champions).
- **`assets/brand/`** — Decorative SVGs (dot-grid, plus-grid, circles) for hero and marketing surfaces.
- **`reference/`** — Rendered HTML component gallery. Open `reference/index.html` in a browser to browse every component at full fidelity.
- **`CLAUDE.md`** — Instructions for AI coding agents (Claude Code, Cursor, etc.) — read this if you're automating UI work.

## Quick start

1. Copy the entire `rapsodo-design-system/` folder into your project (e.g. into `vendor/`, `design-system/`, or similar).
2. Import tokens once at your app's root:
   ```css
   @import "./rapsodo-design-system/tokens.css";
   ```
3. Reference design values via CSS variables:
   ```css
   .button {
     background: var(--rap-red);
     padding: var(--space-3) var(--space-5);
     border-radius: var(--radius-md);
     font-family: var(--font-sans);
   }
   ```
4. Before building a component, open `reference/<component>.html` and copy the markup/styles.

## Using with Claude Code

`CLAUDE.md` at the root of this folder contains detailed instructions for Claude Code. When you run Claude Code in any directory containing this folder (or with this folder in the project), Claude will automatically read `CLAUDE.md` and apply the design system correctly.

To point Claude at this system explicitly:

```
"Read ./rapsodo-design-system/CLAUDE.md and use those tokens and components for this feature."
```

## Browsing the reference

Open `reference/index.html` in a browser — it links to every foundation and component page with live rendering.

## Versioning

v1.0 — Reconstructed from internal `03. Base.fig`. Internal use only.
