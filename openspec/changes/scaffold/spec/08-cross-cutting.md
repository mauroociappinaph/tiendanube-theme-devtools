# Spec: Cross-Cutting Concerns

**Module**: `cross-cutting` | **Change**: `scaffold` | **Phase**: `spec` | **Version**: 1.0

---

## 1. Functional Requirements

### FR-CC-01: Error Handling — Result/Either Pattern

**Description**: All fallible operations MUST return `Result<T, E>` (canonical implementation in `src/shared/result.ts`). No thrown exceptions for expected failures.

**Canonical Implementation** (from `src/shared/result.ts`):
```typescript
// src/shared/result.ts
export type Result<T, E> = Ok<T> | Err<E>;

export interface Ok<T> { readonly _tag: 'Ok'; readonly value: T; }
export interface Err<E> { readonly _tag: 'Err'; readonly error: E; }

export const ok = <T>(value: T): Result<T, never> => ({ _tag: 'Ok', value });
export const err = <E>(error: E): Result<never, E> => ({ _tag: 'Err', error });

// Combinators
export const map = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  r._tag === 'Ok' ? ok(f(r.value)) : r;

export const flatMap = <T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E> =>
  r._tag === 'Ok' ? f(r.value) : r;

export const match = <T, E, R>(
  r: Result<T, E>,
  onOk: (t: T) => R,
  onErr: (e: E) => R
): R => (r._tag === 'Ok' ? onOk(r.value) : onErr(r.error));

export const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T =>
  r._tag === 'Ok' ? r.value : fallback;
```

**Domain Error Types** (canonical from `src/shared/errors.ts`):
```typescript
// src/shared/errors.ts
export type DomainError =
  | { readonly _tag: 'NotFound'; readonly resource: string; readonly id: string }
  | { readonly _tag: 'ValidationFailed'; readonly field: string; readonly reason: string }
  | { readonly _tag: 'PermissionDenied'; readonly operation: string }
  | { readonly _tag: 'NativeHostUnavailable'; readonly reason: string }
  | { readonly _tag: 'MessageTimeout'; readonly correlationId: string; readonly target: string }
  | { readonly _tag: 'SerializationFailed'; readonly cause: unknown }
  | { readonly _tag: 'CSPViolation'; readonly directive: string; readonly blockedUri: string }
  | { readonly _tag: 'StorageError'; readonly operation: 'get' | 'set' | 'remove' | 'observe'; readonly key: string; readonly cause: unknown }
  | { readonly _tag: 'CommandNotFound'; readonly command: string }
  | { readonly _tag: 'PathTraversal'; readonly path: string }
  | { readonly _tag: 'PathNotAllowed'; readonly path: string; readonly allowedBases: string[] }
  | { readonly _tag: 'ParamTooLong'; readonly max: number; readonly actual: number }
  | { readonly _tag: 'ForbiddenPattern'; readonly pattern: string; readonly input: string }
  | { readonly _tag: 'CliExecutionFailed'; readonly command: string; readonly exitCode: number; readonly stderr: string }
  | { readonly _tag: 'CliTimeout'; readonly command: string; readonly timeoutMs: number }
  | { readonly _tag: 'InternalError'; readonly message: string; readonly cause?: unknown };
```

**Applies to**: Background SW, Native Host, Content Script, DevTools Panel, Shared modules.

**Traceability**: "Manejo consistente de errores", "Código limpio y autoexplicativo", "Funciones cortas"

---

### FR-CC-02: Messaging Protocol — Correlation IDs & Request/Response

**Description**: Every message crossing context boundaries carries a correlation ID for tracing and response matching.

**Canonical Message Types** (from `src/shared/messaging.ts`):
```typescript
// src/shared/messaging.ts
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

**Timeout Handling**: Background SW tracks pending requests. Default timeout: 30s. On timeout → `Err({ _tag: 'MessageTimeout', correlationId, target })`.

**Traceability**: "Toda comunicación entre módulos debe estar tipada", "Cohesión alta y acoplamiento bajo"

---

### FR-CC-03: Dependency Injection — Lightweight Container

**Description**: Constructor-based DI container for resolving Port interfaces to Adapters per context (background, panel, native-host).

**Canonical Container** (from `src/shared/di.ts`):
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

**Usage** (Background SW):
```typescript
import { createContainer, createToken } from '@/shared/di';
import { StoragePort } from '@/shared/ports/StoragePort';
import { NativeHostPort } from '@/shared/ports/NativeHostPort';
import { MessagingPort } from '@/shared/ports/MessagingPort';

