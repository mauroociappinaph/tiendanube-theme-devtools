# Architecture Compliance — Scaffold Phase

**Change**: `scaffold`
**Spec**: 00-architecture-compliance
**Date**: 2026-07-16

---

## Purpose

This document maps every architectural principle (from Engram `architecture/principles`) to concrete requirements that the scaffold MUST satisfy. Every file created in the scaffold MUST be traceable to at least one principle below.

---

## Hexagonal Architecture (Ports & Adapters)

### FR-ARCH-001: Layer Separation

The source tree MUST maintain three distinct layers:

```
src/
├── shared/          ← Domain / Core (zero external deps at runtime)
├── background/      ← Adapter: Chrome Service Worker
├── devtools/        ← Adapter: Chrome DevTools Panel
├── content/         ← Adapter: Chrome Content Script
└── native-host/     ← Adapter: Node.js Native Messaging Host
```

**Traceability**: Hexagonal — domain in `shared/`, adapters per Chrome boundary.

#### Scenario: Layer directory structure exists

- GIVEN the project is scaffolded
- WHEN a developer lists `src/`
- THEN the directories `shared/`, `background/`, `devtools/`, `content/`, `native-host/` MUST exist
- AND each directory MUST contain an `index.ts` or equivalent entry point

#### Scenario: Adapter isolation

- GIVEN an adapter module (e.g., `background/service-worker.ts`)
- WHEN it imports from another adapter directly (e.g., `devtools/panel/Panel.tsx`)
- THEN the build MUST fail with a module-not-found error
- ONLY shared types in `shared/` MAY be imported across adapters

### FR-ARCH-002: Port Definitions

The `src/shared/` layer MUST define port interfaces (TypeScript types/interfaces) before any adapter implementation.

**Traceability**: Hexagonal — ports before adapters.

#### Scenario: Shared types exist before adapter code

- GIVEN the scaffold is generated
- WHEN inspecting `src/shared/messaging.ts`
- THEN it MUST define `MessagePayload`, `MessageSender`, and `MessageResponse` interfaces
- AND adapters MUST reference these types, not define their own

---

## SOLID Principles

### FR-ARCH-003: Single Responsibility (SRP)

No file in the scaffold MUST exceed 300 lines. Each file MUST have exactly one reason to change.

**Traceability**: SOLID — SRP principle.

#### Scenario: File length enforced

- GIVEN any source file in `src/`
- WHEN counting its lines
- THEN the count MUST be ≤ 300 (excluding blank lines and comments)

#### Scenario: Single responsibility per file

- GIVEN a source file `src/devtools/panel/components/LocalRemoteToggle.tsx`
- WHEN examining its exports
- THEN it MUST export exactly one component: `LocalRemoteToggle`
- AND it MUST NOT contain unrelated logic (e.g., storage access, message routing)

### FR-ARCH-004: Dependency Injection

All cross-module dependencies MUST use constructor injection. No module SHALL instantiate its own dependencies via `new`.

**Traceability**: SOLID — DIP, DI for decoupling.

#### Scenario: Service worker uses DI

- GIVEN `src/background/service-worker.ts`
- WHEN it needs to send a message to the native host
- THEN it MUST receive a `NativeMessagingPort` via constructor or factory parameter
- AND MUST NOT import and instantiate `chrome.runtime.connectNative` directly

### FR-ARCH-005: Open/Closed

The messaging protocol in `src/shared/messaging.ts` MUST use discriminated unions so that adding a new message type does NOT require modifying existing message handlers.

**Traceability**: SOLID — Open/Closed.

#### Scenario: Adding a new message type

- GIVEN the discriminated union `ExtensionMessage`
- WHEN a new message type `"INSPECT_ELEMENT"` is added
- THEN no existing handler for `"GET_THEME_INFO"` or `"RELOAD_THEME"` MUST be modified
- AND type narrowing MUST work automatically via the `type` discriminant
- AND TypeScript's exhaustiveness checking MUST catch unhandled cases

---

## DRY (Don't Repeat Yourself)

### FR-ARCH-006: Shared Utilities

Common patterns (async storage, message sending, error formatting) MUST live in `src/shared/` and be imported, not duplicated.

**Traceability**: DRY — extract repetition to shared modules.

#### Scenario: Storage wrapper is single source

