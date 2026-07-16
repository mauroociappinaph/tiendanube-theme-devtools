# Manifest Specification

**Change**: `scaffold`
**Spec**: 02-manifest
**Date**: 2026-07-16

---

## Purpose

Define the typed Manifest V3 definition for the Tienda Nube Theme DevTools extension. The manifest is generated from TypeScript source (`src/manifest.ts`) rather than written as a static JSON file, providing type safety, version synchronization, and environment-conditional fields.

---

## Functional Requirements

### FR-MAN-001: Typed Manifest Definition

`src/manifest.ts` MUST export a typed manifest object as the default export. The type definition MUST extend `chrome.runtime.ManifestV3` to inherit all standard fields while adding project-specific constraints.

**Traceability**: TypeScript strict mode — no raw JSON objects.

#### Scenario: Default export is typed

- GIVEN `src/manifest.ts` is loaded
- WHEN inspecting its default export
- THEN the export MUST satisfy the `ChromeExtensionManifest` interface
- AND assigning an invalid field (e.g., `manifest_version: 2`) MUST cause a type error

#### Scenario: Version sync

- GIVEN `src/manifest.ts` reads `version` from `package.json`
- WHEN the manifest is generated
- THEN `manifest.json`'s `version` field MUST equal `package.json`'s `version`
- AND updating `package.json`'s version MUST automatically update the manifest

### FR-MAN-002: Required Manifest Fields

The generated `manifest.json` MUST contain:

| Field | Value | Rationale |
|-------|-------|-----------|
| `manifest_version` | `3` | MV3 requirement |
| `name` | `"Tienda Nube Theme DevTools"` | Product name |
| `version` | From `package.json` | Auto-synced |
| `description` | `"Chrome DevTools extension for Tienda Nube theme development"` | Chrome Web Store required |
| `devtools_page` | `"devtools/devtools.html"` | Panel registration |
| `background` | `{ "service_worker": "background/service-worker.js", "type": "module" }` | MV3 service worker |
| `permissions` | `["storage", "nativeMessaging", "alarms"]` | Minimum required |
| `host_permissions` | `["https://*.tiendanube.com/*", "https://*.nuvemshop.com.br/*"]` | Tiendanube domains |
| `content_scripts` | One entry for `src/content/inspector.ts` | Inspection mode |
| `icons` | `{ "16": ..., "48": ..., "128": ... }` | Extension icons |

#### Scenario: Required fields present

- GIVEN `npm run build` completes
- WHEN parsing `dist/manifest.json`
- THEN all fields from the table above MUST be present
- AND each field MUST have a non-null, non-empty value

#### Scenario: Invalid permissions

- GIVEN `src/manifest.ts` adds `"clipboardRead"` permission
- WHEN TypeScript checks the manifest
- THEN the type system MUST allow it (valid MV3 permission)
- WHEN Chrome loads the extension
- THEN the permission MUST appear in `chrome://extensions` details

### FR-MAN-003: Background Service Worker Config

The `background` field MUST specify:

```json
{
  "service_worker": "background/service-worker.js",
  "type": "module"
}
```

`"type": "module"` is REQUIRED for MV3 service workers that use ES module syntax (esbuild outputs ESM).

#### Scenario: Service worker module type

- GIVEN `dist/manifest.json` is generated
- WHEN inspecting the `background` field
- THEN `"type": "module"` MUST be present
- AND `"service_worker"` MUST be a relative path under `dist/`

#### Scenario: Missing service worker file

- GIVEN `dist/background/service-worker.js` is deleted
- WHEN Chrome loads the extension
- THEN `chrome://extensions` MUST show a warning: "Service worker registration failed"
- AND the extension MUST be disabled until the file is restored

### FR-MAN-004: DevTools Page

The `devtools_page` field MUST point to `"devtools/devtools.html"`.

#### Scenario: DevTools panel loads

- GIVEN the extension is loaded in Chrome
- WHEN the user opens DevTools
- THEN a panel tab titled "🛠 Tienda Nube" MUST appear
- AND clicking the tab MUST load the page at `devtools/devtools.html`

### FR-MAN-005: Content Script Configuration

The content script entry MUST specify:

| Field | Value |
|-------|-------|
| `matches` | `["https://*.tiendanube.com/*", "https://*.nuvemshop.com.br/*"]` |
| `js` | `["content/inspector.js"]` |
| `run_at` | `"document_idle"` |
| `all_frames` | `false` |

#### Scenario: Content script injects on Tiendanube

- GIVEN the extension is loaded
- WHEN navigating to `https://store.tiendanube.com/admin/themes/123`
- THEN `content/inspector.js` MUST be injected
- AND `window.__TIENDANUBE_DEVTOOLS__` MUST be `true`

#### Scenario: Content script does NOT inject on other sites

