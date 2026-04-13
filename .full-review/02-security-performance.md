# Phase 2: Security & Performance Review

## Security Findings

### HIGH

**S1. Dependency Vulnerabilities (npm audit — 4 advisories)**
- **Severity: High (aggregate)**
- **Packages affected:**
  - `picomatch` 4.0.0–4.0.3 — ReDoS via extglob quantifiers (GHSA-c2c7-rcm5-vvqj, CVSS 7.5, CWE-1333)
  - `picomatch` 4.0.0–4.0.3 — Method injection in POSIX character classes (GHSA-3v7f-55p6-f55p, CVSS 5.3, CWE-1321)
  - `esbuild` ≤0.24.2 — Dev server cross-origin request vulnerability (GHSA-67mh-4wv8-2f99, CVSS 5.3, CWE-346)
  - `vite` ≤6.4.1 — Path traversal in optimized deps `.map` handling (GHSA-4w7w-66w2-5vf9, CWE-22)
  - `brace-expansion` 4.0.0–5.0.4 — Zero-step sequence process hang (GHSA-f886-m6hf-6m8v, CVSS 6.5, CWE-400)
- **Risk:** Vite and esbuild vulnerabilities are dev-server only, not present in production builds. Picomatch and brace-expansion are transitive dev dependencies.
- **Fix:** `npm audit fix` + update Vite to latest 5.x patch.

### MEDIUM

**S2. No Content Security Policy (CSP)**
- **Severity: Medium (CVSS 5.0, CWE-1021)**
- **Location:** `index.html` (root)
- **Description:** No CSP meta tag. The app loads external fonts from `fonts.googleapis.com` and `fonts.gstatic.com` with no policy restricting source origins. Without CSP, any future XSS vector has no defense-in-depth.
- **Fix:** Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self';
  frame-src 'none';
  object-src 'none';
">
```

**S3. Hero Image CSS Injection (Self-XSS)**
- **Severity: Medium (CVSS 4.3, CWE-79)**
- **Location:** `src/App.v14.tsx`, line 564; `src/components/navigation/ControlPanel.tsx`, line 483
- **Description:** `heroImage` value from user text input flows directly into `backgroundImage: \`url("${heroImage}")\``. A crafted `")` string breaks out of the CSS `url()` context. This is self-XSS — the presenting user controls the input. No remote exploitation path exists.
- **Fix:** Validate URL format before use:
```ts
function sanitizeImageUrl(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.href);
    return ['http:', 'https:', 'data:'].includes(parsed.protocol) ? parsed.href : null;
  } catch { return null; }
}
```

### LOW

**S4. URL Query Parameter `?deck=` Not Allowlist-Validated**
- **Severity: Low (CVSS 2.1, CWE-20)**
- **Location:** `src/App.v14.tsx`, line 124
- **Description:** An invalid deck key safely falls back to the default deck — no functional exploitation possible.
- **Fix (defense-in-depth):** `const VALID_DECK_KEYS = Object.keys(DECKS); return VALID_DECK_KEYS.includes(param) ? param : "onboarding";`

**S5. Source Maps Not Explicitly Disabled for Production**
- **Severity: Low (CWE-200)**
- **Location:** `vite.config.js`
- **Description:** Vite defaults to no source maps in production, but this is implicit. Explicit configuration prevents accidental exposure.
- **Fix:** Add `build: { sourcemap: false }` to vite config.

**S6. No Runtime Validation on Content JSON Imports**
- **Severity: Low (CWE-20)**
- **Location:** `src/content/content-registry.ts`, lines 14–22
- **Description:** Content JSON files are imported with `as DeckContent` type assertions but no runtime Zod validation. Content is bundled static JSON (not user-supplied), so risk is low. Zod is already a declared dependency (`^4.3.6`) but unused for this purpose.
- **Fix (defense-in-depth):** Add Zod schema validation for content packs at import time.

**S7. Error Message Leaks Layout IDs**
- **Severity: Low (CWE-209)**
- **Location:** `src/layouts/LayoutRenderer.tsx`, lines 48–65
- **Description:** Error fallback renders raw error message including all registered layout IDs. Acceptable for development; for production polish, suppress the "Available:" list.

### INFORMATIONAL (Pass)

- **No `dangerouslySetInnerHTML` usage** — zero uses confirmed; all content flows through React's auto-escaping JSX.
- **Font URL (`T.fontsUrl`) is compile-time constant** — always from hardcoded `THEME_FONT_URLS` in `themes.ts`, never user-controlled.
- **Registry uses `Map` (no prototype pollution)** — `Map.get()` doesn't traverse prototype chain. Spread operators in merge use static JSON — no prototype pollution vector.
- **No secrets, API keys, or credentials** in codebase — confirmed by full-text search.

---

## Performance Findings

### HIGH

