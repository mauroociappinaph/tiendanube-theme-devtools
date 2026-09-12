# Sequence Diagrams

**Change**: `scaffold`
**Phase**: design
**Date**: 2026-07-16
**Traceability**: Spec 01 FR-CONF-001..005, Spec 03 FR-BG-001..006, Spec 04 FR-DTP-001..009, Spec 05 FR-CI-001..006, Spec 06 FR-NH-001..006

---

## 1. Build Pipeline (esbuild Multi-Entry)

```mermaid
sequenceDiagram
  participant Dev as Developer
  participant NPM as npm run build
  participant ES as esbuild.config.mjs
  participant FS as Filesystem (dist/)

  Dev->>NPM: npm run build
  NPM->>ES: node esbuild.config.mjs

  par Parallel Entry Build
    ES->>ES: Entry: src/manifest.ts
    ES->>ES: manifestPlugin: serialize → dist/manifest.json
    ES->>FS: Write dist/manifest.json

    ES->>ES: Entry: src/background/service-worker.ts
    ES->>ES: Bundle ESM, target chrome100+
    ES->>FS: Write dist/background/service-worker.js

    ES->>ES: Entry: src/devtools/devtools.html
    ES->>ES: Copy HTML as-is, resolve referenced assets
    ES->>FS: Write dist/devtools/devtools.html

    ES->>ES: Entry: src/devtools/panel/Panel.tsx (via devtools entry)
    ES->>ES: Bundle Preact + JSX → ESM
    ES->>FS: Write dist/devtools/panel/Panel.js
    ES->>FS: Copy panel/styles.css → dist/devtools/panel/styles.css

    ES->>ES: Entry: src/content/inspector.ts
    ES->>ES: Bundle IIFE, format: iife
    ES->>FS: Write dist/content/inspector.js

    ES->>ES: Copy: public/icons/* → dist/icons/*
    ES->>ES: Copy: src/native-host/manifest.json → dist/native-host/manifest.json
  end

  ES-->>NPM: Exit code 0
  NPM-->>Dev: ✅ Build complete
```

**Build:Host** (separate pass):

```mermaid
sequenceDiagram
  participant Dev as Developer
  participant NPM as npm run build:host
  participant ES as esbuild.config.mjs --host

  Dev->>NPM: npm run build:host
  NPM->>ES: node esbuild.config.mjs --host
  ES->>ES: Entry: src/native-host/main.ts
  ES->>ES: Bundle CJS, target node20, external: none
  ES->>FS: Write dist/native-host/host.node.js
  ES-->>NPM: Exit code 0
```

---

## 2. Extension Startup (SW Install → Storage Init → Native Host Connect → Health Alarm)

```mermaid
sequenceDiagram
  participant Ch as Chrome
  participant SW as Service Worker
  participant SA as ChromeStorageAdapter
  participant NHC as NativeHostClient
  participant NH as Native Host

  Ch->>SW: chrome.runtime.onInstalled
  SW->>SW: Log: "[Tiendanube DevTools] Installed v{version}"
  SW->>SW: DI container init: register StoragePort, NativeHostPort, MessagingPort

  SW->>SA: StoragePort.get(['schemaVersion', 'themeMode', 'inspectMode'])
  SA->>Chrome: chrome.storage.local.get()
  Chrome-->>SA: { schemaVersion: "0.1.0", ... } or null
  alt First Install (null)
    SA-->>SW: null
    SW->>SA: StoragePort.set({ schemaVersion: "0.1.0", themeMode: "local", inspectMode: false, ... })
    SA->>Chrome: chrome.storage.local.set(defaults)
  else Existing Install
    SA-->>SW: { schemaVersion: "0.1.0", themeMode: "local", ... }
  end

  SW->>NHC: NativeHostPort.connect()
  NHC->>Chrome: chrome.runtime.connectNative("com.tiendanube.theme-devtools")
  Chrome-->>NH: Spawns native-host process
  NH-->>Chrome: Port established
  Chrome-->>NHC: Port object

  NHC->>NH: Native messaging frame: {"jsonrpc":"2.0","method":"system.health","id":1,"params":{}}
  NH->>NH: SystemHealthCommand: check nube-cli, check permissions
  NH-->>NHC: {"jsonrpc":"2.0","id":1,"result":{"status":"healthy","cli":{"path":"/usr/local/bin/nube","version":"2.1.0"},"timestamp":...}}
  NHC-->>SW: Result<HealthResult>: Ok({ status: "healthy" })

  SW->>Chrome: chrome.alarms.create("native-host-health", { periodInMinutes: 0.5 })
  SW->>Chrome: chrome.alarms.create("theme-reload-check", { periodInMinutes: 5 })
  SW-->>SW: Startup complete. Broadcasting NATIVE_HOST_STATUS_CHANGED
```

