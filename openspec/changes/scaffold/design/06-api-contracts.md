# API Contracts — Port Interfaces

**Change**: `scaffold`
**Phase**: design
**Date**: 2026-07-16
**Traceability**: Spec 00 FR-ARCH-002, Spec 07 (canonical), Spec 08 FR-CC-01..03

---

> **Canonical source**: `src/shared/ports/`. These interfaces are the **contract** between adapters. No adapter defines its own — they import from `@/shared/ports/*`.

## StoragePort

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
  /** Read one or more keys from storage. Returns null if no data exists. */
  get<T extends keyof StorageSchema>(
    keys: T[],
    area?: StorageArea
  ): Promise<Pick<StorageSchema, T> | null>;

  /** Write one or more keys to storage. Partial update — preserves unspecified keys. */
  set<T extends keyof StorageSchema>(
    data: Pick<StorageSchema, T>,
    area?: StorageArea
  ): Promise<void>;

  /** Remove one or more keys from storage. */
  remove(keys: string[], area?: StorageArea): Promise<void>;

  /** Clear all data in the specified storage area. */
  clear(area?: StorageArea): Promise<void>;

  /** Observe changes to a specific key. Returns unsubscribe function. */
  observe<T extends keyof StorageSchema>(
    key: T,
    callback: (newValue: StorageSchema[T] | null, oldValue?: StorageSchema[T] | null) => void
  ): () => void;

  /** Migrate storage schema between versions. */
  migrate(
    fromVersion: string,
    toVersion: string,
    migrationFn: (oldData: Record<string, unknown>) => Record<string, unknown>
  ): Promise<void>;
}
```

### Implementations

| Adapter | Class | Wraps |
|---------|-------|-------|
| Background SW | `ChromeStorageAdapter` | `chrome.storage.local` |
| DevTools Panel | Via Background (no direct storage) | Messages to background |
| Content Script | Via Background (read-only) | Messages to background |
| Native Host | `FileStorageAdapter` (future) | JSON file on disk |

---

## NativeHostPort

```typescript
// src/shared/ports/NativeHostPort.ts
import type { Result } from '@/shared/result';
import type { DomainError, HealthResult } from '@/shared/errors';

export interface NativeHostPort {
  /** Establish connection to the native messaging host. */
  connect(): Promise<Result<void, DomainError>>;

  /** Disconnect from the native messaging host. */
  disconnect(): Promise<void>;

  /** Send a command and await a typed response. */
  send<T>(command: string, payload: unknown): Promise<Result<T, DomainError>>;

  /** Register handler for unsolicited notifications (e.g., watch events). */
  onNotification(handler: (method: string, params: unknown) => void): void;

  /** Check native host health (CLI availability, permissions). */
  healthCheck(): Promise<Result<HealthResult, DomainError>>;
}

export interface HealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  cli?: { path: string; version: string };
  permissions?: Record<string, boolean>;
  timestamp: number;
}
```

### Implementations

| Adapter | Class | Protocol |
|---------|-------|----------|
| Background SW | `NativeHostClient` | `chrome.runtime.connectNative` |
| Native Host | Internal (StdioTransport) | stdin/stdout JSON-RPC 2.0 |

---

## MessagingPort

```typescript
// src/shared/ports/MessagingPort.ts
import type { ExtensionMessage } from '@/shared/messaging';

export interface MessagingPort {
  /** Send a typed extension message and await a response. */
  send<T>(message: ExtensionMessage): Promise<T>;

  /** Register a handler for incoming messages. */
  onMessage(
    handler: (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => void
  ): void;

  /** Establish connection (for long-lived ports). */
  connect(): Promise<void>;

  /** Disconnect. */
  disconnect(): void;
}
```

### Implementations

| Adapter | Class | Chrome API |
|---------|-------|------------|
| Background SW | `ChromeMessagingAdapter` | `chrome.runtime.onMessage` + `sendMessage` |
| DevTools Panel | Via `useChromeRuntime` hook | `chrome.runtime.sendMessage` |
| Content Script | `MessageHandler` | `chrome.runtime.sendMessage` |

---

## DI Container

```typescript
// src/shared/di.ts

export type Token<T> = string & { readonly __brand: unique symbol };

export function createToken<T>(name: string): Token<T> {
  return name as Token<T>;
}

export interface Container {
  /** Register a factory for a token. Factory receives container for nested resolution. */
  register<T>(token: Token<T>, factory: (container: Container) => T): void;

  /** Register a pre-created instance for a token. */
  registerInstance<T>(token: Token<T>, instance: T): void;

  /** Resolve a token to its registered instance. Throws if not registered. */
  resolve<T>(token: Token<T>): T;

  /** Check if a token is registered. */
  has(token: Token<unknown>): boolean;
}

export function createContainer(): Container;
```

### DI Registration Per Context

#### Background SW Context

```typescript
const container = createContainer();
container.register(StoragePortToken, () => new ChromeStorageAdapter());
container.register(NativeHostPortToken, () => new NativeHostClient());
container.register(MessagingPortToken, () => new ChromeMessagingAdapter());
```

#### DevTools Panel Context

```typescript
const container = createContainer();
// Panel uses MessagingPort via hook — no direct StoragePort/NativeHostPort
container.register(MessagingPortToken, () => new PanelMessagingAdapter());
```

#### Native Host Context

```typescript
// Native host uses its own DI (CommandBus + middleware)
// No shared ports needed — it's the implementation side
```

---

## Token Constants

```typescript
// src/shared/ports/tokens.ts
import { createToken } from '@/shared/di';
import type { StoragePort } from './StoragePort';
import type { NativeHostPort } from './NativeHostPort';
import type { MessagingPort } from './MessagingPort';

export const StoragePortToken = createToken<StoragePort>('StoragePort');
export const NativeHostPortToken = createToken<NativeHostPort>('NativeHostPort');
export const MessagingPortToken = createToken<MessagingPort>('MessagingPort');
```

---

## Contract Validation Rules (from Spec 00 FR-ARCH-002)

1. **No adapter defines its own port types** — all MUST import from `@/shared/ports/`
2. **Port interfaces are the boundary** — adapters never call Chrome APIs directly except through their adapter implementation
3. **Result pattern everywhere** — all fallible operations return `Result<T, E>`, never throw
4. **Discriminated unions** — messages are discriminated by `type`; adding new types never modifies existing handlers
5. **Correlation IDs** — every cross-context message carries `correlationId: string`
6. **Runtime dependency rule** — `src/shared/` has ZERO runtime dependencies (no Chrome APIs, no Node builtins)
