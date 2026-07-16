# Native Host Specification

**Change**: `scaffold`
**Spec**: 06-native-host
**Date**: 2026-07-16

---

## Purpose

Define the Node.js native messaging host that bridges the Chrome extension with the Tiendanube CLI (`nube-cli`). The host communicates with the extension via Chrome's native messaging protocol (JSON-RPC 2.0 over stdin/stdout), dispatches commands to `nube-cli`, and returns structured results. The host is bundled as a standalone binary via esbuild targeting Node.js 20+.

---

## Functional Requirements

### FR-NH-001: Native Messaging Protocol Compliance

The host MUST implement Chrome's native messaging protocol:

1. Read messages from `stdin` as 4-byte little-endian message length prefix + UTF-8 JSON body
2. Write messages to `stdout` as 4-byte little-endian length prefix + UTF-8 JSON body
3. Use `stderr` for logging (Chrome ignores stderr from native hosts)
4. Exit with code 0 on clean shutdown, non-zero on error

**Traceability**: Chrome native messaging protocol is mandatory for host communication.

#### Scenario: Host reads a valid message

- GIVEN the host process is running
- WHEN 4 bytes `0x1F 0x00 0x00 0x00` (= 31) are written to stdin followed by a 31-byte JSON string
- THEN the host MUST parse the message as a valid JSON-RPC 2.0 request
- AND NOT exit

#### Scenario: Host writes a response

- GIVEN the host processes a request
- WHEN it needs to send a response
- THEN it MUST write the 4-byte length prefix first, then the JSON body
- AND the response MUST be valid JSON

#### Scenario: Invalid message on stdin

- GIVEN the host receives bytes that do not form valid UTF-8 JSON
- WHEN parsing fails
- THEN the host MUST write a JSON-RPC error response to stdout
- AND log the error to stderr
- AND NOT crash (continue reading next message)

### FR-NH-002: JSON-RPC 2.0 Dispatch

The host MUST implement a JSON-RPC 2.0 dispatcher that routes method calls to command handlers.

**Traceability**: JSON-RPC 2.0 is the standard protocol for native messaging.

#### Scenario: Successful command dispatch

- GIVEN a valid JSON-RPC 2.0 request with method `theme.push`
- WHEN the dispatcher processes it
- THEN it MUST call the `themePush` handler with the `params` object
- AND return a response with the same `id`

#### Scenario: Unknown method

- GIVEN a request with method `unknown.command`
- WHEN the dispatcher processes it
- THEN it MUST return a JSON-RPC error: `{ "code": -32601, "message": "Method not found" }`
- AND the error response MUST use the same `id` as the request

#### Scenario: Invalid params

- GIVEN a request with method `theme.push` but missing required params
- WHEN the handler validates the params
- THEN it MUST return a JSON-RPC error: `{ "code": -32602, "message": "Invalid params" }`
- AND include a details field: `{ "details": "Missing required field: 'filePath'" }`

### FR-NH-003: Command: theme.push

The host MUST support the `theme.push` command to push theme files to a Tiendanube store via `nube-cli`.

#### Scenario: Push single file

- GIVEN the request params include `{ "filePath": "/path/to/theme/sections/product.liquid" }`
- WHEN the host executes `nube-cli theme push sections/product.liquid`
- THEN it MUST return a success response with:
  ```json
  {
    "jsonrpc": "2.0",
    "result": {
      "success": true,
      "command": "nube-cli theme push sections/product.liquid",
      "exitCode": 0,
      "stdout": "...",
      "stderr": "",
      "duration": 1234
    },
    "id": "req-1"
  }
  ```

#### Scenario: Push entire theme

- GIVEN the request params include `{ "themePath": "/path/to/theme", "all": true }`
- WHEN the host executes `nube-cli theme push --all`
- THEN it MUST return the command result with stdout captured

#### Scenario: Push fails

- GIVEN `nube-cli` exits with non-zero code
- WHEN the host captures the exit code
- THEN it MUST set `result.success` to `false`
- AND include `stderr` content in the response
- AND the host MUST NOT crash

### FR-NH-004: Command: theme.preview

The host MUST support the `theme.preview` command to start a preview server.

#### Scenario: Preview starts successfully

- GIVEN the request params include `{ "themePath": "/path/to/theme" }`
- WHEN the host executes `nube-cli theme preview`
- THEN it MUST return:
  ```json
  {
    "jsonrpc": "2.0",
    "result": {
      "success": true,
      "previewUrl": "https://preview.tiendanube.com/...",
      "command": "nube-cli theme preview",
      "exitCode": 0
    },
    "id": "req-2"
  }
  ```

#### Scenario: Preview already running

- GIVEN a preview server is already active
- WHEN the host receives another `theme.preview` request
- THEN it MUST return an error: `{ "code": -32000, "message": "Preview already running" }`

### FR-NH-005: Command: theme.watch

The host MUST support the `theme.watch` command to watch for file changes and auto-push.

