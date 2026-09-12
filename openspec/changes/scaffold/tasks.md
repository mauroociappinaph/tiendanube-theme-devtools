# Scaffold — Task Breakdown

**Change**: `scaffold`
**Phase**: tasks
**Date**: 2026-07-16
**ADR Alignment**: ADR-001 (specs 00-10 are canonical; spec 00 wins conflicts)
**PR Strategy**: Feature-branch chain, ≤400 lines per PR, 7 stacked PRs

---

## Overview

39 tasks across 7 PRs, spanning ~2,450 lines and ~75 files. Each task is a logical unit of work (1-3 files typically), dependency-ordered, and maps to acceptance criteria from the specs.

**PR Chain** (merge order, sequential):
```
PR #1 (foundation) → PR #2a (shared-types) → PR #2b (shared-logic) → PR #3 (background) → PR #4 (devtools-panel) → PR #5 (content-script) → PR #6 (native-host) → PR #7 (integration)
```

---

## Task Glossary

| ID | Title | PR | Est. Lines | Dependencies |
|----|-------|----|-----------|--------------|
| T-001 | ✅ Root package.json with scripts & deps | PR #1 | 55 | — |
| T-002 | ✅ TypeScript configs (3 files) | PR #1 | 80 | — |
| T-003 | ✅ esbuild multi-entry config | PR #1 | 85 | T-001, T-002 |
| T-004 | ✅ ESLint + Prettier configs | PR #1 | 60 | — |
| T-005 | ✅ Vitest configs + setup + mocks | PR #1 | 125 | T-002 |
| T-006 | ✅ Dependabot + .env.example | PR #1 | 25 | — |
| T-007 | Result pattern (result.ts) | PR #2a | 35 | — |
| T-008 | Domain errors (errors.ts) | PR #2a | 45 | — |
| T-009 | Messaging types (messaging.ts) | PR #2a | 60 | T-007, T-008 |
| T-010 | DI container (di.ts + tokens.ts) | PR #2b | 55 | — |
| T-011 | Logger (logger.ts) | PR #2b | 45 | T-007 |
| T-012 | Port interfaces (3 files) | PR #2a | 45 | T-007, T-008, T-009 |
| T-013 | Utils + type augmentations | PR #2b | 65 | T-007 |
| T-014 | Config + validation + messageRegistry + command | PR #2b | 110 | T-007, T-008, T-009, T-010 |
| T-015 | Domain layer (entities, valueObjects, services) | PR #2b | 50 | T-007, T-008, T-014 |
| T-016 | Manifest TypeScript (manifest.ts + types) | PR #3 | 55 | T-001, T-003 |
| T-017 | Background SW entry (service-worker.ts) | PR #3 | 70 | T-010, T-012, T-014 |
| T-018 | MessageRouter + ChromeStorageAdapter | PR #3 | 75 | T-012, T-014 |
| T-019 | NativeHostClient + alarms | PR #3 | 80 | T-012 |
| T-020 | DevTools HTML shell + registration | PR #4 | 45 | T-003 |
| T-021 | Panel store (panelStore.ts) | PR #4 | 45 | T-009 |
| T-022 | Panel root + App (Panel.tsx, App.tsx) | PR #4 | 65 | T-021 |
| T-023 | Panel components (5 components) | PR #4 | 120 | T-021, T-022 |
| T-024 | Panel hooks (3 hooks) | PR #4 | 75 | T-009 |
| T-025 | Panel styles + types | PR #4 | 65 | T-020 |
| T-026 | Content entry + InspectorController | PR #5 | 60 | T-009 |
| T-027 | State machine + PageDetector | PR #5 | 70 | — |
| T-028 | LiquidMapper + HoverHandler | PR #5 | 75 | — |
| T-029 | BadgeManager + SPANavigation + MessageHandler + Throttle | PR #5 | 95 | T-009 |
| T-030 | Native host entry + config | PR #6 | 80 | T-014 |
| T-031 | StdioTransport + CommandBus | PR #6 | 60 | T-014 |
| T-032 | CliExecutor + validate | PR #6 | 55 | T-008 |
| T-033 | Command handlers (4 commands) | PR #6 | 120 | T-030, T-031, T-032 |
| T-034 | Native host manifest + package.json | PR #6 | 25 | T-003 |
| T-035 | Build scripts (build-host.mjs, build-zip.mjs, validate-env.js) | PR #7 | 100 | T-003 |
| T-036 | CI workflows (6 files) | PR #7 | 160 | T-035 |
| T-037 | Public icons (PNGs) | PR #7 | — | — |
| T-038 | README update + CHANGELOG | PR #7 | 60 | T-001 |
| T-039 | Integration tests + storage.ts | PR #7 | 80 | T-012 |

---

## Task Details

---

### PR #1: Foundation (`feat/scaffold-01-foundation`) — ~410 lines

**Depends on**: — (base)
**Must merge before**: PR #2, PR #3
**Parallelizable**: All tasks in PR #1 are independent and can be created in parallel.

---

#### T-001: Root package.json with scripts & dependencies

- **Description**: Create the root `package.json` with all npm scripts (build, build:host, typecheck, lint, test, zip, clean, format, validate:all, release scripts), runtime and dev dependencies, Node.js >=20 engine constraint, and path alias configuration.
- **Spec References**: FR-CONF-001, FR-CONF-004, FR-CONF-005, FR-CONF-007, FR-CONF-POL-001, FR-CONF-POL-002, FR-CONF-POL-003, FR-CONF-POL-005, NFR-CONF-005
- **Design References**: `01-root-config.md` §Dependencies, §Functional Requirements, §Dev Scripts; `09-deployment-architecture.md` §CI Pipeline
- **Files to Create**: `package.json`
- **Acceptance Criteria**: AC-RC-01, AC-RC-05, AC-RC-06
- **Est. Lines**: 55
- **PR Assignment**: PR #1

---

#### T-002: TypeScript Configuration (3 files)

- **Description**: Create `tsconfig.json` (root with project references), `tsconfig.extension.json` (Chrome/extension context), and `tsconfig.native-host.json` (Node.js context). Extension config must enable `strict: true`, set path aliases (`@shared`, `@background`, `@devtools`, `@content`, `@native-host`), and include Chrome API types. Native host config must separate Node.js environment with no Chrome types.
- **Spec References**: FR-CONF-006, FR-ARCH-009, NFR-ARCH-002
- **Design References**: `01-root-config.md` §FR-CONF-006, §Interface Contracts; `00-architecture-compliance.md` §TypeScript Discipline
- **Files to Create**: `tsconfig.json`, `tsconfig.extension.json`, `tsconfig.native-host.json`
- **Acceptance Criteria**: AC-RC-03, AC-RC-07
- **Est. Lines**: 80 (25 + 30 + 25)
- **PR Assignment**: PR #1

---

#### T-003: esbuild Multi-Entry Build Configuration

