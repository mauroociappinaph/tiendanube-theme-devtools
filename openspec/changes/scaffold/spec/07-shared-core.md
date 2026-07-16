# Shared Core Specification

**Change**: `scaffold`
**Spec**: 07-shared-core
**Date**: 2026-07-16

---

## Purpose

Define the shared modules used by ALL adapters (background, devtools, content, native-host). These modules live in `src/shared/` and form the domain/core layer of the hexagonal architecture. They MUST have zero external runtime dependencies and MUST be stateless (pure functions + type definitions).

---

## Requirements

### FR-SH-001: Messaging Types (`src/shared/messaging.ts`)

The messaging module MUST define a discriminated union of all message types used across the extension.

**Traceability**: Hexagonal — port interface for all inter-adapter communication.

#### Scenario: All message types are defined

- GIVEN `src/shared/messaging.ts`
- WHEN inspecting its exports
- THEN it MUST export the following message types:

| Message Type | Sender | Receiver | Payload |
|-------------|--------|----------|---------|
| `PAGE_DETECTED` | Content | Background | `{ pageType, confidence, detectionMethod }` |
| `HOVER_EVENT` | Content | Background | `{ liquidFile, confidence, elementTag }` |
| `ACTIVATE_INSPECT` | DevTools | Content (via Background) | None |
| `DEACTIVATE_INSPECT` | DevTools | Content (via Background) | None |
| `SET_MODE` | DevTools | Background | `{ mode: 'local' \| 'remote' }` |
| `RELOAD_THEME` | DevTools | Background | `{ themePath?: string }` |
| `THEME_RELOADED` | Background | DevTools | `{ success, message }` |
| `GET_THEME_INFO` | DevTools | Background | None |
| `THEME_INFO` | Background | DevTools | `{ connected, version }` |

#### Scenario: Type narrowing works

- GIVEN a `ExtensionMessage` value
- WHEN checking `message.type === "HOVER_EVENT"`
- THEN TypeScript MUST narrow the payload type to `HoverEventPayload`
- AND accessing `message.payload.liquidFile` MUST compile without errors

#### Scenario: Exhaustiveness checking

- GIVEN a `switch` statement on `message.type`
- WHEN a new type is added to the union
- THEN TypeScript MUST flag any `switch` without a `never` default case
- AS a compile-time error

### FR-SH-002: Correlation IDs

Every message MUST include a `correlationId` field of type `string` (UUID v4). Each sender MUST generate a unique ID per request and include it in both the request and the corresponding response.

#### Scenario: Correlation ID generation

- GIVEN a new message is being created
- WHEN `createMessage(type, payload)` is called
- THEN the returned message MUST include `correlationId`
- AND `correlationId` MUST be a valid UUID v4 string
- AND `correlationId` MUST be unique for each call

#### Scenario: Response uses same correlation ID

- GIVEN a request with `correlationId: "abc-123"`
- WHEN a response is created for that request
- THEN the response MUST use the same `correlationId: "abc-123"`
- AND the caller MUST be able to match response to request via the ID

### FR-SH-003: Storage Wrappers (`src/shared/storage.ts`)

The storage module MUST provide typed wrappers around `chrome.storage` APIs (local, sync, session).

**Traceability**: DRY — single storage access pattern across all adapters.

#### Scenario: Typed set/get

- GIVEN a storage schema `interface Settings { mode: 'local' \| 'remote'; themePath: string }`
- WHEN `storage.get<Settings>(['mode', 'themePath'])` is called
- THEN it MUST return `Promise<Partial<Settings>>` with the correct types
- AND TypeScript MUST enforce the return type

#### Scenario: Observe changes

- GIVEN storage is initialized
- WHEN `storage.observe<Settings>('mode', (newValue, oldValue) => { ... })` is called
- THEN the callback MUST fire whenever `chrome.storage.onChanged` fires for `mode`
- AND the callback MUST receive typed values

#### Scenario: Migration helpers

