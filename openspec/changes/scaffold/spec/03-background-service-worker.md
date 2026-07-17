# Background Service Worker Specification

**Change**: `scaffold`
**Spec**: 03-background-service-worker
**Date**: 2026-07-16

---

## Purpose

Define the service worker skeleton that acts as the central message broker for the extension. The service worker (`src/background/service-worker.ts`) handles message routing between the DevTools panel, content script, and native messaging host, plus manages alarms and extension lifecycle events.

---

## Architecture (Hexagonal Compliance)

The Background SW is an **Adapter** in the Hexagonal architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKGROUND SW (Adapter)                      │
├─────────────────────────────────────────────────────────────────┤
│  MessageRouter          │  Routes messages by type              │
│  ┌────────────────────┐ │  ┌────────────────────────────────┐  │
│  │ registerHandler()  │ │  │ MessageRegistry (shared)       │  │
│  └──────────┬──────────┘ │  └────────────────────────────────┘  │
│             │            │  ┌────────────────────────────────┐  │
│             ▼            │  │ Ports (injected via DI)        │  │
│  ┌────────────────────┐  │  │ ┌──────────────┐ ┌───────────┐ │  │
│  │ NativeHostClient   │  │  │ │ StoragePort  │ │NativeHostPort│
│  │ (implements Native │  │  │ └──────────────┘ └───────────┘ │  │
│  │  HostPort)         │  │  └────────────────────────────────┘  │
│  └────────────────────┘  │                                      │
│             │            │  ┌────────────────────────────────┐  │
│             ▼            │  │ Domain Services (via ports)    │  │
│  ┌────────────────────┐  │  │ ┌──────────────┐ ┌───────────┐ │  │
│  │ ChromeStorage      │  │  │ │ ThemeService │ │InspectSvc  │ │
│  │ Adapter            │  │  │ └──────────────┘ └───────────┘ │  │
│  │ (implements        │  │  └────────────────────────────────┘  │
│  │  StoragePort)      │  │                                      │
│  └────────────────────┘  └──────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

**Key**: Background SW knows **nothing about JSON-RPC**. It uses `NativeHostPort.send<T>(command, payload): Promise<Result<T>>`.

---

## Functional Requirements

### FR-BG-001: Service Worker Initialization

The service worker MUST register the following lifecycle listeners on `install` and `activate`:

- `chrome.runtime.onInstalled` — Log installation/update events
- `chrome.runtime.onStartup` — Initialize state and start health alarms

**Traceability**: Hexagonal — Service worker is an adapter that initializes ports.

#### Scenario: First install logs event

- GIVEN the extension is freshly installed
- WHEN `chrome.runtime.onInstalled` fires with `reason: "install"`
- THEN the service worker MUST log: `[Tiendanube DevTools] Installed version X.Y.Z`
- AND `chrome.storage.local` MUST be initialized with default settings

#### Scenario: Extension update logs event

- GIVEN the extension is updated from v0.1.0 to v0.2.0
- WHEN `chrome.runtime.onInstalled` fires with `reason: "update"`
- THEN the service worker MUST log: `[Tiendanube DevTools] Updated from 0.1.0 to 0.2.0`
- AND previous settings MUST be preserved

---

### FR-BG-002: Message Router (via MessageRegistry)

The service worker MUST use the shared `MessageRegistry` to route messages:

1. Receives messages from all adapters (panel, content script, native host)
2. Routes messages based on a `type` discriminant
3. Returns typed responses via `sendResponse`
4. Supports asynchronous handlers (returns `true` from `onMessage` listener)

**Traceability**: Hexagonal — Service worker is the message bus adapter. Discriminated unions for Open/Closed.

#### Scenario: Panel sends message to background

- GIVEN the DevTools panel is open
- WHEN the panel sends `{ type: "GET_THEME_INFO" }`
- THEN the service worker MUST receive the message
- AND respond with `{ type: "THEME_INFO", payload: { status: "ok" } }`

#### Scenario: Unknown message type

- GIVEN a message with `type: "UNKNOWN_ACTION"` is sent
- WHEN the router processes it
- THEN it MUST respond with `{ type: "ERROR", payload: { message: "Unknown message type: UNKNOWN_ACTION" } }`

#### Scenario: Async handler keeps channel open