const container = createContainer();
const StoragePortToken = createToken<StoragePort>('StoragePort');
const NativeHostPortToken = createToken<NativeHostPort>('NativeHostPort');
const MessagingPortToken = createToken<MessagingPort>('MessagingPort');

container.register(StoragePortToken, () => new ChromeStorageAdapter());
container.register(NativeHostPortToken, () => new NativeHostClient());
container.register(MessagingPortToken, () => new ChromeMessagingAdapter());
// MessageRouter receives StoragePort via DI
```

**Per-Context Registrations**: Each context (background, panel, native-host) gets its own container with context-appropriate adapters.

**Traceability**: "Inyección de dependencias cuando aporte desacoplamiento", "Preferir composición antes que herencia", "Open/Closed Principle"

---

### FR-CC-04: Structured Logging

**Description**: Centralized logger with correlation ID propagation, context enrichment, and level filtering.

**Canonical Logger** (from `src/shared/logger.ts`):
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

export function createLogger(context: string, transport?: 'console' | 'file' | 'memory'): Logger;
```

**Correlation**: `logger.child({ correlationId })` auto-propagates through message handlers.

**Traceability**: "Logging centralizado", "Nombres descriptivos", "Código limpio y autoexplicativo"

---

### FR-CC-05: Security — CSP, Permissions, Origin Validation

**Description**: Extension follows principle of least privilege.

**CSP** (DevTools panel):
```
script-src 'self'; object-src 'self'; style-src 'self';
```
- NO `'unsafe-inline'` for styles — CSS Modules + external stylesheets
- NO `eval` — Preact precompiled for production

**Permissions** (Manifest V3):
```json
{
  "permissions": ["storage", "activeTab", "scripting", "alarms", "nativeMessaging"],
  "host_permissions": [
    "https://*.tiendanube.com/*",
    "https://*.nuvemshop.com.br/*"
  ],
  "optional_host_permissions": []
}
```

**Origin Validation**: Every incoming message validated:
```typescript
function validateOrigin(port: chrome.runtime.Port): boolean {
  const allowed = [
    'chrome-extension://' + chrome.runtime.id,
    /^https:\/\/(.*\.)?tiendanube\.com$/,
    /^https:\/\/(.*\.)?nuvemshop\.com\.br$/
  ];
  return allowed.some(o => o instanceof RegExp ? o.test(port.sender?.origin) : o === port.sender?.origin);
}
```

**Input Sanitization**: All user-controlled strings (badge text, CLI args) escaped/validated.

**Traceability**: "Seguridad", "Principio de menor privilegio", "Manejo consistente de errores"

---

### FR-CC-06: Performance — Budgets & Patterns

**Description**: Hard budgets enforced in CI; patterns documented.

**Budgets** (CI gate):
| Metric | Budget | Enforcement |
|--------|--------|-------------|
| Panel bundle (gz) | ≤ 50 KB | `esbuild --analyze` + CI check |
| Service Worker (gz) | ≤ 15 KB | Same |
| Content Script (gz) | ≤ 10 KB | Same |
| Native Host binary | ≤ 8 MB | `ls -lh` in CI |
| Cold start (panel mount) | ≤ 200 ms | Lighthouse CI |
| Message round-trip | ≤ 50 ms (local) | Integration test |

**Patterns**:
- Lazy load panel components via dynamic `import()`
- Memoize pure functions (`storage.get`, parsing)
- Debounce DOM observers (150ms default)
- Batch storage writes (single `set` per event loop tick)
- Reuse `MessagePort` connections (long-lived)

**Traceability**: "Funciones cortas", "Métodos con una única responsabilidad", "Alta cohesión"

---

## 2. Non-Functional Requirements

| NFR-ID | Requirement | Target | Verification |
|--------|-------------|--------|--------------|
| NFR-CC-01 | Zero unhandled promise rejections | 0 | CI + runtime monitoring |
| NFR-CC-02 | Message timeout → structured error | 100% | Integration test |
| NFR-CC-03 | DI container resolves all ports at startup | 100% | Unit test |
| NFR-CC-04 | Correlation ID present in 100% of log entries | 100% | Log audit |
| NFR-CC-05 | CSP violations = 0 in production | 0 | Chrome DevTools audit |
| NFR-CC-06 | Bundle sizes within budget | 100% | CI gate |
| NFR-CC-07 | Retry only on idempotent actions | 100% | Code review |
| NFR-CC-08 | No circular dependencies | 0 | `madge --circular` in CI |