- **Description**: Create `esbuild.config.mjs` with multi-entry support for 5 entry points (manifest.ts, service-worker.ts, devtools.html via Panel.tsx, inspector.ts, and native host main.ts via --host flag). Includes `manifestPlugin` for typed manifest generation with auto-versioning from package.json, static asset copy logic (icons, native-host manifest), CSS module extraction, and production/development environment support.
- **Spec References**: FR-CONF-001, FR-CONF-002, FR-CONF-003, FR-CONF-004, FR-ARCH-010
- **Design References**: `04-sequences.md` §1 (Build Pipeline), `01-root-config.md` §FR-CONF-001..004, §Interface Contracts (BuildConfig)
- **Files to Create**: `esbuild.config.mjs`
- **Acceptance Criteria**: AC-RC-02, AC-RC-08
- **Est. Lines**: 85
- **PR Assignment**: PR #1

---

#### T-004: ESLint + Prettier Configuration

- **Description**: Create `eslint.config.mjs` with `@typescript-eslint/strict-type-checked`, `no-explicit-any` as error, Preact JSX rules (react/jsx-key), `no-console` as warn, max-lines (300), max-lines-per-function (40), Prettier integration via `eslint-config-prettier`. Create `.prettierrc` and `.prettierignore`.
- **Spec References**: NFR-CONF-003, NFR-CONF-004, FR-ARCH-010, FR-ARCH-011, FR-ARCH-012
- **Design References**: `01-root-config.md` §NFR-CONF-003, §NFR-CONF-004
- **Files to Create**: `eslint.config.mjs`, `.prettierrc`, `.prettierignore`
- **Acceptance Criteria**: AC-RC-04
- **Est. Lines**: 60 (45 + 10 + 5)
- **PR Assignment**: PR #1

---

#### T-005: Vitest Configuration + Chrome API Mocks

- **Description**: Create `vitest.config.ts` (jsdom environment, path aliases, coverage thresholds 80/80/70/80, setup files), `vitest.native-host.config.ts` (Node environment, native-host tests), `vitest.setup.ts` (global chrome.* mocks for storage, runtime, devtools, tabs, scripting, alarms), and `vitest.native-host.setup.ts` (Node env setup).
- **Spec References**: FR-CONF-TEST-001, FR-CONF-TEST-002, FR-CONF-TEST-003, FR-ARCH-013, FR-ARCH-014
- **Design References**: `01-root-config.md` §Vitest Configuration; `09-deployment-architecture.md` §CI Pipeline
- **Files to Create**: `vitest.config.ts`, `vitest.native-host.config.ts`, `vitest.setup.ts`, `vitest.native-host.setup.ts`
- **Acceptance Criteria**: AC-RC-05, AC-RC-09, AC-RC-10, AC-RC-11
- **Est. Lines**: 125 (35 + 20 + 55 + 15)
- **PR Assignment**: PR #1

---

#### T-006: Dependabot + .env.example

- **Description**: Create `.github/dependabot.yml` with weekly schedule, grouped minor/patch updates, and ignore rules for major versions of @types/chrome, typescript, esbuild. Create `.env.example` with all documented environment variables (NUBE_CLI_PATH, NODE_ENV, DEBUG, CHROME_WEBSTORE_*).
- **Spec References**: FR-CONF-POL-004, FR-POL-007, FR-POL-011
- **Design References**: `09-deployment-architecture.md` §CI Pipeline (dependabot), §Environment Variables; `08-cross-cutting.md` §FR-POL-011
- **Files to Create**: `.github/dependabot.yml`, `.env.example`
- **Acceptance Criteria**: (part of broader CI readiness)
- **Est. Lines**: 25
- **PR Assignment**: PR #1

---

### PR #2a: Shared Types (`feat/scaffold-02a-shared-types`) — ~260 lines

**Depends on**: PR #1 (foundation configs must exist for type checking and build)
**Must merge before**: PR #2b, PR #3, PR #4, PR #5, PR #6
**Parallelizable**: T-007, T-008 are independent. T-009 depends on T-007/008. T-012 depends on T-007/008/009.

---

#### T-007: Result Pattern (result.ts)

- **Description**: Create `src/shared/result.ts` with the canonical `Result<T, E>` discriminated union (`Ok<T>` | `Err<E>`), constructors (`ok`, `err`), combinators (`map`, `flatMap`, `match`, `unwrapOr`), and type guards (`isOk`, `isErr`, `unwrap`). Zero dependencies.
- **Spec References**: FR-SH-001 (Result), FR-CC-01
- **Design References**: `06-api-contracts.md` §Result Pattern; `07-data-models.md`; `07-shared-core.md` §Result Pattern
- **Files to Create**: `src/shared/result.ts`, `src/shared/__tests__/result.test.ts`
- **Acceptance Criteria**: AC-CC-01, AC-SH-04, T-SH-017
- **Est. Lines**: 35
- **PR Assignment**: PR #2a

---

#### T-008: Domain Errors (errors.ts)

- **Description**: Create `src/shared/errors.ts` with the canonical `DomainError` tagged union of all error variants (NotFound, ValidationFailed, StorageError, MessageTimeout, NativeHostUnavailable, NativeHostError, CommandNotFound, PathTraversal, PathNotAllowed, ParamTooLong, ForbiddenPattern, CliExecutionFailed, CliTimeout, InternalError). Each variant with readonly tagged fields.
- **Spec References**: FR-SH-001 (errors), FR-CC-01
- **Design References**: `07-shared-core.md` §Domain Errors; `08-cross-cutting.md` §FR-CC-01
- **Files to Create**: `src/shared/errors.ts`, `src/shared/__tests__/errors.test.ts`
- **Acceptance Criteria**: AC-CC-01, T-SH-017
- **Est. Lines**: 45
- **PR Assignment**: PR #2a

---

#### T-009: Messaging Types (messaging.ts)

- **Description**: Create `src/shared/messaging.ts` with the canonical `ExtensionMessage` discriminated union (all message types: PAGE_DETECTED, HOVER_EVENT, ACTIVATE_INSPECT, DEACTIVATE_INSPECT, SET_MODE, RELOAD_THEME, GET_THEME_INFO, THEME_RELOADED, THEME_INFO, NATIVE_HOST_STATUS_CHANGED, NATIVE_COMMAND, NATIVE_RESPONSE, NATIVE_NOTIFICATION, WATCH_EVENT), payload types (PageDetectionPayload, HoverEventPayload, WatchEventPayload), `createMessage()` helper with auto-generated correlationId + timestamp, and `BaseMessage` interface.
- **Spec References**: FR-SH-001, FR-SH-002, FR-ARCH-005, FR-CC-02
- **Design References**: `07-data-models.md` (all payload types + message union); `06-api-contracts.md` §MessagingPort; `07-shared-core.md` §Messaging Types
- **Files to Create**: `src/shared/messaging.ts`, `src/shared/__tests__/messaging.test.ts`
- **Acceptance Criteria**: AC-SH-01, AC-CC-02, T-SH-001, T-SH-002, T-SH-003
- **Est. Lines**: 60
- **PR Assignment**: PR #2a

---

#### T-012: Canonical Port Interfaces (3 files)

