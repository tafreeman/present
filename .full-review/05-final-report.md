# Comprehensive Code Review Report — `present`

## Review Target

React 18 + Vite 5 + TypeScript presentation platform. Registry-based slide deck system (v14 strangler-fig architecture): 10 decks, 34 layouts across 8 families, 15 themes, 4 style modes.

**Review date:** 2026-04-13  
**Phases completed:** Code Quality, Architecture, Security, Performance, Testing, Documentation, Framework Best Practices, CI/CD  
**Flags:** none (default review)

---

## Executive Summary

The codebase demonstrates a **well-designed and substantially complete architecture** — the Strangler Fig migration from the v10 monolith is ~80% done, the registry pattern is sound, the content/structure separation is elegant, and the theme × style-mode orthogonal matrix is clean. The core abstractions are right.

The two systemic problems are: **(1) TypeScript is effectively disabled** (`strict: false`, `as any` throughout transcription, `.js` content files, no `tsc --noEmit` in the build) — the type system exists on paper but provides almost no runtime protection; **(2) the pipeline is entirely manual** — no CI, no test runner, no pre-commit hooks mean that bugs like the `type="future"` Particles violation and the `info-cards` crash-on-null can sit in `master` indefinitely.

---

## Findings by Priority

### P0 — Critical: Must Fix Immediately

| ID | Category | Finding | File |
|----|----------|---------|------|
| C1 | Code Quality | 200+ `as any` casts in `transcription.ts` — silently breaks on field rename | `src/transcription.ts` |
| C2 | Architecture | `LayoutRenderer` try/catch is not a React Error Boundary — render errors crash the tree | `src/layouts/LayoutRenderer.tsx` |
| F1 | Framework | `strict: false` in tsconfig — TypeScript provides no actual type safety | `tsconfig.json` |
| F2 | Framework | Google Fonts `<link>` accumulates in DOM body on every theme switch (bug, not just style) | `src/App.v14.tsx:557` |
| T1 | Testing | No automated test runner installed — `vitest.shims.d.ts` is dead code | `package.json` |
| T3 | Testing | `transcribeTopic` info-cards case crashes when `topic.cards` is undefined | `src/transcription.ts:~27` |
| CI1 | CI/CD | No CI pipeline — zero automated verification on every push | (missing) |
| CI2 | CI/CD | `tsc --noEmit` never runs — TypeScript errors invisible in build | `package.json` |

### P1 — High: Fix Before Next Release

| ID | Category | Finding | File |
|----|----------|---------|------|
| H1 | Code Quality | `App.v14.tsx` 726 lines: deck factory + state + UI + orchestration in one component | `src/App.v14.tsx` |
| H2 | Code Quality | Local `Topic` interface duplicated across all 34 layout files | all layout files |
| H3 | Code Quality | `normalizeDeckTopics` defaults all fields to `[]` — masks missing data | `src/App.v14.tsx:139` |
| A1 | Architecture | Deck factory (300+ lines of static data) still inline in App — not extracted | `src/App.v14.tsx:62–389` |
| S1 | Security | 4 npm audit advisories including High severity picomatch ReDoS | `package.json` |
| P1 | Performance | 27 independent resize listeners — no viewport singleton context | `usePresentationViewport.ts` |
| P3 | Performance | Zero `React.memo` / `useCallback` — all landing tile hover events re-render entire tree | all layout components |
| P6 | Performance | `type="future"` passed to `Particles` is not a valid type — 5 layouts use wrong animation | 5 layout files |
| T4 | Testing | 38 Storybook stories all happy-path; zero edge cases, zero assertions, a11y disabled | all story files |
| T5 | Testing | `hexToGlow` / `lightenHex` produce `NaN` CSS on short hex / named colors | `src/tokens/palette.ts` |
| F3 | Framework | 16+ `useState` with stale closure bugs in `switchDeck` / `handleBack` | `src/App.v14.tsx` |
| F5 | Framework | `LayoutRenderer` needs `react-error-boundary` to actually catch render errors | `src/layouts/LayoutRenderer.tsx` |
| F6 | Framework | `prop-types` in runtime deps — dead dependency, zero usage, ~4KB bundle cost | `package.json` |
| CI3 | CI/CD | `npm audit` not automated — High severity advisory unaddressed | (missing) |
| CI4 | CI/CD | `build-single-file.mjs` fetches Google Fonts at build time — no timeout/retry/fallback | `scripts/build-single-file.mjs` |

### P2 — Medium: Plan for Next Sprint

