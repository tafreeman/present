# Phase 4: Best Practices & Standards

## Framework & Language Findings

### CRITICAL

**F1. `strict: false` in tsconfig.json — TypeScript Not Actually Strict**
- **File:** `tsconfig.json`, line 7
- **Description:** `"strict": false` disables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and more. The codebase has 131+ `any` usages that TypeScript silently accepts. Enabling strict immediately surfaces real bugs: untyped parameters in `createDeckPreset`, `padTopicNumber`, `normalizeSprintNodes`, `switchDeck`; the `border` property missing from Theme; and the `type="future"` Particles violation.
- **Fix:** `"strict": true` — budget 2–4 hours to fix the cascade.

**F2. Google Fonts `<link>` Rendered Inside Component Body — Accumulation Bug**
- **File:** `src/App.v14.tsx`, line 557
- **Description:** `<link href={T.fontsUrl} rel="stylesheet" />` is rendered inside the React root div. Every theme switch appends a new `<link>` to the DOM body without removing the old one. After 5 theme switches, there are 5 `<link>` elements. This causes font loading delays and FOUT on every theme change.
- **Fix:**
```tsx
useEffect(() => {
  let link = document.getElementById('theme-fonts') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = 'theme-fonts'; link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = T.fontsUrl ?? '';
}, [T.fontsUrl]);
```

**F3. 16+ `useState` Calls With No `useReducer` — Stale Closure Bugs**
- **File:** `src/App.v14.tsx`, lines 406–451
- **Description:** `switchDeck` calls 6 setters in sequence and captures `animOptions` without `useCallback` — stale closure risk. `handleBack` uses a raw `setTimeout` without cleanup ref — race condition on rapid navigation.
- **Fix:** Extract to `useReducer` with an `AppAction` discriminated union; wrap `switchDeck` and `handleSelect` in `useCallback`.

### HIGH

**F4. `import React from "react"` — Unnecessary With React 17+ JSX Transform**
- **Files:** `App.v14.tsx:13`, `LayoutRenderer.tsx:13`, all 60 story `.jsx` files
- **Description:** Project uses `"jsx": "react-jsx"` in tsconfig — automatic JSX transform. Explicit React import is dead code.
- **Fix:** Remove from all files that don't call `React.X` APIs directly. `main.tsx` needs `{ StrictMode }` named import.

**F5. `LayoutRenderer` try/catch Is Not a React Error Boundary**
- **File:** `src/layouts/LayoutRenderer.tsx`, lines 42–64
- **Description:** Catches only synchronous `layoutRegistry.get()` errors. Render errors inside child layout components are not caught — they bubble past and crash the tree.
- **Fix:** Add `react-error-boundary` package; wrap `<Component>` in `<ErrorBoundary fallback={<LayoutErrorPanel />}>`.

**F6. `prop-types` in Runtime `dependencies` — Dead Dependency**
- **File:** `package.json`
- **Description:** Zero usages of `PropTypes` in `src/`. TypeScript covers all type safety. `prop-types` adds ~4KB to the production bundle for no benefit.
- **Fix:** `npm uninstall prop-types`

**F7. `vite.config.js` Should Be `.ts` — No Type Safety on Build Config**
- **File:** `vite.config.js`
- **Description:** Plain JavaScript config. No IntelliSense, no type safety on Vite options, no alignment with `tsconfig.json` path aliases.
- **Fix:** Rename to `vite.config.ts`, add `import { defineConfig } from 'vite'`, add `resolve.alias` to match tsconfig paths.

**F8. `LayoutProps` Uses `[key: string]: any` — Defeats TypeScript Entirely**
- **File:** `src/layouts/registry.ts`, lines 20–24
- **Description:** Index signature on `LayoutProps` means every layout accepts any prop. `LayoutContentMap` in `content-types.ts` exists precisely for per-layout typing but is never used at the component boundary.

### MEDIUM

**F9. 20 Content Files Are `.js` in a Full TypeScript Codebase**
- `src/content/*/deck.js` (8 files), `src/content/*/structure.js` (7 files), `src/content/reference-decks/*.js` (3 files) — untyped, no enforcement of `DeckContent` or `DeckStructure` interfaces.
- **Fix:** Rename to `.ts` and add type annotations.

**F10. Zero `React.memo` / `useCallback` Across All 34 Layout Components**
- Layout components re-render on every App state change (including `hovered` mouse events). `handleSelect` and `switchDeck` are recreated every render, making `LandingTile` memoization impossible without `useCallback`.