#### Scenario: Watch starts

- GIVEN the request params include `{ "themePath": "/path/to/theme" }`
- WHEN the host executes `nube-cli theme watch`
- THEN it MUST return a pending response immediately
- AND notify the extension on file changes via a notification message
- AND stop watching when `theme.watch.stop` is received

#### Scenario: Watch stop

- GIVEN a watch process is running
- WHEN the host receives `{ "method": "theme.watch.stop" }`
- THEN it MUST terminate the watch process (SIGTERM)
- AND return a success response

### FR-NH-006: Health Check

The host MUST provide a `system.health` method for health checks.

#### Scenario: Healthy host

- GIVEN the host is running and responsive
- WHEN a `system.health` request is received
- THEN the host MUST respond with:
  ```json
  {
    "jsonrpc": "2.0",
    "result": {
      "status": "ok",
      "version": "1.0.0",
      "nodeVersion": "v20.12.0",
      "nubeCliAvailable": true,
      "nubeCliVersion": "2.1.0",
      "uptime": 12345
    },
    "id": "req-0"
  }
  ```

#### Scenario: nube-cli not found

- GIVEN `nube-cli` is not installed or not in PATH
- WHEN `system.health` runs
- THEN the host MUST set `nubeCliAvailable` to `false`
- AND include a `warning` field: `"nube-cli not found in PATH. Install via: npm install -g @tiendanube/nube-cli"`

### FR-NH-007: Path Discovery

The host MUST discover the `nube-cli` binary location using the following strategy:

1. Check `process.env.NUBE_CLI_PATH` (explicit override)
2. Check `PATH` for `nube-cli`
3. Check common install locations: `/usr/local/bin/nube-cli`, `~/.nvm/versions/node/*/bin/nube-cli`
4. Return error if not found

#### Scenario: Environment variable override

- GIVEN `process.env.NUBE_CLI_PATH` is set to `/custom/path/nube-cli`
- WHEN the host resolves the binary path
- THEN it MUST use `/custom/path/nube-cli`
- AND NOT search PATH

#### Scenario: PATH discovery

- GIVEN `NUBE_CLI_PATH` is not set
- AND `nube-cli` is in PATH
- WHEN the host resolves the binary path
- THEN it MUST find it via `which nube-cli` or `where nube-cli`
- AND cache the path for subsequent calls

#### Scenario: Not found

- GIVEN `nube-cli` is not installed anywhere
- WHEN the host resolves the path
- THEN all methods that require `nube-cli` MUST return error code `-32001`
- AND the error message MUST include: `"nube-cli not found"`
- AND include installation instructions in the error details

### FR-NH-008: Error Resilience

The host MUST handle errors gracefully without crashing.

#### Scenario: Command timeout

- GIVEN a `nube-cli` command takes longer than 30 seconds
- WHEN the timeout expires
- THEN the host MUST terminate the child process (SIGTERM, then SIGKILL after 5s)
- AND return a timeout error: `{ "code": -32002, "message": "Command timed out after 30s" }`

#### Scenario: Concurrent request handling

- GIVEN two requests arrive simultaneously
- WHEN the first request starts a long-running command
- THEN the second request MUST be queued
- AND processed after the first completes
- AND the host MUST NOT crash

#### Scenario: Invalid JSON on stdin

- GIVEN malformed JSON is written to stdin
- WHEN parsing fails
- THEN the host MUST write a JSON-RPC parse error response
- AND continue reading the next message
- AND log the error to stderr

---

## Non-Functional Requirements

### NFR-NH-001: Binary Size

The bundled native host binary MUST NOT exceed 5MB. The host uses Node.js built-in modules only (`child_process`, `path`, `fs`) plus the JSON-RPC implementation.

**Traceability**: Fully bundled via esbuild — no external dependencies.

### NFR-NH-002: Startup Time

The host MUST be ready to process requests within 500ms of process start. This covers module loading, path discovery, and health state initialization.

### NFR-NH-003: Memory Usage

The idle host process MUST consume no more than 30MB RSS. During active command execution, memory MAY spike to 100MB.

### NFR-NH-004: Platform Support

The bundled host binary MUST run on:
- macOS (arm64, x64) — primary development platform
- Linux (x64) — CI/CD
- Windows is NOT supported (nube-cli may not be available)

---

## Interface Contracts