- **Description**: Create `src/shared/ports/StoragePort.ts` (StorageSchema, StorageArea type, StoragePort interface with get/set/remove/clear/observe/migrate), `src/shared/ports/NativeHostPort.ts` (NativeHostPort interface with connect/disconnect/send/onNotification/healthCheck, HealthResult type), and `src/shared/ports/MessagingPort.ts` (MessagingPort interface with send/onMessage/connect/disconnect).
- **Spec References**: FR-ARCH-002, FR-SH-001 (ports), FR-SH-003
- **Design References**: `06-api-contracts.md` (all 3 port interfaces); `07-shared-core.md` §Canonical Port Interfaces
- **Files to Create**: `src/shared/ports/StoragePort.ts`, `src/shared/ports/NativeHostPort.ts`, `src/shared/ports/MessagingPort.ts`
- **Acceptance Criteria**: AC-SH-01, AC-SH-03, T-SH-014, T-SH-015
- **Est. Lines**: 45 (15 each)
- **PR Assignment**: PR #2a

---

### PR #2b: Shared Logic (`feat/scaffold-02b-shared-logic`) — ~270 lines

**Depends on**: PR #1, PR #2a (types must exist for implementation)
**Must merge before**: PR #3, PR #4, PR #5, PR #6
**Parallelizable**: T-010, T-011 are independent. T-013 depends on T-007. T-014 depends on T-007/008/009/010. T-015 depends on T-007/008/014.

---

#### T-010: DI Container (di.ts + tokens.ts)

- **Description**: Create `src/shared/di.ts` with lightweight `Container` interface, `createContainer()` implementation (Map-based), branded `Token<T>` type, and `createToken<T>()` factory. Create `src/shared/ports/tokens.ts` with the three canonical port tokens (StoragePortToken, NativeHostPortToken, MessagingPortToken).
- **Spec References**: FR-SH-001 (DI), FR-ARCH-004, FR-CC-03
- **Design References**: `06-api-contracts.md` §DI Container, §Token Constants; `07-shared-core.md` §DI Container
- **Files to Create**: `src/shared/di.ts`, `src/shared/ports/tokens.ts`, `src/shared/__tests__/di.test.ts`
- **Acceptance Criteria**: AC-CC-03, AC-SH-04, T-SH-016
- **Est. Lines**: 55
- **PR Assignment**: PR #2b

---

#### T-011: Logger (logger.ts)

- **Description**: Create `src/shared/logger.ts` with `Logger` interface, `LogLevel` type, `LogEntry` type, and three implementations: `ConsoleLogger` (extension contexts), `FileLogger` (native host, JSONL output), `MemoryLogger` (tests). Factory function `createLogger()` with context binding and `child()` method for correlation ID propagation.
- **Spec References**: FR-SH-001 (logger), FR-CC-04, NFR-SH-004
- **Design References**: `07-shared-core.md` §FR-SH-007: Logger Interface; `08-cross-cutting.md` §FR-CC-04
- **Files to Create**: `src/shared/logger.ts`, `src/shared/__tests__/logger.test.ts`
- **Acceptance Criteria**: AC-CC-04, T-SH-009
- **Est. Lines**: 45
- **PR Assignment**: PR #2b

---

#### T-013: Utilities + Type Augmentations

- **Description**: Create `src/shared/utils.ts` with pure utility functions (debounce, throttle, uuid, parseLiquidUrl, detectLiquidType, formatError). Create `src/shared/types/chrome.d.ts` with Chrome API augmentations for `devtools.panels.create`, `scripting.executeScript`, `storage.StorageArea`. Create `src/types/global.d.ts` with global type declarations (BuildInfo, console extensions).
- **Spec References**: FR-SH-001 (utils, types), FR-SH-004, FR-SH-005, FR-SH-006, NFR-SH-002, NFR-SH-003
- **Design References**: `07-shared-core.md` §FR-SH-004: Chrome Type Augmentations, §FR-SH-005: Utility Functions, §FR-SH-006: Global Type Declarations
- **Files to Create**: `src/shared/utils.ts`, `src/shared/types/chrome.d.ts`, `src/types/global.d.ts`, `src/shared/__tests__/utils.test.ts`
- **Acceptance Criteria**: AC-SH-04, T-SH-004, T-SH-005, T-SH-006, T-SH-007, T-SH-008, T-SH-013
- **Est. Lines**: 65
- **PR Assignment**: PR #2b

---

#### T-014: Config + Validation + MessageRegistry + Command

- **Description**: Create `src/shared/config.ts` with `ExtensionConfigSchema` (Zod) and `loadExtensionConfig()`. Create `src/shared/validation.ts` with `EnvSchema`, `MessageSchema`, `ThemePushParamsSchema`, and generic `validate()` helper. Create `src/shared/messageRegistry.ts` with `MessageRegistry` class for type-based handler dispatch. Create `src/shared/command.ts` with `Command`, `CommandHandler`, `Middleware`, and `CommandBus` interfaces (CQRS-lite).
- **Spec References**: FR-SH-001 (config, validation, messageRegistry, command), FR-SH-008, FR-SH-009, FR-SH-010, FR-SH-011, NFR-SH-004
- **Design References**: `07-shared-core.md` §FR-SH-008..011; `06-api-contracts.md` §DI Container (used by messageRegistry)
- **Files to Create**: `src/shared/config.ts`, `src/shared/validation.ts`, `src/shared/messageRegistry.ts`, `src/shared/command.ts`, `src/shared/__tests__/config.test.ts`, `src/shared/__tests__/validation.test.ts`, `src/shared/__tests__/messageRegistry.test.ts`, `src/shared/__tests__/command.test.ts`
- **Acceptance Criteria**: T-SH-010, T-SH-011, T-SH-012
- **Est. Lines**: 110
- **PR Assignment**: PR #2b

---

#### T-015: Domain Layer (entities, valueObjects, services)

- **Description**: Create `src/domain/entities/Theme.ts` (ThemeFile, ThemeManifest), `src/domain/entities/NativeHostSession.ts`, `src/domain/entities/InspectionSession.ts`. Create `src/domain/valueObjects/LiquidFilePath.ts`, `src/domain/valueObjects/ThemeMode.ts`, `src/domain/valueObjects/NativeHostStatus.ts`, `src/domain/valueObjects/CorrelationId.ts`. All pure, zero external dependencies.
- **Spec References**: FR-SH-001 (domain), NFR-SH-001, NFR-SH-002, NFR-SH-003
- **Design References**: `07-shared-core.md` §Domain Layer; `00-architecture-compliance.md` §Project Structure
- **Files to Create**: `src/domain/entities/Theme.ts`, `src/domain/entities/NativeHostSession.ts`, `src/domain/entities/InspectionSession.ts`, `src/domain/valueObjects/LiquidFilePath.ts`, `src/domain/valueObjects/ThemeMode.ts`, `src/domain/valueObjects/NativeHostStatus.ts`, `src/domain/valueObjects/CorrelationId.ts`
- **Acceptance Criteria**: (domain layer existence — verified by typecheck)
- **Est. Lines**: 50
- **PR Assignment**: PR #2b

---

### PR #3: Background (`feat/scaffold-03-background`) — ~280 lines

**Depends on**: PR #1 (tooling), PR #2 (ports, types, DI)
**Must merge before**: PR #4, PR #5
**Parallelizable**: T-016 is independent (only needs config/build). T-017 depends on DI + ports. T-018/019 depend on ports.

---

#### T-016: Manifest TypeScript Definition