---

## 3. Messaging Flow (Panel → Background → Content / Native Host)

```mermaid
sequenceDiagram
  participant Panel as DevTools Panel
  participant SW as Service Worker (MessageRouter)
  participant Content as Content Script
  participant NH as Native Host

  Note over Panel,SW: Panel sends ACTIVATE_INSPECT
  Panel->>SW: chrome.runtime.sendMessage({type:"ACTIVATE_INSPECT",correlationId:"c1",source:"devtools"})
  SW->>SW: MessageRouter.dispatch({type:"ACTIVATE_INSPECT"})
  SW->>Content: chrome.tabs.sendMessage(tabId, {type:"ACTIVATE_INSPECT",correlationId:"c1"})
  Content-->>SW: {type:"ACTIVATE_INSPECT_ACK",correlationId:"c1",payload:{status:"ok"}}
  SW-->>Panel: {type:"ACTIVATE_INSPECT_ACK",correlationId:"c1",payload:{status:"ok"}}

  Note over Panel,NH: Panel sends RELOAD_THEME (async via NativeHostPort)
  Panel->>SW: chrome.runtime.sendMessage({type:"RELOAD_THEME",correlationId:"c2",payload:{themePath:"/themes/main"}})
  SW->>SW: MessageRouter.dispatch({type:"RELOAD_THEME"})
  SW->>NH: Native messaging frame: {"jsonrpc":"2.0","method":"theme.push","id":2,"params":{"themePath":"/themes/main"}}
  NH-->>SW: {"jsonrpc":"2.0","id":2,"result":{"success":true,"message":"Theme pushed"}}
  SW-->>Panel: {type:"THEME_RELOADED",correlationId:"c2",payload:{success:true,message:"Theme pushed"}}
```

**Key**: Every message carries `correlationId` (UUIDv4) for request/response matching. Timeout after 30s → `Err(MessageTimeout)`.

---

## 4. Native Host Handshake (JSON-RPC 2.0 over stdio)

```mermaid
sequenceDiagram
  participant Chrome
  participant NH as Native Host (main.ts)
  participant ST as StdioTransport
  participant CB as CommandBus
  participant Ex as CliExecutor
  participant CLI as nube-cli

  Chrome->>NH: Spawn process with --native-messaging flag

  Note over NH,CLI: Startup Phase
  NH->>NH: Load host config (Zod validated)
  NH->>NH: Register CommandHandlers + default middleware (Logging,Timing,Error)
  NH->>ST: Start read loop on stdin

  Note over Chrome,ST: Health check handshake
  Chrome-->>ST: [4-byte LE len][JSON-RPC frame]
  ST->>ST: readMessage(): parse length prefix, read N bytes, parse JSON
  ST->>CB: dispatch({jsonrpc:"2.0",method:"system.health",id:1,params:{}})
  CB->>CB: Middleware chain: Logging → Timing → ErrorHandler
  CB->>Ex: SystemHealthCommand.exec()
  Ex->>CLI: execFile("nube", ["--version"], {timeout:5000})
  CLI-->>Ex: stdout: "nube-cli 2.1.0"
  Ex-->>CB: Ok({status:"healthy", cli:{path:"/usr/local/bin/nube",version:"2.1.0"}, timestamp:...})
  CB-->>ST: Result<HealthResult>
  ST->>ST: writeMessage(): serialize JSON-RPC response, prefix 4-byte LE len
  ST-->>Chrome: [4-byte LE len][JSON-RPC response frame]

  Note over Chrome,CLI: Error path — command not found
  Chrome-->>ST: {"jsonrpc":"2.0","method":"theme.invalid","id":2,"params":{}}
  ST->>CB: dispatch()
  CB->>CB: CommandNotFound: no handler for "theme.invalid"
  CB-->>ST: Err(CommandNotFound)
  ST-->>Chrome: {"jsonrpc":"2.0","id":2,"error":{"code":-32601,"message":"Command not found: theme.invalid"}}
```

