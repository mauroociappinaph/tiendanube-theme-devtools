# Exploration: Project Scaffold

## Current State

The project is an empty shell with:
- A `README.md` describing the planned Chrome DevTools extension for Tienda Nube theme development
- A `.gitignore` with sensible defaults (node_modules, dist, env files, build artifacts)
- An empty `.github/workflows/` directory
- An empty `docs/` directory
- An `openspec/` directory with SDD init artifacts
- **No source code, no package.json, no build config, no test framework, no linting**

## Affected Areas

The entire project root — every file created is additive.

| Path | Role |
|------|------|
| `package.json` | Monorepo-style root package (workspaces for extension + native-host) |
| `tsconfig.json` | Root TS config with project references |
| `src/manifest.ts` | Typed Manifest V3 definition (generates `manifest.json`) |
| `src/background/service-worker.ts` | Service worker for messaging, alarms, native messaging bridge |
| `src/devtools/devtools.html` | DevTools panel HTML entry point |
| `src/devtools/devtools.ts` | Registers the DevTools panel with React/Preact root |
| `src/devtools/panel/` | Panel UI (React/Preact components) |
| `src/content/inspector.ts` | Content script for hover inspect mode |
| `src/native-host/` | Node.js native messaging host |
| `src/shared/` | Types, messaging protocol, storage wrappers, utils |
| `public/icons/` | Extension icons (16/48/128) |
| `scripts/build-zip.mjs` | Build script for Chrome Web Store submission |
| `eslint.config.mjs` | ESLint configuration |
| `.prettierrc` / `.prettierignore` | Prettier configuration |
| `.github/workflows/ci.yml` | CI pipeline |
| `.github/dependabot.yml` | Dependency updates |

## Approaches

### Approach 1: esbuild (Recommended)

Use esbuild as the sole bundler with a single build script for the extension, and esbuild + SEA for the native host.

**Build config**: `esbuild.config.mjs` — multiple entry points, outputs to `dist/`.
**Native host**: esbuild bundles `native-host/main.ts` → Node.js binary via `pkg` or `sea`.
**Dev server**: esbuild's `--watch` mode for development.

- **Pros**:
  - Fastest build times (10-20x faster than webpack)
  - Simple configuration, no plugins needed for basic TS/CSS
  - Native ES module output for service workers
  - Works well with `chrome-types` for type checking
  - Same bundler for both extension and native host
- **Cons**:
  - No built-in HMR for the panel UI (need to reload extension manually)
  - No CSS modules or postcss out of the box (can add plugins)
  - Smaller plugin ecosystem compared to webpack
- **Effort**: Low — single config file, well-understood patterns

### Approach 2: Vite + vite-plugin-web-extension

Use Vite with a dedicated extension plugin for HMR during development.

- **Pros**:
  - Excellent DX with HMR for panel components
  - CSS modules, PostCSS, TypeScript built-in
  - Large plugin ecosystem
- **Cons**:
  - `vite-plugin-web-extension` is a third-party dependency — maintenance risk
  - HMR for service workers is unreliable
  - Vite is designed for web apps, extensions need workarounds
  - Native host still needs a separate build (esbuild or webpack)
  - More complex config for multiple entry points
- **Effort**: Medium — more config, more dependencies

### Approach 3: Webpack (Traditional)

Use webpack with `chrome-extension-boilerplate` patterns.

- **Pros**:
  - Most battle-tested for Chrome extensions
  - Rich plugin ecosystem
  - Good examples and documentation
  - CopyWebpackPlugin handles static assets well
- **Cons**:
  - Slowest build times
  - Verbose configuration
  - Overkill for this project's complexity
  - Native host still needs separate tooling
- **Effort**: Medium-High — lots of boilerplate config

### Approach 4: Vanilla (No Bundler)

Write TypeScript, compile with `tsc`, load as unpacked with raw imports.

- **Pros**:
  - Zero build tooling
  - Direct debugging in DevTools (no sourcemaps needed)
- **Cons**:
  - No bundling — many small HTTP requests in production
  - Service workers can't import ES modules from file://
  - Native host needs Node.js runtime, not bundler
  - No minification for production
  - CSS imports still need a build step
- **Effort**: Low initially, but breaks at production boundaries

## Recommendation

**Use Approach 1 (esbuild)**. It's the pragmatic sweet spot:

1. **Speed**: esbuild compiles the full extension in <200ms — iteration cycles are instant.
2. **Simplicity**: One config file, no plugins for basic needs. Easy to understand and modify.
3. **Dual-purpose**: Same bundler for extension (browser) and native host (Node.js SEA).
4. **MV3 native**: ES module output aligns with service worker module expectations.
5. **Low ceremony**: No webpack plugin magic, no Vite plugin maintenance risk.

For panel UI components, use **Preact** (3KB) instead of React (40KB+) — the DevTools panel is a lightweight UI, not a complex SPA. If the user prefers React, it's a simple swap since Preact is API-compatible.

**Native host strategy**: esbuild bundles `native-host/main.ts` for Node.js. For distribution, use Node.js `--experimental-sea-config` (SEA — Single Executable Application) available in Node.js 20+. This avoids the `pkg` deprecation and creates a native binary.

## UI Framework Decision

| Option | Bundle Size | React Compat | Ecosystem | Panel Suitability |
|--------|------------|--------------|-----------|-------------------|
| **Preact** | ~3KB gzip | ✅ Yes (preact/compat) | Smaller | ✅ Excellent for DevTools panels |
| React | ~40KB gzip | — | Largest | ✅ Works, but heavy for a panel |
| Lit | ~5KB gzip | ❌ No | Medium | ✅ Good for web components |
| Vanilla JS | 0KB | ❌ No | — | ✅ Works, more manual work |

**Recommendation**: Preact. It's React-compatible (can use React patterns, hooks, JSX), weighs a fraction of React, and the DevTools panel is simple enough that Preact's ecosystem is sufficient.

## Bundle Strategy

- **Extension**: Multiple entry points → single-pass esbuild build
  - `src/devtools/devtools.html` → `dist/devtools/`
  - `src/devtools/panel/Panel.tsx` → bundled with devtools entry
  - `src/background/service-worker.ts` → `dist/background/service-worker.js`
  - `src/content/inspector.ts` → `dist/content/inspector.js`
- **Static assets**: Copy `public/` → `dist/` (icons, HTML)
- **Native host**: Separate esbuild build → Node.js SEA binary
- **CSS**: Inline via JS imports or separate CSS output

## Risks

1. **`chrome-types` package version drift** — Chrome API types may lag behind actual API. Mitigation: pin the version matching the target Chrome.
2. **Service worker module imports** — MV3 service workers with type: "module" have import restrictions. Mitigation: esbuild bundles everything, so no runtime imports.
3. **Native host distribution** — Node.js SEA is relatively new (Node 20+). Test on all target platforms early.
4. **Content script CSP** — Tiendanube storefronts may have strict CSP. The inspection content script uses hover events and DOM traversal, which shouldn't trigger CSP issues.
5. **DevTools panel closed-source CSP** — DevTools panels have their own CSP that treats inline styles as unsafe. Need to verify CSS approach (external stylesheets or CSS-in-JS).

## Ready for Proposal

**Yes** — the path is clear. The scaffold should use esbuild + Preact + TypeScript project references with a monorepo-style layout.