- **Description**: Create `src/manifest.ts` with typed Manifest V3 definition extending `chrome.runtime.ManifestV3`, reading version from `package.json`, `defineManifest()` helper, minimal permissions (storage, activeTab, scripting, alarms, nativeMessaging), host permissions for Tiendanube domains, content_scripts entry, CSP declaration, dev-only `key` field stripping in production. Create `src/shared/types/manifest.ts` with `ChromeExtensionManifest` interface.
- **Spec References**: FR-MAN-001, FR-MAN-002, FR-MAN-003, FR-MAN-004, FR-MAN-005, FR-MAN-006, FR-MAN-007, FR-MAN-008, NFR-MAN-001, NFR-MAN-002, NFR-MAN-003, FR-CC-05
- **Design References**: `02-manifest.md` (all); `08-security-boundaries.md` §1, §4, §5; `04-sequences.md` §1 (manifestPlugin)
- **Files to Create**: `src/manifest.ts`, `src/shared/types/manifest.ts`
- **Acceptance Criteria**: AC-MF-01..08
- **Est. Lines**: 55
- **PR Assignment**: PR #3

---

#### T-017: Service Worker Entry Point

- **Description**: Create `src/background/service-worker.ts` with DI container initialization (register StoragePort, NativeHostPort, MessagingPort tokens), lifecycle listeners (onInstalled: defaults init + migration, onStartup: health alarms), alarm creation (native-host-health at 30s, theme-reload-check at 5m), and native host connection health check. Uses ChromeStorageAdapter and NativeHostClient via DI.
- **Spec References**: FR-BG-001, FR-BG-003, FR-BG-004, FR-BG-005, FR-ARCH-004
- **Design References**: `03-c4-component.md` §Background Service Worker; `04-sequences.md` §2 (Extension Startup)
- **Files to Create**: `src/background/service-worker.ts`
- **Acceptance Criteria**: AC-BG-01, AC-BG-04, AC-BG-05, AC-BG-07
- **Est. Lines**: 70
- **PR Assignment**: PR #3

---

#### T-018: MessageRouter + ChromeStorageAdapter

- **Description**: Create `src/background/MessageRouter.ts` that uses the shared `MessageRegistry` and DI-injected ports to route messages between panel ↔ content ↔ native host (discriminated by type), with async handler support (returns true for keepalive), unknown message type error response, and 30s timeout. Create `src/background/ChromeStorageAdapter.ts` implementing `StoragePort` via `chrome.storage.local/sync/session` with Result-based error handling, observe/migrate implementations.
- **Spec References**: FR-BG-002, FR-BG-003, FR-BG-004, FR-BG-006, FR-BG-007, FR-CC-02
- **Design References**: `03-c4-component.md` (router + storage adapter components); `04-sequences.md` §3 (Messaging Flow); `03-background-service-worker.md` §FR-BG-006, §FR-BG-007
- **Files to Create**: `src/background/MessageRouter.ts`, `src/background/ChromeStorageAdapter.ts`
- **Acceptance Criteria**: AC-BG-02, AC-BG-03, AC-BG-05
- **Est. Lines**: 75
- **PR Assignment**: PR #3

---

#### T-019: NativeHostClient + Alarms

- **Description**: Create `src/background/NativeHostClient.ts` implementing `NativeHostPort` via `chrome.runtime.connectNative`, with pending request tracking by correlationId, 30s timeout per request, reconnection with exponential backoff (max 3 retries), onDisconnect cleanup, and NATIVE_NOTIFICATION forwarding. Create `src/background/alarms.ts` with alarm handler for native-host-health (health check via NativeHostPort) and theme-reload-check (poll for theme changes).
- **Spec References**: FR-BG-003, FR-BG-005, FR-BG-008, NFR-CC-07
- **Design References**: `03-c4-component.md` (NativeHostClient + alarms); `04-sequences.md` §2 (health alarm), §4 (native handshake); `03-background-service-worker.md` §FR-BG-008
- **Files to Create**: `src/background/NativeHostClient.ts`, `src/background/alarms.ts`
- **Acceptance Criteria**: AC-BG-03, AC-BG-04, AC-BG-05, AC-BG-06
- **Est. Lines**: 80
- **PR Assignment**: PR #3

---

### PR #4: DevTools Panel (`feat/scaffold-04-devtools-panel`) — ~415 lines

**Depends on**: PR #1, PR #2a, PR #2b, PR #3
**Must merge before**: PR #5, PR #7
**Parallelizable**: T-020/T-025 (styles) can run in parallel with T-021/T-022/T-023/T-024 (panel logic).

---

#### T-020: DevTools HTML Shell + Registration

- **Description**: Create `src/devtools/devtools.html` with CSP meta tags, minimal HTML shell (root div, styles.css link, Panel.js script). Create `src/devtools/devtools.ts` with `chrome.devtools.panels.create('🛠 Tienda Nube', ...)` registration, panel icon, and onShown/onHidden event logging.
- **Spec References**: FR-DTP-001, FR-DTP-002, NFR-DTP-003
- **Design References**: `05-component-tree.md` (devtools.html + entry); `03-c4-component.md` §DevTools Panel
- **Files to Create**: `src/devtools/devtools.html`, `src/devtools/devtools.ts`
- **Acceptance Criteria**: AC-DP-01, AC-DP-03, AC-DP-04
- **Est. Lines**: 45
- **PR Assignment**: PR #4

---

#### T-021: Panel Store (panelStore.ts)

- **Description**: Create `src/devtools/panel/store/panelStore.ts` with Preact Signals-based global state: `nativeHostStatus`, `inspectMode`, `themeMode`, `status` (StatusBarState discriminated union), `isConnected` computed, and actions (setLoading, setSuccess with 3s auto-dismiss, setError). Exports `panelStore` singleton and `usePanelStore()` hook.
- **Spec References**: FR-DTP-009, NFR-DTP-002
- **Design References**: `05-component-tree.md` §Signals Store (panelStore), §Component Props/State
- **Files to Create**: `src/devtools/panel/store/panelStore.ts`
- **Acceptance Criteria**: AC-DP-08, AC-DP-11, AC-DP-12, AC-DP-13
- **Est. Lines**: 45
- **PR Assignment**: PR #4

---

#### T-022: Panel Root + App (Panel.tsx, App.tsx)

- **Description**: Create `src/devtools/panel/Panel.tsx` as root Preact component wrapping App in ErrorBoundary. Create `src/devtools/panel/App.tsx` as layout component composing header, LocalRemoteToggle, InspectModeToggle, ReloadThemeButton, and StatusBar. All state from panelStore signals (no prop drilling).
- **Spec References**: FR-DTP-003, FR-DTP-003b
- **Design References**: `05-component-tree.md` §Component Hierarchy (Panel.tsx → App.tsx → components)
- **Files to Create**: `src/devtools/panel/Panel.tsx`, `src/devtools/panel/App.tsx`
- **Acceptance Criteria**: AC-DP-02, AC-DP-04, AC-DP-09
- **Est. Lines**: 65
- **PR Assignment**: PR #4

---

#### T-023: Panel Components (5 components)

