# Background Service Worker Specification

**Change**: `scaffold`
**Spec**: 03-background-service-worker
**Date**: 2026-07-16

---

## Purpose

Define the service worker skeleton that acts as the central message broker for the extension. The service worker (`src/background/service-worker.ts`) handles message routing between the DevTools panel, content script, and native messaging host, plus manages alarms and extension lifecycle events.

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

### FR-BG-002: Message Router

The service worker MUST implement a message router that:

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

### FR-BG-003: Native Messaging Bridge

The service worker MUST manage a connection to the native host via `chrome.runtime.connectNative`.

**Traceability**: Hexagonal — Native host is an external system, service worker is the adapter.

#### Scenario: Native host connects

- GIVEN the native messaging host is installed
- WHEN the service worker calls `chrome.runtime.connectNative("com.tiendanube.theme-devtools")`
- THEN a `Port` object MUST be created
- AND the service worker MUST store the port reference
- AND MUST listen for `port.onDisconnect` to detect crashes

#### Scenario: Native host is not installed

- GIVEN the native host is NOT installed
- WHEN `chrome.runtime.connectNative` is called
- THEN `chrome.runtime.lastError` MUST be set
- AND the service worker MUST log: `[Tiendanube DevTools] Native host not found`
- AND MUST set `nativeHostStatus` to `"unavailable"` in storage

#### Scenario: Native host disconnects unexpectedly

- GIVEN the native host crashes
- WHEN `port.onDisconnect` fires
- THEN the service worker MUST log the disconnection
- AND MUST attempt to reconnect with exponential backoff (1s, 2s, 4s, max 30s)
- AND MUST update `nativeHostStatus` to `"disconnected"`

### FR-BG-004: Alarm Management

The service worker MUST register an alarm to periodically check native host health.

**Traceability**: Extension patterns — alarms for background tasks.

#### Scenario: Health check alarm registered

- GIVEN the service worker starts
- WHEN `chrome.alarms.create` is called
- THEN an alarm named `"native-host-health"` MUST be created
- AND it MUST fire every 30 seconds

#### Scenario: Health check alarm fires

- GIVEN the `"native-host-health"` alarm fires
- WHEN the native host is connected
- THEN the service worker MUST send a `{ type: "PING" }` message via the native port
- AND expect a `{ type: "PONG" }` response within 5 seconds
- AND update `nativeHostStatus` accordingly

### FR-BG-005: Panel Connection Tracking

The service worker MUST track open DevTools panel connections via `chrome.runtime.onConnect`.

#### Scenario: Panel connects

- GIVEN a DevTools panel opens
- WHEN `chrome.runtime.onConnect` fires with `sender.tab.id` matching DevTools
- THEN the service worker MUST add the port to an internal `panelConnections` map
- AND MUST listen for `port.onDisconnect` to remove it

#### Scenario: Multiple panels

- GIVEN two DevTools windows are open
- WHEN both panels connect
- THEN the service worker MUST maintain two separate port entries
- AND messages from one panel MUST NOT be sent to the other

### FR-BG-006: Storage Sync

The service worker MUST initialize and manage default settings in `chrome.storage.local`.

```typescript
interface ExtensionSettings {
  inspectModeEnabled: boolean;      // Default: false
  themePath: string;                // Default: ""
  autoReload: boolean;              // Default: false
  nativeHostStatus: 'connected' | 'disconnected' | 'unavailable';  // Default: 'unavailable'
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

## Non-Functional Requirements

### NFR-BG-001: Service Worker Lifecycle

The service worker MUST NOT rely on persistent state. All state MUST be restored from `chrome.storage.local` on startup.

**Traceability**: MV3 service worker best practices — ephemeral by design.

### NFR-BG-002: Idle Shutdown Handling

The service worker MUST handle Chrome's MV3 idle shutdown (30s after last event) gracefully. On restart, it MUST reinitialize all connections.

### NFR-BG-003: Message Size Limit

Messages through `chrome.runtime.sendMessage` MUST NOT exceed Chrome's 64KB payload limit. The service worker SHALL reject messages exceeding this limit with an descriptive error.

---

## Interface Contracts

```typescript
// Ports managed by the service worker
interface ServiceWorkerPorts {
  panelConnections: Map<string, chrome.runtime.Port>;
  nativePort: chrome.runtime.Port | null;
}

// Native host health status
type NativeHostStatus = 'connected' | 'disconnected' | 'unavailable';

// Service worker is the message router — it receives all messages
// and dispatches to the appropriate handler.
interface MessageRouter {
  handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionMessage) => void
  ): boolean;  // true = async, false = sync

  handleNativeMessage(message: NativeMessage): void;
  handlePanelDisconnect(port: chrome.runtime.Port): void;
}
```

---

## Dependencies

| Module | Direction | Purpose |
|--------|-----------|---------|
| `src/shared/messaging.ts` | Imports types | Discriminated message types |
| `src/shared/storage.ts` | Imports functions | Settings persistence |
| `src/shared/utils.ts` | Imports helpers | Error formatting, logging |
| `src/native-host/` | Communicates via port | External system via native messaging |

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
| FR-BG-005 | State Management | `service-worker.ts` |
| FR-BG-006 | SRP — Single Store Responsibility | `service-worker.ts`, `storage.ts` |
| NFR-BG-001 | MV3 Best Practices | `service-worker.ts` |
