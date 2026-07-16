# Spec: Acceptance Criteria Matrix

**Module**: `acceptance-criteria` | **Change**: `scaffold` | **Phase**: `spec` | **Version**: 1.0

---

## Overview

This document consolidates all Acceptance Criteria (ACs) for the `scaffold` change. Each AC is traceable to a Functional Requirement (FR) and maps to a test level.

**Total ACs**: 36 (Functional + Non-Functional + Quality)

---

## Acceptance Criteria by Module

### Root Config (01-root-config.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-RC-01 | FR-RC-01 | `npm install` completes without errors | Functional | Smoke | P0 |
| AC-RC-02 | FR-RC-02 | `npm run build` produces `dist/` with all artifacts | Functional | Integration | P0 |
| AC-RC-03 | FR-RC-03 | `npm run typecheck` passes with 0 TypeScript errors | Quality | Unit | P0 |
| AC-RC-04 | FR-RC-04 | `npm run lint` passes with 0 ESLint warnings/errors | Quality | Unit | P0 |
| AC-RC-05 | FR-RC-05 | `npm run test` passes (skeleton tests) | Functional | Unit | P1 |
| AC-RC-06 | FR-RC-06 | `npm run zip` produces valid `dist/extension.zip` | Functional | Integration | P1 |
| AC-RC-07 | NFR-RC-01 | `tsconfig.json` uses project references for 3 layers | Quality | Unit | P1 |
| AC-RC-08 | NFR-RC-02 | `esbuild.config.mjs` builds all 4 entry points | Functional | Integration | P0 |

### Manifest (02-manifest.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-MF-01 | FR-MF-01 | Generated `manifest.json` is valid Manifest V3 | Functional | Integration | P0 |
| AC-MF-02 | FR-MF-02 | DevTools panel registered (`devtools_page`) | Functional | E2E | P0 |
| AC-MF-03 | FR-MF-03 | Service worker registered (`background.service_worker`) | Functional | E2E | P0 |
| AC-MF-04 | FR-MF-04 | Content script matches Tiendanube storefront/admin URLs | Functional | Integration | P0 |
| AC-MF-05 | FR-MF-05 | Native messaging host declared (`externally_connectable`) | Functional | Integration | P0 |
| AC-MF-06 | FR-MF-06 | Icons declared (16, 48, 128) and present in `dist/icons/` | Functional | Integration | P1 |
| AC-MF-07 | NFR-MF-01 | Permissions minimal (storage, activeTab, scripting, alarms, nativeMessaging) | Security | Unit | P0 |
| AC-MF-08 | NFR-MF-02 | Version synchronized from `package.json` | Quality | Unit | P1 |

### Background Service Worker (03-background-service-worker.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-BG-01 | FR-BG-01 | SW starts without errors (no console errors) | Functional | E2E | P0 |
| AC-BG-02 | FR-BG-02 | Messaging bridge routes: panel ↔ content ↔ native host | Functional | Integration | P0 |
| AC-BG-03 | FR-BG-03 | Native host client connects and responds to health check | Functional | Integration | P0 |
| AC-BG-04 | FR-BG-04 | Alarms fire on schedule (theme reload check) | Functional | Unit | P1 |
| AC-BG-05 | FR-BG-05 | Graceful shutdown on suspend (cleanup ports) | Non-functional | Integration | P1 |
| AC-BG-06 | NFR-BG-01 | SW bundle ≤ 15 KB gzipped | Performance | CI Gate | P1 |
| AC-BG-07 | NFR-BG-02 | Zero unhandled promise rejections | Quality | Runtime | P0 |

### DevTools Panel (04-devtools-panel.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-DP-01 | FR-DP-01 | Panel tab "🛠 Tienda Nube" appears in DevTools | Functional | E2E | P0 |
| AC-DP-02 | FR-DP-02 | Preact UI renders (stub components visible) | Functional | E2E | P0 |
| AC-DP-03 | FR-DP-03 | CSP compliant (no `unsafe-inline` styles in production) | Security | Unit | P0 |
| AC-DP-04 | FR-DP-04 | Components respond to background messages (connection state) | Functional | Integration | P0 |
| AC-DP-05 | FR-DP-05 | Status bar shows connection state (connected/disconnected/pending) | Functional | E2E | P1 |
| AC-DP-06 | NFR-DP-01 | Panel bundle ≤ 50 KB gzipped | Performance | CI Gate | P1 |
| AC-DP-07 | NFR-DP-02 | Cold mount ≤ 200ms | Performance | Lighthouse CI | P2 |

### Content Inspector (05-content-inspector.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-CI-01 | FR-CI-01 | Detects Tiendanube storefront page (URL + DOM markers) | Functional | Integration | P0 |
| AC-CI-02 | FR-CI-02 | Hover over element → badge shows Liquid file name | Functional | E2E | P0 |
| AC-CI-03 | FR-CI-03 | Throttle (150ms) prevents excessive badge creation | Performance | Unit | P1 |
| AC-CI-04 | FR-CI-04 | Cleanup on SPA navigation / dynamic content | Non-functional | Integration | P1 |
| AC-CI-05 | NFR-CI-01 | Content script bundle ≤ 10 KB gzipped | Performance | CI Gate | P1 |
| AC-CI-06 | NFR-CI-02 | Zero DOM mutations when inspect mode OFF | Quality | Unit | P1 |

