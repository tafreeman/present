# Review Scope

## Target

Full codebase review of the `present` React 18 + Vite 5 + TypeScript presentation platform.
This is a registry-based slide deck system (v14 strangler-fig architecture) with 10 decks,
34 registered layouts across 8 families, 15 themes, and 4 style modes.

The review is combined with documentation generation — reviewers should also flag
**correctness of implementation patterns** (registry, transcription, context, token system)
so subagents can document the actual intent vs what the code does.

## Files

### Core Application
- `src/App.v14.tsx` (~900 lines) — deck factory, transcription, state management, entry point
- `src/main.jsx` — app version selector

### Layout System
- `src/layouts/registry.ts` — layout registry (singleton)
- `src/layouts/register-all.ts` — side-effect import that registers all 34 layouts
- `src/layouts/LayoutRenderer.tsx` — dynamic layout dispatch
- `src/layouts/base/` — 6 base layouts (TwoCol, StatCards, BeforeAfter, ProcessLanes, HStrip, ProcessCycle)
- `src/layouts/verge-pop/` — 6 verge-pop layouts
- `src/layouts/sprint/` — 1 sprint layout
- `src/layouts/onboarding/` — 7 onboarding layouts
- `src/layouts/handbook/` — 5 handbook layouts
- `src/layouts/engineering/` — 4 engineering layouts
- `src/layouts/advocacy/` — 5 advocacy layouts
- `src/layouts/advocacy-dense/` — 5 advocacy-dense layouts
- `src/layouts/*/register.ts` — per-family registration files

### Content System
- `src/content/content-types.ts` — TypeScript types for deck content
- `src/content/content-registry.ts` — runtime content swapping
- `src/content/merge-deck-content.ts` — content merging utility
- `src/content/*/deck.js` — 10 deck data files
- `src/content/*/structure.js` — slide structure definitions
- `src/content/*/content.json` — slide content data

### Token/Theme System
- `src/tokens/themes.ts` — THEMES + THEMES_BY_ID exports
- `src/tokens/style-modes.ts` — STYLE_MODES + STYLE_MODES_BY_ID exports
- `src/tokens/palette.ts` — color resolution utilities
- `src/tokens/raw-themes/*.json` — raw theme token definitions (15 themes)

### Component Library
- `src/components/context/ThemeContext.ts` — React context for theme
- `src/components/context/ChromeContext.ts` — React context for chrome/UI state
- `src/components/hooks/useTheme.ts` — theme hook
- `src/components/hooks/useChrome.ts` — chrome hook
- `src/components/hooks/usePresentationViewport.ts` — viewport scaling hook
- `src/components/animations/` — CometTransition, ThematicIntro, Particles
- `src/components/cards/` — BeforeAfterPair, LandingTile, StatCard, TopicCard
- `src/components/compound/` — ProcessLane, ProcessNode, SectionHeader
- `src/components/micro/` — BadgePill, CalloutBox, Eyebrow, IconButton, QuoteBlock, StatValue
- `src/components/navigation/` — BackBtn, ControlPanel, DeckPicker, ThemeSelector, OptionalDeckLink

### Transcription System
- `src/transcription.ts` — cross-family layout normalization (topic → layout shape)

### Build / Config
- `package.json` — React 18.2, Vite 5.4, TypeScript 5.9, Storybook 10, Playwright
- `tsconfig.json` — TypeScript configuration
- `vite.config.ts` — build configuration
- `scripts/` — export scripts (HTML, images, PDF)

### Storybook
- `.storybook/` — Storybook configuration
- `src/**/*.stories.jsx` — component stories (60 total, autodocs enabled)

## Flags

- Security Focus: no
- Performance Critical: no
- Strict Mode: no
- Framework: React 18 + Vite 5 + TypeScript (strict)

## Review Phases

1. Code Quality & Architecture
2. Security & Performance
3. Testing & Documentation
4. Best Practices & Standards
5. Consolidated Report + Documentation Generation

## Key Patterns to Investigate for Correctness

1. **Layout Registry Pattern** — Is the singleton registry correctly populated via side-effect imports? Race conditions? Missing registrations?
2. **Transcription System** — Does `transcribeTopic()` correctly normalize content across layout families? Edge cases?
3. **Context Architecture** — Are ThemeContext/ChromeContext correctly structured? Provider placement?
4. **Token Resolution** — Are `resolveTopicColors()` and `resolveIntroStatColors()` correctly applied?
5. **Content Registry** — Is runtime content swapping (`isContentSwappable`, `buildDeckFromContent`) correct?
6. **Strangler Fig Migration** — Is the v14 architecture properly extracted from the v10 monolith? Dead code?
7. **Storybook Integration** — Are ThemeContext/ChromeContext decorators correctly set up for stories?
