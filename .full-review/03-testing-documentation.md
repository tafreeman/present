# Phase 3: Testing & Documentation Review

## Test Coverage Findings

### CRITICAL

**T1. No Automated Test Runner Exists**
- **Severity: Critical**
- `vitest.shims.d.ts` exists referencing `@vitest/browser-playwright`, but Vitest is NOT installed (`package.json` has no `@vitest/*` entries). No `test` script defined. No `.test.*` or `.spec.*` files anywhere.
- **Fix:** `npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom` + add `"test": "vitest run"` to scripts.

**T2. Zero Unit or Integration Tests**
- **Severity: Critical**
- 100% of testing is manual visual inspection via Storybook. Critical business logic (transcription, merge, palette, registry) is entirely untested.

**T3. `transcribeTopic` info-cards Case Crashes on Missing `cards`**
- **Severity: Critical**
- `src/transcription.ts` line ~27: `(topic.cards as any[]).map(...)` with NO null/undefined guard in the `info-cards` case. If a slide with `layout: "info-cards"` has no `cards` field, this throws at runtime. Other cases have `|| []` guards; this one doesn't.
- **Fix:** Add `(topic.cards as any[] || []).map(...)` — and write a test to document the contract.

### HIGH

**T4. Storybook Has 38 Stories — All Happy Path, Zero Assertions**
- All 38 layout stories use identical pattern: `export const Default = { args: { topic: mockTopic } }`. No edge cases (empty arrays, missing fields), no interaction tests (`play()` functions), no a11y assertions (explicitly disabled with `a11y: { test: "todo" }`).

**T5. `hexToGlow` / `lightenHex` Silently Produce `NaN` CSS**
- Short hex (`#RGB`), named colors (`"red"`), `rgba()` strings all produce `rgba(NaN,NaN,NaN,0.25)` — invalid CSS that browsers silently ignore (using transparent). No tests expose this.

**T6. `LayoutRegistry` Class Not Exported for Test Isolation**
- Only the singleton `layoutRegistry` is exported. Tests cannot create fresh registry instances, so layout registrations from one test pollute others. No `reset()` method.

**T7. `mergeDeckContent` Positional Fallback Correctness Unverified**
- The cascading match strategy (ID → role → layout-compat → positional → none) has no tests verifying priority order, `usedContentIds` deduplication, or `matchStats` accuracy.

### MEDIUM

**T8. Zod `validateDeckManifest` / `validateLayoutsExist` — Dead Code, No Tests**
- `src/patterns/decks/schema.ts` defines full Zod validation schemas but is never imported in the runtime data path. The validation exists but runs for nothing.

**T9. `type="future"` Particles Bug — TypeScript Should Have Caught It**
- 5 layouts pass `type="future"` to `<Particles>` which only accepts `"hurdles" | "human" | "sprint"`. This is a TypeScript error that should fail `tsc --noEmit`. The absence of a `tsc` CI step lets this persist.

**T10. Storybook Story Glob Excludes `.tsx` Files**
- `.storybook/main.js` pattern: `"../src/**/*.stories.@(js|jsx)"` — TypeScript `.tsx` story files would be silently ignored.

### LOW

**T11. a11y Explicitly Disabled Globally in Storybook**
- `preview.jsx`: `parameters: { a11y: { test: "todo" } }` disables all accessibility checks across all 38 stories.

---

## 5 Most Important Tests to Write Immediately

```ts
// 1. transcription.ts null-guard crash (info-cards, currently throws)
expect(() => transcribeTopic({ layout: 'info-cards', order: 1 }, 'base')).not.toThrow();

// 2. mergeDeckContent priority order verification
// Verify ID match beats role match beats positional

// 3. hexToGlow NaN edge case documentation
expect(hexToGlow('#RGB')).not.toContain('NaN'); // FAILS until fixed

// 4. LayoutRegistry.get() throws with helpful message
expect(() => reg.get('nonexistent')).toThrowError(/Unknown layout.*Available:/);

// 5. Particles type="future" runtime behavior (does not crash, uses else branch)
expect(() => render(<Particles color="#f00" type={"future" as any} active={true} />)).not.toThrow();
```

---

## Documentation Findings

### CRITICAL

**D1. `Particles type="future"` Bug — 5 Layouts with Wrong Animation Type**
- Completely undocumented. Five layouts silently use bounce-physics instead of intended drift animation.

**D2. No Architecture Diagram Existed**
- No system diagram in README or any doc file. Generated and added (see deliverables).

### HIGH

**D3. README / CLAUDE.md Reference Wrong File Extensions**
- Both reference `App.v14.jsx` and `main.jsx`; actual files are `.tsx`. CLAUDE.md says "React 19"; README says "React 18"; `package.json` pins `^18.2.0`.

**D4. No How-To Guides for Adding Layout Families, Themes, or Decks**
- No guide for the three most common extension tasks. Generated and added (see deliverables).

**D5. `mergeDeckContent` Cascade Algorithm Undocumented**
- 5-step priority: ID match → role match → layout-compat match → positional fallback → structure-only. Never documented externally. Generated full documentation.

### MEDIUM

**D6. Zod Dependency Undocumented — Appears Unused at Runtime**
- `"zod": "^4.3.6"` in runtime `dependencies`. `src/patterns/decks/schema.ts` has full schemas but they're unreachable at runtime. No explanation for why Zod is a runtime dep.

**D7. `stat-cards-manifest` Auto-Routing Not Mentioned Anywhere**
- `LayoutRenderer` silently routes `stat-cards` → `stat-cards-manifest` when manifest fields are present. This variant is invisible to documentation.

---

## Documentation Deliverables Generated

The documentation agent wrote/updated the following files:

1. **`docs/DOCUMENTATION-REVIEW.md`** (new) — comprehensive reference including:
   - Mermaid architecture diagram (4-layer system overview)
   - Mermaid sequence diagram (user selection → rendered slide data flow)
   - How-to: Add a new layout family (7 steps with code)
   - How-to: Add a new theme (5 steps)
   - How-to: Add a new content deck (5 steps with templates)
   - Key interface quick reference (8 interfaces)
   - `mergeDeckContent` cascade algorithm documentation
   - Known issues register (BUG-001 Particles, DEBT-001 through DEBT-007)

2. **`README.md`** (updated) — corrected React version, file extensions, deck count; added full layout ID table, content deck table, data flow section, developer guides pointer, new gotchas

3. **`CLAUDE.md`** (updated) — corrected React version and entry file extensions; expanded architecture bullets; added 4 new gotchas for known bugs and dead code

### Items Requiring Human Decision

1. **Particles bug**: Which animation type was intended for the 5 affected layouts?
2. **Zod decision**: Keep (wire at runtime), keep (dev-only), or delete `src/patterns/decks/schema.ts`?
3. **React version**: Confirm 18.2 or migrate to 19?
4. **Transcription refactor**: Prioritize or defer?
