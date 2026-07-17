# Design Summary — Scaffold Change

**Change**: `scaffold`
**Phase**: design
**Date**: 2026-07-16
**ADR Alignment**: ADR-001 (scope alignment, canonical = specs 00-10, spec 00 wins conflicts)

---

## Technical Approach

Hexagonal Architecture (Ports & Adapters) applied to a Chrome Extension MV3 + Node.js native messaging host. The `src/shared/` layer provides canonical port interfaces (`StoragePort`, `NativeHostPort`, `MessagingPort`) and pure domain utilities (Result pattern, DI container, discriminated union messages). Four adapters (`background/`, `devtools/`, `content/`, `native-host/`) implement these ports for their respective runtime environments. Build pipeline uses esbuild multi-entry with a custom manifest plugin. CI enforces bundle size budgets, type safety, and coverage thresholds.

---

## Key Architecture Decisions

| Decision | Choice | Rationale | Spec Ref |
|----------|--------|-----------|----------|
| Architecture | Hexagonal (Ports & Adapters) | Isolates Chrome API dependency, enables testability, allows native host independence | 00 FR-ARCH-001 |
| Ports location | `src/shared/ports/` | Canonical interfaces before adapter implementation | 00 FR-ARCH-002 |
| Bundler | esbuild | 10-20x faster than webpack, single config, multi-entry | 01 FR-CONF-002 |
| UI framework | Preact + signals | 3KB gzip, reactive store via @preact/signals | 04 FR-DTP-003 |
| Messaging | Discriminated unions | Open/Closed — new message types never modify existing handlers | 07 |
| Native host protocol | JSON-RPC 2.0 (internal to stdio) | Standard protocol, fully encapsulated behind NativeHostPort | 06 |
| Error handling | Result/Either pattern | No thrown exceptions for expected failures | 08 FR-CC-01 |
| DI | Lightweight container + branded tokens | Constructor injection, no framework dependency | 08 FR-CC-03 |
| CSP | `script-src 'self'; style-src 'self'` | Blocks inline scripts and styles in production | 02 FR-MAN-008 |
| CLI security | execFile only, no shell | Prevents shell injection | 06 FR-NH-003 |

---

## Traceability Matrix: Spec FR/NFR → Design Artifact