- GIVEN the extension is loaded
- WHEN navigating to `https://example.com`
- THEN `content/inspector.js` MUST NOT be injected
- AND `window.__TIENDANUBE_DEVTOOLS__` MUST be `undefined`

### FR-MAN-006: Permissions Declaration

The extension MUST declare the minimum viable set of permissions:

```typescript
permissions: [
  "storage",         // Persist panel state, settings
  "nativeMessaging", // Communicate with native host
  "alarms",          // Poll for native host health
] as const,
```

#### Scenario: Extra permission triggers warning

- GIVEN `src/manifest.ts` adds `"tabs"` permission
- WHEN Chrome loads the extension
- THEN `chrome://extensions` MUST show "Read your browsing history" warning
- AND the user MUST accept before the extension activates

### FR-MAN-007: Host Permissions

```typescript
host_permissions: [
  "https://*.tiendanube.com/*",
  "https://*.nuvemshop.com.br/*",
] as const,
```

#### Scenario: Adding a new domain

- GIVEN a new store domain is added to `host_permissions`
- WHEN the extension is rebuilt and reloaded
- THEN Chrome MUST request new host permission approval from the user

---

## Non-Functional Requirements

### NFR-MAN-001: Manifest Schema Validity

The generated `manifest.json` MUST pass Chrome's internal schema validation. An invalid manifest MUST cause Chrome to refuse loading the extension with a descriptive error.

**Traceability**: MV3 compliance from exploration.

### NFR-MAN-002: Deterministic Generation

Two consecutive builds with the same source MUST produce identical `manifest.json` content (except the `key` field, which is environment-specific).

### NFR-MAN-003: Version Format

The `version` field MUST follow semver (`MAJOR.MINOR.PATCH`) with numeric-only parts. Prerelease tags (`-alpha`, `-beta`) MUST be stripped during build to comply with Chrome Web Store requirements.

---

## Interface Contracts

```typescript
// src/shared/types/manifest.ts — type for the manifest generator
interface ChromeExtensionManifest {
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  devtools_page: string;
  background: {
    service_worker: string;
    type: 'module';
  };
  permissions: readonly string[];
  host_permissions: readonly string[];
  content_scripts: readonly Array<{
    matches: readonly string[];
    js: readonly string[];
    run_at: 'document_idle' | 'document_start' | 'document_end';
    all_frames: boolean;
  }>;
  icons: {
    16: string;
    48: string;
    128: string;
  };
  key?: string;          // Only in development builds
  minimum_chrome_version?: string;  // Optional
}

// Helper to create a typed manifest with auto-versioning
function defineManifest(
  manifest: ChromeExtensionManifest,
  packageVersion: string
): ChromeExtensionManifest;
```

---

## Dependencies

| Dependency | Direction | Purpose |
|-----------|-----------|---------|
| `package.json` | `manifest.ts` imports `version` | Version sync |
| `esbuild.config.mjs` | Calls `manifestPlugin` | Generation trigger |
| `src/shared/types/chrome.d.ts` | Provides `chrome.runtime.ManifestV3` | Type inheritance |

---

## Test Scenarios

| ID | Type | Description |
|----|------|-------------|
| T-MAN-001 | Unit | `defineManifest()` returns valid object with all required fields |
| T-MAN-002 | Unit | Version is correctly extracted from `package.json` |
| T-MAN-003 | Unit | Production build strips `key` field |
| T-MAN-004 | Unit | Dev build includes `key` field |
| T-MAN-005 | Integration | Generated `manifest.json` passes Chrome schema validation |
| T-MAN-006 | Integration | Invalid permission causes type error |
| T-MAN-007 | E2E | Extension loads in Chrome with correct manifest details |

---

## Error Scenarios

| Error | Cause | Behavior |
|-------|-------|----------|
| Missing `devtools.html` | File not copied to dist | Chrome DevTools tab shows 404 |
| Invalid `version` | Non-numeric segment in version | Build fails during manifest generation |
| Missing `name` | Empty string in manifest | Chrome shows "Extension" as name |
| Permission prompt rejected | User declines host_permissions | Content script doesn't inject |
| `service_worker` path wrong | Typo in filename | Chrome shows SW registration error |

---

## Traceability

| Requirement | Principle | File |
|-------------|-----------|------|
| FR-MAN-001 | TypeScript Strict | `src/manifest.ts` |
| FR-MAN-002 | MV3 Compliance | `src/manifest.ts` |
| FR-MAN-003 | Hexagonal (Adapter) | Background adapter config |
| FR-MAN-004 | Extension Architecture | DevTools panel entry |
| FR-MAN-005 | Content Script Pattern | Content injection |
| FR-MAN-006 | Security — Least Privilege | Permissions declaration |
| FR-MAN-007 | Security — Host Control | Host permissions scoping |
| NFR-MAN-001 | Deterministic Builds | Manifest generation plugin |
| NFR-MAN-002 | CI/CD Readiness | Build reproducibility |
