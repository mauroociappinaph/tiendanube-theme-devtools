# Proposal: Project Scaffold — `tiendanube-theme-devtools`

**Change**: `scaffold`
**Phase**: proposal
**Date**: 2026-07-16
**Delivery**: force-chained (stacked-to-main)

---

## Intent & Scope

### Intent

Bootstrap the entire Chrome Extension project from zero to functional development environment. After this change, a developer can clone, `npm install`, `npm run build`, and load the extension into Chrome.

### In Scope

- `package.json` with all dependencies (TypeScript, esbuild, ESLint, Prettier, Vitest, chrome-types, Preact)
- `tsconfig.json` with project references for three layers: `extension`, `native-host`, `shared`
- `esbuild.config.mjs` — single-pass esbuild build configuration for Manifest V3 (multiple entry points: service worker, DevTools panel, content script)
- `src/manifest.ts` — Typed Manifest V3 definition (generates `manifest.json` via esbuild plugin)
- Extension source structure:
  - `src/background/service-worker.ts` — Service worker skeleton (messaging, alarms, native messaging bridge)
  - `src/devtools/devtools.html` — DevTools panel HTML
  - `src/devtools/devtools.ts` — Panel registration
  - `src/devtools/panel/Panel.tsx` — Preact root component (stub UI)
  - `src/devtools/panel/components/` — Initial UI components (toggle, button, status)
  - `src/devtools/panel/hooks/` — Runtime hook skeleton
  - `src/devtools/panel/styles.css` — Panel styling
  - `src/content/inspector.ts` — Content script skeleton (hover → inspect)
- Native host structure:
  - `src/native-host/main.ts` — Node.js entry point (stdin/stdout JSON messaging)
  - `src/native-host/manifest.json` — Native messaging host manifest
  - `src/native-host/package.json` — Separate package for native host deps
- Shared types:
  - `src/shared/messaging.ts` — Type-safe message passing (background ↔ panel ↔ content ↔ native)
  - `src/shared/storage.ts` — chrome.storage wrappers
  - `src/shared/types/chrome.d.ts` — Global Chrome API type augmentations
  - `src/shared/utils.ts` — Common utilities
  - `src/types/global.d.ts` — Global type declarations
- Developer tooling:
  - `.eslintrc.cjs` — ESLint config (TypeScript + Preact)
  - `.prettierrc` / `.prettierignore` — Prettier config
  - `vitest.config.ts` — Vitest configuration
- CI/CD:
  - `.github/workflows/ci.yml` — Lint + typecheck + test + build + zip
  - `.github/dependabot.yml` — Weekly dependency updates
- Build scripts:
  - `scripts/build-zip.mjs` — Generates `dist/extension.zip` for Chrome Web Store
- Static assets:
  - `public/icons/` — Placeholder icons (16, 48, 128)
- README update with development commands

### Out of Scope (Explicitly)

- **Feature implementation**: No actual Tiendanube integration, no inspect logic, no theme reload — only stubs/skeletons.
- **Native host binary distribution**: Native host will build and run, but SEA packaging for distribution is deferred.
- **Full test coverage**: Only a skeleton test setup (passing `describe("scaffold", () => {})`) — actual tests come with features.
- **Chrome Web Store assets**: No store listing, screenshots, or promotional images.

---

## Approach

### Architecture