- GIVEN the extension updates from v1 to v2 with a new storage schema
- WHEN `storage.migrate('v1', 'v2', migrationFn)` is called
- THEN it MUST check the stored `schemaVersion`
- AND call `migrationFn` to transform old data to the new schema
- AND update `schemaVersion` to `'v2'`

#### Scenario: Storage area detection

- GIVEN a call to `storage.get()` with no area specified
- WHEN the module determines the correct area
- THEN it MUST default to `chrome.storage.local`
- AND fall back to `chrome.storage.session` for ephemeral data (connection state)
- AND throw a TypeError if the area does not exist in the current context

### FR-SH-004: Chrome Type Augmentations (`src/shared/types/chrome.d.ts`)

The Chrome type augmentations file MUST extend `@types/chrome` with APIs that are not yet in the type definitions.

**Traceability**: DRY — single source of truth for Chrome API types.

#### Scenario: devtools.panels augmentation

- GIVEN `chrome.devtools.panels.create()` is used
- WHEN the TypeScript compiler checks types
- THEN the augmentation MUST define the `create` method signature
- AND its `callback` parameter: `(panel: chrome.devtools.panels.ExtensionPanel) => void`

#### Scenario: scripting.executeScript augmentation

- GIVEN `chrome.scripting.executeScript()` is used in the background
- WHEN the TypeScript compiler checks types
- THEN the augmentation MUST define the `InjectionResult` type
- AND the `ScriptInjection` parameter type

#### Scenario: No duplicate definitions

- GIVEN any adapter file
- WHEN it imports Chrome types
- THEN it MUST NOT redefine any type that is already in `chrome.d.ts`
- AND `chrome.d.ts` MUST be the only file that augments `@types/chrome`

### FR-SH-005: Utility Functions (`src/shared/utils.ts`)

The utilities module MUST provide pure, tree-shakeable utility functions.

**Traceability**: DRY — shared pure functions.

#### Scenario: debounce

- GIVEN `debounce(fn, 150)` returns a debounced function
- WHEN called 3 times within 150ms
- THEN `fn` MUST only be called once, 150ms after the last invocation
- AND the returned function MUST have a `.cancel()` method
- AND the returned function MUST have a `.flush()` method

#### Scenario: throttle

- GIVEN `throttle(fn, 200)` returns a throttled function
- WHEN called continuously
- THEN `fn` MUST be called at most once every 200ms
- AND the last call within the window MUST be executed after the window ends

#### Scenario: UUID generation

- GIVEN `uuid()` is called
- THEN it MUST return a v4 UUID string matching regex `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`
- AND consecutive calls MUST return different values

#### Scenario: URL parsing for Liquid files

- GIVEN `parseLiquidUrl('/path/to/sections/product.liquid')` is called
- THEN it MUST return `{ directory: 'sections', name: 'product', extension: 'liquid', full: 'sections/product.liquid' }`

#### Scenario: Liquid template type detection

- GIVEN `detectLiquidType('sections/product.liquid')` is called
- THEN it MUST return `'section'`
- AND `detectLiquidType('layout/theme.liquid')` MUST return `'layout'`
- AND `detectLiquidType('templates/product.liquid')` MUST return `'template'`
- AND `detectLiquidType('snippets/icon.liquid')` MUST return `'snippet'`
- AND `detectLiquidType('config/settings_schema.json')` MUST return `'config'`

### FR-SH-006: Global Type Declarations (`src/shared/global.d.ts`)

The global declarations file MUST define ambient types that are used across the entire project without explicit imports.

**Traceability**: TypeScript configuration — shared global types.

#### Scenario: BuildInfo type

- GIVEN any adapter file
- WHEN it references `BUILD_INFO` or `__BUILD_INFO__`
- THEN `global.d.ts` MUST declare the type:
  ```typescript
  interface BuildInfo {
    version: string;
    buildTime: string;
    mode: 'development' | 'production';
  }
  ```

#### Scenario: Console extensions