| ID | Category | Finding |
|----|----------|---------|
| M1 | Code Quality | Registry singleton has no `reset()` — untestable in isolation |
| M2 | Code Quality | `resolveLayoutKey` special-case logic belongs in registry, not renderer |
| M3 | Code Quality | Inline style objects recreated on every render across all 34 layouts |
| M4 | Performance | `usePresentationViewport` creates new object on every resize even within same breakpoint |
| M5 | Code Quality | `transcribeToAdvocacyDense` uses fragile string replace (`"adv-"` → `"advd-"`) |
| A4 | Architecture | Registry singleton lacks testability affordances (`clear()` / `reset()`) |
| A5 | Architecture | Deck/structure files are `.js` — `DeckStructure` interface never enforced on them |
| P5 | Performance | `getAvailableContent` called twice per render, unmemoized (O(P×S) per hover) |
| P7 | Performance | No bundle code splitting — all 34 layouts in one chunk |
| T8 | Testing | Zod schemas in `src/patterns/decks/schema.ts` — dead code, never called at runtime |
| T9 | Testing | `type="future"` Particles TypeScript violation — `tsc --noEmit` would catch it |
| S2 | Security | No Content Security Policy defined |
| S3 | Security | Hero image CSS injection (self-XSS; low exploitation risk) |
| D3 | Docs | README / CLAUDE.md reference wrong file extensions (`.jsx` → `.tsx`) and wrong React version |
| D4 | Docs | No how-to guides for adding layout families, themes, or content decks |
| D5 | Docs | `mergeDeckContent` cascade algorithm undocumented |
| F9 | Framework | 20 content `.js` files — `DeckContent` / `DeckStructure` interfaces never enforced |
| F12 | Framework | `chrome = STYLE_MODES_BY_ID[styleModeId]` not memoized → all `useChrome()` consumers re-render on any App state change |
| F13 | Framework | `<Suspense>` in `main.tsx` is a no-op (zero `React.lazy()` calls) |
| CI5 | CI/CD | `playwright install` step missing — export scripts fail on fresh clone |
| CI7 | CI/CD | No pre-commit hooks (no Husky/lint-staged) |

### P3 — Low: Track in Backlog

| ID | Category | Finding |
|----|----------|---------|
| L1 | Code Quality | ControlPanel ESC listener active even when panel is closed |
| L2 | Code Quality | `<link>` for fonts in component body (see P0/F2 — also correctness) |
| L3 | Code Quality | Magic animation delay numbers across layout families |
| M6 | Code Quality | `allLayouts` useMemo with empty deps — fragile against future lazy loading |
| M7 | Code Quality | `hexToGlow`/`lightenHex` don't validate input hex format |
| M8 | Code Quality | `border` property used in App but missing from Theme interface |
| P8 | Performance | `handleBack` timeout not tracked in ref — state update race on rapid navigation |
| P9 | Performance | `mergeDeckContent` positional fallback is O(n²) — acceptable at current scale |
| S4 | Security | URL param `?deck=` not allowlist-validated (safe fallback exists) |
| S5 | Security | Source maps not explicitly disabled in production config |
| F4 | Framework | `import React` unnecessary in 60+ files with React 17+ JSX transform |
| F11 | Framework | `useTheme`/`useChrome` null guards unreachable with current context default value |
| F16 | Framework | `vitest.shims.d.ts` references uninstalled package — delete it |
| F17 | Framework | Zod in runtime `dependencies` — used only in dead code path |
| CI6 | CI/CD | 500ms fixed sleep in export loop is redundant (~5s wasted per deck export) |
| CI10 | CI/CD | No explicit `build.target` or code splitting in Vite config |

---

## Findings by Category

| Category | Critical | High | Medium | Low | Total |
|----------|---------|------|--------|-----|-------|
| Code Quality | 2 | 5 | 8 | 5 | **20** |
| Architecture | 1 | 2 | 4 | 0 | **7** |
| Security | 0 | 1 | 2 | 4 | **7** |
| Performance | 0 | 3 | 3 | 2 | **8** |
| Testing | 2 | 3 | 2 | 1 | **8** |
| Documentation | 0 | 0 | 4 | 2 | **6** |
| Framework | 3 | 4 | 7 | 5 | **19** |
| CI/CD | 2 | 2 | 4 | 2 | **10** |
| **Total** | **10** | **20** | **34** | **21** | **85** |

---

## Recommended Action Plan

### Immediate (P0) — This Week