```
tiendanube-theme-devtools/
├── package.json                  # Root workspace
├── tsconfig.json                 # TS project references
├── tsconfig.extension.json       # Extension TS config
├── tsconfig.native-host.json     # Native host TS config
├── esbuild.config.mjs            # Single esbuild config
├── vitest.config.ts              # Test config
├── .eslintrc.cjs                 # Linter
├── .prettierrc / .prettierignore # Formatter
├── public/
│   └── icons/                    # Extension icons (16, 48, 128)
├── scripts/
│   └── build-zip.mjs             # Zip generation script
├── src/
│   ├── manifest.ts               # Manifest V3 definition
│   ├── types/global.d.ts         # Global type declarations
│   ├── background/
│   │   └── service-worker.ts     # Service worker
│   ├── devtools/
│   │   ├── devtools.html         # Panel HTML
│   │   ├── devtools.ts           # Panel registration
│   │   └── panel/
│   │       ├── Panel.tsx         # Root Preact component
│   │       ├── components/
│   │       │   ├── LocalRemoteToggle.tsx
│   │       │   ├── ReloadThemeButton.tsx
│   │       │   ├── InspectModeToggle.tsx
│   │       │   └── StatusBar.tsx
│   │       ├── hooks/
│   │       │   └── useChromeRuntime.ts
│   │       └── styles.css
│   ├── content/
│   │   └── inspector.ts          # Content script
│   ├── native-host/
│   │   ├── main.ts               # Node.js entry point
│   │   ├── manifest.json         # Native host manifest
│   │   └── package.json          # Native host deps
│   └── shared/
│       ├── messaging.ts          # Message passing
│       ├── storage.ts            # Storage wrappers
│       ├── types/
│       │   └── chrome.d.ts       # Chrome API types
│       └── utils.ts              # Utilities
├── .github/
│   ├── workflows/
│   │   └── ci.yml                # CI pipeline
│   └── dependabot.yml            # Dependency updates
└── README.md                     # Updated docs
```

### Tooling Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Bundler | **esbuild** | 10-20x faster than webpack, single config, same tool for extension + native host |
| UI Framework | **Preact** | 3KB gzip, React-compatible via `preact/compat`, perfect for DevTools panel |
| TypeScript | **tsc** (type-check) + esbuild (compile) | esbuild strips types; tsc used only for type checking (`tsc --noEmit`) |
| Testing | **Vitest** | Fast, Jest-compatible API, native ESM, minimal config |
| Linting | **ESLint** + **@typescript-eslint** | Industry standard, Preact plugin config |
| Formatting | **Prettier** | Zero-config, tailwind-compatible if needed later |
| Chrome Types | **chrome-types** | Official Chrome Extension API type definitions from `@types/chrome` |

### Build Pipeline

```
npm run build → esbuild.config.mjs
├── Entry: src/manifest.ts          → dist/manifest.json (via esbuild text plugin)
├── Entry: src/background/service-worker.ts → dist/background/service-worker.js
├── Entry: src/devtools/devtools.html       → dist/devtools/devtools.html
├── Entry: src/devtools/panel/Panel.tsx     → bundled with devtools entry
├── Entry: src/content/inspector.ts         → dist/content/inspector.js
├── Copy: public/icons/*           → dist/icons/*
├── Copy: src/native-host/manifest.json → dist/native-host/manifest.json
└── Output: dist/ directory (ready to load as unpacked extension)

npm run build:host → separate esbuild pass → dist/native-host/host.node.js
npm run zip        → scripts/build-zip.mjs → dist/extension.zip
npm run lint       → eslint src/
npm run typecheck  → tsc --noEmit
npm run test       → vitest run
```

### Manifest V3 Strategy

The `manifest.json` is **generated** from `src/manifest.ts` rather than written as a static JSON file:

```typescript
// src/manifest.ts
import { defineManifest } from './shared/types/manifest';

export default defineManifest({
  manifest_version: 3,
  name: "Tienda Nube Theme DevTools",
  version: "0.1.0",
  // ... typed manifest definition
});
```

A custom esbuild plugin (`manifestPlugin`) writes the compiled manifest to `dist/manifest.json` during build. This gives us:
- Type safety for manifest fields
- Automatic version synchronization from `package.json`
- Conditional fields per environment (dev vs prod)

### Native Host Strategy

- `native-host/main.ts` is bundled by esbuild targeting Node.js
- Communication via stdin/stdout with JSON messages (standard Chrome native messaging protocol)
- `native-host/manifest.json` points to the built binary
- Distribution via Node.js SEA (Single Executable Application) deferred to a later change

---

## Risks & Tradeoffs

| Risk | Impact | Mitigation |
|------|--------|------------|
| `chrome-types` API gaps | Type errors on Chrome-only APIs | Pin chrome-types version; augment types in `src/shared/types/chrome.d.ts` |
| Service worker ES modules | MV3 requires modules, but import paths differ | esbuild bundles everything — no runtime imports needed |
| DevTools panel CSP | Inline styles blocked | Use external `styles.css` or CSS-in-JS with nonce |
| Native host SEA compatibility | Node.js SEA (experimental) may not work on all platforms | Defer SEA packaging; ship as standalone Node.js script initially |
| Content script on Tiendanube | Storefront DOM may change, breaking inspect mode | Decouple selector logic from content script skeleton; feature comes in later change |

