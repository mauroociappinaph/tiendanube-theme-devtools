# Shared Core Specification

**Change**: `scaffold`
**Spec**: 07-shared-core
**Date**: 2026-07-16

---

## Purpose

Define the shared modules used by ALL adapters (background, devtools, content, native-host). These modules live in `src/shared/` and form the domain/core layer of the hexagonal architecture. They MUST have zero external runtime dependencies and MUST be stateless (pure functions + type definitions).

**This spec is the SINGLE SOURCE OF TRUTH for all port interfaces, message types, and shared patterns.** All other specs MUST import types from here and NOT redefine them.

---

## Canonical Port Interfaces

### StoragePort (`src/shared/ports/StoragePort.ts`)

```typescript
// src/shared/ports/StoragePort.ts
export interface StorageSchema {
  mode: 'local' | 'remote';
  themePath: string;
  inspectMode: boolean;
  schemaVersion: string;
}

export type StorageArea = 'local' | 'sync' | 'session';

export interface StoragePort {
  get<T extends keyof StorageSchema>(
    keys: T[],
    area?: StorageArea
  ): Promise<Pick<StorageSchema, T> | null>;

  set<T extends keyof StorageSchema>(
    data: Pick<StorageSchema, T>,
    area?: StorageArea
  ): Promise<void>;

  remove(keys: string[], area?: StorageArea): Promise<void>;
  clear(area?: StorageArea): Promise<void>;

  observe<T extends keyof StorageSchema>(
    key: T,
    callback: (newValue: StorageSchema[T] | null, oldValue?: StorageSchema[T] | null) => void
  ): () => void; // returns unsubscribe function

  migrate(
    fromVersion: string,
    toVersion: string,
    migrationFn: (oldData: Record<string, unknown>) => Record<string, unknown>
  ): Promise<void>;
}
```

**Traceability**: Hexagonal — port interface for all storage access. Implemented by `ChromeStorageAdapter` (background) and `FileStorageAdapter` (native-host).

---

### NativeHostPort (`src/shared/ports/NativeHostPort.ts`)

```typescript
// src/shared/ports/NativeHostPort.ts
export interface NativeHostPort {
  connect(): Promise<Result<void, DomainError>>;
  disconnect(): Promise<void>;
  send<T>(command: string, payload: unknown): Promise<Result<T, DomainError>>;
  onNotification(handler: (method: string, params: unknown) => void): void;
  healthCheck(): Promise<Result<HealthResult, DomainError>>;
}

export interface HealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  cli?: { path: string; version: string };
  permissions?: Record<string, boolean>;
  timestamp: number;
}
```

**Traceability**: Hexagonal — port interface for native messaging host communication. Implemented by `NativeHostClient` (background). Native host exposes JSON-RPC 2.0 internally but THIS is the external contract.

---

### MessagingPort (`src/shared/ports/MessagingPort.ts`)

```typescript
// src/shared/ports/MessagingPort.ts
export interface MessagingPort {
  send<T>(message: ExtensionMessage): Promise<T>;
  onMessage(handler: (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => void): void;
  connect(): Promise<void>;
  disconnect(): void;
}
```

**Traceability**: Hexagonal — port interface for Chrome runtime messaging.

---

### DI Container (`src/shared/di.ts`)

```typescript
// src/shared/di.ts
export type Token<T> = string & { readonly __brand: unique symbol };

export function createToken<T>(name: string): Token<T> {
  return name as Token<T>;
}

export interface Container {
  register<T>(token: Token<T>, factory: (container: Container) => T): void;
  registerInstance<T>(token: Token<T>, instance: T): void;
  resolve<T>(token: Token<T>): T;
  has(token: Token<unknown>): boolean;
}

export function createContainer(): Container;
```

**Usage**:
```typescript
const container = createContainer();
const StoragePortToken = createToken<StoragePort>('StoragePort');
container.register(StoragePortToken, () => new ChromeStorageAdapter());
const storage = container.resolve(StoragePortToken);
```

---

## Result Pattern (`src/shared/result.ts`)