- GIVEN multiple adapters need to read/write `chrome.storage.local`
- WHEN they import the storage wrapper
- THEN they MUST import from `src/shared/storage.ts`
- AND MUST NOT call `chrome.storage.local.get/set` directly

#### Scenario: Error formatting utility

- GIVEN any adapter catches an error
- WHEN formatting it for display or logging
- THEN it MUST use `formatError()` from `src/shared/utils.ts`
- AND MUST NOT construct error strings inline

### NFR-ARCH-001: No Duplicate Type Definitions

Every Chrome API type augmentation MUST be defined once in `src/shared/types/chrome.d.ts`. No adapter SHALL redeclare Chrome types.

**Traceability**: DRY — single source of truth for types.

---

## High Cohesion, Low Coupling

### FR-ARCH-007: Adapter Independence

Each adapter (background, devtools, content, native-host) MUST be independently loadable and testable.

**Traceability**: High cohesion, low coupling.

#### Scenario: Background adapter loads independently

- GIVEN a test imports `src/background/service-worker.ts`
- WHEN the test runs
- THEN it MUST NOT require the DevTools panel or content script modules to be present

#### Scenario: Native host runs standalone

- GIVEN `src/native-host/main.ts` is built
- WHEN executed via `node dist/native-host/host.node.js`
- THEN it MUST start, read stdin, and write stdout without loading any Chrome extension modules

### FR-ARCH-008: No Circular Dependencies

The dependency graph MUST be acyclic. The build SHALL fail if circular imports are detected.

**Traceability**: Low coupling — no circular deps.

#### Scenario: Import graph is a DAG

- GIVEN the full source tree
- WHEN analyzing the import graph with `madge`
- THEN no cycles MUST be found

---

## TypeScript Discipline

### FR-ARCH-009: Strict Mode

`tsconfig.json` MUST enable `strict: true`. The `any` type MUST be prohibited except in explicitly documented locations.

**Traceability**: TypeScript strict mode, zero `any`.

#### Scenario: Strict mode enabled

- GIVEN `tsconfig.json` and `tsconfig.*.json` files
- WHEN inspecting compiler options
- THEN `strict: true` MUST be set
- AND `noImplicitAny: true` MUST be set
- AND `strictNullChecks: true` MUST be set

#### Scenario: Documented `any` exceptions

- GIVEN any file uses `any`
- WHEN inspecting it
- THEN a comment `// eslint-disable-next-line @typescript-eslint/no-explicit-any — {reason}` MUST precede each usage
- AND the reason MUST be valid (e.g., `Chrome API callback parameter`)

### NFR-ARCH-002: `tsc --noEmit` Type Check

The build pipeline MUST run `tsc --noEmit` to verify types. esbuild strips types, so `tsc` alone provides type safety.

**Traceability**: TypeScript strict mode.

---

## Code Quality

### FR-ARCH-010: File Size Budget

No source file SHALL exceed 300 lines. The `esbuild.config.mjs` SHALL NOT exceed 150 lines. Config files (`tsconfig.json`, `.eslintrc.cjs`) SHALL be exempt from this budget but SHOULD stay concise.

**Traceability**: File size < 300 lines, no God Objects.

### FR-ARCH-011: Descriptive Naming

Functions MUST use verb phrases (`getThemeInfo`, `sendMessage`). Components MUST use noun phrases (`LocalRemoteToggle`, `StatusBar`). Variables MUST be descriptive, never single-letter (except loop indices).

**Traceability**: Clean code — descriptive names.

### FR-ARCH-012: Short Functions

No function SHALL exceed 40 lines. No component SHALL exceed 80 lines.

**Traceability**: Clean code — short functions, single responsibility.

---

## Testability

### FR-ARCH-013: Unit Test Scaffold

Every module in `src/shared/` MUST have a corresponding test file at `src/shared/__tests__/`.

**Traceability**: Testability by design — unit for business logic.

#### Scenario: Shared module tests exist

- GIVEN `src/shared/messaging.ts` exists
- WHEN the scaffold is complete
- THEN `src/shared/__tests__/messaging.test.ts` MUST exist as a skeleton (import + `describe` block)
- AND passing `vitest run` MUST include this test

### FR-ARCH-014: Test Isolation

Tests MUST NOT depend on `chrome.*` APIs. The `vitest.config.ts` MUST provide mocks for `chrome` globals.

**Traceability**: Testability — minimal mocks.

---

## Maintainability Priority