**P1. 27 Independent Resize Listeners — No Shared Singleton**
- **Severity: High**
- **Impact:** Every layout component that calls `usePresentationViewport()` adds its own `resize` event listener. A single window resize triggers 27 independent hook evaluations + re-renders, even for components not currently displayed.
- **Root cause:** `readViewport()` returns a new object literal every call (even when breakpoints haven't changed), so React always sees a state change.
- **Fix:** Move viewport state to a context provider (one listener, one state update). Add breakpoint equality guard:
```ts
setViewport(prev =>
  prev.isPhone === next.isPhone && prev.isCompact === next.isCompact ? prev : next
);
```

**P2. Inline Style Objects Recreated on Every Render**
- **Severity: High**
- **Impact:** Every layout component + App + ControlPanel (~60+ objects) allocates fresh inline style objects each render. ControlPanel alone has ~60 style objects per render.
- **Fix:** Extract static style constants outside component bodies. Only keep dynamic properties (theme colors, computed sizes) inline.

**P3. Zero `React.memo` / `useCallback` — All Callbacks Unstable**
- **Severity: High**
- **Impact:** `handleSelect` and `switchDeck` are recreated on every App render without `useCallback`. All `LandingTile` components receive new function references on every hover state change, defeating any potential memoization.
- **Fix:**
```ts
const handleSelect = useCallback((id, pos) => { ... }, [animOptions.comet, deckTopics]);
const LandingTile = React.memo(function LandingTile(...) { ... });
```

### MEDIUM

**P4. `introDeck` Spread Creates New Object on Every App Render**
- **Severity: Medium**
- **Impact:** `{ ...deck, introStats }` creates a new object on every render (including hover state changes), causing `ThematicIntro` to re-render unnecessarily.
- **Fix:** `const introDeck = useMemo(() => ({ ...deck, introStats }), [deck, introStats]);`

**P5. `getAvailableContent` Called Twice Per Render, Unmemoized**
- **Severity: Medium**
- **Impact:** O(P×S) set-intersection runs on every App render including hover events. Returns new array of new objects each time.
- **Fix:** `const availableContent = useMemo(() => isContentSwappable(deckKey) ? getAvailableContent(deckKey) : [], [deckKey]);`

**P6. `type="future"` Is Not a Valid Particles Type — Silent Runtime Bug**
- **Severity: Medium (correctness)**
- **Impact:** 5 layout files (`TwoColLayout`, `HStripLayout`, `ProcessLanesLayout`, `ArchitectureSlide`, `TechStackTimeline`) pass `type="future"` to `<Particles>`. The Particles component only accepts `"hurdles" | "human" | "sprint"`. At runtime, `"future"` silently falls through to a generic bouncing-ball behavior — likely not the intended visual effect.
- **Fix:** Either add `"future"` as a named particle type with upward-drift motion, or update call sites to use `"human"` (closest match for drift).

**P7. No Bundle Code Splitting — All 34 Layouts Eager**
- **Severity: Medium**
- **Impact:** All 34 layout components, 8 content decks, all structure files, and all images are bundled in one chunk. `vite.config.js` has no `manualChunks` or `React.lazy` splitting.
- **Fix:** Add `rollupOptions.output.manualChunks` to split layouts by family, or use `React.lazy` per family in `register-all.ts`.

### LOW

**P8. `handleBack` Timeout Not Tracked — Potential State Update Race**
- **Severity: Low**
- **Description:** `setTimeout(() => { setActive(null); setTransitioning(false); }, 350)` is not stored in a ref. Rapid navigation within 350ms fires two `setActive(null)` calls.
- **Fix:** Store timeout in `useRef`; clear on `handleSelect`.

**P9. `mergeDeckContent` Positional Fallback is O(n²)**
- **Severity: Low**
- **Description:** `contentEntries.filter(([id]) => !usedContentIds.has(id))` runs for every unmatched slide. At current scale (7–10 slides) negligible. Only called on content swap, not hot path.
- **Fix:** Pre-filter unused entries once before the loop.

**P10. Export Pipeline Uses Fixed 500ms Sleep Between Slides**
- **Severity: Low**
- **Description:** `export-presentation.mjs` sleeps 500ms between each slide capture. Replace with DOM-ready signal for faster exports.

---

## Critical Issues for Phase 3 Context

1. **`type="future"` Particles bug (P6)** — 5 layouts render wrong visual behavior. No test exists to catch this.
2. **No bundle splitting (P7)** — all layout components must be documented and their lazy-loading strategy planned.
3. **Zod is a declared dependency but unused for validation (S6)** — the testing phase should check whether Zod schemas are expected but missing.
4. **`hexToGlow`/`lightenHex` don't validate hex format (M7 from Phase 1)** — edge-case inputs could silently produce garbage CSS colors; no unit tests cover the failure modes.
5. **No CSP policy (S2)** — documentation should note this as a deployment checklist item.