```typescript
// src/shared/result.ts
export type Result<T, E> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly _tag: 'Ok';
  readonly value: T;
}

export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
}

export function ok<T>(value: T): Ok<T> {
  return { _tag: 'Ok', value };
}

export function err<E>(error: E): Err<E> {
  return { _tag: 'Err', error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result._tag === 'Ok';
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result._tag === 'Err';
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) return result.value;
  throw result.error;
}

export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (isErr(result)) return result.error;
  throw new Error('Expected Err');
}
```

---

## Domain Errors (`src/shared/errors.ts`)

```typescript
// src/shared/errors.ts
export type DomainError =
  | { _tag: 'NotFound'; resource: string; id: string }
  | { _tag: 'ValidationFailed'; errors: Record<string, string[]> }
  | { _tag: 'StorageError'; operation: 'get' | 'set' | 'remove' | 'observe'; key: string; cause: unknown }
  | { _tag: 'MessageTimeout'; correlationId: string }
  | { _tag: 'MessageSizeExceeded'; size: number; limit: number }
  | { _tag: 'NativeHostUnavailable'; reason: string }
  | { _tag: 'NativeHostError'; code: number; message: string }
  | { _tag: 'CommandNotFound'; command: string }
  | { _tag: 'PathTraversal'; path: string }
  | { _tag: 'PathNotAllowed'; path: string; allowedBases: string[] }
  | { _tag: 'ParamTooLong'; max: number; actual: number }
  | { _tag: 'ForbiddenPattern'; pattern: string; input: string }
  | { _tag: 'CliExecutionFailed'; command: string; exitCode: number; stderr: string }
  | { _tag: 'CliTimeout'; command: string; timeoutMs: number }
  | { _tag: 'InternalError'; message: string; cause?: unknown };
```

---

## Messaging Types (`src/shared/messaging.ts`)

```typescript
// src/shared/messaging.ts
import type { DomainError } from './errors';
import type { Result } from './result';

export interface BaseMessage {
  correlationId: string;
  timestamp: number;
  source?: 'content' | 'background' | 'devtools' | 'native-host';
}

export type ExtensionMessage =
  // Content → Background
  | (BaseMessage & { type: 'PAGE_DETECTED'; payload: PageDetectionPayload })
  | (BaseMessage & { type: 'HOVER_EVENT'; payload: HoverEventPayload })
  // DevTools → Background → Content
  | (BaseMessage & { type: 'ACTIVATE_INSPECT'; payload?: undefined })
  | (BaseMessage & { type: 'DEACTIVATE_INSPECT'; payload?: undefined })
  // DevTools → Background
  | (BaseMessage & { type: 'SET_MODE'; payload: { mode: 'local' | 'remote' } })
  | (BaseMessage & { type: 'RELOAD_THEME'; payload: { themePath?: string } })
  // Background → DevTools
  | (BaseMessage & { type: 'THEME_RELOADED'; payload: { success: boolean; message: string } })
  | (BaseMessage & { type: 'GET_THEME_INFO'; payload?: undefined })
  | (BaseMessage & { type: 'THEME_INFO'; payload: { connected: boolean; version: string } })
  // Background ↔ Native Host
  | (BaseMessage & { type: 'NATIVE_COMMAND'; payload: { command: string; payload: unknown } })
  | (BaseMessage & { type: 'NATIVE_RESPONSE'; payload: { result?: unknown; error?: unknown } })
  | (BaseMessage & { type: 'NATIVE_NOTIFICATION'; payload: { method: string; params: unknown } })
  // Native Host → Background (watch events)
  | (BaseMessage & { type: 'WATCH_EVENT'; payload: WatchEventPayload });

export interface PageDetectionPayload {
  pageType: 'storefront' | 'admin_themes' | 'checkout' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: 'meta_tag' | 'url_pattern' | 'global_var' | 'fallback';
  nuvemshopId?: string;
}

export interface HoverEventPayload {
  liquidFile: string;
  confidence: 'high' | 'medium' | 'low';
  mappingMethod: 'data-liquid-file' | 'data-section-id' | 'data-block-id' | 'heuristic' | 'unknown';
  elementTag: string;
  elementClasses: string[];
  elementId?: string;
  boundingRect: { top: number; left: number; width: number; height: number };
}

export interface WatchEventPayload {
  type: 'change' | 'error' | 'ready';
  file?: string;
  message?: string;
  timestamp: number;
}

export type MessagePayload<T extends ExtensionMessage['type']> =
  Extract<ExtensionMessage, { type: T }>['payload'];

export function createMessage<T extends ExtensionMessage['type']>(
  type: T,
  payload: MessagePayload<T>,
  source?: BaseMessage['source']
): Extract<ExtensionMessage, { type: T }> {
  return {
    type,
    payload,
    correlationId: crypto.randomUUID(),
    timestamp: Date.now(),
    source,
  } as Extract<ExtensionMessage, { type: T }>;
}
```

