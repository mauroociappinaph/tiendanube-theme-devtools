# Preact Component Tree — DevTools Panel

**Change**: `scaffold`
**Phase**: design
**Date**: 2026-07-16
**Traceability**: Spec 04 FR-DTP-001..009, FR-DTP-003b, AC-DP-01..14

---

## Component Hierarchy

```
devtools.html                          ← HTML shell, CSP meta, links styles.css
└── <script src="panel/Panel.js">      ← ESM module entry
    └── Panel.tsx                      ← Root Preact component
        └── ErrorBoundary              ← Class component: componentDidCatch, getDerivedStateFromError
            └── App                    ← Layout component
                ├── <header>           ← App header
                │   ├── <h1>Tienda Nube Theme DevTools</h1>
                │   └── <img src="icons/icon16.png">   ← Extension icon
                │
                ├── <section class="connection-status">
                │   └── StatusBar      ← Reacts to panelStore
                │       props: none (reads from store via signals)
                │
                ├── <section class="tools">
                │   ├── LocalRemoteToggle  ← Toggle switch
                │   │   props: none
                │   │   reads: panelStore.themeMode
                │   │   writes: panelStore.setThemeMode(mode)
                │   │   emits: SET_MODE message to background
                │   │
                │   ├── InspectModeToggle  ← Toggle switch
                │   │   props: none
                │   │   reads: panelStore.inspectMode
                │   │   writes: panelStore.setInspectMode(enabled)
                │   │   emits: ACTIVATE_INSPECT / DEACTIVATE_INSPECT
                │   │
                │   └── ReloadThemeButton  ← Button
                │       props: none
                │       reads: panelStore.isLoading (disables while loading)
                │       writes: panelStore.setLoading(true/false)
                │       emits: RELOAD_THEME message
                │
                └── <footer class="status-bar">
                    └── StatusBar      ← Also rendered at bottom
                        reads: panelStore.connected, panelStore.lastReloadResult
```

## Component Props/State Details

### `ErrorBoundary`

```typescript
// Internal state
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Props
interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback: ComponentChildren;
}
```

### `App`

```typescript
// Props: none (stateless layout)
// Internal: delegates all state to panelStore signals
function App(): JSX.Element
```

### `LocalRemoteToggle`

```typescript
// Props: none
// Reads: panelStore.themeMode — signal<'local' | 'remote'>
// Writes: panelStore.setThemeMode(mode) — stores + sends SET_MODE message
// Renders: toggle switch with "Local" / "Remote" labels
function LocalRemoteToggle(): JSX.Element
```

### `InspectModeToggle`

```typescript
// Props: none
// Reads: panelStore.inspectMode — signal<boolean>
// Writes: panelStore.setInspectMode(enabled) — sends ACTIVATE_INSPECT/DEACTIVATE_INSPECT
// Renders: toggle switch with "Inspect" label, disabled icon when off
function InspectModeToggle(): JSX.Element
```

### `ReloadThemeButton`

```typescript
// Props: none
// Reads: panelStore.isLoading — signal<boolean>
// Reads: panelStore.themeMode — to determine local/remote reload
// Writes: panelStore.setLoading(true) before send
// Emits: RELOAD_THEME message via useChromeRuntime hook
// Renders: button with loading spinner state, disabled while isLoading
function ReloadThemeButton(): JSX.Element
```

### `StatusBar`

```typescript
// Props: none
// Reads: panelStore.connected — signal<boolean> (derived from native host status)
// Reads: panelStore.status — signal<string> ("connected" | "disconnected" | "pending")
// Reads: panelStore.error — signal<string | null>
// Reads: panelStore.lastReloadResult — signal<{success:boolean, message:string} | null>
// Renders: status text with color-coded indicator (green/red/yellow)
function StatusBar(): JSX.Element
```

## Signals Store (`panelStore`)

```typescript
// src/devtools/panel/store.ts
import { signal, computed } from '@preact/signals';

export const panelStore = {
  // Signals (mutable reactive state)
  status: signal<'connected' | 'disconnected' | 'pending'>('pending'),
  inspectMode: signal<boolean>(false),
  themeMode: signal<'local' | 'remote'>('local'),
  themePath: signal<string>(''),
  isLoading: signal<boolean>(false),
  error: signal<string | null>(null),
  lastInspected: signal<{ liquidFile: string; confidence: string } | null>(null),
  lastReloadResult: signal<{ success: boolean; message: string; previewUrl?: string } | null>(null),

  // Computed
  connected: computed(() => panelStore.status.value === 'connected'),

  // Actions
  setStatus(status: 'connected' | 'disconnected' | 'pending'): void,
  setInspectMode(enabled: boolean): void,
  setThemeMode(mode: 'local' | 'remote'): void,
  setLoading(loading: boolean): void,
  setError(error: string | null): void,
  setLastInspected(info: { liquidFile: string; confidence: string } | null): void,
  setReloadResult(result: { success: boolean; message: string; previewUrl?: string } | null): void,
};
```

## Hook

```typescript
// src/devtools/panel/hooks/useChromeRuntime.ts

interface UseChromeRuntime {
  sendMessage(message: ExtensionMessage): Promise<unknown>;
  onMessage(handler: (msg: ExtensionMessage) => void): () => void;  // returns unsubscribe
  connect(): void;
  disconnect(): void;
}

function useChromeRuntime(): UseChromeRuntime;
```

## Event Flow

```
User clicks InspectModeToggle
  → panelStore.setInspectMode(true)
    → signal triggers StatusBar re-render (shows "Inspecting...")
    → useChromeRuntime.sendMessage({type:"ACTIVATE_INSPECT"})
      → chrome.runtime.sendMessage → Service Worker → Content Script

Background sends NATIVE_HOST_STATUS_CHANGED
  → useChromeRuntime.onMessage handler fires
    → panelStore.setStatus("connected")
      → signal triggers StatusBar re-render (green indicator)

Background sends THEME_RELOADED
  → useChromeRuntime.onMessage handler fires
    → panelStore.setLoading(false)
    → panelStore.setReloadResult({success:true, message:"Theme reloaded"})
      → signal triggers StatusBar + ReloadThemeButton re-render
```
