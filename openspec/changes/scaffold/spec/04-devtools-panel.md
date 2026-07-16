# DevTools Panel Specification

**Change**: `scaffold`
**Spec**: 04-devtools-panel
**Date**: 2026-07-16

---

## Purpose

Define the DevTools panel — the primary user interface of the extension. The panel consists of an HTML entry point (`devtools.html`), a registration script (`devtools.ts`), a Preact-based UI (`panel/Panel.tsx`), UI components (`panel/components/`), hooks (`panel/hooks/`), and styles (`panel/styles.css`).

---

## Functional Requirements

### FR-DTP-001: Panel Registration

`src/devtools/devtools.ts` MUST register the DevTools panel via `chrome.devtools.panels.create`.

**Traceability**: Extension architecture — DevTools panel adapter.

#### Scenario: Panel tab appears in DevTools

- GIVEN the extension is loaded
- WHEN the user opens Chrome DevTools (F12 or right-click → Inspect)
- THEN a panel tab titled "🛠 Tienda Nube" MUST appear in the DevTools tab bar
- AND the tab icon MUST be the extension's 16px icon

#### Scenario: Panel opens on first click

- GIVEN the "🛠 Tienda Nube" tab exists
- WHEN the user clicks it
- THEN `devtools.html` MUST be loaded as the panel content
- AND the Preact root component MUST mount within 500ms

#### Scenario: Panel loads in side panel

- GIVEN DevTools is in "drawer" (bottom) mode
- WHEN the "🛠 Tienda Nube" tab is selected
- THEN the panel MUST render correctly in the narrower side panel layout
- AND no elements MUST overflow or be clipped

### FR-DTP-002: Panel HTML Shell

`src/devtools/devtools.html` MUST provide a minimal HTML shell:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self';">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="panel/Panel.js"></script>
</body>
</html>
```

**Traceability**: CSP compliance from exploration — inline styles blocked, external CSS used.

#### Scenario: CSP headers present

- GIVEN `devtools.html` is served by DevTools
- WHEN inspecting the `<meta>` CSP tag
- THEN the policy MUST restrict `default-src` to `'self'`
- AND `script-src` MUST be `'self'`
- AND `style-src` MUST allow `'self' 'unsafe-inline'`

### FR-DTP-003: Root Preact Component

`src/devtools/panel/Panel.tsx` MUST be the root Preact component that composes the panel layout and wraps all children in an **Error Boundary**.

**Traceability**: Preact UI framework from exploration decision; Error Boundary for graceful failure handling.

#### Scenario: Panel renders with all sections

- GIVEN the panel mounts
- WHEN inspecting the DOM
- THEN the following sections MUST be present:
  - A header with the extension name "Tienda Nube Theme DevTools"
  - A connection status indicator (connected/disconnected from native host)
  - A tools section with toggle and button components
  - A status bar at the bottom

#### Scenario: Error Boundary catches component errors

- GIVEN any child component throws during render
- WHEN the error occurs
- THEN `ErrorBoundary.tsx` MUST catch the error
- AND render fallback UI: `<div class="panel-error">Panel error — recargá DevTools</div>`
- AND the error MUST be logged via `panelStore.setError()` for error` for reporting

#### Scenario: Empty state on fresh install

- GIVEN the extension is freshly installed
- WHEN the panel opens for the first time
- THEN the status bar MUST show: "Status: Not connected"
- AND the theme path input MUST be empty
- AND inspect mode toggle MUST be off (grey/inactive state)

### FR-DTP-003b: Error Boundary Component

`src/devtools/panel/components/ErrorBoundary.tsx` MUST implement a Preact class component with `componentDidCatch` and `getDerivedStateFromError`.

**Traceability**: SRP — error handling isolated; graceful degradation.

#### Scenario: Error boundary fallback renders

- GIVEN a child component throws during render
- WHEN the error is caught
- THEN the fallback UI MUST render in place of the failed subtree
- AND the rest of the panel MUST remain interactive

**Implementation**:
```tsx
// src/devtools/panel/components/ErrorBoundary.tsx
import { Component, ComponentChildren } from 'preact';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: ComponentChildren; fallback: ComponentChildren }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Log via store for status bar reporting
    panelStore.setError(`Panel error: ${error.message}`);
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render({ children, fallback }: { children: ComponentChildren; fallback: ComponentChildren }) {
    if (this.state.hasError) {
      return <div class="panel-error">{fallback}</div>;
    }
    return children;
  }
}
```

**Usage in Panel.tsx**:
```tsx
// src/devtools/panel/Panel.tsx
import { ErrorBoundary } from './components/ErrorBoundary';
import { App } from './App';

export function Panel() {
  return (
    <ErrorBoundary fallback={<div class="panel-error">Panel error — recargá DevTools</div>}>
      <App />
    </ErrorBoundary>
  );
}
```