- **Description**: Create `LocalRemoteToggle.tsx` (toggle switch reading/writing panelStore.themeMode, sending SET_MODE), `ReloadThemeButton.tsx` (button triggering RELOAD_THEME, disabled when disconnected, loading spinner), `InspectModeToggle.tsx` (toggle for ACTIVATE_INSPECT/DEACTIVATE_INSPECT), `StatusBar.tsx` (reactive display based on panelStore.status with color-coded states), and `ErrorBoundary.tsx` (class component with componentDidCatch + getDerivedStateFromError).
- **Spec References**: FR-DTP-004, FR-DTP-005, FR-DTP-006, FR-DTP-007, FR-DTP-003b
- **Design References**: `05-component-tree.md` (all components with props/state/event-flow)
- **Files to Create**: `src/devtools/panel/components/LocalRemoteToggle.tsx`, `src/devtools/panel/components/ReloadThemeButton.tsx`, `src/devtools/panel/components/InspectModeToggle.tsx`, `src/devtools/panel/components/StatusBar.tsx`, `src/devtools/panel/components/ErrorBoundary.tsx`
- **Acceptance Criteria**: AC-DP-05, AC-DP-09, AC-DP-10, AC-DP-11, AC-DP-12, AC-DP-14
- **Est. Lines**: 120
- **PR Assignment**: PR #4

---

#### T-024: Panel Hooks (3 hooks)

- **Description**: Create `useChromeRuntime.ts` (wraps chrome.runtime.sendMessage/onMessage with signal-based connection state), `useConnectionState.ts` (dedicated hook for background SW connection status), and `useNativeHostStatus.ts` (health polling via `NATIVE_HOST_STATUS_CHANGED` listener).
- **Spec References**: FR-DTP-008, NFR-DTP-001
- **Design References**: `05-component-tree.md` §Hook (useChromeRuntime.ts), §Event Flow
- **Files to Create**: `src/devtools/panel/hooks/useChromeRuntime.ts`, `src/devtools/panel/hooks/useConnectionState.ts`, `src/devtools/panel/hooks/useNativeHostStatus.ts`
- **Acceptance Criteria**: AC-DP-04, AC-DP-07
- **Est. Lines**: 75
- **PR Assignment**: PR #4

---

#### T-025: Panel Styles + Types

- **Description**: Create `src/devtools/panel/styles.css` (CSP-compliant global styles, no inline styles), `src/devtools/panel/styles.module.css` (CSS Modules for component-specific styles), and `src/devtools/panel/types.ts` (panel-specific type aliases importing from shared canonical types).
- **Spec References**: NFR-DTP-003, NFR-DTP-004
- **Design References**: `05-component-tree.md` §Component Hierarchy (references to styles.css); `02-manifest.md` §FR-MAN-008 (CSP)
- **Files to Create**: `src/devtools/panel/styles.css`, `src/devtools/panel/styles.module.css`, `src/devtools/panel/types.ts`
- **Acceptance Criteria**: AC-DP-03
- **Est. Lines**: 65
- **PR Assignment**: PR #4

---

### PR #5: Content Script (`feat/scaffold-05-content-script`) — ~300 lines

**Depends on**: PR #1, PR #2a, PR #2b, PR #4 (messaging types, panel messaging)
**Must merge before**: PR #7
**Parallelizable**: T-027 (state machine + page detector) is independent. T-028 (LiquidMapper + HoverHandler) is independent. T-029 depends on T-026 for wiring.

---

#### T-026: Content Entry + InspectorController

- **Description**: Create `src/content/inspector.ts` as entry point (initializes InspectorController, registers lifecycle). Create `src/content/InspectorController.ts` as orchestrator wiring all modules (PageDetector, LiquidMapper, HoverHandler, BadgeManager, SPANavigationHandler, MessageHandler), managing state machine transitions, and coordinating inspect mode lifecycle.
- **Spec References**: FR-CI-001 (page detection), FR-CI-003 (hover), FR-CI-004 (badge), FR-CI-005 (SPA nav), FR-CI-006 (cleanup), FR-ARCH-015 (extension point)
- **Design References**: `05-content-inspector.md` §Architecture; `03-c4-component.md` §Content Script; `04-sequences.md` §5 (Inspect Mode)
- **Files to Create**: `src/content/inspector.ts`, `src/content/InspectorController.ts`
- **Acceptance Criteria**: AC-CI-01, AC-CI-04
- **Est. Lines**: 60
- **PR Assignment**: PR #5

---

#### T-027: InspectorStateMachine + PageDetector

- **Description**: Create `src/content/InspectorStateMachine.ts` with state transitions (idle → detecting → ready → inspecting → cleaning), guards against invalid transitions, and event emission on state change. Create `src/content/PageDetector.ts` that classifies pages via URL patterns, DOM meta tags (nuvemshop-id), window globals (Tiendanube), with confidence levels and detection methods.
- **Spec References**: FR-CI-001
- **Design References**: `05-content-inspector.md` §State Machine, §FR-CI-001; `03-c4-component.md` §Content Script
- **Files to Create**: `src/content/InspectorStateMachine.ts`, `src/content/PageDetector.ts`
- **Acceptance Criteria**: AC-CI-01
- **Est. Lines**: 70
- **PR Assignment**: PR #5

---

#### T-028: LiquidMapper + HoverHandler

- **Description**: Create `src/content/LiquidMapper.ts` as pure function `mapElementToLiquidFile(element)` using priority: data-liquid-file → data-section-id → data-block-id → heuristics → unknown. Create `src/content/HoverHandler.ts` with 150ms throttle, IntersectionObserver for viewport checking, RAF-based badge positioning, pointermove/pointerenter/pointerleave support.
- **Spec References**: FR-CI-002, FR-CI-003
- **Design References**: `05-content-inspector.md` §FR-CI-002, §FR-CI-003; `03-c4-component.md` (LiquidMapper + HoverHandler)
- **Files to Create**: `src/content/LiquidMapper.ts`, `src/content/HoverHandler.ts`
- **Acceptance Criteria**: AC-CI-02, AC-CI-03
- **Est. Lines**: 75
- **PR Assignment**: PR #5

---

#### T-029: BadgeManager + SPANavigation + MessageHandler + Throttle

- **Description**: Create `src/content/BadgeManager.ts` with BadgeManager interface + DOMBadgeManager implementation (badge injection, positioning via RAF, cleanup on cleanup/destroy). Create `src/content/SPANavigationHandler.ts` with MutationObserver + history.pushState/replaceState patching for SPA navigation detection. Create `src/content/MessageHandler.ts` routing ACTIVATE_INSPECT, DEACTIVATE_INSPECT, PAGE_DETECTED, HOVER_EVENT via chrome.runtime.onMessage. Create `src/content/Throttle.ts` with 150ms debounce + RAF helpers.
- **Spec References**: FR-CI-004, FR-CI-005, FR-CI-006
- **Design References**: `05-content-inspector.md` §FR-CI-004..006; `03-c4-component.md` (BadgeManager, SPANavigationHandler, MessageHandler)
- **Files to Create**: `src/content/BadgeManager.ts`, `src/content/SPANavigationHandler.ts`, `src/content/MessageHandler.ts`, `src/content/Throttle.ts`
- **Acceptance Criteria**: AC-CI-02, AC-CI-04, AC-CI-06
- **Est. Lines**: 95
- **PR Assignment**: PR #5