---

## 5. Inspect Mode Activation (Hover → LiquidMapper → BadgeManager → Panel)

```mermaid
sequenceDiagram
  participant Page as Storefront Page
  participant HH as HoverHandler
  participant IC as InspectorController
  participant LM as LiquidMapper
  participant BM as BadgeManager
  participant SW as Service Worker
  participant Panel

  Note over Page,Panel: Inspect mode is ON (state machine: INSPECTING)
  Page->>HH: pointermove event (throttled 150ms)
  HH->>HH: Check IntersectionObserver — element in viewport
  HH->>IC: onElementHover(element)
  IC->>LM: mapElementToLiquidFile(element)
  LM-->>IC: {liquidFile:"sections/product.liquid",confidence:"high",mappingMethod:"data-section-id"}
  IC->>BM: show(mapping, rect)
  BM->>BM: Create/update badge element with file name + confidence icon
  BM-->>Page: Badge visible at element position (RAF positioning)

  IC->>SW: chrome.runtime.sendMessage({type:"HOVER_EVENT",payload:{liquidFile:"sections/product.liquid",confidence:"high",...}})
  SW-->>Panel: Forward HOVER_EVENT to DevTools panel
  Panel->>Panel: Update panelStore.lastInspected

  alt pointerleave or DEACTIVATE_INSPECT
    Page->>HH: pointerleave
    HH->>IC: onElementLeave()
    IC->>BM: hide()
    BM->>BM: Remove badge from DOM
  end
```

---

## 6. Theme Reload (Panel → Background → Native Host → nube-cli → Watch Event → Panel)

```mermaid
sequenceDiagram
  participant Panel as DevTools Panel
  participant SW as Service Worker
  participant NH as Native Host
  participant CLI as nube-cli
  participant Store as Tiendanube Storefront

  Panel->>Panel: User clicks ReloadThemeButton
  Panel->>Panel: panelStore.setLoading(true)
  Panel->>SW: chrome.runtime.sendMessage({type:"RELOAD_THEME",correlationId:"c3",payload:{themePath:"/themes/main"}})

  SW->>SW: MessageRouter.dispatch → NativeHostPort.send("theme.push", {themePath:"/themes/main"})
  SW->>NH: Native msging frame: {"jsonrpc":"2.0","method":"theme.push","id":3,"params":{"themePath":"/themes/main"}}

  NH->>NH: validatePath("/themes/main") → safe
  NH->>CLI: execFile("nube", ["theme", "push", "/themes/main"], {timeout:30000})
  CLI-->>NH: stdout: {"status":"ok","previewUrl":"https://preview.store.com/..."}
  NH-->>SW: {"jsonrpc":"2.0","id":3,"result":{"success":true,"previewUrl":"https://preview.store.com/..."}}

  SW-->>Panel: {type:"THEME_RELOADED",correlationId:"c3",payload:{success:true,previewUrl:"https://preview.store.com/..."}}
  Panel->>Panel: panelStore.setLoading(false)
  Panel->>Panel: panelStore.lastReloadResult = {success:true, previewUrl:"..."}

  Note over CLI,Store: If watch mode, push triggers automatic refresh
  CLI-->>Store: Theme pushed to storefront
```
