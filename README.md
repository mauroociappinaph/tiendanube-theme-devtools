# Tienda Nube Theme DevTools

Chrome DevTools extension for Tienda Nube / Nuvemshop theme development.

## Features (Planned)

- 🔥 **Live CSS/JS** — Toggle between local files (`http://localhost:3000`) and remote theme instantly
- 🎯 **Inspect Mode** — Hover any element → see which `.liquid` file (section/snippet) rendered it
- 🔄 **One-click Deploy** — "Reload Theme" button runs `nube-cli theme push` via Native Messaging
- ⌨️ **Shortcuts** — `Cmd+Shift+S` → save in VS Code → push → reload preview
- 🌐 **Cross-platform** — Native host installer for macOS, Windows, Linux

## Installation (Development)

```bash
# 1. Clone
git clone https://github.com/mauroociappinaph/tiendanube-theme-devtools.git
cd tiendanube-theme-devtools

# 2. Build extension
npm install && npm run build

# 3. Load in Chrome
# chrome://extensions → Developer mode → "Load unpacked" → select ./dist

# 4. Install Native Host (one-time)
npm run install:host
```

## Usage

1. Run `nube-cli theme watch` in your theme folder
2. Open the preview URL (`?theme_installation_id=...`)
3. Open DevTools (F12) → **"🛠 Tienda Nube"** panel
4. Toggle **Local/Remote**, enable **Inspect Mode**, click **Reload Theme**

## Architecture

```
src/
├── manifest.ts                    # Manifest V3 typed (generates manifest.json)
├── background/                    # Adapter: Chrome Service Worker
│   ├── service-worker.ts          # Entry: router, alarms, native host bridge
│   ├── MessageRouter.ts           # Routes panel↔content↔native
│   ├── NativeHostClient.ts        # Adapter for NativeHostPort
│   ├── ChromeStorageAdapter.ts    # Adapter for StoragePort
│   └── alarms.ts                  # Theme reload check alarm
├── devtools/                      # Adapter: DevTools Panel (Preact)
│   ├── devtools.html              # Panel HTML entry
│   ├── devtools.ts                # chrome.devtools.panels.create() registration
│   └── panel/
│       ├── Panel.tsx              # Root Preact component (layout)
│       ├── App.tsx                # Main app with state + message hooks
│       ├── store/
│       │   └── panelStore.ts      # Global reactive store (Preact Signals)
│       ├── components/
│       │   ├── LocalRemoteToggle.tsx
│       │   ├── ReloadThemeButton.tsx
│       │   ├── InspectModeToggle.tsx
│       │   ├── StatusBar.tsx
│       │   └── ErrorBoundary.tsx
│       ├── hooks/
│       │   ├── useChromeRuntime.ts
│       │   ├── useConnectionState.ts
│       │   └── useNativeHostStatus.ts
│       ├── styles.css             # Global styles (CSP-compliant)
│       ├── styles.module.css      # CSS Modules for components
│       └── types.ts               # Panel-specific types
├── content/                       # Adapter: Content Script
│   ├── inspector.ts               # Entry point
│   ├── InspectorController.ts     # Orchestrator + state machine
│   ├── InspectorStateMachine.ts   # State machine: idle→detecting→ready→inspecting→cleaning
│   ├── PageDetector.ts            # Page classification (storefront/admin/checkout/unknown)
│   ├── LiquidMapper.ts            # Pure function: element → LiquidFileMapping
│   ├── HoverHandler.ts            # Throttled hover (150ms), IntersectionObserver, RAF positioning
│   ├── BadgeManager.ts            # Badge injection, positioning, cleanup (interface + impl)
│   ├── SPANavigationHandler.ts    # MutationObserver + history.pushState patching
│   ├── MessageHandler.ts          # Message routing: ACTIVATE/DEACTIVATE_INSPECT, PAGE_DETECTED, HOVER_EVENT
│   └── Throttle.ts                # 150ms debounce utility + RAF helpers
├── native-host/                   # Adapter: Node.js Native Messaging Host
│   ├── main.ts                    # CLI entry: health, push, preview, watch
│   ├── StdioTransport.ts          # Framed stdin/stdout + JSON-RPC 2.0
│   ├── CommandBus.ts              # Handler registry + middleware pipeline
│   ├── config.ts                  # HostConfigSchema (Zod) + loadHostConfig()
│   ├── validate.ts                # Path + arg security validators
│   ├── CliExecutor.ts             # execFile wrapper (timeout, no shell)
│   ├── commands/
│   │   ├── ThemePushCommand.ts
│   │   ├── ThemePreviewCommand.ts
│   │   ├── ThemeWatchCommand.ts
│   │   └── SystemHealthCommand.ts
│   ├── manifest.json              # Native messaging host manifest
│   └── package.json               # Minimal deps (zod only)
├── shared/                        # Domain / Core (zero external deps at runtime)
│   ├── result.ts                  # Result/Either pattern (Ok/Err)
│   ├── errors.ts                  # DomainError discriminated union
│   ├── messaging.ts               # Envelope, Request, Response types (canonical)
│   ├── di.ts                      # Lightweight DI container
│   ├── logger.ts                  # Logger interface + ConsoleLogger/FileLogger/MemoryLogger
│   ├── config.ts                  # ExtensionConfig + HostConfig + loadConfig()
│   ├── messageRegistry.ts         # Central message handler registry
│   ├── command.ts                 # Command pattern interfaces (CQRS-lite)
│   ├── validation.ts              # Zod schemas + validate()
│   ├── storage.ts                 # Chrome storage wrapper (Result-based)
│   ├── utils.ts                   # Pure utilities (debounce, uuid, etc.)
│   ├── ports/
│   │   ├── StoragePort.ts         # Interface for chrome.storage
│   │   ├── MessagingPort.ts       # Interface for chrome.runtime
│   │   └── NativeHostPort.ts      # Interface for native host
│   └── types/
│       └── chrome.d.ts            # Chrome API augmentations
├── domain/                        # Pure domain layer (future)
│   ├── entities/
│   ├── valueObjects/
│   └── services/
├── scripts/
│   ├── build-host.mjs
│   ├── build-zip.mjs
│   └── validate-env.js
└── tests/
    ├── integration/
    └── e2e/
```

The extension follows **Hexagonal Architecture** (Ports & Adapters):
- **shared/** — Domain layer (pure TypeScript, zero runtime deps)
- **background/** — Adapter: Chrome Service Worker (message routing, alarms, native host bridge)
- **devtools/** — Adapter: DevTools Panel (Preact UI with Signals)
- **content/** — Adapter: Content Script (page detection, hover inspection, badge injection)
- **native-host/** — Adapter: Node.js Native Messaging Host (executes nube-cli)

**Bundle Size Budgets** (enforced in CI):
- Service Worker: ≤ 15 KB gzipped
- DevTools Panel: ≤ 50 KB gzipped  
- Content Script: ≤ 10 KB gzipped
- Native Host Binary: ≤ 8 MB

## Branches

- `main` — Stable releases (tagged versions)
- `develop` — Active development, PRs target here

## License

MIT