- GIVEN a message requires native host communication (async)
- WHEN the handler calls `sendResponse` asynchronously
- THEN the `onMessage` listener MUST return `true` to keep the channel open
- AND `sendResponse` MUST be called within 5 minutes (Chrome's limit)

---

### FR-BG-003: Native Messaging Bridge (via NativeHostPort)

The service worker MUST manage a connection to the native host via `chrome.runtime.connectNative`.

**Traceability**: Hexagonal — Native host is an external system, service worker is the adapter.

#### Scenario: Native host connects

- GIVEN the native messaging host is installed
- WHEN the service worker calls `chrome.runtime.connectNative("com.tiendanube.theme-devtools")`
- THEN a `Port` MUST be established
- AND the service worker MUST register `onMessage` and `onDisconnect` listeners
- AND MUST send a health check on connect

#### Scenario: Native host sends response

- GIVEN the native host sends a response via native messaging protocol
- WHEN the port's `onMessage` fires
- THEN the service worker MUST correlate by `correlationId`
- AND resolve the pending promise in `NativeHostClient`

#### Scenario: Native host disconnects

- GIVEN the native host process exits unexpectedly
- WHEN `port.onDisconnect` fires
- THEN the service worker MUST set native host status to `"disconnected"`
- AND attempt reconnection with exponential backoff (max 3 retries)
- AND notify DevTools panel via `NATIVE_HOST_STATUS_CHANGED` message

---

### FR-BG-004: Settings Management (via StoragePort)

The service worker MUST manage extension settings through the `StoragePort` interface (implemented by `ChromeStorageAdapter`).

**Traceability**: Hexagonal — Adapter implements Port; no direct `chrome.storage` calls.

#### Settings Schema

```typescript
interface ExtensionSettings {
  themeMode: 'local' | 'remote';      // Default: 'remote'
  themePath: string;                   // Default: ''
  inspectMode: boolean;                // Default: false
  nativeHost: {
    maxRetries: number;                // Default: 3
    retryDelayMs: number;              // Default: 1000
  };
  schemaVersion: string;               // For migrations
}
```

#### Scenario: Default settings on install

- GIVEN the extension is installed
- WHEN the service worker initializes
- THEN `chrome.storage.local` MUST contain all keys from `ExtensionSettings`
- AND each key MUST have its default value

#### Scenario: Settings migration

- GIVEN the extension is updated from v0.1.0 to v0.2.0
- WHEN a new setting key exists in the defaults but not in storage
- THEN the service worker MUST add the missing key with its default value
- AND existing settings MUST NOT be overwritten

---

### FR-BG-005: Alarm Scheduler

The service worker MUST use `chrome.alarms` for periodic tasks.

| Alarm | Interval | Purpose |
|-------|----------|---------|
| `native-host-health` | 30 seconds | Check native host connectivity |
| `theme-reload-check` | 5 minutes | Poll for theme changes (remote mode) |

#### Scenario: Native host health check

- GIVEN the alarm fires
- WHEN the service worker calls `NativeHostPort.healthCheck()`
- THEN it MUST update internal status
- AND broadcast `NATIVE_HOST_STATUS_CHANGED` to all connected panels

---

### FR-BG-006: Message Routing Table

**Uses message types from `src/shared/messaging.ts` (defined in 07-shared-core.md).**
Import with: `import type { ExtensionMessage } from '@/shared/messaging';`

| Message Type | Route | Handler |
|--------------|-------|---------|
| `PAGE_DETECTED` | Content → Background | Log + store page type |
| `HOVER_EVENT` | Content → Background | Forward to panel (if connected) |
| `ACTIVATE_INSPECT` | Panel → Background → Content | Relay to content script |
| `DEACTIVATE_INSPECT` | Panel → Background → Content | Relay to content script |
| `SET_MODE` | Panel → Background | Update storage + notify content |
| `RELOAD_THEME` | Panel → Background → Native Host | Dispatch via NativeHostPort |
| `GET_THEME_INFO` | Panel → Background | Return current theme status |
| `NATIVE_COMMAND` | Background → Native Host | Dispatch via NativeHostPort |
| `NATIVE_RESPONSE` | Native Host → Background | Resolve pending promise |
| `NATIVE_NOTIFICATION` | Native Host → Background | Broadcast to panel (watch events) |

---

## Port Implementations (Hexagonal Compliance)

### FR-BG-007: StoragePort Implementation

The background service worker's `ChromeStorageAdapter` MUST implement the **canonical** `StoragePort` interface from `src/shared/ports/StoragePort.ts` (defined in `07-shared-core.md`).

**Canonical Port Interface** (from `src/shared/ports/StoragePort.ts`):

```typescript
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

**Adapter Implementation** (`src/background/ChromeStorageAdapter.ts`):

```typescript
export class ChromeStorageAdapter implements StoragePort {
  async get<T extends keyof StorageSchema>(
    keys: T[],
    area: StorageArea = 'local'
  ): Promise<Pick<StorageSchema, T> | null> {
    try {
      const storage = area === 'sync' ? chrome.storage.sync : 
                      area === 'session' ? chrome.storage.session : chrome.storage.local;
      const result = await storage.get(keys);
      const picked: Partial<StorageSchema> = {};
      let hasAny = false;
      for (const key of keys) {
        if (key in result) {
          picked[key] = result[key];
          hasAny = true;
        }
      }
      return hasAny ? picked as Pick<StorageSchema, T> : null;
    } catch (e) {
      throw new Error(`Storage get failed: ${e}`);
    }
  }

  async set<T extends keyof StorageSchema>(
    data: Pick<StorageSchema, T>,
    area: StorageArea = 'local'
  ): Promise<void> {
    try {
      const storage = area === 'sync' ? chrome.storage.sync :
                      area === 'session' ? chrome.storage.session : chrome.storage.local;
      await storage.set(data);
    } catch (e) {
      throw new Error(`Storage set failed: ${e}`);
    }
  }

  async remove(keys: string[], area: StorageArea = 'local'): Promise<void> {
    try {
      const storage = area === 'sync' ? chrome.storage.sync :
                      area === 'session' ? chrome.storage.session : chrome.storage.local;
      await storage.remove(keys);
    } catch (e) {
      throw new Error(`Storage remove failed: ${e}`);
    }
  }

  async clear(area: StorageArea = 'local'): Promise<void> {
    try {
      const storage = area === 'sync' ? chrome.storage.sync :
                      area === 'session' ? chrome.storage.session : chrome.storage.local;
      await storage.clear();
    } catch (e) {
      throw new Error(`Storage clear failed: ${e}`);
    }
  }

  observe<T extends keyof StorageSchema>(
    key: T,
    callback: (newValue: StorageSchema[T] | null, oldValue?: StorageSchema[T] | null) => void
  ): () => void {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === area && changes[key]) {
        callback(changes[key].newValue ?? null, changes[key].oldValue ?? null);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  async migrate(
    fromVersion: string,
    toVersion: string,
    migrationFn: (oldData: Record<string, unknown>) => Record<string, unknown>
  ): Promise<void> {
    const current = await this.get(['schemaVersion'] as any);
    if (current?.schemaVersion === fromVersion) {
      const allData = await this.get(['mode', 'themePath', 'inspectMode', 'schemaVersion'] as any);
      if (allData) {
        const migrated = migrationFn(allData as Record<string, unknown>);
        await this.set(migrated as any);
      }
    }
  }
}
```

**DI Registration** (in service worker initialization):

```typescript
import { createContainer, createToken } from '@/shared/di';
import { StoragePort } from '@/shared/ports/StoragePort';
import { NativeHostPort } from '@/shared/ports/NativeHostPort';

const container = createContainer();
const StoragePortToken = createToken<StoragePort>('StoragePort');
const NativeHostPortToken = createToken<NativeHostPort>('NativeHostPort');

container.register(StoragePortToken, () => new ChromeStorageAdapter());
container.register(NativeHostPortToken, () => new NativeHostClient());
// MessageRouter receives StoragePort via DI
```

**Traceability**: Hexagonal — Adapter implements Port (SRP, DIP). Background SW is the adapter; StoragePort is the contract.

---

### FR-BG-008: NativeHostPort Implementation

The background service worker's `NativeHostClient` MUST implement the **canonical** `NativeHostPort` interface from `src/shared/ports/NativeHostPort.ts` (defined in `07-shared-core.md`).

**Canonical Port Interface** (from `src/shared/ports/NativeHostPort.ts`):

```typescript
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

**Adapter Implementation** (`src/background/NativeHostClient.ts`):

```typescript
import { NativeHostPort, HealthResult } from '@/shared/ports/NativeHostPort';
import { Result, ok, err, DomainError } from '@/shared/result';
import { createMessage } from '@/shared/messaging';

export class NativeHostClient implements NativeHostPort {
  private port: chrome.runtime.Port | null = null;
  private pending = new Map<string, { resolve: (value: Result<any, DomainError>) => void; reject: (err: DomainError) => void }>();
  private notificationHandler?: (method: string, params: unknown) => void;

  async connect(): Promise<Result<void, DomainError>> {
    try {
      this.port = chrome.runtime.connectNative('com.tiendanube.theme-devtools');
      this.port.onMessage.addListener(this.onMessage.bind(this));
      this.port.onDisconnect.addListener(this.onDisconnect.bind(this));
      return ok(undefined);
    } catch (e) {
      return err({ _tag: 'NativeHostUnavailable', reason: String(e) });
    }
  }

  async disconnect(): Promise<void> {
    this.port?.disconnect();
    this.port = null;
    this.pending.clear();
  }

  async send<T>(command: string, payload: unknown): Promise<Result<T, DomainError>> {
    if (!this.port) {
      return err({ _tag: 'NativeHostUnavailable', reason: 'Not connected' });
    }

    const correlationId = crypto.randomUUID();
    const message = createMessage('NATIVE_COMMAND', { command, payload, correlationId }, 'background');

    return new Promise((resolve) => {
      this.pending.set(correlationId, { resolve: resolve as any, reject: () => {} });
      this.port!.postMessage(message);

      // 30 second timeout
      setTimeout(() => {
        if (this.pending.has(correlationId)) {
          this.pending.delete(correlationId);
          resolve(err({ _tag: 'MessageTimeout', correlationId }));
        }
      }, 30000);
    });
  }

  onNotification(handler: (method: string, params: unknown) => void): void {
    this.notificationHandler = handler;
  }

  async healthCheck(): Promise<Result<HealthResult, DomainError>> {
    return this.send('system.health', {});
  }

  private onMessage(message: any): void {
    // Handle NATIVE_RESPONSE
    if (message.type === 'NATIVE_RESPONSE' && message.payload.correlationId) {
      const { correlationId, result, error } = message.payload;
      const pending = this.pending.get(correlationId);
      if (pending) {
        this.pending.delete(correlationId);
        if (error) {
          pending.resolve(err({ _tag: 'NativeHostError', code: error.code, message: error.message }));
        } else {
          pending.resolve(ok(result));
        }
      }
    }
    // Handle NATIVE_NOTIFICATION (watch events)
    else if (message.type === 'NATIVE_NOTIFICATION' && this.notificationHandler) {
      this.notificationHandler(message.payload.method, message.payload.params);
    }
  }

  private onDisconnect(): void {
    this.port = null;
    // Reject all pending with NativeHostUnavailable
    for (const [, { resolve }] of this.pending) {
      resolve(err({ _tag: 'NativeHostUnavailable', reason: 'Port disconnected' }));
    }
    this.pending.clear();
  }
}
```

**Traceability**: Hexagonal — Adapter implements Port (SRP, DIP). Background SW is the adapter; NativeHostPort is the contract.

---

## Dependencies

| Module | Direction | Purpose |
|--------|-----------|---------|
| `src/shared/messaging.ts` | Imports types | Discriminated message types (canonical) |
| `src/shared/result.ts` | Imports types | Result/Either pattern |
| `src/shared/errors.ts` | Imports types | DomainError types |
| `src/shared/utils.ts` | Imports helpers | Error formatting, logging |
| `src/shared/ports/StoragePort.ts` | **Implements** | Settings persistence contract (canonical) |
| `src/shared/ports/NativeHostPort.ts` | **Implements** | Native host communication contract (canonical) |
| `src/shared/ports/MessagingPort.ts` | Implements | Message routing contract |
| `src/shared/validation.ts` | Imports | Zod schemas for message validation |
| `src/shared/logger.ts` | Imports | Structured logging |
| `src/shared/di.ts` | Uses | DI container for port registration |
| `src/native-host/` | Communicates via port | External system via native messaging |

---

## Non-Functional Requirements

### NFR-BG-001: Service Worker Lifecycle

The service worker MUST NOT rely on persistent state. All state MUST be restored from `chrome.storage.local` on startup.

**Traceability**: MV3 service worker best practices — ephemeral by design.

### NFR-BG-002: Idle Shutdown Handling

The service worker MUST handle Chrome's MV3 idle shutdown (30s after last event) gracefully. On restart, it MUST reinitialize all connections.

### NFR-BG-003: Message Size Limit

Messages through `chrome.runtime.sendMessage` MUST NOT exceed Chrome's 64KB payload limit. The service worker SHALL reject messages exceeding this limit with a descriptive error.

### NFR-BG-004: Bundle Size

- Service Worker bundle **≤ 15 KB gzipped** (enforced in CI via `esbuild --analyze`)

---

## Interface Contracts

```typescript
// Ports managed by the service worker (canonical from shared-core)
import type { StoragePort } from '@/shared/ports/StoragePort';
import type { NativeHostPort, HealthResult } from '@/shared/ports/NativeHostPort';
import type { MessagingPort } from '@/shared/ports/MessagingPort';
import type { ExtensionMessage, DomainError, Result } from '@/shared/messaging';

interface ServiceWorkerPorts {
  panelConnections: Map<string, chrome.runtime.Port>;
  nativePort: chrome.runtime.Port | null;
}

type NativeHostStatus = 'connected' | 'disconnected' | 'unavailable';

interface MessageRouter {
  handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionMessage) => void
  ): boolean;

  handleNativeMessage(message: any): void;
  handlePanelDisconnect(port: chrome.runtime.Port): void;
}
```

---

## Test Scenarios

| ID | Type | Description |
|----|------|-------------|
| T-BG-001 | Unit | `createInitialState()` returns correct default settings |
| T-BG-002 | Unit | Message router dispatches to correct handler by type |
| T-BG-003 | Unit | Unknown message type returns error response |
| T-BG-004 | Unit | Native host reconnection follows exponential backoff formula |
| T-BG-005 | Integration | `onInstalled` event initializes storage |
| T-BG-006 | Integration | Panel port is tracked and removed on disconnect |
| T-BG-007 | Integration | Native host status updates propagate to storage |
| T-BG-008 | E2E | Full message roundtrip: panel → background → native → response |
| T-BG-009 | E2E | Service worker survives idle shutdown and reconnects |

---

## Error Scenarios

| Error | Cause | Behavior |
|-------|-------|----------|
| Native host not installed | User hasn't set up native messaging | Status set to `"unavailable"`, panel shows warning |
| Native host crash | Native process exits unexpectedly | Reconnection with backoff, status `"disconnected"` |
| Message exceeds 64KB | Large payload from panel | Rejected with size error |
| Service worker killed | Chrome terminates idle SW | All state restored from storage on next event |
| Port disconnected (panel closed) | User closes DevTools | Port removed from tracking map, no further messages |

---

## Traceability

| Requirement | Principle | File |
|-------------|-----------|------|
| FR-BG-001 | Hexagonal — Adapter Initialization | `service-worker.ts` |
| FR-BG-002 | Open/Closed — Discriminated Unions | `service-worker.ts`, `messaging.ts` |
| FR-BG-003 | Hexagonal — External System Bridge | `service-worker.ts` |
| FR-BG-004 | Extension Patterns | `service-worker.ts` |
| FR-BG-005 | State Management | `service-worker.ts`, `storage.ts` |
| FR-BG-006 | SRP — Single Store Responsibility | `service-worker.ts`, `storage.ts` |
| **FR-BG-007** | **Hexagonal — Port/Adapter (StoragePort)** | **`ChromeStorageAdapter.ts`** |
| **FR-BG-008** | **Hexagonal — Port/Adapter (NativeHostPort)** | **`NativeHostClient.ts`** |
| NFR-BG-001 | MV3 Best Practices | `service-worker.ts` |
| NFR-BG-002 | MV3 Best Practices | `service-worker.ts` |
| NFR-BG-003 | Chrome Limits | `service-worker.ts` |
| NFR-BG-004 | Performance | `esbuild.config.mjs` |

---

## Files Created in Scaffold

| Path | Purpose |
|------|---------|
| `src/background/service-worker.ts` | Entry point — router, alarms, native host bridge |
| `src/background/MessageRouter.ts` | Routes messages between panel, content, native host |
| `src/background/NativeHostClient.ts` | Adapter for NativeHostPort (canonical) |
| `src/background/ChromeStorageAdapter.ts` | Adapter for StoragePort (canonical) |
| `src/background/alarms.ts` | Theme reload check alarm |
| `src/native-host/manifest.json` | Native messaging host manifest |

---

*End of Background Service Worker Spec*