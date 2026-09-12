# Spec: Acceptance Criteria Matrix

**Module**: `acceptance-criteria` | **Change**: `scaffold` | **Phase**: `spec` | **Version**: 1.0

---

## Overview

This document consolidates all Acceptance Criteria (ACs) for the `scaffold` change. Each AC is traceable to a Functional Requirement (FR) and maps to a test level.

**Total ACs**: 67 (Functional + Non-Functional + Quality)

---

## Acceptance Criteria by Module

### Root Config (01-root-config.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-RC-01 | FR-RC-001 | `npm install` completes without errors | Functional | Smoke | P0 |
| AC-RC-02 | FR-RC-002 | `npm run build` produces `dist/` with all artifacts | Functional | Integration | P0 |
| AC-RC-03 | FR-RC-003 | `npm run typecheck` passes with 0 TypeScript errors | Quality | Unit | P0 |
| AC-RC-04 | FR-RC-004 | `npm run lint` passes with 0 ESLint warnings/errors | Quality | Unit | P0 |
| AC-RC-05 | FR-RC-005 | `npm run test` passes (skeleton tests) | Functional | Unit | P1 |
| AC-RC-06 | FR-RC-006 | `npm run zip` produces valid `dist/extension.zip` | Functional | Integration | P1 |
| AC-RC-07 | NFR-RC-001 | `tsconfig.json` uses project references for 3 layers | Quality | Unit | P1 |
| AC-RC-08 | NFR-RC-002 | `esbuild.config.mjs` builds all 4 entry points | Functional | Integration | P0 |
| AC-RC-09 | FR-CONF-TEST-001 | Vitest config supports jsdom + node environments | Functional | Unit | P1 |
| AC-RC-10 | FR-CONF-TEST-002 | Chrome API mocks work in vitest setup | Functional | Unit | P1 |
| AC-RC-11 | FR-CONF-TEST-003 | Native host vitest config runs on Node environment | Functional | Unit | P1 |

### Manifest (02-manifest.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-MF-01 | FR-MF-001 | Generated `manifest.json` is valid Manifest V3 | Functional | Integration | P0 |
| AC-MF-02 | FR-MF-002 | DevTools panel registered (`devtools_page`) | Functional | E2E | P0 |
| AC-MF-03 | FR-MF-003 | Service worker registered (`background.service_worker`) | Functional | E2E | P0 |
| AC-MF-04 | FR-MF-004 | Content script matches Tiendanube storefront/admin URLs | Functional | Integration | P0 |
| AC-MF-05 | FR-MF-005 | Native messaging host declared (`externally_connectable`) | Functional | Integration | P0 |
| AC-MF-06 | FR-MF-006 | Icons declared (16, 48, 128) and present in `dist/icons/` | Functional | Integration | P1 |
| AC-MF-07 | NFR-MF-001 | Permissions minimal (storage, activeTab, scripting, alarms, nativeMessaging) | Security | Unit | P0 |
| AC-MF-08 | NFR-MF-002 | Version synchronized from `package.json` | Quality | Unit | P1 |

### Background Service Worker (03-background-service-worker.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-BG-01 | FR-BG-001 | SW starts without errors (no console errors) | Functional | E2E | P0 |
| AC-BG-02 | FR-BG-002 | Messaging bridge routes: panel ↔ content ↔ native host | Functional | Integration | P0 |
| AC-BG-03 | FR-BG-003 | Native host client connects and responds to health check | Functional | Integration | P0 |
| AC-BG-04 | FR-BG-004 | Alarms fire on schedule (theme reload check) | Functional | Unit | P1 |
| AC-BG-05 | FR-BG-005 | Graceful shutdown on suspend (cleanup ports) | Non-functional | Integration | P1 |
| AC-BG-06 | NFR-BG-001 | SW bundle ≤ 15 KB gzipped | Performance | CI Gate | P1 |
| AC-BG-07 | NFR-BG-002 | Zero unhandled promise rejections | Quality | Runtime | P0 |

### DevTools Panel (04-devtools-panel.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-DP-01 | FR-DTP-001 | Panel tab "🛠 Tienda Nube" appears in DevTools | Functional | E2E | P0 |
| AC-DP-02 | FR-DTP-002 | Preact UI renders (stub components visible) | Functional | E2E | P0 |
| AC-DP-03 | FR-DTP-003 | CSP compliant (no `unsafe-inline` styles in production) | Security | Unit | P0 |
| AC-DP-04 | FR-DTP-004 | Components respond to background messages (connection state) | Functional | Integration | P0 |
| AC-DP-05 | FR-DTP-005 | Status bar shows connection state (connected/disconnected/pending) | Functional | E2E | P1 |
| AC-DP-06 | NFR-DTP-001 | Panel bundle ≤ 50 KB gzipped | Performance | CI Gate | P1 |
| AC-DP-07 | NFR-DTP-002 | Cold mount ≤ 200ms | Performance | Lighthouse CI | P2 |
| AC-DP-08 | FR-DTP-009 | `panelStore` exports signals for all shared state | Functional | Unit | P1 |
| AC-DP-09 | FR-DTP-009 | `StatusBar` reacts to `panelStore.status` changes automatically | Functional | Integration | P0 |
| AC-DP-10 | FR-DTP-009 | `ReloadThemeButton` click → `setLoading` → status bar shows loading | Functional | E2E | P0 |
| AC-DP-11 | FR-DTP-009 | `InspectModeToggle` reads/writes `panelStore.inspectMode` | Functional | Unit | P1 |
| AC-DP-12 | FR-DTP-009 | `LocalRemoteToggle` reads/writes `panelStore.themeMode` | Functional | Unit | P1 |
| AC-DP-13 | FR-DTP-009 | `isConnected` computed updates when native host status changes | Functional | Integration | P1 |
| AC-DP-14 | FR-DTP-003b | ErrorBoundary catches component crashes and shows fallback UI | Non-functional | Unit | P1 |