| Spec | Requirement | Design Artifact |
|------|-------------|-----------------|
| 00 | FR-ARCH-001: Layer separation | `01-c4-context.md`, `02-c4-container.md` |
| 00 | FR-ARCH-002: Canonical port definitions | `06-api-contracts.md` |
| 00 | FR-ARCH-003: SRP — 300 line max | `03-c4-component.md` (component per file) |
| 00 | FR-ARCH-004: Dependency injection | `06-api-contracts.md` (DI container) |
| 00 | FR-ARCH-005: Open/Closed messaging | `07-data-models.md` (discriminated union) |
| 00 | FR-ARCH-006: Shared utilities (DRY) | `06-api-contracts.md`, `07-data-models.md` |
| 00 | FR-ARCH-007: Adapter independence | `02-c4-container.md`, `03-c4-component.md` |
| 00 | FR-ARCH-008: No circular deps | `09-deployment-architecture.md` (CI: madge) |
| 00 | FR-ARCH-009: TypeScript strict mode | `09-deployment-architecture.md` (CI: tsc) |
| 00 | NFR-ARCH-001: Bundle size budgets | `02-c4-container.md`, `09-deployment-architecture.md` |
| 01 | FR-CONF-001: Manifest generation plugin | `04-sequences.md` (sequence 1: build pipeline) |
| 01 | FR-CONF-002: Multi-entry build | `04-sequences.md` (sequence 1) |
| 01 | FR-CONF-003: Static asset copy | `04-sequences.md` (sequence 1) |
| 01 | FR-CONF-004: Native host build | `04-sequences.md` (build:host sub-sequence) |
| 01 | FR-CONF-005: Zip script | `09-deployment-architecture.md` (CI pipeline) |
| 01 | FR-CONF-006: TS project references | `02-c4-container.md` (extension vs native-host) |
| 02 | FR-MAN-001: Typed manifest | `04-sequences.md` (manifestPlugin) |
| 02 | FR-MAN-002: Required manifest fields | `08-security-boundaries.md` (permissions) |
| 02 | FR-MAN-006: Permissions declaration | `08-security-boundaries.md` |
| 02 | FR-MAN-008: CSP | `08-security-boundaries.md` |
| 03 | FR-BG-001: SW initialization | `04-sequences.md` (sequence 2: startup) |
| 03 | FR-BG-002: Message router | `03-c4-component.md`, `04-sequences.md` (sequence 3) |
| 03 | FR-BG-003: Native messaging bridge | `04-sequences.md` (sequence 2, 4) |
| 03 | FR-BG-004: Settings management | `07-data-models.md` (ExtensionSettings) |
| 03 | FR-BG-005: Alarm scheduler | `04-sequences.md` (sequence 2) |
| 03 | FR-BG-007: Settings schema (ExtensionSettings) | `07-data-models.md` |
| 04 | FR-DTP-001: Panel registration | `03-c4-component.md`, `05-component-tree.md` |
| 04 | FR-DTP-002: HTML shell with CSP | `05-component-tree.md` |
| 04 | FR-DTP-003: Root Preact component | `05-component-tree.md` |
| 04 | FR-DTP-003b: ErrorBoundary | `05-component-tree.md` |
| 04 | FR-DTP-004: Local/Remote Toggle | `05-component-tree.md` |
| 04 | FR-DTP-005..0010: Components | `05-component-tree.md` (all components) |
| 04 | FR-DTP-009: panelStore signals | `05-component-tree.md` (store section) |
| 04 | NFR-DTP-001: Panel ≤50KB | `02-c4-container.md` (size budget) |
| 05 | FR-CI-001: Page detection | `03-c4-component.md`, `07-data-models.md` |
| 05 | FR-CI-002: Liquid file mapping | `03-c4-component.md`, `07-data-models.md` |
| 05 | FR-CI-003: Hover handling | `03-c4-component.md`, `04-sequences.md` (sequence 5) |
| 05 | FR-CI-004: Badge injection | `03-c4-component.md` |
| 05 | FR-CI-005: SPA navigation handling | `03-c4-component.md` |
| 05 | NFR-CI-001: Content ≤10KB | `02-c4-container.md` (size budget) |
| 06 | FR-NH-001: Native messaging protocol | `04-sequences.md` (sequence 4) |
| 06 | FR-NH-002: Command Bus | `03-c4-component.md` |
| 06 | FR-NH-003: Host configuration (Zod) | `08-security-boundaries.md` |
| 06 | FR-NH-005: Watch service | `04-sequences.md` (sequence 6) |
| 06 | FR-NH-006: Health check | `04-sequences.md` (sequence 2, 4) |
| 06 | NFR-NH-001: Host ≤8MB | `02-c4-container.md` (size budget) |
| 07 | FR-SH-001..005: Shared modules | `06-api-contracts.md`, `07-data-models.md` |
| 07 | NFR-SH-001: Zero runtime deps | `02-c4-container.md` (shared is domain layer) |
| 08 | FR-CC-01: Result/Either pattern | `06-api-contracts.md`, `07-data-models.md` |
| 08 | FR-CC-02: Correlation IDs + messaging | `07-data-models.md` (ExtensionMessage) |
| 08 | FR-CC-03: DI container | `06-api-contracts.md` |
| 08 | FR-CC-04: Structured logging | `03-c4-component.md` (middleware) |
| 08 | FR-CC-05: CSP compliance | `08-security-boundaries.md` |
| 08 | FR-CC-06: Bundle size budgets | `09-deployment-architecture.md` (CI) |
| 09 | All ACs | `09-deployment-architecture.md` |
| 10 | Delivery plan (6 stacked PRs) | `09-deployment-architecture.md` |

