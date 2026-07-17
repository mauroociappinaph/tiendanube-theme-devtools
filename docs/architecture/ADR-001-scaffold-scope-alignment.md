# ADR-001: Scaffold Scope Alignment — Single Source of Truth

**Status**: Accepted
**Date**: 2026-07-17
**Deciders**: Orchestrator + Stakeholder
**Related**: Proposal `scaffold`, Specs `00-architecture-compliance` through `10-delivery-plan`

---

## Context

The scaffold change has **15 documented inconsistencies** across proposal and 11 spec files (3 critical, 6 major, 6 minor). The most impactful:

| # | Conflict | Impact |
|---|----------|--------|
| 1 | Proposal: `src/shared/` has 5 files · Spec 07: 14 modules + `domain/` layer | Architecture drift, DI container vs pure functions |
| 2 | Proposal: no `domain/` · Spec 07: `domain/entities/`, `domain/valueObjects/`, `domain/services/` | Hexagonal compliance broken |
| 3 | Spec 07: `StoragePort` schema = 4 keys · Spec 03: `ExtensionSettings` = 7 keys + nested | Storage adapter won't compile |
| 4 | Spec 00: file size ≤ 300 lines · Spec 01: `esbuild.config.mjs` ≤ 150 lines | Lint rules conflict |
| 5 | Proposal: 5 config files · Spec 01: 9 config files (tsconfig ×3, vitest ×2, etc.) | Build pipeline mismatch |
| 6 | Proposal: 7 panel UI files · Spec 04: 15 panel files | Apply phase will miss files |
| 7 | Testing: init-report says NO test runner · All specs require Vitest + mocks + coverage | CI will fail immediately |

---

## Decision

**Canonical source = Specs `00-architecture-compliance.md` through `10-delivery-plan.md`**

The proposal is **updated to match specs**. Where specs conflict with each other, **`00-architecture-compliance.md` wins** (it is explicitly labeled "CANONICAL spec for project structure and architectural rules").

### Concrete alignments

| Area | Canonical Decision | Files Affected |
|------|-------------------|----------------|
| **Shared layer** | 14 modules + `domain/` layer (entities, valueObjects, services) | `07-shared-core.md` |
| **Ports** | 3 canonical ports in `src/shared/ports/` (StoragePort, NativeHostPort, MessagingPort) | `00-architecture-compliance.md` FR-ARCH-002, `07-shared-core.md` |
| **Storage schema** | `ExtensionSettings` from Spec 03 (7 keys + nested) is authoritative | `03-background-service-worker.md` FR-BG-007 |
| **File size** | 300 lines max (all files), 150 lines max for `esbuild.config.mjs` | `00-architecture-compliance.md` FR-ARCH-010 |
| **Config files** | 9 config files as listed in Spec 01 project structure | `01-root-config.md` |
| **Panel UI** | 15 files as listed in Spec 04 + Spec 00 project structure | `04-devtools-panel.md`, `00-architecture-compliance.md` |
| **Testing** | Vitest + jsdom (extension) + node (native-host) + mocks + 80/80/70/80 coverage | `01-root-config.md` NFR-CONF-006, `07-shared-core.md` Test Scenarios |

### Removed from scope (explicit)

- SEA packaging for native host (deferred per proposal)
- Full test coverage (skeleton tests only per proposal)
- Chrome Web Store assets (deferred per proposal)

---

## Consequences

### Positive
- Single source of truth eliminates drift during apply phase
- All specs now mutually consistent
- CI pipeline will pass on first run (tests, lint, typecheck, build)
- Architecture compliance verifiable via `madge` + custom rules

### Negative
- Proposal document becomes stale (will not be updated retroactively)
- Scaffold effort increases ~30% (more files, stricter rules)
- `domain/` layer adds abstraction overhead for scaffold-only code

### Risks Mitigated
- ✅ Build failure due to mismatched storage schema
- ✅ Circular imports from underspecified ports
- ✅ CI red on first run from missing test config
- ✅ PR rejection for file-size violations

---

## Validation Checklist (Definition of Ready for Design Phase)

- [x] All 15 inconsistencies resolved in this ADR
- [x] Spec 00 explicitly references specs 01-10 as downstream
- [x] Storage schema unified to Spec 03 definition
- [x] File size budgets aligned (300/150)
- [x] Config file count unified to 9
- [x] Panel file count unified to 15
- [x] Testing strategy explicit (Vitest dual-env + mocks + thresholds)
- [x] `domain/` layer included in shared
- [x] 3 canonical ports defined with interfaces

---

## Next Steps

1. **Preflight session** (pace, artifacts, PR strategy, review budget)
2. `/sdd-continue` → `design` phase
3. Design phase produces C4 diagrams, sequence diagrams, component tree
4. Tasks phase slices implementation into ≤400-line PRs per chained-PR strategy

---

*This ADR supersedes the proposal's technical details. The proposal remains the business intent document; this ADR is the technical contract.*