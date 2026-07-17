# Spec: Cross-Cutting Concerns

**Module**: `cross-cutting` | **Change**: `scaffold` | **Phase**: `spec` | **Version**: 1.0

---

## 1. Functional Requirements

### FR-CC-01: Error Handling — Result/Either Pattern
**Description**: All fallible operations MUST return `Result<T, E>` (fp-ts style). No thrown exceptions for expected failures.

**Details**:
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
```

**Domain Error Types** (discriminated unions):
```typescript
// src/shared/errors.ts
export type DomainError =
  | { readonly _tag: 'NotFound'; readonly resource: string; readonly id: string }
  | { readonly _tag: 'ValidationFailed'; readonly field: string; readonly reason: string }
  | { readonly _tag: 'PermissionDenied'; readonly operation: string }
  | { readonly _tag: 'NativeHostUnavailable'; readonly reason: string }
  | { readonly _tag: 'MessageTimeout'; readonly correlationId: string; readonly target: string }
  | { readonly _tag: 'SerializationFailed'; readonly cause: unknown }
  | { readonly _tag: 'CSPViolation'; readonly directive: string; readonly blockedUri: string };
```

**Applies to**: Background SW, Native Host, Content Script, DevTools Panel, Shared modules.

**Traceability**: "Manejo consistente de errores", "Código limpio y autoexplicativo", "Funciones cortas"

---

### FR-CC-02: Messaging Protocol — Correlation IDs & Request/Response
**Description**: Every message crossing context boundaries carries a correlation ID for tracing and response matching.

**Message Envelope**:
```typescript
// src/shared/messaging.ts
export interface Envelope<TPayload> {
  readonly correlationId: string;           // UUID v4
  readonly timestamp: number;               // Date.now()
  readonly source: MessageSource;           // 'panel' | 'background' | 'content' | 'native-host'
  readonly destination: MessageDestination; // same + 'broadcast'
  readonly payload: TPayload;
  readonly replyTo?: string;                // correlationId for response
}

export type MessageSource = 'panel' | 'background' | 'content' | 'native-host';
export type MessageDestination = MessageSource | 'broadcast';
```

**Request/Response Pattern**:
```typescript
export interface Request<TPayload, TResponse> {
  readonly type: 'request';
  readonly method: string;
  readonly params: TPayload;
  readonly correlationId: string; // matches envelope.correlationId
}

export interface Response<TResponse> {
  readonly type: 'response';
  readonly correlationId: string; // matches request.correlationId
  readonly result?: TResponse;
  readonly error?: DomainError;
}
```

**Timeout Handling**: Background SW tracks pending requests. Default timeout: 5s. On timeout → `Err({ _tag: 'MessageTimeout', correlationId, target })`.

**Traceability**: "Toda comunicación entre módulos debe estar tipada", "Cohesión alta y acoplamiento bajo"

---

### FR-CC-03: Dependency Injection — Lightweight Container
**Description**: Constructor-based DI container for resolving Port interfaces to Adapters per context (background, panel, native-host).

**Container Interface**:
```typescript
// src/shared/di.ts
export interface Container {
  register<T>(token: Token<T>, factory: () => T): void;
  resolve<T>(token: Token<T>): T;
  resolveAsync<T>(token: Token<T>): Promise<T>;
}

export interface Token<T> {
  readonly name: string;
  readonly type: new (...args: any[]) => T; // for debugging
}

// Usage (Background SW):
const container = createContainer();
container.register(StoragePort, () => new ChromeStorageAdapter());
container.register(NativeHostPort, () => new NativeHostClient());
container.register(MessageRouter, () => new MessageRouter(container.resolve(StoragePort)));

// Panel context:
const panelContainer = createContainer();
panelContainer.register(StoragePort, () => new ChromeStorageAdapter());
panelContainer.register(ThemeService, () => new ThemeService(panelContainer.resolve(StoragePort)));
```

**Per-Context Registrations**: Each context (background, panel, native-host) gets its own container with context-appropriate adapters.

**Traceability**: "Inyección de dependencias cuando aporte desacoplamiento", "Preferir composición antes que herencia", "Open/Closed Principle"

---

### FR-CC-04: Structured Logging
**Description**: Centralized logger with correlation ID propagation, context enrichment, and level filtering.

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
```

**Implementations**:
- **Background/Panel/Content**: `ConsoleLogger` (browser console, structured JSON)
- **Native Host**: `FileLogger` (writes JSONL to `~/.tiendanube-devtools/logs/`)
- **Test**: `MemoryLogger` (in-memory buffer for assertions)

**Correlation**: `logger.child({ correlationId })` auto-propagates through message handlers.

**Traceability**: "Logging centralizado", "Nombres descriptivos", "Código limpio y autoexplicativo"

---

### FR-CC-05: Security — CSP, Permissions, Origin Validation
**Description**: Extension follows principle of least privilege.