- GIVEN the project uses structured logging
- WHEN a module calls `console.debug`, `console.info`, `console.warn`, `console.error`
- THEN `global.d.ts` MUST extend the `Console` interface with a `logLevel` property
- AND any custom log methods used by the shared logger

---

## Non-Functional Requirements

### NFR-SH-001: Zero Runtime Dependencies

All shared modules MUST have zero external dependencies. They MAY use TypeScript-only types from `@types/chrome` (dev dependency only — stripped at build time).

### NFR-SH-002: Tree-Shakeable

Each function in `utils.ts` MUST be a named export. The esbuild bundler MUST be able to tree-shake unused functions.

### NFR-SH-003: Immutability

All exported functions MUST be pure (no side effects, no mutations of input arguments).

### NFR-SH-004: TypeDoc Coverage

Every exported type and function MUST have a JSDoc comment describing its purpose, parameters, and return value.

---

## Interface Contracts

```typescript
// === messaging.ts ===

// Base message structure
interface BaseMessage {
  correlationId: string;
  timestamp: number;
  source?: 'content' | 'background' | 'devtools' | 'native-host';
}

// Discriminated union of all extension messages
type ExtensionMessage =
  | (BaseMessage & { type: 'PAGE_DETECTED'; payload: PageDetectionPayload })
  | (BaseMessage & { type: 'HOVER_EVENT'; payload: HoverEventPayload })
  | (BaseMessage & { type: 'ACTIVATE_INSPECT'; payload?: undefined })
  | (BaseMessage & { type: 'DEACTIVATE_INSPECT'; payload?: undefined })
  | (BaseMessage & { type: 'SET_MODE'; payload: { mode: 'local' | 'remote' } })
  | (BaseMessage & { type: 'RELOAD_THEME'; payload: { themePath?: string } })
  | (BaseMessage & { type: 'THEME_RELOADED'; payload: { success: boolean; message: string } })
  | (BaseMessage & { type: 'GET_THEME_INFO'; payload?: undefined })
  | (BaseMessage & { type: 'THEME_INFO'; payload: { connected: boolean; version: string } });

// type-functions
type MessagePayload<T extends ExtensionMessage['type']> = 
  Extract<ExtensionMessage, { type: T }>['payload'];


// === storage.ts ===

interface StorageSchema {
  mode: 'local' | 'remote';
  themePath: string;
  inspectMode: boolean;
  schemaVersion: string;
}

type StorageArea = 'local' | 'sync' | 'session';

interface StorageWrapper {
  get<T extends keyof StorageSchema>(
    keys: T[],
    area?: StorageArea
  ): Promise<Pick<StorageSchema, T>>;

  set<T extends keyof StorageSchema>(
    data: Pick<StorageSchema, T>,
    area?: StorageArea
  ): Promise<void>;

  observe<T extends keyof StorageSchema>(
    key: T,
    callback: (newValue: StorageSchema[T], oldValue?: StorageSchema[T]) => void
  ): () => void; // Returns unsubscribe function

  remove(keys: string[], area?: StorageArea): Promise<void>;

  clear(area?: StorageArea): Promise<void>;

  migrate(
    fromVersion: string,
    toVersion: string,
    migrationFn: (oldData: Record<string, unknown>) => Record<string, unknown>
  ): Promise<void>;
}


// === utils.ts ===

interface LiquidFileInfo {
  directory: string;
  name: string;
  extension: string;
  full: string;
}

type LiquidType = 'section' | 'block' | 'template' | 'layout' | 'snippet' | 'config' | 'unknown';

interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel(): void;
  flush(): void;
}

interface ThrottledFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel(): void;
}


// === global.d.ts ===

interface BuildInfo {
  version: string;
  buildTime: string;
  mode: 'development' | 'production';
}

// Injected by esbuild define
declare const __BUILD_INFO__: BuildInfo;
```

---

## Dependencies