### NFR-ARCH-003: Readability Over Performance

Code SHALL favor readability over micro-optimizations. If a performance optimization obscures intent, a comment MUST explain both the optimization and the rationale.

**Traceability**: Maintainability priority — Readability > Maintainability > Scalability > Testability > Simplicity.

---

## Scalability

### FR-ARCH-015: Extensibility Points

The scaffold MUST define clear extension points for future additions:

| Extension Point | Location | Future Additions |
|----------------|----------|------------------|
| Message types | `src/shared/messaging.ts` | New command types |
| Panel tools | `src/devtools/panel/components/` | Theme browser, CSS editor |
| Inspection modes | `src/content/inspector.ts` | Element picker, layout debugger |
| AI providers | `src/shared/` (future) | OpenAI, Claude adapters |
| Transports | `src/shared/messaging.ts` | WebSocket, iframe |

**Traceability**: Scalability — easy addition of DevTools tools, commands, AI providers, inspection modes, transports.

---

## Summary

| Principle | FR/NFR Count | Key Files |
|-----------|-------------|-----------|
| Hexagonal (Ports & Adapters) | 2 FR | `src/shared/`, all adapters |
| SOLID (SRP, DIP, OCP) | 3 FR | All files |
| DRY | 1 FR + 1 NFR | `src/shared/utils.ts`, `src/shared/storage.ts` |
| High Cohesion, Low Coupling | 2 FR | Import graph |
| TypeScript Strict | 1 FR + 1 NFR | `tsconfig.json`, type definitions |
| Code Quality | 3 FR | All files |
| Testability | 2 FR | `vitest.config.ts`, test files |
| Maintainability | 1 NFR | Code style |
| Scalability | 1 FR | Extension points |

---

## Git Flow & Branching Strategy (Project Policies)

### FR-POL-001: Git Flow Structure

The repository MUST follow Git Flow with these branches:

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production-ready releases only | Branch protection + required reviews |
| `develop` | Integration branch for next release | Branch protection + CI required |
| `feature/*` | New features (from `develop`) | Short-lived, deleted after merge |
| `fix/*` | Bug fixes (from `develop` or `main`) | Short-lived |
| `refactor/*` | Code improvements (from `develop`) | Short-lived |
| `docs/*` | Documentation updates | Short-lived |
| `test/*` | Test additions/improvements | Short-lived |
| `chore/*` | Maintenance tasks | Short-lived |

**Traceability**: Project policy — Git Flow & Branching Strategy.

#### Scenario: Branch naming enforced
- GIVEN a developer creates a branch
- WHEN pushing to origin
- THEN branch name MUST match `^(feature|fix|refactor|docs|test|chore)/[a-z0-9-]+$`

#### Scenario: No direct commits to protected branches
- GIVEN a commit is pushed to `main` or `develop`
- WHEN not via PR merge
- THEN the push MUST be rejected by branch protection

---

### FR-POL-002: Conventional Commits

Every commit message MUST follow Conventional Commits 1.0.0:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Allowed types**: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `build`, `ci`, `style`, `chore`.

**Traceability**: Project policy — Conventional Commits.

#### Scenario: Commit message validation
- GIVEN a commit message
- WHEN validated by commitlint
- THEN it MUST pass `commitlint --strict`

#### Scenario: Scopes for this project
| Scope | Area |
|-------|------|
| `bg` | Background Service Worker |
| `panel` | DevTools Panel (Preact) |
| `content` | Content Script Inspector |
| `native` | Native Messaging Host |
| `shared` | Shared Core (messaging, storage, di, logger, types) |
| `config` | Build/config files (tsconfig, esbuild, eslint, etc.) |
| `ci` | GitHub Actions workflows |
| `deps` | Dependency updates |

---

## Pull Request Requirements (Project Policies)

### FR-POL-003: PR Required for All Changes

All changes reaching `develop` or `main` MUST go through a Pull Request:

| Change Type | Target Branch | Reviewers Required | Approvals |
|-------------|---------------|-------------------|-----------|
| `feature/*` | `develop` | 1+ | 1 |
| `fix/*` | `develop` | 1+ | 1 |
| `refactor/*` | `develop` | 1+ | 1 |
| `docs/*` | `develop` | 1+ | 1 |
| `test/*` | `develop` | 1+ | 1 |
| `chore/*` | `develop` | 1+ | 1 |
| `release/*` | `main` | 1+ | 1 |