---

## 3. Interface Contracts (TypeScript)

### 3.1 Error Handling
```typescript
// src/shared/result.ts
type Result<T, E> = Ok<T> | Err<E>;

interface Ok<T> { readonly _tag: 'Ok'; readonly value: T; }
interface Err<E> { readonly _tag: 'Err'; readonly error: E; }

const ok = <T>(value: T): Result<T, never> => ({ _tag: 'Ok', value });
const err = <E>(error: E): Result<never, E> => ({ _tag: 'Err', error });

const map = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  r._tag === 'Ok' ? ok(f(r.value)) : r;

const flatMap = <T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E> =>
  r._tag === 'Ok' ? f(r.value) : r;

const match = <T, E, R>(r: Result<T, E>, onOk: (t: T) => R, onErr: (e: E) => R): R =>
  r._tag === 'Ok' ? onOk(r.value) : onErr(r.error);

const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T =>
  r._tag === 'Ok' ? r.value : fallback;
```

### 3.2 Messaging
```typescript
// src/shared/messaging.ts
type MessageSource = 'background' | 'panel' | 'content' | 'native-host';

interface MessagePort {
  postMessage(msg: unknown): void;
  onMessage: (handler: (msg: unknown) => void) => void;
  onDisconnect: (handler: () => void) => void;
}

interface IMessageBus {
  send<T>(target: MessageSource, action: string, params: T): Promise<Result<unknown, DomainError>>;
  broadcast(action: string, data: unknown): void;
  on<T>(action: string, handler: (params: T) => Promise<Result<unknown, DomainError>>): void;
  off(action: string): void;
}
```

### 3.3 Dependency Injection
```typescript
// src/shared/di.ts
interface PortToken<T> { readonly _brand: unique symbol; }

function createPortToken<T>(name: string): PortToken<T> {
  return { _brand: Symbol(name) } as PortToken<T>;
}

interface DIContainer {
  register<T>(token: PortToken<T>, impl: T, lifecycle?: 'singleton' | 'transient'): void;
  resolve<T>(token: PortToken<T>): T;
  createScope(): DIContainer;
}

function createContainer(): DIContainer { /* ... */ }
```

### 3.4 Logging
```typescript
// src/shared/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug(msg: string, ctx?: LogContext): void;
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext): void;
  child(ctx: LogContext): Logger;
}

interface LogContext {
  correlationId?: string;
  module: string;
  action?: string;
  [key: string]: unknown;
}
```

---

## 4. Error Scenarios & Handling

| Scenario | Detection | Response | Recovery |
|----------|-----------|----------|----------|
| Native host binary missing | `spawn ENOENT` | `Err({ kind: 'PathDiscoveryFailed' })` | Fallback to user config path; show panel error |
| Native host crash | `exitCode !== 0` or stderr | `Err({ kind: 'ExecutionFailed', exitCode, stderr })` | Auto-restart (max 3), then circuit breaker |
| Message timeout | No response in 30s | `Err({ kind: 'Timeout', ms: 30000 })` | Retry idempotent; notify panel |
| CSP violation | Console error | Log + sentry (future) | Fix in next release |
| Storage quota exceeded | `QuotaExceededError` | `Err({ kind: 'StorageQuotaExceeded' })` | Clear old data; notify user |
| Circular dependency | `madge` in CI | Build fail | Refactor |
| Message port disconnected | `onDisconnect` | Cleanup listeners; reconnect | Auto-reconnect with backoff |

---

## 5. Dependencies

### Internal (Direction: this → other)
| Module | Direction | Purpose |
|--------|-----------|---------|
| `shared/result` | Provides | Base error handling types |
| `shared/messaging` | Provides | Message bus interface & envelope |
| `shared/di` | Provides | DI container & tokens |
| `shared/logger` | Provides | Logger interface & transports |
| `shared/storage` | Consumes | Uses DI for storage adapter |

### External
| Package | Version | Purpose |
|---------|---------|---------|
| `fp-ts` | ^2.16 | Result/Either/Option/TaskEither (optional — local `Result` preferred) |
| `uuid` | ^9.0 | Correlation IDs (`crypto.randomUUID()` preferred) |
| `@types/chrome` | ^0.0.258 | Chrome API types |
| `zod` | ^3.23 | Schema validation (config, messages) |

---

*End of Cross-Cutting Concerns Spec*