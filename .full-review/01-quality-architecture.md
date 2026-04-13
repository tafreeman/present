# Phase 1: Code Quality & Architecture Review

## Code Quality Findings

### CRITICAL

**C1. Massive `any` type abuse in transcription.ts — 200+ `as any` casts**
- **File:** `src/transcription.ts`, lines 25–660
- **Description:** The entire transcription module uses `as any` and `as any[]` on nearly every line. Every switch case casts topic fields through `any`, defeating TypeScript's purpose. A renamed field in content JSON silently produces `undefined` at runtime with no compile-time warning.
- **Example:** `leadershipPoints: (topic.cards as any[]).map((c: any) => ...)`
- **Fix:** Connect the existing `LayoutContentMap` in `content-types.ts` to a discriminated union type for `Topic`. Use switch-narrowing so the compiler validates each branch.

**C2. LayoutRenderer error handling uses try/catch — not a React Error Boundary**
- **File:** `src/layouts/LayoutRenderer.tsx`, lines 41–65
- **Description:** The try/catch around the component render only catches synchronous errors from the registry lookup. If the resolved Component throws during its own render cycle, React will crash the entire app — try/catch around JSX return is not how React error boundaries work.
- **Fix:** Wrap the resolved Component in a proper `React.ErrorBoundary` class component, or use the `react-error-boundary` library.

### HIGH

**H1. App.v14.tsx — 726 lines, 30+ state variables in one component**
- **File:** `src/App.v14.tsx`
- **Description:** The `App` component manages ~16 `useState` calls, ~10 derived values, inline styles spanning hundreds of lines, and the landing grid, layout cycler, and one-pager toggle all co-located. Natural seams (deck factory, state, UI) are commented but not extracted.
- **Fix:** Extract `useAppState` custom hook (or `useReducer`). Extract `LandingGrid`, `LayoutCycler`, and `OnePagerToggle` as sub-components. Extract `DECKS` and `createDeckPreset` to `src/content/deck-factory.ts`.

**H2. Duplicated `Topic` interface across all 34 layout files**
- **Files:** `TwoColLayout.tsx:18–36`, `AdvOverviewLayout.tsx:14–24`, `ArchitectureSlide.tsx:15–25`, and ~31 others
- **Description:** Each layout defines its own local `Topic` interface with `[key: string]: unknown`. These are nearly identical but subtly different. A shape change requires updating every layout's interface manually.
- **Fix:** Create a shared `SlideProps` interface in `src/layouts/types.ts`. The registry already defines `LayoutProps` — extend it.

**H3. `normalizeDeckTopics` silently patches missing fields with empty defaults**
- **File:** `src/App.v14.tsx`, lines 139–153
- **Description:** Every slide unconditionally receives `cards: []`, `heroPoints: []`, `talkingPoints: []`, `focusPanels: []`, `capabilities: []`, `lanes: []`. Layout components checking `topic.lanes?.length` get `0` instead of `undefined`, potentially rendering empty containers with no content.
- **Fix:** Default only fields required by the specific layout type, or let layouts handle their own defaults.

**H4. Missing parameter types in App.v14.tsx — implicit `any`**
- **File:** `src/App.v14.tsx`, lines 128, 132, 139, 155, 471, 491, 508
- **Description:** Functions `padTopicNumber`, `normalizeSprintNodes`, `normalizeDeckTopics`, `createDeckPreset`, `switchDeck`, `resetToDeckTheme`, `handleSelect` all have untyped parameters. With `strict: true` these should be compiler errors.
- **Fix:** Add explicit parameter and return types to all functions.

**H5. Content registry has massive boilerplate duplication**
- **File:** `src/content/content-registry.ts`, lines 51–151
- **Description:** `CONTENT_PACKS` and `DECK_STRUCTURES` are manually defined records with the same 8 entries in identical patterns. Adding a new deck requires updating 4 separate places.
- **Fix:** Use a factory function `registerDeck(id, content, structure)` or a single `DECKS` config array that derives both maps.

### MEDIUM

