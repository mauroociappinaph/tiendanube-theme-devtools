# Data Models

**Change**: `scaffold`
**Phase**: design
**Date**: 2026-07-16
**Traceability**: Spec 03 FR-BG-004, FR-BG-007, Spec 05 FR-CI-001..002, Spec 06 FR-NH-003, Spec 07, Spec 08 FR-CC-02

---

## ExtensionSettings (Storage Schema)

Canonical storage schema stored in `chrome.storage.local`. Managed exclusively via `StoragePort`.

```typescript
// src/shared/ports/StoragePort.ts (embedded in StorageSchema)
// Canonical source: Spec 03 FR-BG-004

interface ExtensionSettings {
  /** Theme source mode: local filesystem vs remote (nube-cli) */
  themeMode: 'local' | 'remote';

  /** Absolute or relative path to the theme being developed */
  themePath: string;

  /** Whether inspect mode is active on the current page */
  inspectMode: boolean;

  /** Native host connection configuration */
  nativeHost: {
    /** Maximum reconnection attempts on disconnect */
    maxRetries: number;        // Default: 3
    /** Delay between retries in ms */
    retryDelayMs: number;      // Default: 1000
  };

  /** Schema version for migration support */
  schemaVersion: string;       // Default: "0.1.0"
}
```

### Default Values

| Key | Default |
|-----|---------|
| `themeMode` | `"local"` |
| `themePath` | `""` |
| `inspectMode` | `false` |
| `nativeHost.maxRetries` | `3` |
| `nativeHost.retryDelayMs` | `1000` |
| `schemaVersion` | `"0.1.0"` |

### Storage Rules

- All defaults set on `onInstalled` event (fresh install)
- Migrations run on version change (`onInstalled` with `reason: "update"`)
- Partial updates via `StoragePort.set()` (preserves unspecified keys)
- DevTools panel reads/writes via background messages (no direct `chrome.storage`)

---

## ThemeInfo

```typescript
// src/shared/domain/entities/ThemeInfo.ts

interface ThemeInfo {
  /** Current theme identifier from Tiendanube */
  themeId: string;

  /** Theme name (user-facing) */
  name: string;

  /** Active version */
  version: string;

  /** Last modified timestamp */
  lastModified: number;

  /** Whether this theme is currently published */
  isPublished: boolean;

  /** Preview URL if available */
  previewUrl?: string;

  /** Connected store identifier */
  storeId?: string;

  /** Connection status */
  connectionStatus: 'connected' | 'disconnected' | 'error';
}
```

---

## PageDetectionPayload

```typescript
// src/shared/messaging.ts (canonical)
// Spec 05 FR-CI-001

interface PageDetectionPayload {
  /** Classified page type */
  pageType: 'storefront' | 'admin_themes' | 'checkout' | 'unknown';

  /** Confidence level of the classification */
  confidence: 'high' | 'medium' | 'low';

  /** How the page was classified */
  detectionMethod: 'meta_tag' | 'url_pattern' | 'global_var' | 'fallback';

  /** Store identifier from <meta name="nuvemshop-id"> if found */
  nuvemshopId?: string;
}
```

### Detection Method Priority

| Method | Source | Priority |
|--------|--------|----------|
| `meta_tag` | `<meta name="nuvemshop-id">` | Highest |
| `global_var` | `window.Tiendanube` exists | High |
| `url_pattern` | URL matches `*.mitiendanube.com/*` | Medium |
| `fallback` | No indicators found | Low |

---

## HoverEventPayload

```typescript
// src/shared/messaging.ts (canonical)
// Spec 05 FR-CI-002, FR-CI-003

interface HoverEventPayload {
  /** Resolved Liquid file path */
  liquidFile: string;

  /** Confidence of the mapping */
  confidence: 'high' | 'medium' | 'low';

  /** How the mapping was resolved */
  mappingMethod:
    | 'data-liquid-file'
    | 'data-section-id'
    | 'data-block-id'
    | 'heuristic'
    | 'unknown';

  /** Tag name of the hovered element */
  elementTag: string;

  /** CSS classes of the hovered element */
  elementClasses: string[];

  /** Element ID if present */
  elementId?: string;

  /** Bounding rectangle for badge positioning */
  boundingRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}
```