**F11. `useTheme` / `useChrome` Null Guards Are Unreachable**
- **File:** `src/components/hooks/useTheme.ts`, `useChrome.ts`
- `if (!theme)` guard is unreachable because context has a default value. For the guard to be meaningful, context must be `createContext<Theme | null>(null)`.

**F12. `chrome = STYLE_MODES_BY_ID[styleModeId]` Not Memoized in Provider**
- Computed inline on every App render → all `useChrome()` consumers re-render on any App state change.
- **Fix:** `const chrome = useMemo(() => STYLE_MODES_BY_ID[styleModeId], [styleModeId]);`

**F13. `Suspense` in `main.tsx` Is a No-Op (No `React.lazy` Anywhere)**
- `main.tsx` wraps App in `<Suspense>` but there are zero `React.lazy()` calls. Opportunity: lazy-load layout families (8 natural split boundaries).

**F14. Path Aliases in tsconfig Not Mirrored in Vite Config**
- Aliases declared in tsconfig are type-checking-only. Vite needs matching `resolve.alias` entries or runtime imports using those aliases will fail to build.

**F15. All 60 Storybook Stories Are `.jsx` — No TypeScript**
- Story files don't benefit from TypeScript prop checking. Renaming to `.tsx` would catch arg type errors in story definitions.

### LOW

**F16. `vitest.shims.d.ts` References Uninstalled Package**
- Dead artifact suggesting abandoned Vitest setup. Delete or install Vitest.

**F17. `zod` in Runtime `dependencies` — Used Only in Dead Code Path**
- Zod schemas in `src/patterns/decks/schema.ts` are never called at runtime. Either wire validation or move Zod to `devDependencies`.

---

## CI/CD & DevOps Findings

### CRITICAL

**CI1. No CI/CD Pipeline — Zero Automated Verification**
- **Severity: Critical**
- No `.github/workflows/` directory. Every push to `master` is completely unverified. A broken TypeScript error, bad import, or failing build goes undetected until someone manually runs `npm run build` locally.

**CI2. `tsc --noEmit` Never Runs — TypeScript Errors Are Invisible**
- **Severity: Critical**
- `npm run build` calls `vite build` which uses esbuild (strips types, no type-checking). No `typecheck` script defined. The `type="future"` Particles bug, the 131 `any` violations, and missing function parameter types would never surface in any automated step.
- **Fix:** Add `"typecheck": "tsc --noEmit"` to scripts; run in CI before build.

### HIGH

**CI3. `npm audit` Not Part of Any Pipeline — High Severity Advisory Active**
- **Severity: High**
- Picomatch ReDoS (CVSS 7.5) is active. No automated check gates on advisory severity.

**CI4. `build-single-file.mjs` Has Live Network Dependency on Google Fonts**
- **Severity: High**
- The single-file build fetches Google Fonts CSS and font binaries at build time with no timeout, no retry, no fallback. Fails silently in restricted network environments (corporate proxy, CI runners with egress restrictions).

### MEDIUM

**CI5. Playwright Scripts Fail on Fresh Clone With Opaque Error**
- No `playwright install` step in any script. Running `export:images` or `export:pdf` on a fresh clone fails with "executable not found".
- **Fix:** Add `"preexport": "playwright install chromium"` to scripts.

**CI6. 500ms Fixed Sleep in Export Loop Is Redundant**
- `waitForStableRender` already handles network idle + fonts + animation frames. The extra 500ms per slide wastes ~5s per full deck export.

**CI7. No Pre-commit Hooks**
- No Husky, Lefthook, or lint-staged. No local gate against bad TypeScript or broken builds before push.

**CI8. `vitest.shims.d.ts` References Uninstalled Package — Latent CI Hazard**
- `tsc --noEmit` with `skipLibCheck: false` would error on this. Currently masked by `skipLibCheck: true`.

### LOW

**CI9. No `engines` Field in `package.json`**
- Scripts use top-level `await` in `.mjs` files (Node 14.8+ required). Undocumented constraint.

**CI10. `vite.config` Has No Explicit `build.target` or Code Splitting**
- Acceptable for current local deployment use case, but unreviewed. All 34 layouts land in one chunk.

---

## Generated: Recommended `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    name: Typecheck · Build · Storybook
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Dependency audit
        run: npm audit --audit-level=high
      - name: Typecheck
        run: npx tsc --noEmit
      - name: Build (Vite)
        run: npm run build
      - name: Build Storybook
        run: npm run build-storybook
      - uses: actions/upload-artifact@v4
        with:
          name: storybook-static
          path: storybook-static/
          retention-days: 7
```
