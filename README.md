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
git clone https://github.com/<org>/tiendanube-theme-devtools.git
cd tiendanube-theme-devtools

# 2. Build extension (coming soon)
npm install && npm run build

# 3. Load in Chrome
# chrome://extensions → Developer mode → "Load unpacked" → select ./extension/dist

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
extension/       # Manifest V3 DevTools extension (panel, background, content)
native-host/     # Node.js binary (pkg/sea) — runs nube-cli commands
shared/          # TypeScript types shared between both
```

## Branches

- `main` — Stable releases (tagged versions)
- `develop` — Active development, PRs target here

## License

MIT