---

### PR #6: Native Host (`feat/scaffold-06-native-host`) — ~340 lines

**Depends on**: PR #1 (build tooling), PR #2a, PR #2b (shared types, command pattern, validation)
**Must merge before**: PR #7
**Parallelizable**: T-030 (main+config) depends on T-014. T-031 (StdioTransport+CommandBus) depends on T-014. T-032 (CliExecutor+validate) depends on T-008. T-033 depends on T-030/031/032.

---

#### T-030: Native Host Entry + Config

- **Description**: Create `src/native-host/main.ts` as CLI entry with `--health`, `push`, `preview`, `watch` commands, loading config, building CommandBus, registering handlers, starting StdioTransport, and graceful shutdown (SIGTERM handler). Create `src/native-host/config.ts` with HostConfigSchema (Zod) for CLI discovery, watch service, security, and logging configuration, plus `loadHostConfig()` with dotenv loading.
- **Spec References**: FR-NH-003, FR-NH-002, FR-NH-008, NFR-NH-002, NFR-NH-005
- **Design References**: `03-c4-component.md` §Native Host (main.ts, config.ts); `04-sequences.md` §4 (Handshake); `06-native-host.md` §FR-NH-003
- **Files to Create**: `src/native-host/main.ts`, `src/native-host/config.ts`
- **Acceptance Criteria**: AC-NH-01, AC-NH-03, AC-NH-07
- **Est. Lines**: 80
- **PR Assignment**: PR #6

---

#### T-031: StdioTransport + CommandBus

- **Description**: Create `src/native-host/StdioTransport.ts` with 4-byte LE length-prefixed JSON-RPC 2.0 framing for stdin/stdout, `readMessage()` returning JsonRpcRequest | null, `writeMessage()` for responses/notifications, all logging to stderr. Create `src/native-host/CommandBus.ts` with handler registry by command name, middleware pipeline (Logging, Timing, ErrorHandling), and `dispatch()` returning Result<T, E>.
- **Spec References**: FR-NH-001, FR-NH-002
- **Design References**: `03-c4-component.md` (StdioTransport + CommandBus); `04-sequences.md` §4 (JSON-RPC flow); `06-native-host.md` §FR-NH-001, §FR-NH-002, §FR-NH-006
- **Files to Create**: `src/native-host/StdioTransport.ts`, `src/native-host/CommandBus.ts`
- **Acceptance Criteria**: AC-NH-01, AC-NH-07, T-NH-001, T-NH-002, T-NH-003
- **Est. Lines**: 60
- **PR Assignment**: PR #6

---

#### T-032: CliExecutor + validate

- **Description**: Create `src/native-host/CliExecutor.ts` wrapping `child_process.execFile` with timeout, no shell, max buffer (1MB), and Result-based return (ExecResult). Create `src/native-host/validate.ts` with isTraversal(), isAllowedBase(), hasForbiddenChars(), isWithinMaxLength(), validateThemePath(), and sanitizeArg() — all returning Result<T, DomainError>.
- **Spec References**: FR-NH-003, FR-NH-007, SEC-NH-001, SEC-NH-002, SEC-NH-003
- **Design References**: `08-security-boundaries.md` §3 (Path Validation), §6 (CLI Security); `06-native-host.md` §FR-NH-007, §SEC-NH-001..003
- **Files to Create**: `src/native-host/CliExecutor.ts`, `src/native-host/validate.ts`
- **Acceptance Criteria**: AC-NH-03, T-NH-005, T-NH-006, T-NH-007
- **Est. Lines**: 55
- **PR Assignment**: PR #6

---

#### T-033: Command Handlers (4 commands)

- **Description**: Create 4 command handlers implementing the CommandHandler interface: `ThemePushCommand` (nube-cli theme push with path validation), `ThemePreviewCommand` (nube-cli theme preview, returns preview URL), `ThemeWatchCommand` (long-running watch with WATCH_EVENT notifications, max 2 concurrent), and `SystemHealthCommand` (CLI discovery + version + permissions check returning HealthResult).
- **Spec References**: FR-NH-004, FR-NH-005, FR-NH-008, NFR-NH-004
- **Design References**: `03-c4-component.md` (4 command handlers); `04-sequences.md` §4 (health check), §6 (theme reload); `06-native-host.md` §FR-NH-004, §FR-NH-005
- **Files to Create**: `src/native-host/commands/ThemePushCommand.ts`, `src/native-host/commands/ThemePreviewCommand.ts`, `src/native-host/commands/ThemeWatchCommand.ts`, `src/native-host/commands/SystemHealthCommand.ts`
- **Acceptance Criteria**: AC-NH-02, AC-NH-03, AC-NH-04, AC-NH-05, T-NH-009, T-NH-010
- **Est. Lines**: 120
- **PR Assignment**: PR #6

---

#### T-034: Native Host Manifest + package.json

- **Description**: Create `src/native-host/manifest.json` for Chrome native messaging host registration (`com.tiendanube.theme-devtools`, stdio type, allowed_origins with placeholder extension ID). Create `src/native-host/package.json` with minimal dependencies (zod only) and build script.
- **Spec References**: FR-NH-001, NFR-NH-001, NFR-NH-003
- **Design References**: `08-security-boundaries.md` §2 (Native Host Allowlist); `06-native-host.md` §Files Created
- **Files to Create**: `src/native-host/manifest.json`, `src/native-host/package.json`
- **Acceptance Criteria**: AC-NH-06 (part of), AC-NH-05
- **Est. Lines**: 25
- **PR Assignment**: PR #6

---

### PR #7: Integration (`feat/scaffold-07-integration`) — ~400 lines

**Depends on**: PR #1-6 (all previous PRs must be merged)
**Must merge before**: — (final PR)
**Parallelizable**: T-035, T-037, T-038 are independent. T-036 depends on T-035. T-039 depends on T-012.

---

#### T-035: Build Scripts (build-host.mjs, build-zip.mjs, validate-env.js)

- **Description**: Create `scripts/build-host.mjs` for native host esbuild pass (target node20, CJS, fully bundled, cross-platform via --os flag). Create `scripts/build-zip.mjs` creating `dist/extension.zip` excluding native-host/, with Chrome Web Store-compatible structure. Create `scripts/validate-env.js` checking required env vars (CHROME_WEBSTORE_CLIENT_ID, etc.) before CI build.
- **Spec References**: FR-CONF-004, FR-CONF-005, FR-CONF-POL-001, FR-CONF-POL-002, FR-POL-015
- **Design References**: `01-root-config.md` §FR-CONF-004, §FR-CONF-005, §FR-CONF-POL-001, §FR-CONF-POL-002; `09-deployment-architecture.md` §CI Pipeline (Zip stage)
- **Files to Create**: `scripts/build-host.mjs`, `scripts/build-zip.mjs`, `scripts/validate-env.js`
- **Acceptance Criteria**: AC-RC-06, AC-NH-06
- **Est. Lines**: 100
- **PR Assignment**: PR #7

---

#### T-036: CI Workflows