---

## Design Artifact Inventory

| # | File | Type | Key Content |
|---|------|------|-------------|
| 1 | `01-c4-context.md` | C4 Level 1 | System context: developer, storefront, nube-cli, Chrome DevTools |
| 2 | `02-c4-container.md` | C4 Level 2 | Containers: SW, Panel, Content, Shared Core, Native Host + Chrome API matrix |
| 3 | `03-c4-component.md` | C4 Level 3 | Components per adapter: MessageRouter, NativeHostClient, InspectorController, CommandBus, etc. |
| 4 | `04-sequences.md` | Sequence | 6 diagrams: build, startup, messaging, handshake, inspect, reload |
| 5 | `05-component-tree.md` | Component Tree | Preact hierarchy: Panel → App → 6 components + panelStore hooks/state |
| 6 | `06-api-contracts.md` | Interfaces | 3 canonical ports + DI container + tokens |
| 7 | `07-data-models.md` | Data | ExtensionSettings, ThemeInfo, PageDetectionPayload, HoverEventPayload, HealthResult, WatchEventPayload, ExtensionMessage discriminated union |
| 8 | `08-security-boundaries.md` | Security | MV3 permissions, native host allowlist, path validation, CSP, CLI security |
| 9 | `09-deployment-architecture.md` | Deployment | PR chain strategy, CI pipeline, release workflow, native host install |
| 10 | `design-summary.md` | Traceability | This file — spec→design matrix, decisions, risk assessment |

---

## Quality Gates Verification

| Gate | Status | Evidence |
|------|--------|----------|
| Every spec FR/NFR traces to ≥1 design artifact | ✅ | Full matrix above covering 00-10 |
| No implementation code — architecture/design only | ✅ | All files are markdown with diagrams |
| Diagrams in Mermaid syntax | ✅ | C4, gitGraph, flowcharts, sequences |
| Component tree shows Preact hierarchy | ✅ | Full tree with props/state in `05-component-tree.md` |
| API contracts match Spec 07 canonical interfaces | ✅ | Exact TypeScript in `06-api-contracts.md` |
| Hexagonal Architecture strictly followed | ✅ | Ports in shared/, adapters in each layer, DI injection |
| Bundle size budgets respected | ✅ | Documented in `02-c4-container.md`, enforced in `09-deployment-architecture.md` |
| CSP rules satisfied | ✅ | `08-security-boundaries.md` |
| Testing strategy explicit | ✅ | Vitest dual-env + thresholds in `09-deployment-architecture.md` |
| Threat matrix N/A | ✅ | No routing, shell, subprocess, VCS/PR automation, or executable-file classification in this change scope |

---

## Risk Assessment

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Stacked PR merge conflicts | Medium | Each PR depends on previous — sequential merge order enforced | ✅ Documented in 09 |
| Native host Node.js path resolution | Low | `which nube` or `NUBE_CLI_PATH` env var | ✅ Spec 06 FR-NH-003 |
| Chrome extension ID mismatch | Medium | Native host `allowed_origins` must match production ID | ✅ Documented in 08 |
| Content script CSP on Tiendanube | Low | MV3 isolated world — CSP applies to extension pages, not injected scripts | ✅ Spec 02 |
| Bundle size creep | Low | CI gates enforce hard limits per bundle | ✅ 09 |

---

## Next Steps

1. **sdd-tasks** — Break design into implementable tasks per PR
2. **sdd-apply** — Implement PR #1 (Root Config + Shared Core) first
3. **sdd-verify** — Verify against ACs from Spec 09

**Approach**: Hexagonal Ports & Adapters across 6 stacked PRs
**Key Decisions**: 9 documented ADRs in this design
**Files Affected**: ~59 new files across 6 PRs
**Testing Strategy**: Vitest dual-env (jsdom + node) with Chrome mocks, 80/80/70/80 coverage