1. **Add CI pipeline** [small] — Create `.github/workflows/ci.yml` from the template in `04-best-practices.md`. Covers install, typecheck, build, Storybook build. One file, zero code changes.
2. **Add `"typecheck": "tsc --noEmit"` to scripts** [trivial] — Immediately surfaces the `type="future"` bug, the 131 `any` violations, and all untyped parameters.
3. **Fix `transcribeTopic` info-cards null crash** [small] — Add `|| []` guard on line ~27: `(topic.cards as any[] || []).map(...)`. Write the 5 vitest tests from Phase 3 to lock it in.
4. **Install Vitest** [small] — `npm install --save-dev vitest @vitest/ui jsdom @testing-library/react`; add test script; write the 5 critical tests from Phase 3.
5. **Fix Google Fonts `<link>` accumulation** [small] — Replace rendered `<link>` with `useEffect` targeting `document.head` with stable element ID.
6. **Fix `type="future"` Particles in 5 layouts** [small] — Change to `"human"` or add `"future"` as a named type. TypeScript strict mode will enforce this going forward.
7. **Run `npm audit fix`** [trivial] — Address the 4 active advisories.
8. **Remove `prop-types`** [trivial] — `npm uninstall prop-types`. Zero risk.

### Short-term (P1) — Current Sprint

9. **Add React Error Boundary to `LayoutRenderer`** [small] — Add `react-error-boundary` package; wrap `<Component>` render.
10. **Extract deck factory from App.v14** [medium] — Move all `createDeckPreset()` calls and `DECKS` map to `src/content/deck-factory.ts`. Reduces App from 726 to ~400 lines.
11. **Extract shared `SlideProps` interface** [medium] — Create `src/layouts/types.ts`; replace 34 duplicate local `Topic` interfaces.
12. **Add CSP meta tag to `index.html`** [trivial] — Template from `02-security-performance.md`.
13. **Memoize `getAvailableContent` and `introDeck`** [small] — Add `useMemo` wrappers in App.v14.
14. **Fix `chrome` memoization** [trivial] — `useMemo(() => STYLE_MODES_BY_ID[styleModeId], [styleModeId])` in App.v14.
15. **Add `playwright install` to export scripts / README** [trivial] — Add `"preexport": "playwright install chromium"` to package.json.
16. **Remove network fetch from `build-single-file.mjs`** [medium] — Bundle fonts at build time or make the single-file export network-optional with a local fallback.

### Planned (P2) — Next Sprint

17. **Enable `strict: true` in tsconfig** [large] — Budget 4–8 hours to fix cascade. Requires typing all content files, transcription parameters, and `createDeckPreset`.
18. **Migrate content files to `.ts`** [medium] — Rename 20 `.js` content files; add type annotations enforcing `DeckContent` / `DeckStructure`.
19. **Add `useReducer` to replace 16 `useState` calls** [large] — Eliminates stale closure bugs; makes state transitions testable.
20. **Add Viewport singleton context provider** [medium] — Reduces 27 resize listeners to 1; add breakpoint equality guard.
21. **Add `React.memo` to `LandingTile` + `useCallback` to `handleSelect`** [small] — Stops hover events from re-rendering all tiles.
22. **Add `React.lazy` per layout family** [medium] — 8 natural code-split boundaries; makes `<Suspense>` in main.tsx functional.
23. **Wire Zod validation** [medium] — Connect `validateDeckManifest` to content-registry load path, or move Zod to devDependencies.

---

## Documentation Artifacts Generated (Phase 3)

The following files were written to the repository by the review agents:

- **`docs/DOCUMENTATION-REVIEW.md`** — Mermaid architecture diagram, data flow sequence diagram, how-to guides (layout family, theme, content deck), interface quick reference, `mergeDeckContent` algorithm documentation, known issues register (BUG-001 through DEBT-007)
- **`README.md`** — Corrected: React version, file extensions, deck count; added layout ID table, content deck table, data flow section
- **`CLAUDE.md`** — Corrected: React version, entry file extensions; expanded architecture bullets; added 4 new gotchas

---

## Review Metadata

- **Review date:** 2026-04-13
- **Phases completed:** 1A Code Quality, 1B Architecture, 2A Security, 2B Performance, 3A Testing, 3B Documentation, 4A Framework, 4B CI/CD
- **Files analyzed:** 40+ source files across all layers
- **Agents dispatched:** 8 specialist agents in 4 parallel pairs
- **Total findings:** 85 (10 critical, 20 high, 34 medium, 21 low)
- **Flags applied:** none

---

## Items Requiring Human Decision

1. **`type="future"` Particles intent** — Which animation behavior was intended for the 5 affected layouts? (Drift upward? Bounce? Something else?)
2. **Zod decision** — Wire at runtime, keep in devDependencies only, or delete `src/patterns/decks/schema.ts`?
3. **React version** — Confirm 18.2 or migrate to 19? (README says 18, CLAUDE.md says 19, package.json pins `^18.2.0`)
4. **App.v14 decomposition priority** — Which extraction phase first: deck factory, state hook, or UI sub-components?
5. **`strict: true` migration** — Schedule time and risk tolerance for the TypeScript strictness cascade.