**Traceability**: Project policy — Pull Request Requirements.

#### Scenario: PR structure enforced
- GIVEN a PR is opened
- WHEN validated
- THEN it MUST have: clear title, description, linked issue, test plan, updated docs if applicable

---

## GitHub Actions Workflows (Project Policies)

### FR-POL-004: Required Workflow Files

The scaffold MUST include these workflows in `.github/workflows/`:

| Workflow | File | Triggers | Purpose |
|----------|------|----------|---------|
| CI | `ci.yml` | push, PR to main/develop | lint, typecheck, test, build, arch validation |
| Lint | `lint.yml` | push, PR | ESLint + Prettier |
| Typecheck | `typecheck.yml` | push, PR | `tsc --noEmit` |
| Test | `test.yml` | push, PR | `vitest run` + coverage |
| Build | `build.yml` | push to main/develop | `npm run build` + `npm run zip` |
| Dependency | `dependency.yml` | weekly schedule | Dependabot/Renovate PRs |
| Release | `release.yml` | manual / tag | SemVer tag, changelog, GitHub Release, upload artifact |

**Traceability**: Project policy — GitHub Actions Workflows.

---

### FR-POL-005: Branch Protection Rules

Branch protection MUST be configured via GitHub API or UI for `main` and `develop`:

| Branch | Require PR | Require Approvals | Require CI | Dismiss Stale | Require Linear History | Include Admins |
|--------|-----------|-------------------|------------|---------------|------------------------|----------------|
| `main` | ✅ | 1 | ✅ (all workflows) | ✅ | ✅ | ✅ |
| `develop` | ✅ | 1 | ✅ (ci.yml) | ✅ | ✅ | ❌ |

**Traceability**: Project policy — Branch Protection Rules.

---

## Automated Code Review (Project Policies)

### FR-POL-006: CodeRabbit Integration

CodeRabbit MUST be configured for all PRs to `develop` and `main`:

| Detection Category | Required |
|--------------------|----------|
| Bugs & logic errors | ✅ |
| Architecture violations (Hexagonal, SOLID) | ✅ |
| Code smells & anti-patterns | ✅ |
| Duplication | ✅ |
| Performance issues | ✅ |
| Security vulnerabilities | ✅ |
| SOLID/SRP violations | ✅ |

**Traceability**: Project policy — Automated Code Review.

---

## Dependency Management (Project Policies)

### FR-POL-007: Dependabot/Renovate Configuration

Dependency updates MUST be automated:

| Setting | Value |
|---------|-------|
| Schedule | Weekly (Mondays) |
| Target branches | `develop` |
| Group minor/patch | ✅ |
| Group major | ❌ (separate PRs) |
| Auto-merge minor/patch | ✅ (if CI passes) |
| Auto-merge major | ❌ |
| Ignore list | Major versions of `@types/chrome`, `typescript`, `esbuild` until tested |

**Traceability**: Project policy — Dependency Management.

---

## Semantic Versioning & Releases (Project Policies)

### FR-POL-008: SemVer Tagging

All releases MUST follow SemVer: `MAJOR.MINOR.PATCH`

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking change | MAJOR | `1.0.0` → `2.0.0` |
| New feature (backward compatible) | MINOR | `1.0.0` → `1.1.0` |
| Bug fix (backward compatible) | PATCH | `1.0.0` → `1.0.1` |

**Git tags**: `v<version>` (e.g., `v1.2.3`)

**Traceability**: Project policy — Semantic Versioning.

---

### FR-POL-009: Automated Changelog

`CHANGELOG.md` MUST be auto-generated from Conventional Commits via `standard-version` or `release-it`:

```yaml
# .releaserc.json (or similar)
{
  "preset": "conventionalcommits",
  "changelog": {
    "disable": false
  }
}
```

**Traceability**: Project policy — Changelog Generation.

---

### FR-POL-010: GitHub Releases with Artifacts

Every release tag MUST create a GitHub Release with:

| Artifact | Description |
|----------|-------------|
| `extension-vX.Y.Z.zip` | Chrome Web Store uploadable zip |
| `native-host-vX.Y.Z-linux.tar.gz` | Native host binary (Linux) |
| `native-host-vX.Y.Z-macos.tar.gz` | Native host binary (macOS) |
| `native-host-vX.Y.Z-windows.zip` | Native host binary (Windows) |
| `SHA256SUMS` | Checksums for all artifacts |

