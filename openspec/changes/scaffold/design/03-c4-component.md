# C4 Component Diagram — Components

**Change**: `scaffold`
**Phase**: design
**Date**: 2026-07-16
**Traceability**: Spec 00 FR-ARCH-001..008, Spec 03, Spec 04, Spec 05, Spec 06

---

## Background Service Worker (Adapter)

```mermaid
C4Component
  title Background SW — Component Diagram

  Container_Boundary(bg, "Service Worker") {
    Component(router, "MessageRouter", "TS class", "Routes messages by type discriminant to registered handlers. Uses MessageRegistry from shared")
    Component(nhc, "NativeHostClient", "TS class", "Implements NativeHostPort. Manages chrome.runtime.connectNative port lifecycle")
    Component(csa, "ChromeStorageAdapter", "TS class", "Implements StoragePort. Wraps chrome.storage.local in Result pattern")
    Component(cma, "ChromeMessagingAdapter", "TS class", "Implements MessagingPort. Wraps chrome.runtime.onMessage + sendMessage")
    Component(sw_entry, "service-worker.ts", "Entry", "Initializes container, registers lifecycle listeners, starts alarms")
    Component(alarms, "alarms.ts", "TS module", "Registers 'native-host-health' (30s) and 'theme-reload-check' (5m) alarms")
  }

  Container_Boundary(shared_bg, "Shared Core (injected via DI)") {
    Component(di_bg, "DI Container", "src/shared/di.ts", "Registers StoragePortToken, NativeHostPortToken, MessagingPortToken")
    Component(reg_bg, "MessageRegistry", "src/shared/messageRegistry.ts", "Central handler registry with type-based dispatch")
  }

  Rel(sw_entry, di_bg, "Creates container, registers adapters")
  Rel(router, reg_bg, "Uses for handler dispatch")
  Rel(di_bg, csa, "Resolves StoragePort → ChromeStorageAdapter")
  Rel(di_bg, nhc, "Resolves NativeHostPort → NativeHostClient")
  Rel(di_bg, cma, "Resolves MessagingPort → ChromeMessagingAdapter")
  Rel(router, csa, "Calls for settings persistence")
  Rel(router, nhc, "Forwards commands to native host")
  Rel(router, cma, "Sends responses to panel/content")
  Rel(alarms, nhc, "Periodic health checks via NativeHostPort.healthCheck()")
```

## DevTools Panel (Adapter)

```mermaid
C4Component
  title DevTools Panel — Component Diagram

  Container_Boundary(dtp, "DevTools Panel") {
    Component(html, "devtools.html", "HTML shell", "Minimal HTML with CSP meta, links styles.css, loads Panel.js")
   Component(dts, "devtools.ts", "TS entry", "Calls chrome.devtools.panels.create() with title '🛠 Tienda Nube'")
    Component(panel_root, "Panel.tsx", "Preact component", "Root component — wraps App in ErrorBoundary")
    Component(app, "App.tsx", "Preact component", "Layout: header, connection status, tools section, status bar")
    Component(err_b, "ErrorBoundary", "Preact class", "componentDidCatch + getDerivedStateFromError, renders fallback UI")
    Component(lrt, "LocalRemoteToggle", "Preact component", "Toggle switch for local/remote theme source. Reads/writes panelStore.themeMode")
    Component(rtb, "ReloadThemeButton", "Preact component", "Trigger: sends RELOAD_THEME message. Reads panelStore.isLoading")
    Component(imt, "InspectModeToggle", "Preact component", "Toggle for inspect mode. Sends ACTIVATE_INSPECT/DEACTIVATE_INSPECT")
    Component(sb, "StatusBar", "Preact component", "Reactive status display. Reads panelStore.status, panelStore.connected, panelStore.error")
    Component(store, "panelStore", "Preact signals store", "Global panel state: status, inspectMode, themeMode, themePath, isLoading, error, connected")
    Component(hooks, "useChromeRuntime", "Preact hook", "Abstraction over MessagingPort for Panel. Sends messages, listens for responses")
  }

  Rel(dts, html, "Panel opens in DevTools tab")
  Rel(panel_root, err_b, "Wraps App")
  Rel(app, lrt, "Contains")
  Rel(app, rtb, "Contains")
  Rel(app, imt, "Contains")
  Rel(app, sb, "Contains")
  Rel(lrt, store, "Reads/writes themeMode")
  Rel(rtb, store, "Reads isLoading")
  Rel(imt, store, "Reads/writes inspectMode")
  Rel(sb, store, "Reads status, connected, error reactively")
  Rel(hooks, store, "Updates store on messages from background")
```