### Native Host (06-native-host.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-NH-01 | FR-NH-01 | Binary starts and responds to health check (`--health`) | Functional | Integration | P0 |
| AC-NH-02 | FR-NH-02 | Executes `nube-cli theme push` and returns structured result | Functional | E2E | P0 |
| AC-NH-03 | FR-NH-03 | Returns structured error on command failure (timeout, exit code) | Functional | Unit | P0 |
| AC-NH-04 | FR-NH-04 | Handles concurrent requests (queued or parallel) | Non-functional | Integration | P1 |
| AC-NH-05 | FR-NH-05 | Binary runs on target platforms (macOS, Linux, Windows) | Compatibility | E2E | P1 |
| AC-NH-06 | NFR-NH-01 | Binary size ≤ 8 MB | Performance | CI Gate | P1 |
| AC-NH-07 | NFR-NH-02 | Stdin/stdout protocol compliant (JSON-RPC 2.0) | Quality | Unit | P0 |

### Shared Core (07-shared-core.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-SH-01 | FR-SH-01 | Message types compile without errors in all contexts | Quality | Unit | P0 |
| AC-SH-02 | FR-SH-02 | Storage wrappers work in SW, panel, and content script | Functional | Integration | P0 |
| AC-SH-03 | FR-SH-03 | Chrome type augmentations valid (no `any` leaks) | Quality | Unit | P0 |
| AC-SH-04 | FR-SH-04 | Utils are pure, tested, and tree-shakeable | Quality | Unit | P1 |

### Cross-Cutting (08-cross-cutting.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-CC-01 | FR-CC-01 | Result pattern used consistently across all modules | Quality | Unit | P0 |
| AC-CC-02 | FR-CC-02 | Correlation IDs propagate through entire message chain | Functional | Integration | P0 |
| AC-CC-03 | FR-CC-03 | DI container resolves all ports at startup in each context | Functional | Unit | P0 |
| AC-CC-04 | FR-CC-04 | Structured logging with correlation IDs in all contexts | Non-functional | Integration | P1 |
| AC-CC-05 | FR-CC-05 | CSP violations = 0 in production build | Security | CI Gate | P0 |
| AC-CC-06 | FR-CC-06 | Bundle size budgets enforced in CI | Performance | CI Gate | P1 |

---

## Consolidated Matrix

| Module | Functional ACs | Non-Functional ACs | Quality ACs | Total |
|--------|----------------|---------------------|-------------|-------|
| Root Config | 4 | 2 | 2 | 8 |
| Manifest | 6 | 2 | 0 | 8 |
| Background SW | 5 | 2 | 1 | 8 |
| DevTools Panel | 5 | 2 | 0 | 7 |
| Content Inspector | 4 | 2 | 0 | 6 |
| Native Host | 5 | 2 | 1 | 8 |
| Shared Core | 4 | 0 | 0 | 4 |
| Cross-Cutting | 3 | 0 | 3 | 6 |
| **TOTAL** | **36** | **12** | **7** | **55** |

*Note: Some ACs span multiple categories; counted in primary category.*

---

## Test Level Distribution

| Test Level | AC Count | Modules Covered |
|------------|----------|-----------------|
| Unit | 18 | All (logic, types, patterns) |
| Integration | 12 | Messaging, storage, native host, DI |
| E2E | 7 | Panel load, theme reload, inspector hover |
| CI Gate | 6 | Bundle sizes, typecheck, lint, CSP, circular deps |
| Runtime | 2 | Unhandled rejections, CSP violations |
| Lighthouse CI | 1 | Panel cold mount |
| Compatibility | 1 | Native host platforms |

---

## Traceability to Architectural Principles

| Principle | ACs Enforcing |
|-----------|---------------|
| Hexagonal (Ports & Adapters) | AC-CC-03, AC-BG-02, AC-NH-02, AC-SH-02 |
| SOLID (SRP) | AC-RC-01..08, AC-DP-01..05, AC-CI-01..04 (one responsibility per module) |
| DRY | AC-SH-01..04 (shared core), AC-CC-01 (Result pattern reuse) |
| DI / Inversion | AC-CC-03 (DI container), AC-BG-03 (native host client) |
| Composition over Inheritance | AC-CC-01 (Result composition), AC-SH-01 (message composition) |
| Open/Closed | AC-CC-02 (extensible messaging), AC-DP-04 (component extensibility) |
| TypeScript Strict | AC-SH-03, AC-RC-03, AC-MF-01 (typed manifest) |
| File Size < 300 lines | Enforced by CI (`eslint --max-lines`) |
| Testability | All ACs mapped to test level (Unit/Integration/E2E) |
| Scalability | AC-DP-04 (new tools), AC-NH-04 (new commands), AC-CI-01 (new page types) |

---

## Definition of Done (Change-Level)

The `scaffold` change is **complete** when:

1. ✅ All 36 ACs pass (automated where possible, manual for E2E)
2. ✅ 5 stacked-to-main PRs merged to `main` in order
3. ✅ CI pipeline passes on each PR (lint, typecheck, test, build, zip)
4. ✅ Extension loads in Chrome unpacked from `dist/` without errors
5. ✅ DevTools panel "🛠 Tienda Nube" renders stub UI
6. ✅ Native host binary runs (`--health` returns OK)
7. ✅ `dist/extension.zip` uploads to Chrome Web Store (validation only)
8. ✅ README updated with dev commands
9. ✅ No `any` types (except documented in `tsconfig.json` `suppressImplicitAnyIndexErrors` if absolutely needed)
10. ✅ No circular dependencies (`madge --circular` passes)

---

*End of Acceptance Criteria Matrix*