- **Description**: Create `.github/workflows/ci.yml` (full pipeline: lint → typecheck → test → build → zip → bundle size → CSP validation → madge circular deps), `lint.yml` (ESLint on push/PR), `typecheck.yml` (tsc --noEmit for both configs), `test.yml` (vitest run with coverage), `build.yml` (build + zip on push to main/develop), `release.yml` (manual trigger: SemVer tag, GitHub Release with artifacts, SHA256SUMS). Each workflow uses setup-node@v4 with cache.
- **Spec References**: FR-POL-004, FR-POL-010, FR-POL-014, FR-CC-06, FR-POL-019
- **Design References**: `09-deployment-architecture.md` §CI Pipeline, §Release Workflow; `08-cross-cutting.md` §FR-CC-06
- **Files to Create**: `.github/workflows/ci.yml`, `.github/workflows/lint.yml`, `.github/workflows/typecheck.yml`, `.github/workflows/test.yml`, `.github/workflows/build.yml`, `.github/workflows/release.yml`
- **Acceptance Criteria**: AC-CC-06, AC-RC-02 (via CI)
- **Est. Lines**: 160
- **PR Assignment**: PR #7

---

#### T-037: Public Icons

- **Description**: Create `public/icons/icon16.png`, `public/icons/icon48.png`, and `public/icons/icon128.png` — placeholder extension icons for DevTools panel tab, management page, and Chrome Web Store.
- **Spec References**: FR-MAN-002 (icons field), FR-CONF-003 (static asset copy)
- **Design References**: `02-manifest.md` §FR-MAN-002; `01-root-config.md` §FR-CONF-003
- **Files to Create**: `public/icons/icon16.png`, `public/icons/icon48.png`, `public/icons/icon128.png`
- **Acceptance Criteria**: AC-MF-06
- **Est. Lines**: — (binary files)
- **PR Assignment**: PR #7

---

#### T-038: README + CHANGELOG

- **Description**: Update `README.md` with project description, architecture overview (hexagonal diagram), setup instructions (npm ci, npm run build, Chrome unpacked load), available scripts table, project structure tree, environment variables, native host installation, and Chrome Web Store publishing. Create `CHANGELOG.md` with scaffold entry (can be auto-generated by standard-version).
- **Spec References**: FR-POL-017, FR-POL-009
- **Design References**: `09-deployment-architecture.md` §Versioning, §Release Workflow
- **Files to Create**: `README.md`, `CHANGELOG.md`
- **Acceptance Criteria**: (documentation readiness)
- **Est. Lines**: 60
- **PR Assignment**: PR #7

---

#### T-039: Integration Tests + storage.ts

- **Description**: Create `src/shared/storage.ts` with Result-based chrome.storage wrapper (implements StoragePort pattern, not the interface — used for backward compat when ChromeStorageAdapter is not available). Create integration tests for cross-module scenarios: storage get/set roundtrip, DI container resolves all ports, MessageRegistry dispatches by type, debounce with fake timers, UUID uniqueness, native host config validation.
- **Spec References**: FR-SH-003, FR-ARCH-013, NFR-CC-08
- **Design References**: `07-shared-core.md` §FR-SH-003: Storage Wrappers; `01-root-config.md` §Test Scenarios
- **Files to Create**: `src/shared/storage.ts`, `src/shared/__tests__/storage.test.ts`, integration test files
- **Acceptance Criteria**: AC-SH-02, AC-SH-04, AC-CC-08
- **Est. Lines**: 80
- **PR Assignment**: PR #7

---

## Appendix A: PR Slicing Summary

| PR | Branch | Scope | Total Tasks | Est. Lines | Depends On | Must Merge Before |
|----|--------|-------|-------------|------------|------------|-------------------|
| **1** | `feat/scaffold-01-foundation` | Root configs: package.json, tsconfig×3, esbuild.config.mjs, eslint.config.mjs, .prettierrc, vitest.config.ts×2, dependabot, .env.example | T-001..T-006 | ~410 | — (base) | PR #2a+, PR #3+ |
| **2a** | `feat/scaffold-02a-shared-types` | Shared types: result, errors, messaging, ports (3 files), type augmentations | T-007, T-008, T-009, T-012 | ~185 | PR #1 | PR #2b, PR #3, PR #4, PR #5, PR #6, PR #7 |
| **2b** | `feat/scaffold-02b-shared-logic` | Shared logic: DI, logger, utils, config, validation, messageRegistry, command, domain layer | T-010, T-011, T-013, T-014, T-015 | ~325 | PR #1, PR #2a | PR #3, PR #4, PR #5, PR #6, PR #7 |
| **3** | `feat/scaffold-03-background` | Background: manifest.ts, service-worker.ts, MessageRouter, ChromeStorageAdapter, NativeHostClient, alarms | T-016..T-019 | ~280 | PR #1, PR #2a, PR #2b | PR #4, PR #5, PR #7 |
| **4** | `feat/scaffold-04-devtools-panel` | DevTools panel: HTML shell, registration, panel store, root components, 5 components, 3 hooks, styles, types | T-020..T-025 | ~415 | PR #1, PR #2a, PR #2b, PR #3 | PR #5, PR #7 |
| **5** | `feat/scaffold-05-content-script` | Content script: entry, controller, state machine, page detector, liquid mapper, hover handler, badge manager, SPA nav, message handler, throttle | T-026..T-029 | ~300 | PR #1, PR #2a, PR #2b, PR #4 | PR #7 |
| **6** | `feat/scaffold-06-native-host` | Native host: entry, config, StdioTransport, CommandBus, CliExecutor, validate, 4 command handlers, manifest, package.json | T-030..T-034 | ~340 | PR #1, PR #2a, PR #2b | PR #7 |
| **7** | `feat/scaffold-07-integration` | Integration: build scripts, 6 CI workflows, icons, README, CHANGELOG, storage.ts, integration tests | T-035..T-039 | ~400 | PR #1-6 | — (final) |