### LiquidFileMapping (Internal — used by LiquidMapper)

```typescript
// src/content/LiquidMapper.ts
// Pure function output, no DOM side effects

interface LiquidFileMapping {
  /** Resolved path to the Liquid file (e.g., "sections/product.liquid") */
  liquidFile: string;

  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';

  /** Resolution method */
  mappingMethod: 'data-liquid-file' | 'data-section-id' | 'data-block-id' | 'heuristic' | 'unknown';

  /** Template type if determinable */
  templateType?: 'section' | 'block' | 'template' | 'snippet';
}
```

---

## HealthResult

```typescript
// src/shared/ports/NativeHostPort.ts (canonical)
// Spec 06 FR-NH-003, FR-NH-006

interface HealthResult {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** CLI information if found */
  cli?: {
    /** Absolute path to nube-cli binary */
    path: string;
    /** Version string from nube-cli --version */
    version: string;
  };

  /** Permission status map */
  permissions?: Record<string, boolean>;

  /** Epoch timestamp of the health check */
  timestamp: number;
}
```

---

## WatchEventPayload

```typescript
// src/shared/messaging.ts (canonical)
// Spec 06 FR-NH-005

interface WatchEventPayload {
  /** Type of watch event */
  type: 'change' | 'error' | 'ready';

  /** Changed file path (for 'change' events) */
  file?: string;

  /** Error or status message */
  message?: string;

  /** Event timestamp */
  timestamp: number;
}
```

---

## ExtensionMessage (Discriminated Union — Complete)

```typescript
// src/shared/messaging.ts
// Canonical source: Spec 07

// All messages carry:
interface BaseMessage {
  correlationId: string;   // UUIDv4
  timestamp: number;       // Date.now()
  source?: 'content' | 'background' | 'devtools' | 'native-host';
}

// Full discriminated union:
type ExtensionMessage =
  // Content → Background
  | (BaseMessage & { type: 'PAGE_DETECTED'; payload: PageDetectionPayload })
  | (BaseMessage & { type: 'HOVER_EVENT'; payload: HoverEventPayload })

  // DevTools → Background → Content
  | (BaseMessage & { type: 'ACTIVATE_INSPECT'; payload?: undefined })
  | (BaseMessage & { type: 'DEACTIVATE_INSPECT'; payload?: undefined })

  // DevTools → Background
  | (BaseMessage & { type: 'SET_MODE'; payload: { mode: 'local' | 'remote' } })
  | (BaseMessage & { type: 'RELOAD_THEME'; payload: { themePath?: string } })
  | (BaseMessage & { type: 'GET_THEME_INFO'; payload?: undefined })

  // Background → DevTools
  | (BaseMessage & { type: 'THEME_RELOADED'; payload: { success: boolean; message: string; previewUrl?: string } })
  | (BaseMessage & { type: 'THEME_INFO'; payload: ThemeInfo })
  | (BaseMessage & { type: 'NATIVE_HOST_STATUS_CHANGED'; payload: { status: 'connected' | 'disconnected' | 'pending' } })

  // Background ↔ Native Host
  | (BaseMessage & { type: 'NATIVE_COMMAND'; payload: { command: string; payload: unknown } })
  | (BaseMessage & { type: 'NATIVE_RESPONSE'; payload: { result?: unknown; error?: unknown } })
  | (BaseMessage & { type: 'NATIVE_NOTIFICATION'; payload: { method: string; params: unknown } })

  // Native Host → Background (watch events)
  | (BaseMessage & { type: 'WATCH_EVENT'; payload: WatchEventPayload });
```

---

## Data Flow Summary

```
Storage (chrome.storage.local)
└── ExtensionSettings (themeMode, themePath, inspectMode, nativeHost, schemaVersion)

Content Script → Background (via MessagingPort)
└── PageDetectionPayload, HoverEventPayload

DevTools Panel ↔ Background (via MessagingPort)
└── ACTIVATE_INSPECT, DEACTIVATE_INSPECT, SET_MODE, RELOAD_THEME, GET_THEME_INFO
└── THEME_RELOADED, THEME_INFO, NATIVE_HOST_STATUS_CHANGED

Native Host → Background (via NativeHostPort)
└── HealthResult, WatchEventPayload
└── Internal: JSON-RPC 2.0 request/response/results
```
