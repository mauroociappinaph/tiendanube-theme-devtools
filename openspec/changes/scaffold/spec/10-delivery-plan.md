# Spec: Delivery Plan — Stacked-to-Main PRs

**Change**: `scaffold` | **Phase**: `spec` | **Version**: 1.0

---

## Overview

The `scaffold` change delivers ~2,130 lines across ~59 files. Per SDD review budget (400 lines) and delivery strategy (`force-chained` / `stacked-to-main`), this is split into **6 stacked PRs** merged sequentially to `main`.

| PR | Scope | Est. Lines | Files | Depends On |
|----|-------|------------|-------|------------|
| **PR #1** | Root Config + Shared Core | ~440 | 12 | — (base) |
| **PR #2** | Manifest + Background SW | ~350 | 8 | PR #1 |
| **PR #3** | Native Host | ~355 | 6 | PR #1 |
| **PR #4** | DevTools Panel (Preact) | ~390 | 15 | PR #1, PR #2, PR #3 |
| **PR #5** | Content Inspector | ~350 | 10 | PR #1, PR #2, PR #4 |
| **PR #6** | Cross-Cutting + CI/CD + Zip + Icons + README | ~360 | 8 | PR #1-5 |

**Total**: ~2,245 lines | ~59 files | 6 PRs

---

## PR Tracking — Status | Owner | Coverage

| PR | Scope | Status | Owner | Coverage (unit/int) | DoR ✅ | DoD ✅ |
|----|-------|--------|-------|---------------------|--------|--------|
| #1 | Root Config + Shared Core | Not Started | @backend-lead | — / — | ☐ | ☐ |
| #2 | Manifest + Background SW | Not Started | @backend-lead | — / — | ☐ | ☐ |
| #3 | Native Host | Not Started | @fullstack-lead | — / — | ☐ | ☐ |
| #4 | DevTools Panel (Preact) | Not Started | @frontend-lead | — / — | ☐ | ☐ |
| #5 | Content Inspector | Not Started | @frontend-lead | — / — | ☐ | ☐ |
| #6 | Cross-Cutting + CI/CD + Zip | Not Started | @devops-lead | — / — | ☐ | ☐ |

### Sub-tasks PR #1 (granular tracking)