**Traceability**: SRP — error handling isolated; graceful degradation per NFR-DTP-001.

### FR-DTP-004: Local/Remote Toggle

`src/devtools/panel/components/LocalRemoteToggle.tsx` MUST render a toggle switch for selecting between local and remote theme sources.

**Traceability**: SRP — one component, one responsibility.

#### Scenario: Toggle defaults to local

- GIVEN the panel loads
- WHEN the toggle renders
- THEN it MUST default to "Local" (development mode)

#### Scenario: Toggle changes propagate

- GIVEN the toggle is set to "Remote"
- WHEN the user clicks it
- THEN it MUST switch to "Local"
- AND the state MUST be persisted via **StoragePort** (via DI)
- AND a message MUST be sent to the background: `{ type: "SET_MODE", payload: { mode: "local" } }`

#### Scenario: Toggle reflects stored state

- GIVEN the user previously set the toggle to "Remote"
- WHEN the panel re-opens
- THEN the toggle MUST render in the "Remote" position
- AND the stored preference MUST be honored

#### StoragePort Alignment (Hexagonal Compliance)

- GIVEN the panel needs to persist theme mode
- WHEN `LocalRemoteToggle` changes mode
- THEN it MUST call `StoragePort.set('themeMode', mode)` via DI container
- AND MUST NOT call `chrome.storage.local.set` directly
- Background service worker's `ChromeStorageAdapter` handles the actual persistence
- This enforces **Hexagonal Architecture** — panel is an adapter, storage logic is in shared port

**Traceability**: Hexagonal (Ports & Adapters) — FR-ARCH-001, FR-ARCH-004; SRP — toggle only handles UI, persistence delegated to port.

### FR-DTP-005: Reload Theme Button

`src/devtools/panel/components/ReloadThemeButton.tsx` MUST render a button that triggers a theme reload.

#### Scenario: Button click triggers reload

- GIVEN the native host is connected
- WHEN the user clicks "Reload Theme"
- THEN a `{ type: "RELOAD_THEME" }` message MUST be sent to the background
- AND the button MUST show a loading spinner (disabled state) for up to 5 seconds
- AND the status bar MUST update: "Reloading theme..."

#### Scenario: Button disabled when not connected

- GIVEN the native host is disconnected
- THEN the "Reload Theme" button MUST be disabled (greyed out)
- AND hovering MUST show tooltip: "Native host not connected"

#### Scenario: Reload succeeds

- GIVEN the native host processes the reload
- WHEN a success response is received
- THEN the button MUST return to active state
- AND the status bar MUST show for 3 seconds: "Theme reloaded successfully"
- AND then return to the default status

#### Scenario: Reload fails

- GIVEN the native host returns an error
- WHEN the error response is received
- THEN the button MUST return to active state
- AND the status bar MUST show: "Reload failed: {error message}" (red text)
- AND the error MUST persist until the user interacts with the panel

### FR-DTP-006: Inspect Mode Toggle

`src/devtools/panel/components/InspectModeToggle.tsx` MUST render a toggle to activate hover-inspect mode on the Tiendanube theme.

#### Scenario: Toggle activates inspect mode

- GIVEN the toggle is off
- WHEN the user clicks it
- THEN a message MUST be sent to the content script: `{ type: "ACTIVATE_INSPECT" }`
- AND the toggle MUST show as active (green/blue highlight)
- AND the status bar MUST show: "Inspect mode active — hover over theme elements"

#### Scenario: Toggle deactivates inspect mode

- GIVEN the toggle is on
- WHEN the user clicks it again
- THEN a message MUST be sent: `{ type: "DEACTIVATE_INSPECT" }`
- AND the toggle MUST show as inactive (grey)
- AND the status bar MUST show: "Inspect mode off"

### FR-DTP-007: Status Bar

`src/devtools/panel/components/StatusBar.tsx` MUST display contextual status information at the bottom of the panel.

**Traceability**: Single Responsibility — status presentation only.

#### Scenario: Status bar states

- GIVEN various extension states
- THEN the status bar MUST display:

| State | Status Text | Color |
|-------|-------------|-------|
| Native host connected + idle | "Ready" | Green |
| Native host disconnected | "Not connected" | Grey |
| Native host not installed | "Native host not found" | Orange |
| Reload in progress | "Reloading theme..." | Blue |
| Reload success | "Theme reloaded successfully" | Green (auto-dismiss 3s) |
| Reload failure | "Reload failed: {error}" | Red |
| Inspect mode active | "Inspect mode active" | Blue |
| Error (general) | "Error: {message}" | Red |