## Content Script (Adapter)

```mermaid
C4Component
  title Content Script — Component Diagram

  Container_Boundary(cs, "Content Script") {
    Component(entry, "inspector.ts", "TS entry", "Creates InspectorController, registers lifecycle")
    Component(ctrl, "InspectorController", "TS class", "Orchestrator — wires modules, manages state machine transitions")
    Component(sm, "InspectorStateMachine", "TS class", "State machine: idle → detecting → ready → inspecting → cleaning")
    Component(pd, "PageDetector", "TS module", "Classifies page (storefront/admin_themes/checkout/unknown) via URL + DOM markers")
    Component(lm, "LiquidMapper", "Pure function", "DOM element → LiquidFileMapping (data attributes → heuristics)")
    Component(hh, "HoverHandler", "TS class", "Throttled hover (150ms), IntersectionObserver, RAF positioning")
    Component(bm, "BadgeManager", "Interface + DOMBadgeManager", "Badge injection, positioning, cleanup")
    Component(sph, "SPANavigationHandler", "TS class", "MutationObserver + history.pushState patching for SPA")
    Component(mh, "MessageHandler", "TS module", "Routes: ACTIVATE_INSPECT, DEACTIVATE_INSPECT, PAGE_DETECTED, HOVER_EVENT")
  }

  Rel(entry, ctrl, "Initializes")
  Rel(ctrl, sm, "Manages lifecycle state transitions")
  Rel(ctrl, pd, "Classifies page on load and navigation")
  Rel(ctrl, lm, "Maps hovered element → Liquid file")
  Rel(ctrl, hh, "Registers pointermove handlers")
  Rel(ctrl, bm, "Shows/hides badges")
  Rel(ctrl, sph, "Detects SPA page changes")
  Rel(ctrl, mh, "Routes incoming messages")
```

## Native Host (Adapter)

```mermaid
C4Component
  title Native Host — Component Diagram

  Container_Boundary(nh, "Native Messaging Host") {
    Component(main, "main.ts", "Entry", "CLI: --health, push, preview, watch. Creates CommandBus, registers handlers, starts StdioTransport")
    Component(st, "StdioTransport", "TS class", "Reads/writes framed messages (4-byte LE prefix + JSON-RPC 2.0 body). All logging to stderr")
    Component(cb, "CommandBus", "TS class", "Handler registry + middleware pipeline. dispatch() → Result<T, E>")
    Component(cfg, "config.ts", "TS module", "HostConfigSchema (Zod) + loadHostConfig() + validators")
    Component(val, "validate.ts", "TS module", "Path traversal guard, param length check, forbidden pattern check")
    Component(cli, "CliExecutor", "TS class", "child_process.execFile wrapper — timeout, no shell, max buffer")
    Component(tpc, "ThemePushCommand", "CommandHandler", "Executes nube-cli theme push, returns Result")
    Component(tprc, "ThemePreviewCommand", "CommandHandler", "Executes nube-cli theme preview, returns Result")
    Component(twc, "ThemeWatchCommand", "CommandHandler", "Watches theme dir, emits WATCH_EVENT notifications")
    Component(shc, "SystemHealthCommand", "CommandHandler", "Checks nube-cli availability + permissions + disk space")
  }

  Rel(main, st, "Creates, starts read/write loop")
  Rel(main, cb, "Registers handlers + middleware")
  Rel(cb, tpc, "Routes 'theme.push'")
  Rel(cb, tprc, "Routes 'theme.preview'")
  Rel(cb, twc, "Routes 'theme.watch'")
  Rel(cb, shc, "Routes 'system.health'")
  Rel(cb, cli, "Executes CLI commands via execFile")
  Rel(main, cfg, "Loads and validates config at startup")
  Rel(main, val, "Validates all incoming paths/params")

  UpdateLayoutConfig($c4ShapeInRow="4", $c4BoundaryInRow="2")
```
