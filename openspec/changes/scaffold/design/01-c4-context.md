# C4 Context Diagram — System Context

**Change**: `scaffold`
**Phase**: design
**Date**: 2026-07-16
**Traceability**: Spec 00 FR-ARCH-001, FR-ARCH-002, FR-ARCH-007

---

## System Context (Level 1)

```mermaid
C4Context
  title System Context — Tienda Nube Theme DevTools

  Person(developer, "Theme Developer", "Builds and customizes Tiendanube themes")
  Person(site_visitor, "Store Visitor", "Browses the online store")

  System_Ext(tiendanube_storefront, "Tiendanube Storefront", "Live store running on Tiendanube platform")
  System_Ext(nube_cli, "nube-cli", "Tiendanube CLI tool for theme push/preview/watch")
  System_Ext(chrome_devtools, "Chrome DevTools API", "Built-in DevTools panels API")

  System_Boundary(extension_system, "Tienda Nube Theme DevTools Extension") {
    System(extension, "Chrome Extension (MV3)", "Service worker + DevTools panel + content script")
    System(native_host, "Native Messaging Host", "Node.js process bridging extension to nube-cli")
  }

  Rel(developer, chrome_devtools, "Opens DevTools panel tab", "🛠 Tienda Nube")
  Rel(developer, extension, "Uses panel UI, inspect mode")
  Rel(extension, tiendanube_storefront, "Injects content script on", "HTTPS")
  Rel(extension, native_host, "Sends commands via native messaging", "stdin/stdout JSON-RPC 2.0")
  Rel(native_host, nube_cli, "Executes CLI commands", "child_process.execFile")
  Rel(tiendanube_storefront, site_visitor, "Serves storefront pages")
  Rel(native_host, tiendanube_storefront, "Pushes/previews themes via", "nube-cli proxy")
```

## External Systems

| System | Role | Protocol | Boundaries |
|--------|------|----------|------------|
| **Tiendanube Storefront** | Target environment for theme inspection | HTTPS, DOM inspection | Content script injected only on `*.tiendanube.com` and `*.nuvemshop.com.br` |
| **nube-cli** | CLI tool for theme operations | `child_process.execFile` with timeout | Never direct shell — only `execFile` via `CliExecutor` |
| **Chrome DevTools API** | Panel registration and lifecycle | `chrome.devtools.panels.create` | Panel opens in DevTools context, no cross-origin access |

## Actors

| Actor | Role | Interaction |
|-------|------|-------------|
| **Theme Developer** | Primary user | Opens DevTools panel, inspects elements, reloads themes |
| **Store Visitor** | Indirect | No direct interaction — content script reads DOM passively |

## Key Architectural Rules (from Spec 00)

1. **Adapter isolation**: Each adapter (extension, native-host) knows nothing about the other's internals — only shared port interfaces
2. **Native Host as separate process**: Not a Chrome extension module; standalone Node.js process
3. **Content script isolation**: Runs in isolated world, communicates only via `chrome.runtime.sendMessage`
4. **No secrets in extension bundle**: Native host handles all CLI credentials