### FR-DTP-008: Runtime Hook

`src/devtools/panel/hooks/useChromeRuntime.ts` MUST provide a Preact hook for communicating with the background service worker.

**Traceability**: DRY — shared hook used by all components.

#### Scenario: Hook returns connection state

- GIVEN the background service worker is running
- WHEN `useChromeRuntime()` is called
- THEN it MUST return `{ connected: true, nativeHostStatus: "connected" }`

#### Scenario: Hook sends messages

- GIVEN a component calls `sendMessage({ type: "GET_THEME_INFO" })`
- WHEN the hook processes it
- THEN it MUST call `chrome.runtime.sendMessage` with the message
- AND return a promise that resolves with the response

#### Scenario: Hook handles disconnection

- GIVEN the background service worker disconnects
- WHEN `useChromeRuntime()` checks the port status
- THEN it MUST set `connected: false`
- AND components consuming the hook MUST re-render with the disconnected state

---

### FR-DTP-009: Global Panel Store (Preact Signals)

`src/devtools/panel/store/panelStore.ts` MUST provide a global reactive store using **Preact Signals** (`@preact/signals`) for shared panel state.

**Traceability**: Solves prop drilling — components share `loading`, `inspectMode`, `themeMode`, `status` without passing props through intermediate layers.

#### Store Interface

```typescript
// src/devtools/panel/store/panelStore.ts
import { signal, computed } from '@preact/signals';

export type NativeHostStatus = 'connected' | 'disconnected' | 'pending' | 'error';
export type ThemeMode = 'local' | 'remote';
export type StatusBarState = 
  | { type: 'ready' }
  | { type: 'disconnected' }
  | { type: 'host_not_found' }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

export const panelStore = {
  // Core state
  nativeHostStatus: signal<NativeHostStatus>('pending'),
  inspectMode: signal<boolean>(false),
  themeMode: signal<ThemeMode>('remote'),
  status: signal<StatusBarState>({ type: 'ready' }),
  
  // Derived state
  isConnected: computed(() => 
    panelStore.nativeHostStatus.value === 'connected' && panelStore.status.value.type !== 'error'
  ),
  
  // Actions
  setLoading(message: string) {
    panelStore.status.value = { type: 'loading', message };
  },
  setSuccess(message: string) {
    panelStore.status.value = { type: 'success', message };
    setTimeout(() => panelStore.status.value = { type: 'ready' }, 3000);
  },
  setError(message: string) {
    panelStore.status.value = { type: 'error', message };
  },
};

// Hook for components
export function usePanelStore() {
  return panelStore;
}
```

#### Scenario: ReloadThemeButton triggers loading state

- GIVEN `ReloadThemeButton` is clicked
- WHEN the reload starts
- THEN `panelStore.setLoading('Recargando tema...')` is called
- AND `StatusBar` immediately shows "Recargando tema..." (reactive)
- AND `ReloadThemeButton` disables (reads `panelStore.status.value.type === 'loading'`)

#### Scenario: InspectModeToggle updates shared state

- GIVEN `InspectModeToggle` is clicked
- WHEN it toggles
- THEN `panelStore.inspectMode.set(true)` is called
- AND `StatusBar` immediately shows "Inspect mode active" (derived from store)

#### Scenario: LocalRemoteToggle persists mode

- GIVEN `LocalRemoteToggle` changes to "local"
- WHEN the toggle updates
- THEN `panelStore.themeMode.set('local')` is called
- AND mode is persisted to `chrome.storage.local`

#### Scenario: Components auto-update on store change

- GIVEN any store signal changes
- WHEN Preact detects the change
- THEN ALL components using `usePanelStore()` re-render automatically
- WITHOUT manual prop passing or context providers

#### Scenario: Store is lightweight

- GIVEN `@preact/signals` is imported
- WHEN bundle size is measured
- THEN the signal overhead MUST be < 1KB gzipped
- AND no additional runtime (like Redux/Zustand) is needed

**Traceability**: Preact ecosystem choice — Signals integrate natively with Preact's reactivity model.

---

## Non-Functional Requirements

### NFR-DTP-001: Panel Load Time

The panel MUST be interactive (Preact root mounted, event listeners active) within 1 second of clicking the tab.

### NFR-DTP-002: Panel Size

The Preact bundle for the panel MUST NOT exceed 50KB gzipped. Preact itself is ~3KB; the component code should account for the rest.

**Traceability**: Preact over React decision from exploration — 37KB savings.

### NFR-DTP-003: CSP Compliance