| Task | Status | Owner | Coverage | DoR ✅ | DoD ✅ |
|------|--------|-------|----------|--------|--------|
| package.json + scripts | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| tsconfig (project refs) | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| esbuild.config.mjs | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| vitest.config.ts + setup | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| eslint + prettier | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| shared/result.ts + tests | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| shared/errors.ts + tests | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| shared/messaging.ts + tests | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| shared/di.ts + tests | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| shared/logger.ts + tests | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| shared/ports/* + tests | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| shared/storage.ts + tests | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| shared/utils.ts + tests | Not Started | @backend-lead | 80/80/70/80 | ☐ | ☐ |
| shared/types/chrome.d.ts | Not Started | @backend-lead | N/A | ☐ | ☐ |
| `src/types/global.d.ts` | Not Started | @backend-lead | N/A | ☐ | ☐ |
| vitest.setup.ts (chrome mocks) | Not Started | @backend-lead | N/A | ☐ | ☐ |
| .github/workflows/ci.yml | Not Started | @devops-lead | N/A | ☐ | ☐ |
| .github/dependabot.yml | Not Started | @devops-lead | N/A | ☐ | ☐ |
| README.md + CHANGELOG.md | Not Started | @devops-lead | N/A | ☐ | ☐ |
| **T-005b: Corrección de errores TypeScript existentes** | Not Started | @backend-lead | N/A | ☐ | ☐ |
| **T-005c: Implementación de tests unitarios para código existente** | Not Started | @backend-lead | N/A | ☐ | ☐ |

---

## Definition of Ready / Definition of Done (Reference)

**DoR** (before starting any PR): Spec exists + ACs clear + traceability + deps resolved + env ready + test skeletons + mocks ready + ADR if needed + estimation.

**DoD** (before merge to main): Spec compliance ✅ + code quality (lint/typecheck/format) + tests pass + coverage ≥ targets (lines 80%, functions 80%, branches 70%, statements 80%) + build + arch validation + security audit + docs updated + agent self-eval + human approval.

See `00-architecture-compliance.md` for full DoR/DoD checklists and SDD Phase Gates.

---

## PR #1: Root Config + Shared Core

### Goal
Establish tooling, build pipeline, and shared domain layer. After merge: `npm install && npm run build` works (produces empty `dist/`).

### Files Created
| Path | Purpose | Est. Lines |
|------|---------|------------|
| `package.json` | Workspace root + scripts + deps | 55 |
| `tsconfig.json` | Project references root | 25 |
| `tsconfig.extension.json` | Extension layer TS config | 30 |
| `tsconfig.native-host.json` | Native host TS config | 25 |
| `esbuild.config.mjs` | Multi-entry build (4 entry points) | 80 |
| `vitest.config.ts` | Test config (jsdom + node) | 35 |
| `vitest.native-host.config.ts` | Native host test config (Node) | 25 |
| `vitest.setup.ts` | Chrome API mocks (storage, runtime, devtools) | 45 |
| `vitest.native-host.setup.ts` | Native host test setup (Node) | 15 |
| `eslint.config.mjs` | ESLint + TypeScript + Preact | 45 |
| `.prettierrc` / `.prettierignore` | Formatting | 15 |
| `src/shared/result.ts` | Result/Either pattern | 45 |
| `src/shared/errors.ts` | DomainError discriminated union | 50 |
| `src/shared/messaging.ts` | Envelope, Request, Response types (canonical) | 55 |
| `src/shared/di.ts` | Lightweight DI container | 50 |
| `src/shared/logger.ts` | Logger interface + ConsoleLogger/FileLogger/MemoryLogger | 40 |
| `src/shared/ports/StoragePort.ts` | Port interface (canonical) | 15 |
| `src/shared/ports/MessagingPort.ts` | Port interface (canonical) | 15 |
| `src/shared/ports/NativeHostPort.ts` | Port interface (canonical) | 15 |
| `src/shared/types/chrome.d.ts` | Chrome API augmentations | 25 |
| `src/shared/utils.ts` | Pure utilities (debounce, uuid, etc.) | 60 |
| `src/types/global.d.ts` | Global type declarations | 10 |
| `.env.example` | Env template (FR-POL-011) | 10 |

### Acceptance Criteria (from 09-acceptance-criteria.md)
- AC-RC-01..08, AC-SH-01..04, AC-CC-01..03

### CI Gates (must pass before PR #2 can be reviewed)
```yaml
jobs:
  lint: eslint src/
  typecheck: tsc --noEmit -p tsconfig.extension.json -p tsconfig.native-host.json
  test: vitest run
  build: npm run build  # produces dist/ (empty but valid)
```

### Validation
```bash
npm ci && npm run build  # dist/manifest.json, dist/background/, dist/devtools/, dist/content/
npm run typecheck        # 0 errors
npm run lint             # 0 warnings
npm run test             # skeleton tests pass
```

---

## PR #2: Manifest + Background Service Worker

### Goal
Generate valid Manifest V3, register Service Worker, implement message routing and native host client.

### Files Created
| Path | Purpose | Est. Lines |
|------|---------|------------|
| `src/manifest.ts` | Typed manifest definition (generates manifest.json) | 70 |
| `src/shared/types/manifest.ts` | `defineManifest()` helper + types | 30 |
| `src/background/service-worker.ts` | SW entry: router, alarms, native host client | 120 |
| `src/background/MessageRouter.ts` | Routes messages between panel/content/native | 80 |
| `src/background/NativeHostClient.ts` | Adapter for NativeHostPort (canonical) | 75 |
| `src/background/ChromeStorageAdapter.ts` | Adapter for StoragePort (canonical) | 35 |
| `src/background/alarms.ts` | Theme reload check alarm | 25 |
| `src/native-host/manifest.json` | Native messaging host manifest | 15 |

### Acceptance Criteria
- AC-MF-01..08, AC-BG-01..07

### CI Gates (extends PR #1)
- Same + `npm run build` now produces full `dist/` with:
  - `dist/manifest.json` (valid MV3)
  - `dist/background/service-worker.js`
  - `dist/native-host/manifest.json` (copied)

### Validation
```bash
# In Chrome: Load unpacked dist/
# chrome://extensions → service worker console: "SW started", "Native host client connected"
# chrome.runtime.sendMessage({ type: 'health' }) → { ok: true }
```

---

## PR #3: Native Host

### Goal
Native messaging host binary that responds to health checks and executes nube-cli commands. Standalone — no Chrome dependencies needed.

### Files Created
| Path | Purpose | Est. Lines |
|------|---------|------------|
| `src/native-host/main.ts` | CLI entry: health, push, preview, watch | 90 |
| `src/native-host/StdioTransport.ts` | Framed stdin/stdout + JSON-RPC 2.0 | 35 |
| `src/native-host/CommandBus.ts` | Handler registry + middleware pipeline | 40 |
| `src/native-host/config.ts` | `HostConfigSchema` (Zod) + `loadHostConfig()` | 35 |
| `src/native-host/validate.ts` | Path + arg security validators | 25 |
| `src/native-host/CliExecutor.ts` | `execFile` wrapper (timeout, no shell) | 30 |
| `src/native-host/commands/ThemePushCommand.ts` | Theme push handler | 30 |
| `src/native-host/commands/ThemePreviewCommand.ts` | Theme preview handler | 30 |
| `src/native-host/commands/ThemeWatchCommand.ts` | Watch handler (streaming) | 35 |
| `src/native-host/commands/SystemHealthCommand.ts` | Health check handler | 25 |
| `src/native-host/package.json` | Native host deps (minimal: zod) | 15 |

### Acceptance Criteria
- AC-NH-01..07

### CI Gates (extends PR #1)
- Build produces `dist/native-host/host.node.js`
- Native host binary via `npm run build:host`

### Validation
```bash
node dist/native-host/host.node.js --health
# { "status": "ok", "version": "0.1.0" }

node dist/native-host/host.node.js push --theme-id 123
# Executes nube-cli theme push, returns structured result
```

---

## PR #4: DevTools Panel (Preact)

### Goal