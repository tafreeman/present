# Presentation System

React 18.2 + Vite 5 presentation platform. 8 registered content decks, 34 registered layouts, 15 themes, 4 style modes.

## Quick Start

```bash
npm install && npm run dev       # Dev on :5173
npm run storybook                # Storybook on :6006
npm run build                    # Production build
npm run export:all               # Export HTML + images + PDF
```

## Architecture

- **Entry:** `src/App.v14.tsx` (~900 lines) — deck factory, transcription, state management
- **Registry:** `layoutRegistry.register(id, Component)` — 34 IDs across 8 families (`src/layouts/register-all.ts`)
- **Transcription:** `transcribeTopic(topic, family)` reshapes content across layout families (`src/transcription.ts`)
- **Tokens:** `src/tokens/*.ts` — `Theme`, `StyleMode`, `TypeScaleEntry` interfaces; 15 themes × 4 style modes
- **Content:** `src/content/*/structure.js` + `content.json` — 8 registered decks (migrated pattern)
- **ContentRegistry:** `src/content/content-registry.ts` — runtime deck + content-pack swapping
- **MergeDeckContent:** `src/content/merge-deck-content.ts` — 5-step cascading match algorithm
- **ControlPanel:** Floating right-side drawer (DECK / THEME / STYLE / RENDER AS / EFFECTS / BACKGROUND)

## App Versions (main.tsx)

v10 (monolith), v10.2 (dense monolith), v13 (extracted), v14 (registry-based, current)

## Layout Families

base (6), verge-pop (6), sprint (1), onboarding (7), handbook (5), engineering (4), advocacy (5), advocacy-dense (5) = 34 total

## Storybook

60 stories, autodocs enabled. ThemeContext + ChromeContext decorator with theme/chrome toolbar selectors in `.storybook/preview.jsx`.

## Gotchas

- Rollup does NOT auto-resolve `.js` → `.ts` — update import paths when renaming
- Tokens are `.ts` with exported interfaces — import with `.ts` extension
- All components are `.tsx`, stories remain `.jsx`
- No vitest — visual testing only via Storybook
- `@storybook/addon-actions` not installed — use `console.log` shim instead
- `stat-cards-manifest` is auto-routed by LayoutRenderer (not directly selectable) — check MANIFEST_FIELDS in LayoutRenderer.tsx
- `LayoutRenderer` passes `topic` prop (not `slide`) to components — both are the same object, naming is a legacy alias
- Zod is in `dependencies` but `validateDeckManifest()` in `src/patterns/decks/schema.ts` is NOT called at runtime — see docs/DOCUMENTATION-REVIEW.md DEBT-002
- **KNOWN BUG:** `Particles type="future"` is used in 5 layouts but may not be a valid Particles variant — see docs/DOCUMENTATION-REVIEW.md BUG-001