All styles MUST use **external CSS files** (CSS Modules: `*.module.css`) loaded via `<link rel="stylesheet">` in `devtools.html`.

**Strict CSP** (no `'unsafe-inline'` for styles):
```typescript
// src/manifest.ts
content_security_policy: {
  extension_pages: "script-src 'self'; object-src 'self'; style-src 'self';"
}
```

**Forbidden**:
- Inline `<style>` tags
- `style` attributes on elements (Preact JSX `style={{...}}` compiles to inline styles in dev, MUST be avoided)
- Dynamic `<link>` insertion from JavaScript at runtime

**Required**:
- CSS Modules (`*.module.css`) imported in components → extracted to `dist/devtools/panel/*.css` by esbuild
- `<link rel="stylesheet" href="panel/Component.module.css">` in `devtools.html`
- Production build uses `preact/compat` with CSS extraction (esbuild `cssModules: true`)

**Traceability**: Project policy — Chrome MV3 Security (FR-POL-012), Quality Gates (FR-POL-019).

### NFR-DTP-004: Responsive Layout

The panel MUST be usable at widths from 300px (side panel) to 800px (full DevTools window). Components MUST stack vertically when narrow.

---

## Interface Contracts

```typescript
// Props for each panel component
interface LocalRemoteToggleProps {
  value: 'local' | 'remote';
  onChange: (mode: 'local' | 'remote') => void;
  disabled: boolean;
}

interface ReloadThemeButtonProps {
  onReload: () => Promise<ReloadResult>;
  disabled: boolean;
  nativeHostStatus: NativeHostStatus;
}

interface InspectModeToggleProps {
  active: boolean;
  onToggle: (active: boolean) => void;
  disabled: boolean;
}

interface StatusBarProps {
  status: StatusBarState;
}

type StatusBarState = 
  | { type: 'ready' }
  | { type: 'disconnected' }
  | { type: 'host_not_found' }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

// Return type of useChromeRuntime hook
interface ChromeRuntimeHook {
  connected: boolean;
  nativeHostStatus: NativeHostStatus;
  sendMessage: <T>(message: ExtensionMessage) => Promise<T>;
}
```

---

## Dependencies

| Module | Direction | Purpose |
|--------|-----------|---------|
| `src/shared/messaging.ts` | Imports types | Message type definitions |
| `src/shared/storage.ts` | Imports functions | Settings persistence |
| `src/devtools/devtools.html` | Shell for panel | HTML entry point |
| `preact` | Runtime | UI framework |
| `preact/compat` | Runtime | React compatibility layer |

---

## Test Scenarios

| ID | Type | Description |
|----|------|-------------|
| T-DTP-001 | Unit | Panel renders with all default sections |
| T-DTP-002 | Unit | LocalRemoteToggle maintains state correctly |
| T-DTP-003 | Unit | ReloadThemeButton triggers correct message |
| T-DTP-004 | Unit | InspectModeToggle sends activate/deactivate messages |
| T-DTP-005 | Unit | StatusBar displays all states correctly |
| T-DTP-006 | Unit | useChromeRuntime hook returns correct defaults |
| T-DTP-007 | Integration | All components compose correctly in Panel.tsx |
| T-DTP-008 | Integration | Toggle state persists across re-mounts |
| T-DTP-009 | E2E | Panel loads and is interactive within 1 second |
| T-DTP-010 | E2E | Full message roundtrip: toggle → background → response |

---

## Error Scenarios

| Error | Cause | Behavior |
|-------|-------|----------|
| Background not responding | Service worker not running | Components show "Not connected" status |
| Message timeout | Background doesn't respond in 5s | `sendMessage` rejects with timeout error |
| Storage quota exceeded | Too many settings | `chrome.storage` set fails, caught and logged |
| Invalid panel state | Corrupted storage data | Default settings applied, corrupt data discarded |

---

## Traceability

| Requirement | Principle | File |
|-------------|-----------|------|
| FR-DTP-001 | Extension Architecture | `devtools.ts` |
| FR-DTP-002 | CSP Compliance | `devtools.html` |
| FR-DTP-003 | Hexagonal — UI Adapter | `Panel.tsx` |
| FR-DTP-004 | SRP | `LocalRemoteToggle.tsx` |
| FR-DTP-005 | SRP | `ReloadThemeButton.tsx` |
| FR-DTP-006 | SRP | `InspectModeToggle.tsx` |
| FR-DTP-007 | SRP | `StatusBar.tsx` |
| FR-DTP-008 | DRY | `useChromeRuntime.ts` |
| NFR-DTP-002 | Preact Decision | Panel bundle |
| NFR-DTP-003 | CSP Compliance | `devtools.html`, `styles.css` |