**Total**: ~2,655 lines across 8 PRs (avg ~330 lines/PR, all ≤ ~415 — PR #2a and #2b both under 400).

### Merge Order (Sequential)

```
main ── PR #1 ── PR #2a ── PR #2b ── PR #3 ── PR #4 ── PR #5 ── PR #6 ── PR #7 ── main
```

Each PR is merged to `main` one at a time. The next PR rebases on the updated `main` before review. No parallel merges.

---

## Appendix B: FR/NFR → Task Matrix

| Spec | FR/NFR ID | Task(s) |
|------|-----------|---------|
| 00 | FR-ARCH-001 | T-002, T-003, T-012, T-015 |
| 00 | FR-ARCH-002 | T-012 |
| 00 | FR-ARCH-003 | T-004, T-005 |
| 00 | FR-ARCH-004 | T-010 |
| 00 | FR-ARCH-005 | T-009 |
| 00 | FR-ARCH-006 | T-013, T-039 |
| 00 | FR-ARCH-007 | T-012, T-015, T-026 |
| 00 | FR-ARCH-008 | T-003, T-036 |
| 00 | FR-ARCH-009 | T-002 |
| 00 | FR-ARCH-010 | T-004 |
| 00 | FR-ARCH-011 | T-004 |
| 00 | FR-ARCH-012 | T-004 |
| 00 | FR-ARCH-013 | T-005, T-039 |
| 00 | FR-ARCH-014 | T-005 |
| 00 | FR-ARCH-015 | T-009, T-023, T-026 |
| 00 | NFR-ARCH-001 | T-013 |
| 00 | NFR-ARCH-002 | T-002, T-036 |
| 00 | NFR-ARCH-003 | T-004 |
| 01 | FR-CONF-001 | T-003, T-016 |
| 01 | FR-CONF-002 | T-003 |
| 01 | FR-CONF-003 | T-003, T-037 |
| 01 | FR-CONF-004 | T-003, T-035 |
| 01 | FR-CONF-005 | T-035 |
| 01 | FR-CONF-006 | T-002 |
| 01 | FR-CONF-007 | T-001 |
| 01 | FR-CONF-POL-001 | T-001, T-035 |
| 01 | FR-CONF-POL-002 | T-035 |
| 01 | FR-CONF-POL-003 | T-001 |
| 01 | FR-CONF-POL-004 | T-006 |
| 01 | FR-CONF-POL-005 | T-001 |
| 01 | FR-CONF-TEST-001 | T-005 |
| 01 | FR-CONF-TEST-002 | T-005 |
| 01 | FR-CONF-TEST-003 | T-005 |
| 01 | NFR-CONF-001 | T-003 |
| 01 | NFR-CONF-002 | T-003 |
| 01 | NFR-CONF-003 | T-004 |
| 01 | NFR-CONF-004 | T-004 |
| 01 | NFR-CONF-005 | T-001 |
| 01 | NFR-CONF-006 | T-005 |
| 02 | FR-MAN-001 | T-016 |
| 02 | FR-MAN-002 | T-016, T-037 |
| 02 | FR-MAN-003 | T-016 |
| 02 | FR-MAN-004 | T-016 |
| 02 | FR-MAN-005 | T-016 |
| 02 | FR-MAN-006 | T-016 |
| 02 | FR-MAN-007 | T-016 |
| 02 | FR-MAN-008 | T-016 |
| 02 | NFR-MAN-001 | T-003, T-016 |
| 02 | NFR-MAN-002 | T-003 |
| 02 | NFR-MAN-003 | T-016 |
| 03 | FR-BG-001 | T-017 |
| 03 | FR-BG-002 | T-018 |
| 03 | FR-BG-003 | T-019 |
| 03 | FR-BG-004 | T-017, T-018 |
| 03 | FR-BG-005 | T-017, T-019 |
| 03 | FR-BG-006 | T-018 |
| 03 | FR-BG-007 | T-018 |
| 03 | FR-BG-008 | T-019 |
| 04 | FR-DTP-001 | T-020 |
| 04 | FR-DTP-002 | T-020 |
| 04 | FR-DTP-003 | T-022 |
| 04 | FR-DTP-003b | T-023 |
| 04 | FR-DTP-004 | T-023 |
| 04 | FR-DTP-005 | T-023 |
| 04 | FR-DTP-006 | T-023 |
| 04 | FR-DTP-007 | T-023 |
| 04 | FR-DTP-008 | T-024 |
| 04 | FR-DTP-009 | T-021 |
| 04 | NFR-DTP-001 | T-024 |
| 04 | NFR-DTP-002 | T-021 |
| 04 | NFR-DTP-003 | T-020, T-025 |
| 04 | NFR-DTP-004 | T-025 |
| 05 | FR-CI-001 | T-026, T-027 |
| 05 | FR-CI-002 | T-028 |
| 05 | FR-CI-003 | T-028 |
| 05 | FR-CI-004 | T-029 |
| 05 | FR-CI-005 | T-029 |
| 05 | FR-CI-006 | T-029 |
| 05 | NFR-CI-001 | T-036 |
| 06 | FR-NH-001 | T-031, T-034 |
| 06 | FR-NH-002 | T-031 |
| 06 | FR-NH-003 | T-030 |
| 06 | FR-NH-004 | T-033 |
| 06 | FR-NH-005 | T-033 |
| 06 | FR-NH-006 | T-031 |
| 06 | FR-NH-007 | T-032 |
| 06 | FR-NH-008 | T-030, T-033 |
| 06 | NFR-NH-001 | T-034 |
| 06 | NFR-NH-002 | T-030 |
| 06 | NFR-NH-003 | T-034 |
| 06 | NFR-NH-004 | T-033 |
| 06 | NFR-NH-005 | T-030 |
| 06 | SEC-NH-001 | T-032 |
| 06 | SEC-NH-002 | T-032 |
| 06 | SEC-NH-003 | T-032 |
| 07 | FR-SH-001 | T-007..T-015 |
| 07 | FR-SH-002 | T-009 |
| 07 | FR-SH-003 | T-039 |
| 07 | FR-SH-004 | T-013 |
| 07 | FR-SH-005 | T-013 |
| 07 | FR-SH-006 | T-013 |
| 07 | FR-SH-007 | T-011 |
| 07 | FR-SH-008 | T-014 |
| 07 | FR-SH-009 | T-014 |
| 07 | FR-SH-010 | T-014 |
| 07 | FR-SH-011 | T-014 |
| 07 | NFR-SH-001 | T-007..T-015 |
| 07 | NFR-SH-002 | T-013 |
| 07 | NFR-SH-003 | T-007, T-013, T-015 |
| 07 | NFR-SH-004 | T-011, T-014 |
| 08 | FR-CC-01 | T-007, T-008 |
| 08 | FR-CC-02 | T-009 |
| 08 | FR-CC-03 | T-010 |
| 08 | FR-CC-04 | T-011 |
| 08 | FR-CC-05 | T-016, T-020 |
| 08 | FR-CC-06 | T-036 |
| — | FR-POL-001..021 | T-001..T-039 (distributed across all tasks) |

---

## Appendix C: Circular Dependency Validation

The task graph forms a DAG with no cycles:

```
T-001 ──→ T-003 ──→ T-016, T-020, T-035
T-002 ──→ T-003, T-005
T-004 (independent)
T-006 (independent)
T-007 ──→ T-009, T-012, T-013, T-014, T-015
T-008 ──→ T-009, T-012, T-014, T-015, T-032
T-009 ──→ T-012, T-014, T-021, T-024, T-026, T-029
T-010 ──→ T-014, T-017
T-011 (independent, used by T-014)
T-012 ──→ T-017, T-018, T-019, T-039
T-013 (independent)
T-014 ──→ T-015, T-017, T-018, T-030, T-031
T-015 (no consumers)
T-016 ──→ (no consumers outside PR #3)
T-017 ──→ (runtime composition, no build dep)
T-018 ──→ (runtime composition, no build dep)
T-019 ──→ (runtime composition, no build dep)
T-020 ──→ T-025
T-021 ──→ T-022, T-023
T-022 ──→ T-023
T-023 (no downstream)
T-024 (no downstream)
T-025 (no downstream)
T-026 ──→ (wires T-027, T-028, T-029)
T-027, T-028, T-029 (leaf tasks)
T-030 ──→ T-033
T-031 ──→ T-033
T-032 ──→ T-033
T-033 (leaf)
T-034 (leaf)
T-035 ──→ T-036
T-036 (leaf)
T-037 (leaf)
T-038 (leaf)
T-039 (leaf)
```

All dependencies are forward-only. No task depends on a task in a later PR.