**M1. Singleton registry has no test seam and no reset method**
- **File:** `src/layouts/registry.ts`, line 124
- **Description:** Module-level singleton with no `clear()` or `reset()` method. HMR re-execution triggers "already registered; overwriting" warning on every save in development.
- **Fix:** Add `reset()` method for testing. Make the warn-on-overwrite configurable in dev.

**M2. `resolveLayoutKey` special-case logic belongs in the registry**
- **File:** `src/layouts/LayoutRenderer.tsx`, lines 29–35
- **Description:** The `stat-cards` → `stat-cards-manifest` routing based on `MANIFEST_FIELDS` is hard-coded in the renderer. Layout resolution should be the registry's responsibility.
- **Fix:** Move into the registry as a `resolve(layoutId, slide)` method.

**M3. Inline styles throughout all layout components and App.tsx**
- **Files:** All layout files, `App.v14.tsx`, `ControlPanel.tsx`
- **Description:** Every component uses inline `style={{...}}` objects with raw pixel values and hex colors recreated on every render. The `ControlPanel.tsx` alone has ~50 inline style objects. Impossible to search "where is card padding set" across the codebase.
- **Fix:** Extract repeated style patterns into constants or a `useStyles()` hook per component.

**M4. `usePresentationViewport` creates new object on every resize**
- **File:** `src/components/hooks/usePresentationViewport.ts`, lines 66–91
- **Description:** Every resize event creates a new `PresentationViewport` object, triggering re-renders in every consumer even when breakpoints haven't changed.
- **Fix:** Compare new viewport with previous before calling `setViewport`, or memoize on breakpoint values.

**M5. `transcribeToAdvocacyDense` uses fragile string replace**
- **File:** `src/transcription.ts`, lines 657–660
- **Description:** `base.layout.replace("adv-", "advd-")` assumes all advocacy layouts start with `"adv-"`. Any new layout not following this convention silently breaks dense transcription.
- **Fix:** Use an explicit `ADV_TO_DENSE: Record<string, string>` mapping.

**M6. `allLayouts` useMemo with empty deps**
- **File:** `src/App.v14.tsx`, line 520
- **Description:** `useMemo(() => layoutRegistry.list(), [])` computed once and never updates. Safe currently but fragile against future lazy-loaded layout families.

**M7. `hexToGlow` and `lightenHex` don't validate input**
- **File:** `src/tokens/palette.ts`, lines 10–23
- **Description:** Both functions assume 7-character `#RRGGBB` format. Shorthand hex (`#RGB`), named colors, or `rgba()` values produce garbage output.
- **Fix:** Add input validation or normalize hex inputs.

**M8. `border` property used in App.v14 but missing from Theme interface**
- **File:** `src/App.v14.tsx`, line 602
- **Description:** `T.border || "rgba(255,255,255,0.06)"` references a property not in the `Theme` interface. TypeScript should flag this under strict mode.

### LOW

**L1. ControlPanel ESC listener runs globally even when closed**
- **File:** `src/components/navigation/ControlPanel.tsx`, lines 143–149
- **Fix:** Add `open` to the dependency array or guard with `if (!open) return;`.

**L2. Font `<link>` rendered inside component body instead of `<head>`**
- **File:** `src/App.v14.tsx`, line 557
- **Fix:** Use `useEffect` to append/update the link element in `document.head`, or use `react-helmet`.

**L3. Magic numbers in animation delays across layout families**
- **Files:** `TwoColLayout.tsx:74`, `AdvOverviewLayout.tsx:99`, `ArchitectureSlide.tsx:65`
- **Fix:** Extract shared `STAGGER_DELAY` constant or `staggerDelay(index)` utility.

**L4. Deck preset definitions are highly repetitive**
- **File:** `src/App.v14.tsx`, lines 163–377
- **Fix:** Move deck metadata into content modules (many already export `deckMeta`) and generate `DECKS` programmatically.

**L5. Unused `import React` in some files**
- **Files:** `ArchitectureSlide.tsx:9`, `TwoColLayout.tsx:8`, `ControlPanel.tsx:1`
- **Fix:** Remove — React 17+ JSX transform doesn't require explicit import.

---

## Architecture Findings

### HIGH