---

## New Modules (Added per Architecture Review)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `logger.ts` | Structured logging interface + transports | `Logger`, `ConsoleLogger`, `FileLogger`, `MemoryLogger`, `LogLevel`, `createLogger` |
| `config.ts` | Centralized configuration with Zod validation | `ExtensionConfig`, `HostConfig`, `loadExtensionConfig()`, `loadHostConfig()` |
| `messageRegistry.ts` | Central message handler registry | `MessageRegistry`, `messageRegistry` |
| `command.ts` | Command pattern interfaces (CQRS-lite) | `Command`, `CommandHandler`, `CommandBus`, `Middleware` |
| `validation.ts` | Zod schemas for env, messages, commands | `EnvSchema`, `MessageSchema`, `validate()` |
| `domain/` | Pure domain layer (entities, value objects, services) | See Domain Layer section below |

---

## Requirements

### FR-SH-001: Messaging Types (`src/shared/messaging.ts`)

The messaging module MUST define a discriminated union of all message types used across the extension.

**Traceability**: Hexagonal — port interface for all inter-adapter communication.

#### Scenario: All message types are defined

- GIVEN `src/shared/messaging.ts`
- WHEN inspecting its exports
- THEN it MUST export the message types defined in the Interface Contracts section above

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

---

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

---

### FR-SH-003: Storage Wrappers (`src/shared/storage.ts`)

The storage module MUST provide typed wrappers around `chrome.storage` APIs (local, sync, session).

**Traceability**: DRY — single storage access pattern across all adapters.

#### Scenario: Typed set/get

- GIVEN a storage schema `interface Settings { mode: 'local' | 'remote'; themePath: string }`
- WHEN `storage.get<Settings>(['mode', 'themePath'])` is called
- THEN it MUST return `Promise<Partial<Settings> | null>` with the correct types
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

---

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

---

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

---

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

### FR-SH-007: Logger Interface (`src/shared/logger.ts`)

Structured logging interface with multiple transports.

**Traceability**: Project policy — centralized logging (FR-POL-004).

```typescript
// src/shared/logger.ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;      // ISO 8601
  readonly correlationId?: string;
  readonly context: string;        // module name
  readonly metadata?: Record<string, unknown>;
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, error?: Error, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger; // adds context
}

// Transports (implemented in shared, used by all adapters)
export class ConsoleLogger implements Logger { /* ... */ }  // Panel, Background, Content
export class FileLogger implements Logger { /* ... */ }     // Native Host (writes JSONL)
export class MemoryLogger implements Logger { /* ... */ }   // Tests (in-memory buffer)

// Factory
export function createLogger(context: string, transport?: 'console' | 'file' | 'memory'): Logger;
```

---

### FR-SH-008: Configuration (`src/shared/config.ts`)

Centralized configuration with Zod validation for both Extension and Native Host.

```typescript
// src/shared/config.ts
import { z } from 'zod';

export const ExtensionConfigSchema = z.object({
  nativeHost: z.object({
    name: z.string().default('com.tiendanube.theme-devtools'),
    maxRetries: z.number().int().positive().default(3),
    retryDelayMs: z.number().int().positive().default(1000),
  }),
  inspect: z.object({
    hoverDebounceMs: z.number().int().positive().default(150),
    maxBadgeLength: z.number().int().positive().default(60),
  }),
  build: z.object({
    version: z.string(),
    buildTime: z.string(),
    mode: z.enum(['development', 'production']),
  }),
});

export type ExtensionConfig = z.infer<typeof ExtensionConfigSchema>;

export function loadExtensionConfig(overrides?: Partial<ExtensionConfig>): ExtensionConfig {
  const raw = {
    nativeHost: { name: 'com.tiendanube.theme-devtools', maxRetries: 3, retryDelayMs: 1000 },
    inspect: { hoverDebounceMs: 150, maxBadgeLength: 60 },
    build: { version: '0.1.0', buildTime: new Date().toISOString(), mode: 'development' },
  };
  const merged = deepMerge(raw, overrides ?? {});
  return ExtensionConfigSchema.parse(merged);
}
```

