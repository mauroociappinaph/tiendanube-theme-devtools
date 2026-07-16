# SDD Init Report — tiendanube-theme-devtools

**Generated**: 2026-07-16
**Executor**: sdd-init (Nemotron 3 Super 120B)
**Persistence Mode**: openspec (file-based)

---

## Project

| Field       | Value                          |
|-------------|--------------------------------|
| Name        | tiendanube-theme-devtools      |
| Root        | `/Users/mauroociappina/Desktop/HiHi/ExtensionWebtlp` |
| Repository  | Git initialized (main/develop branches) |
| Description | Chrome DevTools extension for Tienda Nube / Nuvemshop theme development |

## Stack Detection

| Dimension       | Detected                                        |
|-----------------|-------------------------------------------------|
| Platform        | Chrome Extension (Manifest V3)                  |
| Languages       | TypeScript (primary), JavaScript, CSS           |
| Bundler         | Not configured (pending setup)                  |
| Build toolchain | Not configured                                  |
| Package manager | Not configured (expected: npm or pnpm)          |

### Architecture (from README)

```
extension/       # Manifest V3 extension — panel, background, content scripts
native-host/     # Node.js binary (pkg/sea) — runs nube-cli commands
shared/          # TypeScript types shared between all layers
```

### Key Features (Planned)

- Live CSS/JS — Toggle between localhost:3000 and remote theme
- Inspect Mode — Hover → see which `.liquid` file rendered it
- One-click Deploy — Reload via native messaging to nube-cli
- Shortcuts — Cmd+Shift+S → save → push → reload
- Native host for macOS, Windows, Linux

## Testing Capabilities

**Strict TDD Mode**: ❌ Disabled
**Detected**: 2026-07-16

### Test Runner

None detected. No `package.json`, test config, or runner binary found.

### Test Layers

| Layer       | Available | Tool |
|-------------|-----------|------|
| Unit        | ❌        | —    |
| Integration | ❌        | —    |
| E2E         | ❌        | —    |

### Coverage

- Available: ❌
- Command: —

### Quality Tools

| Tool         | Available | Command  |
|--------------|-----------|----------|
| Linter       | ❌        | —        |
| Type checker | ❌        | —        |
| Formatter    | ❌        | —        |

**Note**: All quality tools are TBD. Recommended initial setup: TypeScript `tsc` for type checking, ESLint + Prettier for linting/formatting, Vitest for testing.

## Persistence

- **Mode**: openspec (file-based)
- **OpenSpec directory**: `openspec/`
- **Config**: `openspec/config.yaml`
- **Init report**: `openspec/init-report.md`
- **Skill registry**: `.atl/skill-registry.md`

## Delivery Strategy

- **Execution**: interactive
- **Delivery**: force-chained (chained PRs, stacked-to-main)
- **Review budget**: 400 lines

## Next Steps

1. **Explore** → `/sdd-new` to define the first change (proposal → spec → design → tasks)
2. Setup toolchain: TypeScript, bundler (e.g., esbuild or webpack), linter, formatter
3. Wire up Chrome Extension boilerplate (manifest.json, service worker, content script, DevTools panel)