**CSP** (DevTools panel):
```
script-src 'self' 'wasm-unsafe-eval'; // Preact needs eval for dev, production precompiled
style-src 'self';                      // NO 'unsafe-inline' — CSS Modules + external stylesheets
connect-src 'self' https://*.tiendanube.com https://*.nuvemshop.com.br;
img-src 'self' data: blob:;
font-src 'self' data:;
```

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

## Non-Functional Requirements

### NFR-CC-007: Message Queue v2 (Future)

For the scaffold, the `MessageRouter` handles basic routing. A full `MessageQueue` with retry/backoff/dead-letter is deferred to a follow-up change.

**Planned Interface**:
```typescript
// src/shared/messageQueue.ts (future)
interface MessageQueue {
  enqueue<T>(message: Envelope<T>): Promise<Result<void, DomainError>>;
  dequeue(): Promise<Envelope<unknown> | null>;
  deadLetter: Envelope<unknown>[];
  retryPolicy: RetryPolicy;
}
```

**Scope**: Background SW message reliability, native host command queuing.

---

### NFR-CC-008: Command Bus v2 (Future)

The `CommandBus` in `shared/command.ts` provides basic dispatch. Advanced features (pipeline behaviors, saga orchestration, compensation) are deferred.

**Planned Middleware**:
- `LoggingMiddleware` — structured command logging
- `TimingMiddleware` — latency tracking
- `RetryMiddleware` — automatic retry with backoff
- `CircuitBreakerMiddleware` — failure isolation

---

### NFR-CC-009: Performance Budget Enforcement

Hard budgets enforced in CI for all bundles:

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| Panel bundle (gz) | ≤ 50 KB | `esbuild --analyze` + CI check |
| Service Worker (gz) | ≤ 15 KB | Same |
| Content Script (gz) | ≤ 10 KB | Same |
| Native Host binary | ≤ 8 MB | `ls -lh` in CI |
| Cold start (panel mount) | ≤ 200 ms | Lighthouse CI |
| Message round-trip | ≤ 50 ms (local) | Integration test |

**Traceability**: Project policy — Performance budgets (FR-POL-019).

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
  send<T>(target: MessageSource, action: string, params: T): Promise<Result<unknown, AppError>>;
  broadcast(action: string, data: unknown): void;
  on<T>(action: string, handler: (params: T) => Promise<Result<unknown, AppError>>): void;
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

---

## 6. Test Scenarios

### Unit (Vitest)
| Test ID | Description | Coverage Target |
|---------|-------------|-----------------|
| UT-CC-01 | `Result` map/flatMap/match/unwrapOr laws | 100% |
| UT-CC-02 | Correlation ID generation uniqueness | 100% |
| UT-CC-03 | DI container singleton vs transient lifecycle | 100% |
| UT-CC-04 | Logger child context merging | 100% |
| UT-CC-05 | Message envelope serialization round-trip | 100% |
| UT-CC-06 | Retry logic (exponential backoff, max attempts) | 100% |
| UT-CC-07 | Origin validation (allowed/blocked) | 100% |
| UT-CC-08 | Input sanitization (XSS vectors) | 100% |

### Integration
| Test ID | Description |
|---------|-------------|
| IT-CC-01 | Full message round-trip: panel → background → native host → background → panel |
| IT-CC-02 | DI container resolves all ports in each context (panel, background, native host) |
| IT-CC-03 | Logger correlation ID propagates across message boundaries |
| IT-CC-04 | Storage wrapper works in all three contexts (extension SW, panel, content) |

### E2E (Playwright)
| Test ID | Description |
|---------|-------------|
| E2E-CC-01 | Load extension, open DevTools panel, verify no console errors |
| E2E-CC-02 | Click "Reload Theme" → native host invoked → panel shows success |

---

## 7. Traceability Matrix

| Requirement | Architectural Principle | Spec File |
|-------------|------------------------|-----------|
| FR-CC-01 | Manejo consistente de errores, Código limpio | 00-architecture-compliance.md |
| FR-CC-02 | Comunicación tipada, Cohesión alta | 07-shared-core.md (messaging) |
| FR-CC-03 | Inyección de dependencias, Composición, Open/Closed | 00-architecture-compliance.md |
| FR-CC-04 | Logging centralizado, Nombres descriptivos | 00-architecture-compliance.md |
| FR-CC-05 | Seguridad, Menor privilegio | 00-architecture-compliance.md |
| FR-CC-06 | Funciones cortas, Responsabilidad única | 00-architecture-compliance.md |
| FR-CC-07 | Message Queue v2 (Future) | 08-cross-cutting.md (NFR-CC-007) |
| FR-CC-08 | Command Bus v2 (Future) | 08-cross-cutting.md (NFR-CC-008) |

---

## 8. Acceptance Criteria (from 09-acceptance-criteria.md)

| AC-ID | Description |
|-------|-------------|
| AC-CC-01 | Result pattern used consistently across all modules |
| AC-CC-02 | Correlation IDs propagate through entire message chain |
| AC-CC-03 | DI container resolves all ports at startup in each context |

---

*End of Spec — Cross-Cutting Concerns*