**Native Host config** is defined in `06-native-host.md` (`HostConfigSchema`) but uses the same pattern.

---

### FR-SH-009: Message Registry (`src/shared/messageRegistry.ts`)

Central registry for message handlers — replaces giant `switch` in Background.

```typescript
// src/shared/messageRegistry.ts
import type { ExtensionMessage } from './messaging';

type MessageHandler<T extends ExtensionMessage> = (
  message: T,
  sender: chrome.runtime.MessageSender
) => Promise<ExtensionMessage | void>;

export class MessageRegistry {
  private handlers = new Map<string, MessageHandler<any>>();

  register<T extends ExtensionMessage>(type: T['type'], handler: MessageHandler<T>): void {
    this.handlers.set(type, handler);
  }

  getHandler<T extends ExtensionMessage>(type: T['type']): MessageHandler<T> | undefined {
    return this.handlers.get(type);
  }

  dispatch(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<ExtensionMessage | void> {
    const handler = this.handlers.get(message.type);
    if (!handler) throw new Error(`No handler for message type: ${message.type}`);
    return handler(message, sender);
  }
}

// Singleton
export const messageRegistry = new MessageRegistry();
```

---

### FR-SH-010: Command Pattern (`src/shared/command.ts`)

CQRS-lite interfaces for Native Host commands.

```typescript
// src/shared/command.ts
import type { Result } from './result';
import type { DomainError } from './errors';

export interface Command {
  readonly name: string;
  readonly payload: unknown;
  readonly correlationId: string;
  readonly timestamp: number;
}

export interface CommandHandler<C extends Command, R> {
  readonly commandName: string;
  execute(command: C): Promise<Result<R, DomainError>>;
}

export interface Middleware {
  readonly name: string;
  execute<C extends Command, R>(
    command: C,
    next: () => Promise<Result<R, DomainError>>
  ): Promise<Result<R, DomainError>>;
}

export class CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>();
  private middlewares: Middleware[] = [];

  register<C extends Command, R>(handler: CommandHandler<C, R>): void {
    this.handlers.set(handler.commandName, handler);
  }

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  async dispatch<C extends Command, R>(
    command: C
  ): Promise<Result<R, DomainError>> {
    const handler = this.handlers.get(command.name);
    if (!handler) {
      return err({ _tag: 'CommandNotFound', command: command.name });
    }

    const chain = this.middlewares.reduceRight(
      (next, mw) => () => mw.execute(command, next),
      () => handler.execute(command)
    );

    return chain();
  }
}
```

**Default Middlewares**: `LoggingMiddleware`, `TimingMiddleware`, `ErrorHandlingMiddleware`.

---

### FR-SH-011: Validation Schemas (`src/shared/validation.ts`)

Zod schemas for all external inputs.

```typescript
// src/shared/validation.ts
import { z } from 'zod';
import type { Result } from './result';
import type { DomainError } from './errors';

export const EnvSchema = z.object({
  CHROME_WEBSTORE_CLIENT_ID: z.string().min(1),
  CHROME_WEBSTORE_CLIENT_SECRET: z.string().min(1),
  CHROME_WEBSTORE_REFRESH_TOKEN: z.string().min(1),
  NUBE_CLI_PATH: z.string().optional(),
});

export const MessageSchema = z.object({
  correlationId: z.string().uuid(),
  timestamp: z.number().int().positive(),
  type: z.string().min(1),
  payload: z.unknown().optional(),
});

export const ThemePushParamsSchema = z.object({
  themePath: z.string().min(1).max(4096),
  force: z.boolean().optional(),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): Result<T, DomainError> {
  const result = schema.safeParse(data);
  if (result.success) return ok(result.data);
  return err({ _tag: 'ValidationFailed', errors: result.error.flatten().fieldErrors });
}
```