### Content Inspector (05-content-inspector.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-CI-01 | FR-CI-001 | Detects Tiendanube storefront page (URL + DOM markers) | Functional | Integration | P0 |
| AC-CI-02 | FR-CI-002 | Hover over element → badge shows Liquid file name | Functional | E2E | P0 |
| AC-CI-03 | FR-CI-003 | Throttle (150ms) prevents excessive badge creation | Performance | Unit | P1 |
| AC-CI-04 | FR-CI-004 | Cleanup on SPA navigation / dynamic content | Non-functional | Integration | P1 |
| AC-CI-05 | NFR-CI-001 | Content script bundle ≤ 10 KB gzipped | Performance | CI Gate | P1 |
| AC-CI-06 | NFR-CI-002 | Zero DOM mutations when inspect mode OFF | Quality | Unit | P1 |

### Native Host (06-native-host.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-NH-01 | FR-NH-001 | Binary starts and responds to health check (`--health`) | Functional | Integration | P0 |
| AC-NH-02 | FR-NH-002 | Executes `nube-cli theme push` and returns structured result | Functional | E2E | P0 |
| AC-NH-03 | FR-NH-003 | Returns structured error on command failure (timeout, exit code) | Functional | Unit | P0 |
| AC-NH-04 | FR-NH-004 | Handles concurrent requests (queued or parallel) | Non-functional | Integration | P1 |
| AC-NH-05 | FR-NH-005 | Binary runs on target platforms (macOS, Linux, Windows) | Compatibility | E2E | P1 |
| AC-NH-06 | NFR-NH-001 | Binary size ≤ 8 MB | Performance | CI Gate | P1 |
| AC-NH-07 | NFR-NH-002 | Stdin/stdout protocol compliant (JSON-RPC 2.0) | Quality | Unit | P0 |

### Shared Core (07-shared-core.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-SH-01 | FR-SH-001 | Message types compile without errors in all contexts | Quality | Unit | P0 |
| AC-SH-02 | FR-SH-002 | Storage wrappers work in SW, panel, and content script | Functional | Integration | P0 |
| AC-SH-03 | FR-SH-003 | Chrome type augmentations valid (no `any` leaks) | Quality | Unit | P0 |
| AC-SH-04 | FR-SH-004 | Utils are pure, tested, and tree-shakeable | Quality | Unit | P1 |

### Cross-Cutting (08-cross-cutting.md)

| AC-ID | FR Ref | Description | Type | Test Level | Priority |
|-------|--------|-------------|------|------------|----------|
| AC-CC-01 | FR-CC-001 | Result pattern used consistently across all modules | Quality | Unit | P0 |
| AC-CC-02 | FR-CC-002 | Correlation IDs propagate through entire message chain | Functional | Integration | P0 |
| AC-CC-03 | FR-CC-003 | DI container resolves all ports at startup in each context | Functional | Unit | P0 |
| AC-CC-04 | FR-CC-004 | Structured logging with correlation IDs in all contexts | Non-functional | Integration | P1 |
| AC-CC-05 | FR-CC-005 | CSP violations = 0 in production build | Security | CI Gate | P0 |
| AC-CC-06 | FR-CC-006 | Bundle size budgets enforced in CI | Performance | CI Gate | P1 |
| AC-CC-07 | FR-CC-007 | Message Queue v2 design documented (deferred to follow-up) | Functional | Doc | P2 |
| AC-CC-08 | FR-CC-008 | Command Bus v2 design documented (deferred to follow-up) | Functional | Doc | P2 |

---

## Consolidated Matrix

| Module | Functional ACs | Non-Functional ACs | Quality ACs | Total |
|--------|----------------|---------------------|-------------|-------|
| Root Config | 4 | 2 | 2 | 8 |
| Manifest | 6 | 2 | 0 | 8 |
| Background SW | 5 | 2 | 0 | 7 |
| DevTools Panel | 5 | 2 | 0 | 14 |
| Content Inspector | 4 | 2 | 0 | 6 |
| Native Host | 5 | 2 | 0 | 7 |
| Shared Core | 4 | 0 | 0 | 4 |
| Cross-Cutting | 5 | 0 | 3 | 8 |
| **TOTAL** | **38** | **12** | **5** | **62** |

*Note: Some ACs span multiple categories; counted in primary category.*

---

## Test Level Distribution

| Test Level | AC Count | Modules Covered |
|------------|----------|-----------------|
| Unit | 21 | All (logic, types, patterns) |
| Integration | 14 | Messaging, storage, native host, DI |
| E2E | 9 | Panel load, theme reload, inspector hover |
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
| Error Boundary Graceful Degradation | AC-DP-14 |

---

## Definition of Done (Change-Level)

The `scaffold` change is **complete** when:

1. ✅ All 67 ACs pass (automated where possible, manual for E2E)
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

### Coverage Requirements

The following coverage thresholds MUST be met (matching `vitest.config.ts` in 01-root-config.md):

| Metric | Threshold |
|--------|-----------|
| lines | 80% |
| functions | 80% |
| branches | 70% |
| statements | 80% |
| statements | 80% |

These thresholds are enforced by `npm run test:coverage` and the CI pipeline.

---

*End of Acceptance Criteria Matrix*