```typescript
// JSON-RPC 2.0 request received from Chrome
interface NativeHostRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
}

// JSON-RPC 2.0 response sent to Chrome
interface NativeHostResponse {
  jsonrpc: '2.0';
  result?: CommandResult | HealthResult;
  error?: {
    code: number;
    message: string;
    data?: Record<string, unknown>;
  };
  id: string | number | null;
}

// Command execution result
interface CommandResult {
  success: boolean;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number; // ms
  previewUrl?: string; // for theme.preview
}

// Health check result
interface HealthResult {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  nodeVersion: string;
  nubeCliAvailable: boolean;
  nubeCliVersion?: string;
  uptime: number;
  warning?: string;
}

// Native messaging manifest (installed by Chrome)
interface NativeHostManifest {
  name: string;
  description: string;
  path: string;          // Absolute path to host binary
  type: 'stdio';
  allowed_origins: string[];
}

// Supported JSON-RPC method names
type NativeHostMethod =
  | 'system.health'
  | 'theme.push'
  | 'theme.preview'
  | 'theme.watch'
  | 'theme.watch.stop'
  | 'system.shutdown';

// JSON-RPC error codes
const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom codes
  CLI_NOT_FOUND: -32001,
  COMMAND_TIMEOUT: -32002,
  PREVIEW_ALREADY_RUNNING: -32000,
} as const;
```

---

## Dependencies

| Module | Direction | Purpose |
|--------|-----------|---------|
| `src/shared/messaging.ts` | Imports types | Message type alignment (optional — host uses its own JSON-RPC types) |
| `child_process` (Node built-in) | Runtime | Execute `nube-cli` commands |
| `path` (Node built-in) | Runtime | Binary path resolution |
| `fs` (Node built-in) | Runtime | File existence checks, path discovery |
| Chrome native messaging | Protocol | stdin/stdout communication format |

---

## Test Scenarios

| ID | Type | Description | Automation |
|----|------|-------------|------------|
| T-NH-001 | Unit | JSON-RPC dispatcher routes `theme.push` to correct handler | Vitest with mock handlers |
| T-NH-002 | Unit | JSON-RPC dispatcher returns error for unknown method | Vitest |
| T-NH-003 | Unit | JSON-RPC dispatcher returns error for invalid params | Vitest |
| T-NH-004 | Unit | Path discovery checks `NUBE_CLI_PATH` first | Vitest with env mock |
| T-NH-005 | Unit | Path discovery falls back to PATH | Vitest with `which` mock |
| T-NH-006 | Unit | Path discovery returns error when not found | Vitest |
| T-NH-007 | Unit | Stdin reader parses 4-byte length prefix correctly | Vitest with Buffer mock |
| T-NH-008 | Unit | Stdout writer formats 4-byte length prefix correctly | Vitest with Buffer mock |
| T-NH-009 | Unit | Command timeout kills child process after 30s | Vitest with fake timers |
| T-NH-010 | Unit | Health check returns correct version info | Vitest |
| T-NH-011 | Integration | stdin/stdout roundtrip: write request → read response | Vitest with pipe mock |
| T-NH-012 | Integration | `theme.push` executes and returns command result | Vitest with `execFile` mock |
| T-NH-013 | Integration | Concurrent requests are queued correctly | Vitest |
| T-NH-014 | Integration | Invalid JSON on stdin returns parse error | Vitest |
| T-NH-015 | E2E | Host binary starts and responds to health check | Node.js process spawn |
| T-NH-016 | E2E | Host binary executes real `nube-cli theme --version` | Spawn + assert version output |

---

## Error Scenarios

| Error | Cause | Behavior |
|-------|-------|----------|
| Stdin pipe broken | Chrome extension disconnects unexpectedly | Host detects EOF on stdin, exits gracefully with code 0 |
| nube-cli not installed | Developer hasn't installed CLI | All theme commands return `CLI_NOT_FOUND` error with install instructions |
| Command times out | nube-cli hangs on network request | SIGTERM → 5s wait → SIGKILL, returns `COMMAND_TIMEOUT` error |
| Disk full during command | nube-cli tries to write but disk is full | Captures stderr, checks exit code, returns error result |
| Native host manifest invalid | Wrong `allowed_origins` in manifest | Chrome refuses to launch the host; error logged in `chrome://extensions` |
| Multiple instances | User opens DevTools in multiple tabs | Each tab spawns its own host process (Chrome manages lifecycle) |

---

## Traceability

| Requirement | Principle | File |
|-------------|-----------|------|
| FR-NH-001 | Chrome native messaging protocol | `src/native-host/main.ts` (readMessage, writeMessage) |
| FR-NH-002 | JSON-RPC 2.0 | `src/native-host/dispatcher.ts` |
| FR-NH-003 | nube-cli integration | `src/native-host/commands/themePush.ts` |
| FR-NH-004 | nube-cli integration | `src/native-host/commands/themePreview.ts` |
| FR-NH-005 | nube-cli integration | `src/native-host/commands/themeWatch.ts` |
| FR-NH-006 | Health checking | `src/native-host/commands/systemHealth.ts` |
| FR-NH-007 | Path discovery | `src/native-host/discovery.ts` |
| FR-NH-008 | Error resilience | `src/native-host/main.ts` (error boundary) |
| NFR-NH-001 | Bundle size | `esbuild.config.mjs` (fully bundled CJS) |
| NFR-NH-004 | Platform support | `tsconfig.native-host.json` (target `node20`) |