| Module | Direction | Purpose |
|--------|-----------|---------|
| `src/shared/messaging.ts` | Re-exported | Message types used by all adapters |
| `src/shared/storage.ts` | Re-exported | Storage wrappers used by background + DevTools |
| `src/shared/utils.ts` | Re-exported | Pure functions used by all adapters |
| `src/shared/types/chrome.d.ts` | Type-level only | Chrome API augmentations |
| `src/shared/global.d.ts` | Type-level only | Global ambient declarations |
| `@types/chrome` | Dev dependency | Base Chrome API type definitions |

**Dependency direction**: Shared modules import NOTHING from adapters. They are the domain layer.

---

## Test Scenarios

| ID | Type | Description | Automation |
|----|------|-------------|------------|
| T-SH-001 | Unit | `ExtensionMessage` discriminated union compiles and narrows | TypeScript compile check |
| T-SH-002 | Unit | `createMessage()` returns valid message with UUID | Vitest |
| T-SH-003 | Unit | `correlationId` is unique across 10,000 calls | Vitest (set test) |
| T-SH-004 | Unit | `debounce()` fires once after multiple rapid calls | Vitest with fake timers |
| T-SH-005 | Unit | `debounce().cancel()` prevents execution | Vitest with fake timers |
| T-SH-006 | Unit | `throttle()` limits calls to once per window | Vitest with fake timers |
| T-SH-007 | Unit | `uuid()` generates valid v4 UUID strings | Vitest (regex match) |
| T-SH-008 | Unit | `uuid()` has zero collisions in 100,000 calls | Vitest |
| T-SH-009 | Unit | `parseLiquidUrl()` returns correct parts for 5 path formats | Vitest |
| T-SH-010 | Unit | `detectLiquidType()` returns correct type for 6 paths | Vitest |
| T-SH-011 | Unit | `chrome.d.ts` augmentations compile without conflicts | TypeScript compile check |
| T-SH-012 | Unit | `global.d.ts` `__BUILD_INFO__` is accessible without import | TypeScript compile check |
| T-SH-013 | Integration | `storage.get()` reads from mocked `chrome.storage.local` | Vitest with mock |
| T-SH-014 | Integration | `storage.set()` writes to mocked `chrome.storage.local` | Vitest with mock |
| T-SH-015 | Integration | `storage.observe()` fires callback on storage changes | Vitest with mock |
| T-SH-016 | Integration | `storage.migrate()` transforms data and updates version | Vitest with mock |
| T-SH-017 | Integration | Storage wrapper works in `session` area | Vitest with mock |
| T-SH-018 | E2E | No circular imports when building shared modules | `madge` check |

---

## Error Scenarios

| Error | Cause | Behavior |
|-------|-------|----------|
| `storage.get()` called in native host | No `chrome.storage` in Node.js | Throws `ReferenceError: chrome is not defined` — native host has its own config |
| `debounce()` called with negative delay | Developer error | Throws `RangeError: delay must be non-negative` |
| Storage area `session` not supported | Called from popup (not all contexts support session) | Falls back to `local` with a warning |
| `migrate()` called without `schemaVersion` | Fresh install with no prior storage | Migration is skipped (no-op) |

---

## Traceability

| Requirement | Principle | File |
|-------------|-----------|------|
| FR-SH-001 | Hexagonal — port interface | `src/shared/messaging.ts` |
| FR-SH-002 | Messaging protocol | `src/shared/messaging.ts` (createMessage) |
| FR-SH-003 | DRY — storage access | `src/shared/storage.ts` |
| FR-SH-004 | DRY — single type source | `src/shared/types/chrome.d.ts` |
| FR-SH-005 | DRY — pure utilities | `src/shared/utils.ts` |
| FR-SH-006 | TypeScript discipline | `src/shared/global.d.ts` |
| NFR-SH-001 | Zero runtime deps | All shared modules |
| NFR-SH-002 | Tree-shaking | `utils.ts` named exports |
| NFR-SH-004 | Documentation discipline | JSDoc on all exports |