---

## Domain Layer

```
src/domain/
├── entities/
│   ├── Theme.ts              # ThemeFile, ThemeManifest
│   ├── NativeHostSession.ts  # Session state
│   └── InspectionSession.ts  # Inspect mode state
├── valueObjects/
│   ├── LiquidFilePath.ts     # Validated path
│   ├── ThemeMode.ts          # 'local' | 'remote'
│   ├── NativeHostStatus.ts   # Enum wrapper
│   └── CorrelationId.ts      # UUID wrapper
└── services/
    ├── ThemeService.ts       # Business logic: push, preview, watch
    ├── InspectionService.ts  # Liquid mapping, badge logic
    └── NativeHostService.ts  # Health, path discovery, exec
```

**Rules**:
- Zero external dependencies
- Pure functions / pure classes
- No Chrome APIs, no Node.js APIs
- Testable in isolation (pure Vitest)

---

## Non-Functional Requirements

### NFR-SH-001: Zero Runtime Dependencies

All shared modules MUST have zero external dependencies. They MAY use TypeScript-only types from `@types/chrome` (dev dependency only — stripped at build time).

### NFR-SH-002: Tree-Shakeable

Each function in `utils.ts`, `validation.ts`, etc. MUST be a named export. The esbuild bundler MUST be able to tree-shake unused functions.

### NFR-SH-003: Immutability

All exported functions MUST be pure (no side effects, no mutations of input arguments).

### NFR-SH-004: TypeDoc Coverage

Every exported type and function MUST have a JSDoc comment describing its purpose, parameters, and return value.

---

## Interface Contracts (Consolidated)

All interfaces defined above in Canonical Port Interfaces section are the authoritative definitions. Other specs MUST import from these modules:

```typescript
// Import patterns for adapters:
import type { StoragePort } from '@/shared/ports/StoragePort';
import type { NativeHostPort } from '@/shared/ports/NativeHostPort';
import type { MessagingPort } from '@/shared/ports/MessagingPort';
import type { ExtensionMessage, PageDetectionPayload, HoverEventPayload } from '@/shared/messaging';
import type { Result, DomainError, ok, err } from '@/shared/result';
import type { Logger } from '@/shared/logger';
import { createContainer, createToken } from '@/shared/di';
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
| `src/shared/logger.ts` | Re-exported | Logger interface + transports |
| `src/shared/config.ts` | Re-exported | Config loading + validation |
| `src/shared/messageRegistry.ts` | Re-exported | Central message handler registry |
| `src/shared/command.ts` | Re-exported | Command pattern interfaces |
| `src/shared/validation.ts` | Re-exported | Zod schemas + validate() |
| `src/shared/ports/StoragePort.ts` | Implements | Storage port interface |
| `src/shared/ports/NativeHostPort.ts` | Implements | Native host port interface |
| `src/shared/ports/MessagingPort.ts` | Implements | Messaging port interface |
| `src/shared/di.ts` | Uses | DI container for port registration |
| `src/shared/result.ts` | Re-exported | Result/Either pattern |
| `src/shared/errors.ts` | Re-exported | DomainError types |
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
| T-SH-009 | Unit | `logger.child()` binds correlationId | Vitest |
| T-SH-010 | Unit | `validate(schema, data)` returns Ok/Err correctly | Vitest |
| T-SH-011 | Unit | `MessageRegistry` dispatches to correct handler | Vitest |
| T-SH-012 | Unit | `CommandBus` middleware chain executes in order | Vitest |
| T-SH-013 | Unit | `parseLiquidUrl` / `detectLiquidType` correct | Vitest |
| T-SH-014 | Unit | `StoragePort` get/set/observe/remove/migrate work | Vitest with chrome mocks |
| T-SH-015 | Unit | `NativeHostPort` send/healthCheck/connect work | Vitest with mock transport |
| T-SH-016 | Unit | `DI Container` register/resolve works | Vitest |
| T-SH-017 | Unit | `Result` ok/err/isOk/isErr/unwrap work | Vitest |

---

*End of Shared Core Spec*