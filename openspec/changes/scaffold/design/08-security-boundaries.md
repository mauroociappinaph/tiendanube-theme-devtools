# Security Boundaries

**Change**: `scaffold`
**Phase**: design
**Date**: 2026-07-16
**Traceability**: Spec 02 FR-MAN-006..008, Spec 06 FR-NH-003, Spec 08 FR-CC-05

---

## 1. Manifest V3 Permissions

### Declared Permissions (Minimum Viable)

```typescript
// src/manifest.ts
permissions: [
  "storage",         // Persist panel state, settings
  "activeTab",       // Read tab info for theme detection (only when DevTools open)
  "scripting",       // Inject content script programmatically
  "alarms",          // Poll for native host health
  "nativeMessaging", // Communicate with native host
] as const,
```

| Permission | Justification | Risk |
|------------|---------------|------|
| `storage` | Saves panel preferences (theme mode, path) | Low — only local extension data |
| `activeTab` | Detects Tiendanube store tabs | Low — scope limited to active tab when DevTools is open |
| `scripting` | Programmatic content script injection | Medium — restricted to host_permissions domains |
| `alarms` | Native host health polling (30s) | Low — no data access |
| `nativeMessaging` | Bridge to Node.js process | Medium — Chrome validates native host manifest |

### Host Permissions

```typescript
host_permissions: [
  "https://*.tiendanube.com/*",
  "https://*.nuvemshop.com.br/*",
] as const,
```

**Boundary**: Content script only injects on these domains. No other site can be inspected.

### Permission NOT Declared (Explicit Omissions)

| Permission | Reason Omitted |
|------------|----------------|
| `tabs` | Would trigger "Read your browsing history" warning. We use `activeTab` + `scripting` instead |
| `cookies` | Not needed — no auth handling in extension |
| `webRequest` | Not needed — all CLI operations go through native host |
| `<all_urls>` | Would trigger broad site access warning. Scoped to Tiendanube domains only |

---

## 2. Native Host Allowlist

### Chrome Native Messaging Manifest

```json
// src/native-host/manifest.json
{
  "name": "com.tiendanube.theme-devtools",
  "description": "Tienda Nube Theme DevTools native messaging host",
  "path": "host.node.js",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://<EXTENSION_ID>/"
  ]
}
```

| Field | Security Rule |
|-------|---------------|
| `name` | MUST be `com.tiendanube.theme-devtools` — Chrome validates against extension's `permissions` |
| `allowed_origins` | MUST contain the exact extension ID. Only this extension can communicate with this host |
| `path` | MUST be relative to the manifest location. Chrome resolves before spawning |

### Installation Location

- **macOS**: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.tiendanube.theme-devtools.json`
- **Linux**: `~/.config/google-chrome/NativeMessagingHosts/com.tiendanube.theme-devtools.json`
- **Windows**: Registry key `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.tiendanube.theme-devtools`

**Boundary**: Only the Chrome extension with the matching ID can communicate. No other process can connect.

---

## 3. Native Host Path Validation

All paths received from the extension MUST be validated before use.

```typescript
// src/native-host/validate.ts

/** Allowed base directories for theme paths */
const ALLOWED_BASE_PATHS = [
  process.env.HOME + '/tiendanube',
  process.env.HOME + '/Desktop',
  '/tmp/tiendanube',
];

/** Paths cannot contain traversal sequences */
function isTraversal(path: string): boolean {
  return path.includes('..') || path.includes('~');
}

/** Paths must start with an allowed base */
function isAllowedBase(path: string): boolean {
  return ALLOWED_BASE_PATHS.some(base => path.startsWith(base));
}

/** Forbidden characters in CLI arguments */
function hasForbiddenChars(input: string): boolean {
  return /[;&|`$()]/.test(input);
}

/** Max parameter length */
function isWithinMaxLength(input: string, max = 4096): boolean {
  return input.length <= max;
}

interface ValidationResult {
  valid: boolean;
  error?: DomainError;
}
```

### Validation Pipeline

```
Incoming path/param
  → isTraversal()        — Reject if contains ".." or "~"
  → isAllowedBase()      — Reject if not under ALLOWED_BASE_PATHS
  → hasForbiddenChars()  — Reject if contains shell metacharacters
  → isWithinMaxLength()  — Reject if > 4096 chars
  → ✓ Safe to use
```

---

## 4. No Secrets in Extension Bundle

| Secret | Location | Rationale |
|--------|----------|-----------|
| nube-cli API credentials | Native host config (user's system) | Never touches extension bundle |
| Tiendanube store credentials | Native host process env | Transmitted via stdin to nube-cli |
| Native host path | `dist/native-host/manifest.json` | Only the path, not the credential file |
| Extension ID | `src/manifest.ts` | Public by design — visible in Chrome Web Store |

**Rule**: The extension bundle (`dist/extension.zip`) MUST NOT contain:
- API keys
- Authentication tokens
- User credentials
- Private keys

---

## 5. Content Security Policy

```typescript
// src/manifest.ts
content_security_policy: {
  extension_pages: "script-src 'self'; object-src 'self'; style-src 'self';"
},
```

| Directive | Effect |
|-----------|--------|
| `script-src 'self'` | Blocks inline scripts, eval(), remote scripts |
| `object-src 'self'` | Blocks plugins (Flash, Java) |
| `style-src 'self'` | Blocks inline styles (no JSX `style={{}}` in production) |

**Enforcement**: CI pipeline MUST include a CSP validation step.

---

## 6. CLI Execution Security

```typescript
// src/native-host/CliExecutor.ts
import { execFile } from 'child_process';

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

class CliExecutor {
  async execute(command: string, args: string[], timeout: number): Promise<Result<ExecResult, DomainError>> {
    // NEVER use exec/shell — always execFile
    // NEVER pass user input as arguments without validation
    // ALWAYS set timeout to prevent hanging
    // ALWAYS set maxBuffer to prevent memory exhaustion
  }
}
```

| Rule | Rationale |
|------|-----------|
| `execFile` not `exec` | Prevents shell injection — args are passed as array, not interpreted |
| No shell metacharacters | Path validation blocks `;`, `&`, `|`, `` ` ``, `$(` |
| Timeout (30s default) | Prevents hanging on zombie nube-cli processes |
| maxBuffer (1MB) | Prevents memory exhaustion from large output |
| Allowed paths only | `nube-cli` discovered via `PATH` or explicit config |

---

## 7. Threat Surface Summary

| Vector | Exposure | Mitigation |
|--------|----------|------------|
| Malicious extension | None — extension is self-built | Native host `allowed_origins` restricts to specific extension ID |
| Malicious web page | Content script in isolated world | MV3 isolated world, no DOM access to extension internals |
| Command injection | Via theme path params | Path validation + `execFile` (no shell) |
| Path traversal | Via nube-cli arguments | `isTraversal()` + `isAllowedBase()` checks |
| Extension bundle tampering | Build process | CI pipeline verifies bundle integrity |
| Secrets leak | Extension bundle | No credentials in bundle — native host handles all auth |
| CSP bypass | Inline scripts | CSP blocks eval, inline scripts, remote sources |