### Tradeoff: esbuild over Vite

Vite offers HMR for the panel UI, but esbuild wins on simplicity. The panel is a DevTools panel — it's loaded once per DevTools window and doesn't need hot reload during development. Manual reload via `chrome://extensions` is acceptable.

### Tradeoff: Preact over React

Preact saves ~37KB gzip. The DevTools panel has no complex state management needs. If React-specific libraries are needed later, `preact/compat` provides near-full compatibility.

---

## Acceptance Criteria

The scaffold is complete when all of the following are true:

1. **`npm install` completes without errors** — all dependencies resolve.
2. **`npm run build` produces `dist/` with**:
   - `manifest.json` (valid MV3)
   - `background/service-worker.js` (runnable)
   - `devtools/devtools.html` (loadable in DevTools)
   - `content/inspector.js` (injectable)
   - `icons/` (16, 48, 128 PNG)
3. **`npm run typecheck` passes** — no TypeScript errors.
4. **`npm run lint` passes** — no ESLint warnings/errors.
5. **`npm run test` passes** — at minimum passing skeleton tests.
6. **`npm run zip` produces `dist/extension.zip`** — ready for Chrome Web Store upload.
7. **Chrome can load the unpacked extension** from `dist/`:
   - Extension appears in `chrome://extensions` without errors
   - DevTools panel tab "🛠 Tienda Nube" appears when DevTools is open
   - Clicking the panel tab shows the Preact UI (buttons, status bar, toggles)
8. **Native host can start** — `node dist/native-host/host.node.js --help` outputs usage.

### "Definition of Done" Checklist

- [ ] All source files exist with proper structure
- [ ] All config files are valid and working
- [ ] Build pipeline produces correct output
- [ ] Type checking passes with zero errors
- [ ] Linting passes with zero errors
- [ ] Tests pass (skeleton tests)
- [ ] Zip script produces valid output
- [ ] Extension loads in Chrome without errors
- [ ] DevTools panel renders (stub UI)
- [ ] Native host starts (stub)
- [ ] CI pipeline defined and passes
- [ ] README updated with dev commands

---

## Estimated Effort

| Layer | Files | Complexity | Est. Time |
|-------|-------|------------|-----------|
| Config files (package.json, tsconfig, esbuild) | 5-7 | Low | 45 min |
| Extension source (manifest, background, devtools, content) | 12-15 | Low-Med | 1.5 h |
| Panel UI (Preact components, hooks, CSS) | 7 | Low | 45 min |
| Native host (main.ts, manifest, package.json) | 3 | Low | 30 min |
| Shared types (messaging, storage, types) | 4 | Low | 30 min |
| Developer tooling (ESLint, Prettier, Vitest) | 4 | Low | 20 min |
| CI/CD (GitHub Actions, dependabot, zip script) | 3 | Low | 20 min |
| Icons | 3 | Trivial | 5 min |
| README update | 1 | Trivial | 10 min |

**Total estimated effort**: ~4.5 hours development time.

**Review budget forecast**: The scaffold will create approximately 40-50 new files. Estimated change size: 1200-1800 lines added. **This exceeds the 400-line review budget** — chained PRs will be needed for implementation.

---

## Next Steps

1. **Orchestrator**: Accept/reject this proposal
2. **Phase**: `spec` — Define detailed specs for each module in the scaffold
3. **Phase**: `design` — Technical design with sequence diagrams for build pipeline and messaging flow
4. **Phase**: `tasks` — Break into implementation tasks with chained PR slices (by review budget)
5. **Apply**: Implement slice by slice

**Decision needed before apply**: Yes (delivery strategy: chained PRs required)
**Chained PRs recommended**: Yes (scaffold exceeds 400-line budget)
**400-line budget risk**: High (~1500 lines estimated)

---

## Rollback Plan

If the scaffold has issues:
1. `git revert` the merge commits in reverse order
2. `git clean -fd` to remove untracked files (dist, node_modules)
3. Verify by attempting a fresh `npm install && npm run build`

No database migrations, no data loss — this is purely additive file creation.