Release MUST require explicit approval before publishing.

**Traceability**: Project policy — GitHub Releases.

---

## Environment Variables & Secrets Security (Project Policies)

### FR-POL-011: Environment Strategy

| File | Versioned? | Purpose |
|------|------------|---------|
| `.env.example` | ✅ | Template with placeholder values |
| `.env.local` | ❌ | Developer local overrides |
| `.env.ci` | ❌ | CI-specific (injected via GitHub Secrets) |
| `.env.production` | ❌ | Production (never committed) |

**Traceability**: Project policy — Environment Variables & Secrets.

---

### FR-POL-012: Chrome Extension Security (Manifest V3)

**CRITICAL**: NO SECRETS in extension bundle (`dist/`), manifest, or source files committed to repo.

| Secret Type | Where It Lives | How Extension Accesses |
|-------------|----------------|------------------------|
| API keys | Native Host `process.env` | Via native messaging (background → native host) |
| OAuth tokens | Native Host `process.env` / Backend | Via native messaging |
| Service account JSON | Native Host file system | Via native messaging |
| CI/CD tokens | GitHub Actions Secrets | Injected at build time (never in dist) |

Extension code MUST NEVER:
- Import `.env` files directly
- Use `process.env` (not available in browser)
- Hardcode any credential

**Traceability**: Project policy — Chrome Extension Security (MV3).

---

### FR-POL-013: Native Host Security

Native Host (`src/native-host/`) is the ONLY component that accesses secrets:

| Requirement | Implementation |
|-------------|----------------|
| Reads secrets from `process.env` | `dotenv.config()` at startup (only `.env.local` / `.env.ci`) |
| Validates all input | Zod schemas for every native message request |
| Sanitizes output | Never returns secrets, tokens, or raw stderr to extension |
| Runs with least privilege | No network access beyond required APIs; no filesystem beyond config dir |
| Binary verification | SHA256 checksums published with release |

**Traceability**: Project policy — Native Host Security.

---

### FR-POL-014: GitHub Actions Secrets

| Secret | Used By | Never In |
|--------|---------|----------|
| `CHROME_WEBSTORE_CLIENT_ID` | Release workflow | `env:` directly |
| `CHROME_WEBSTORE_CLIENT_SECRET` | Release workflow | `env:` directly |
| `CHROME_WEBSTORE_REFRESH_TOKEN` | Release workflow | `env:` directly |
| `CODESIGN_CERT` / `CODESIGN_PASSWORD` | Release workflow (macOS/Windows) | `env:` directly |
| `NATIVE_HOST_CONFIG_PATH` | CI build | `env:` directly |

Access pattern:
```yaml
# .github/workflows/release.yml
env:
  CHROME_WEBSTORE_CLIENT_ID: ${{ secrets.CHROME_WEBSTORE_CLIENT_ID }}
  # NOT: CHROME_WEBSTORE_CLIENT_ID: ${{ secrets.CHROME_WEBSTORE_CLIENT_ID }} in job env
```

**Traceability**: Project policy — GitHub Actions Secrets.

---

### FR-POL-015: Environment Validation

Build MUST fail if critical environment variables are missing:

```typescript
// scripts/validate-env.ts (run in CI before build)
const required = [
  'CHROME_WEBSTORE_CLIENT_ID',
  'CHROME_WEBSTORE_CLIENT_SECRET',
  'CHROME_WEBSTORE_REFRESH_TOKEN'
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}
```

Add to `package.json`: `"validate:env": "node scripts/validate-env.ts"`

**Traceability**: Project policy — Environment Validation.

---

## Chrome Extension Permissions (Project Policies)

### FR-POL-016: Minimum Required Privilege

Manifest V3 permissions MUST be minimal:

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "alarms",
    "nativeMessaging",
    "devtools"
  ],
  "host_permissions": [
    "https://*.tiendanube.com/*",
    "https://*.nuvemshop.com.br/*"
  ],
  "optional_host_permissions": []
}
```

**NO** `"<all_urls>"` or broad host permissions.

**Traceability**: Project policy — Chrome Extension Permissions.

---

## Documentation Maintenance (Project Policies)

### FR-POL-017: README Update Requirement

PR MUST update `README.md` when introducing changes that affect:
- Installation steps
- Build commands
- Required environment variables
- External dependencies (e.g., new `nube-cli` version)
- Chrome Web Store publishing process
- Native host installation

**Traceability**: Project policy — Documentation Maintenance.

---

### FR-POL-018: Architecture Decision Records (ADR)

Significant decisions MUST be recorded in `docs/architecture/ADR-XXX-title.md`:

| Decision Type | Requires ADR? |
|---------------|---------------|
| New external dependency (runtime) | ✅ |
| Architecture pattern change | ✅ |
| Security model change | ✅ |
| Breaking API change | ✅ |
| Build tool change | ✅ |
| Refactor (internal only) | ❌ |

**ADR Template**:
```markdown
# ADR-XXX: Title