**A1. App.v14.tsx Is a Fat Controller**
- **Severity: High**
- Serves as deck factory (lines 62–389), state manager (lines 406–451), UI renderer (lines 553–722), and orchestrator simultaneously. The file header acknowledges this as intentional "technical debt preserved from the monolith."
- **Recommendation:** Extract in phases: (1) `src/content/deck-factory.ts` for all deck data, (2) `usePresenterState()` custom hook, (3) `LandingGrid.tsx` and `LayoutCycler.tsx` sub-components.

**A2. Transcription Layer Bypasses the Typed Content System**
- **Severity: High**
- `transcription.ts` uses ~80+ `as any` casts in direct contradiction to the well-designed `LayoutContentMap` in `content-types.ts`. The typed interfaces exist but are disconnected from the runtime data path.
- **Recommendation:** Use discriminated union types based on layout ID, connected to `LayoutContentMap`.

### MEDIUM

**A3. LayoutRenderer Uses Try/Catch Instead of Error Boundary**
- **Severity: Medium**
- Standard React pattern violation. See C2 above.

**A4. Singleton Registry Lacks Testability Affordances**
- **Severity: Medium**
- No `reset()` or `clear()` method. Stories importing layout components may trigger double-registration warnings.
- **Recommendation:** Add `clear()` for testing. Consider accepting a registry instance via props/context for testability.

**A5. Deck Definitions and Structure Files Are Untyped JavaScript**
- **Severity: Medium**
- `deck.js` and `structure.js` files use plain JavaScript despite `DeckStructure`, `SlideStructure`, and `MergedDeck` TypeScript interfaces existing in `content-types.ts`.
- **Recommendation:** Migrate structure files to `.ts`. Type `createDeckPreset()` to accept and return a typed `DeckPreset`.

**A6. Content Registry Duplicates Deck Data Paths**
- **Severity: Medium**
- Two parallel paths: `deck.js` imports (static, used by default) and `content-registry.ts` (dynamic, used for runtime swap) both import the same source data.
- **Recommendation:** Have `deck.js` files self-register with the content registry.

### LOW

**A7. `LayoutProps` Interface Uses Permissive Index Signature**
- **Severity: Low**
- `src/layouts/registry.ts`: `[key: string]: any` on `LayoutProps` eliminates TypeScript's ability to catch prop mismatches.
- **Recommendation:** Use explicit optional props and discriminated union for `slide`.

**A8. `border` Missing from Theme Interface (see also M8)**
- **Severity: Low**

---

## Migration Status

| Phase | Status |
|-------|--------|
| v10/v13 monolith files removed | COMPLETE |
| 25-case switch replaced with registry | COMPLETE |
| ThemeContext / ChromeContext extracted | COMPLETE |
| Layout components extracted to 8 families | COMPLETE |
| Micro-components extracted | COMPLETE |
| Content separated into structure + content.json | COMPLETE |
| Content registry for runtime swapping | COMPLETE |
| Deck factory extracted from App.v14 | NOT STARTED |
| App.v14 decomposed into smaller components | NOT STARTED |
| State management extracted to custom hook | NOT STARTED |
| TypeScript strictness across content layer | PARTIAL |

**Migration is ~80% complete.** The remaining work is decomposing App.v14.tsx itself and strengthening TypeScript coverage across the content boundary.

---

## Critical Issues for Phase 2 Context

1. **No runtime validation on content JSON imports** — content.json files are imported directly with no Zod or runtime validation. Malformed content silently produces `undefined` fields.
2. **No input sanitization on slide text content** — slide titles, card bodies, and list items flow directly from JSON into JSX with no sanitization. If content files are user-generated, XSS risk exists.
3. **The font `<link>` is rendered inside component body** — not a direct security concern but could be exploited if `T.fontsUrl` is user-controlled (SSRF-adjacent via arbitrary URL injection).
4. **All state is in-memory/URL** — there is no auth or persistence layer, so traditional web security concerns are minimal for this SPA.
5. **Performance:** The viewport hook creates objects on every resize; `normalizeDeckTopics` runs on every deck switch; inline style objects are recreated on every render. None are critical at current scale (10 decks, ~8 slides each).