## Status
Proposed | Accepted | Superseded

## Context
What is the issue?

## Decision
What was decided?

## Consequences
Positive / Negative / Risks
```

**Traceability**: Project policy — Architecture Decision Records.

---

## Quality Validation (Project Policies)

### FR-POL-019: Quality Gates (All Must Pass)

| Gate | Tool | Threshold |
|------|------|-----------|
| TypeScript strict | `tsc --noEmit` | 0 errors |
| Linting | `eslint src/` | 0 errors, 0 warnings |
| Formatting | `prettier --check` | 0 diffs |
| Unit tests | `vitest run` | 100% pass |
| Integration tests | `vitest run --integration` | 100% pass |
| Build | `npm run build` | Success + artifacts |
| Architecture validation | `madge --circular` | 0 cycles |
| Dependency audit | `npm audit --audit-level=high` | 0 high/critical |
| Automated code review | CodeRabbit | No blocking findings |
| Security validation | `npm audit` + manual | 0 critical |

**Traceability**: Project policy — Quality Validation.

---

### FR-POL-020: Agent Self-Evaluation Before PR

Before opening a PR, the implementing agent MUST produce:

| Section | Content |
|---------|---------|
| **Spec Compliance Checklist** | Each FR/NFR from specs marked ✅/❌ with evidence |
| **Technical Review** | Architecture alignment, SOLID, Hexagonal, DRY, TS strict, test coverage, security, performance, maintainability |
| **Implementation Summary** | Files changed, lines added/removed, tests added, breaking changes, migration notes, rollback plan |

**Traceability**: Project policy — Agent Self-Evaluation.

---

## SDD Artifact Validation (Project Policies)

### FR-POL-021: Filesystem Validation Before Phase Completion

**NEVER** mark an SDD phase complete without PHYSICAL validation:

```bash
# Validation checklist per phase
✓ Folder exists: ls -la openspec/changes/<change>/spec/
✓ Files exist: ls -la openspec/changes/<change>/spec/*.md
✓ Content present: head -5 openspec/changes/<change>/spec/01-*.md
✓ No write errors: check git status for uncommitted
✓ Expected artifacts: compare with spec deliverables list
```

If a file expected by the spec does NOT exist on disk:
- The phase is NOT complete
- The phase MUST be re-executed
- Validation MUST be repeated

**NEVER report**: "Spec completed" if files are missing.

**Traceability**: Project policy — SDD Artifact Validation.

---

## Project Structure (Concrete)

The scaffold MUST produce this exact directory structure:

```
src/
├── manifest.ts                    # Manifest V3 typed (generates manifest.json)
├── types/
│   └── global.d.ts                # Global type declarations
├── background/                    # Adapter: Chrome Service Worker
│   ├── service-worker.ts          # Entry point
│   ├── MessageRouter.ts           # Routes panel↔content↔native
│   ├── NativeHostClient.ts        # Adapter for NativeHostPort (stdio JSON-RPC)
│   ├── ChromeStorageAdapter.ts    # Adapter for StoragePort
│   └── alarms.ts                  # Theme reload check alarm
├── devtools/                      # Adapter: DevTools Panel (Preact)
│   ├── devtools.html              # Panel HTML entry
│   ├── devtools.ts                # chrome.devtools.panels.create() registration
│   └── panel/
│       ├── Panel.tsx              # Root Preact component (layout)
│       ├── App.tsx                # Main app with state + message hooks
│       ├── store/
│       │   └── panelStore.ts      # Global reactive store (Preact Signals)
│       ├── components/
│       │   ├── LocalRemoteToggle.tsx
│       │   ├── ReloadThemeButton.tsx
│       │   ├── InspectModeToggle.tsx
│       │   ├── StatusBar.tsx
│       │   └── ErrorBoundary.tsx
│       ├── hooks/
│       │   ├── useChromeRuntime.ts
│       │   ├── useConnectionState.ts
│       │   └── useNativeHostStatus.ts
│       ├── styles.css             # Global styles (CSP-compliant)
│       ├── styles.module.css      # CSS Modules for components
│       └── types.ts               # Panel-specific types
├── content/                       # Adapter: Content Script
│   ├── inspector.ts               # Entry + hover logic
│   ├── LiquidFileDetector.ts      # Heuristics for Liquid file names
│   ├── BadgeManager.ts            # Badge DOM injection + cleanup
│   └── Throttle.ts                # 150ms debounce utility
├── native-host/                   # Adapter: Node.js Native Messaging Host
│   ├── main.ts                    # CLI entry: health, push, preview, watch
│   ├── CommandDispatcher.ts       # JSON-RPC 2.0 dispatch
│   ├── NubeCliExecutor.ts         # Spawns nube-cli, timeout, parsing
│   ├── StdioTransport.ts          # stdin/stdout JSON-RPC framing
│   ├── FileStorageAdapter.ts      # StoragePort adapter (file-based)
│   ├── manifest.json              # Native messaging host manifest
│   └── package.json               # Minimal deps (Node built-ins only)
└── shared/                        # Domain / Core (zero external deps at runtime)
    ├── result.ts                  # Result/Either pattern (Ok/Err)
    ├── errors.ts                  # DomainError discriminated union
    ├── messaging.ts               # Envelope, Request, Response types
    ├── di.ts                      # Lightweight DI container
    ├── logger.ts                  # Logger interface + ConsoleLogger/FileLogger
    ├── ports/
    │   ├── StoragePort.ts         # Interface for chrome.storage
    │   ├── MessagingPort.ts       # Interface for chrome.runtime
    │   └── NativeHostPort.ts      # Interface for native host
    ├── storage.ts                 # Chrome storage wrapper (Result-based)
    ├── types/
    │   └── chrome.d.ts            # Chrome API augmentations
    └── utils.ts                   # Pure utilities (debounce, uuid, etc.)

Root config files:
├── package.json
├── tsconfig.json
├── tsconfig.extension.json
├── tsconfig.native-host.json
├── esbuild.config.mjs
├── vitest.config.ts
├── .eslintrc.cjs
├── .prettierrc
├── .prettierignore
├── scripts/
│   ├── build-host.mjs
│   ├── build-zip.mjs
│   └── validate-env.js
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── lint.yml
│   │   ├── typecheck.yml
│   │   ├── test.yml
│   │   ├── build.yml
│   │   ├── dependency.yml
│   │   └── release.yml
│   └── dependabot.yml
└── public/
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

**Traceability**: Hexagonal (Ports & Adapters) — domain in `shared/`, adapters per Chrome boundary. Each adapter is independently loadable and testable.

---

## Definition of Ready / Definition of Done (Project Policy)

### DoR — Definition of Ready (antes de iniciar un PR)

| Criterio | Verificación |
|----------|--------------|
| **Spec exists** | FR/NFR escritos en `openspec/changes/<change>/spec/` |
| **ACs claros** | Cada FR tiene ACs medibles (Given/When/Then) |
| **Traceability** | Cada FR mapea a principio arquitectónico + archivo |
| **Dependencies** | PRs bloqueantes identificados y enlazados |
| **Estimation** | Líneas estimadas ≤ 400 (review budget) |
| **Test plan** | Unit/Integration/E2E definidos en spec |
| **Security review** | Cambios de permisos/config seguras documentados |

### DoD — Definition of Done (para mergear a main)

| Criterio | Verificación |
|----------|--------------|
| **Spec Compliance** | ✅ Todos los FR/NFR del spec marcados ✅/❌ con evidencia |
| **Code Quality** | `lint` + `typecheck` + `format` pasan (0 warnings) |
| **Tests** | Unit + Integration + E2E definidos pasan (`vitest run`) |
| **Coverage** | Umbrales: lines 80%, functions 80%, branches 70%, statements 80% |
| **Build** | `npm run build` produce `dist/` válido + `npm run zip` genera `.zip` |
| **Architecture** | `madge --circular` = 0 ciclos; `npm run validate:arch` pasa |
| **Security** | `npm audit --audit-level=high` = 0; permisos mínimos en manifest |
| **Documentation** | README actualizado si cambio externo; ADR si decisión arquitectónica |
| **Agent Self-Eval** | Checklist FR-POL-020 completada en PR |
| **SDD Validation** | FR-POL-021: archivos físicos existen en `openspec/changes/<change>/spec/` |

---

## SDD Phase Gates (Gates entre fases SDD)

| Fase | Entrada | Salida | Gate Automático | Gate Manual |
|------|---------|--------|-----------------|-------------|
| **Explore** | Idea / Problem statement | `exploration.md` | Archivo existe | Revisión usuario: "¿Entendido el problema?" |
| **Propose** | Exploration | `proposal.md` | FRs + ACs + Risques + Esfuerzo | Aprobación usuario: "¿Arrancamos?" |
| **Spec** | Proposal | `spec/*.md` (11 archivos) | 11 archivos existen + traceability matrix | Revisión usuario: "¿Spec completa?" |
| **Design** | Spec | `design/*.md` (C4, sequences, component tree) | Diagramas + breakdown por PR | Aprobación usuario: "¿Diseño correcto?" |
| **Tasks** | Design + Spec | `tasks.md` + `state.yaml` | Tasks cubren todos FRs, ≤400 líneas/PR | Aprobación usuario: "¿Tasks listos?" |
| **Apply (PR #1)** | Tasks | Code en `develop` | CI pasa (lint, typecheck, test, build) | Usuario revisa PR #1 |
| **Apply (PR #2..N)** | Tasks | Code en `develop` | CI pasa + ≤400 líneas/PR | Usuario revisa cada PR |
| **Verify** | Todos PRs merged | `verify-report.md` | Todos ACs ✅ + E2E pasan | Usuario: "¿Release?" |
| **Archive** | Verify | `archive-report.md` | Estado final en Engram + OpenSpec | Usuario: "¿Cerramos?" |

**Regla de oro**: No se avanza a la siguiente fase sin pasar **ambos** gates (automático + manual).

---

## Summary Table (Updated)

| Principle | FR/NFR Count | Key Files |
|-----------|-------------|-----------|
| Hexagonal (Ports & Adapters) | 2 FR | `src/shared/`, all adapters |
| SOLID (SRP, DIP, OCP) | 3 FR | All files |
| DRY | 1 FR + 1 NFR | `src/shared/utils.ts`, `src/shared/storage.ts` |
| High Cohesion, Low Coupling | 2 FR | Import graph |
| TypeScript Strict | 1 FR + 1 NFR | `tsconfig.json`, type definitions |
| Code Quality | 3 FR | All files |
| Testability | 2 FR | `vitest.config.ts`, test files |
| Maintainability | 1 NFR | Code style |
| Scalability | 1 FR | Extension points |
| **Git Flow & Branching** | **2 FR** | `.github/`, branch naming |
| **Conventional Commits** | **1 FR** | `commitlint`, PR titles |
| **PR Requirements** | **1 FR** | PR template, CODEOWNERS |
| **GitHub Actions** | **1 FR** | `.github/workflows/*.yml` |
| **Branch Protection** | **1 FR** | GitHub settings |
| **Automated Code Review** | **1 FR** | CodeRabbit config |
| **Dependency Management** | **1 FR** | Dependabot config |
| **Semantic Versioning** | **1 FR** | `package.json`, tags |
| **Changelog Generation** | **1 FR** | `standard-version`/`release-it` |
| **GitHub Releases** | **1 FR** | Release workflow, artifacts |
| **Env/Secrets Security** | **5 FR** | `.env.example`, GitHub Secrets, native host |
| **Chrome MV3 Security** | **1 FR** | `manifest.ts`, native messaging |
| **Native Host Security** | **1 FR** | `src/native-host/` |
| **GitHub Actions Secrets** | **1 FR** | Release workflow |
| **Env Validation** | **1 FR** | `scripts/validate-env.ts` |
| **Chrome Permissions** | **1 FR** | `manifest.ts` |
| **Documentation Maintenance** | **1 FR** | `README.md`, PR template |
| **ADR** | **1 FR** | `docs/architecture/ADR-*.md` |
| **Quality Gates** | **1 FR** | CI workflows |
| **Agent Self-Evaluation** | **1 FR** | PR template |
| **SDD Artifact Validation** | **1 FR** | Checklist per phase |

(End of file - total ~580 lines)
