# Native Host Specification

**Change**: `scaffold`
**Spec**: 06-native-host
**Date**: 2026-07-16

---

## Purpose

Define the Node.js native messaging host that bridges the Chrome extension with the Tiendanube CLI (`nube-cli`). The host communicates with the extension via Chrome's native messaging protocol (stdin/stdout with 4-byte length prefix), **internally uses JSON-RPC 2.0 for command dispatch**, and exposes a clean `NativeHostPort` interface to the Background adapter. The host is bundled as a standalone binary via esbuild targeting Node.js 20+.

**Key Principle**: The **external contract** between Background SW and Native Host is the **canonical `NativeHostPort` interface from `src/shared/ports/NativeHostPort.ts`** (defined in `07-shared-core.md`). JSON-RPC 2.0 is **completely encapsulated inside `StdioTransport`** — Background knows nothing about JSON-RPC.

---

## Architecture (Hexagonal Compliance)

```
┌─────────────────────────────────────────────────────────────────┐
│                    NATIVE HOST (Adapter)                        │
├─────────────────────────────────────────────────────────────────┤
│  StdioTransport          │  JSON-RPC 2.0 (internal only)        │
│  ┌─────────────────────┐ │  ┌─────────────────────────────────┐ │
│  │ readMessage()       │ │  │ CommandBus v2                   │ │
│  │ writeMessage()      │ │  │ ┌─────────────┐ ┌─────────────┐  │ │
│  └──────────┬──────────┘ │  │ │ CommandHandler│ │ Middleware  │  │ │
│             │            │  │ └─────────────┘ └─────────────┘  │ │
│             ▼            │  └─────────────────────────────────┘ │
│  ┌─────────────────────┐ │  ┌─────────────────────────────────┐ │
│  │ CommandDispatcher   │◄─┤  │ Domain Services                 │ │
│  │ (routes JSON-RPC →  │  │  │ ┌─────────────┐ ┌────────────┐ │ │
│  │  CommandHandlers)   │  │  │ │ ThemeService  │ │WatchService │ │
│  └──────────┬──────────┘  │  │ └─────────────┘ └────────────┘ │ │
│             │             │  └─────────────────────────────────┘ │
│             ▼             │  ┌─────────────────────────────────┐ │
│  ┌─────────────────────┐  │  │ Config & Security               │ │
│  │ CommandHandlers     │  │  │ ┌─────────────┐ ┌────────────┐ │ │
│  │ ThemePushHandler    │  │  │ │ HostConfig    │ │ Security   │ │
│  │ ThemePreviewHandler │  │  │ │ (Zod validated)│ │ (path, args)│ │
│  │ ThemeWatchHandler   │  │  │ └─────────────┘ └────────────┘ │ │
│  │ SystemHealthHandler │  │  └─────────────────────────────────┘ │
│  └─────────────────────┘  └─────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## Functional Requirements

### FR-NH-001: Native Messaging Protocol Compliance

The host MUST implement Chrome's native messaging protocol:

1. Read messages from `stdin` as 4-byte little-endian length prefix + UTF-8 JSON body
2. Write messages to `stdout` as 4-byte little-endian length prefix + UTF-8 JSON body
3. Use `stderr` for logging (Chrome ignores stderr from native hosts)
4. Exit with code 0 on clean shutdown, non-zero on error

**Internal Protocol**: JSON-RPC 2.0 over the native messaging framing.

#### Scenario: Host reads a valid message

- GIVEN Chrome extension sends a framed message
- WHEN `StdioTransport.readMessage()` is called
- THEN it parses the 4-byte length, reads exactly that many bytes, parses JSON-RPC
- AND dispatches to `CommandBus`

#### Scenario: Host writes a response

- GIVEN `CommandBus` returns `Result<T>`
- WHEN `StdioTransport.writeMessage()` is called
- THEN it serializes to JSON-RPC 2.0 response, prefixes with 4-byte length, writes to `stdout`

---

### FR-NH-002: Command Bus v2 (Internal)

The host MUST implement a `CommandBus` that:

- Registers `CommandHandler<Command, Result>` by command name
- Supports middleware pipeline (logging, timing, error handling)
- Returns `Result<T>` — **never throws**

```typescript
// src/native-host/commandBus.ts
export interface CommandHandler<C extends Command, R> {
  readonly commandName: string;
  execute(command: C): Promise<Result<R, DomainError>>;
}

export interface Middleware {
  readonly name: string;
  execute<C extends Command, R>(
    command: C,
    next: () => Promise<Result<R, DomainError>>
  ): Promise<Result<R, DomainError>>;
}

export class CommandBus {
  private handlers = new Map<string, CommandHandler<any, any>>();
  private middlewares: Middleware[] = [];

  register<C extends Command, R>(handler: CommandHandler<C, R>): void {
    this.handlers.set(handler.commandName, handler);
  }

  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  async dispatch<C extends Command, R>(
    command: C
  ): Promise<Result<R, DomainError>> {
    const handler = this.handlers.get(command.name);
    if (!handler) {
      return err({ _tag: 'CommandNotFound', command: command.name });
    }

    // Build middleware chain
    const chain = this.middlewares.reduceRight(
      (next, mw) => () => mw.execute(command, next),
      () => handler.execute(command)
    );

    return chain();
  }
}
```

**Default Middlewares** (registered in order):
1. `LoggingMiddleware` — logs command + duration
2. `TimingMiddleware` — adds `executionTimeMs` to result metadata
3. `ErrorHandlingMiddleware` — catches thrown errors, wraps in `Result`

---

### FR-NH-003: Host Configuration (Zod Validated)

All configuration via `HostConfig` — validated at startup with Zod.

```typescript
// src/native-host/config.ts
import { z } from 'zod';

export const HostConfigSchema = z.object({
  // CLI discovery
  cli: z.object({
    path: z.string().optional().describe('Explicit path to nube-cli binary'),
    envVar: z.string().default('NUBE_CLI_PATH').describe('Env var to check first'),
    searchPaths: z.array(z.string()).default([
      '/usr/local/bin',
      '/opt/homebrew/bin',
      process.env.HOME ? `${process.env.HOME}/.nvm/versions/node/*/bin` : '',
    ]).describe('Fallback search paths'),
    timeout: z.number().int().positive().default(30000).describe('Command timeout (ms)'),
    maxRetries: z.number().int().min(0).default(3).describe('Retries for transient failures'),
  }),

  // Watch service
  watch: z.object({
    debounceMs: z.number().int().positive().default(500),
    maxConcurrent: z.number().int().positive().default(2),
    tempDir: z.string().default(() => `${os.tmpdir()}/tiendanube-native-host`),
  }),

  // Security
  security: z.object({
    allowedBasePaths: z.array(z.string()).default([
      process.env.HOME ? `${process.env.HOME}/tiendanube` : '',
      '/tmp/tiendanube',
    ]).describe('Allowed base directories for theme paths'),
    maxParamLength: z.number().int().positive().default(4096),
    forbiddenPatterns: z.array(z.string()).default(['..', ';', '&&', '|', '`', '$(']),
  }),

  // Logging
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    file: z.string().optional(),
    console: z.boolean().default(true),
  }),

  // Advanced
  advanced: z.object({
    ipcBufferSize: z.number().int().positive().default(64 * 1024), // 64KB
    shutdownGracePeriod: z.number().int().positive().default(5000),
  }),
});

export type HostConfig = z.infer<typeof HostConfigSchema>;

// Load with validation
export function loadHostConfig(overrides?: Partial<HostConfig>): HostConfig {
  const raw = {
    cli: {
      path: process.env.NUBE_CLI_PATH,
      envVar: 'NUBE_CLI_PATH',
      searchPaths: ['/usr/local/bin', '/opt/homebrew/bin'],
      timeout: 30000,
      maxRetries: 3,
    },
    watch: { debounceMs: 500, maxConcurrent: 2 },
    security: { allowedBasePaths: [], maxParamLength: 4096, forbiddenPatterns: ['..', ';', '&&', '|', '`', '$('] },
    logging: { level: 'info', console: true },
    advanced: { ipcBufferSize: 64 * 1024, shutdownGracePeriod: 5000 },
  };

  const merged = deepMerge(raw, overrides ?? {});
  const result = HostConfigSchema.safeParse(merged);

  if (!result.success) {
    throw new Error(`Invalid HostConfig: ${result.error.format()}`);
  }

  return result.data;
}
```

**Security Validations** (enforced at startup + per command):

| Validation | Implementation |
|------------|----------------|
| Theme path within allowed base paths | `path.resolve(themePath).startsWith(allowedBasePath)` |
| Path traversal prevention | `path.normalize(themePath)` must not contain `..` |
| Max parameter length | All string params ≤ `security.maxParamLength` |
| Forbidden patterns | Reject params containing `..`, `;`, `&&`, `\|`, `\``, `$(` |
| **Always** `execFile` (never shell) | `child_process.execFile(cmd, args, { shell: false })` |
| Argument sanitization | Args passed as array, never concatenated into string |

---

### FR-NH-004: Command Handlers (Domain Services)

Each command maps to a **Domain Service** — pure business logic, no I/O.

```typescript
// src/domain/services/ThemeService.ts
export class ThemeService {
  constructor(
    private readonly cli: CliExecutor,      // Adapter
    private readonly config: HostConfig,
    private readonly logger: Logger
  ) {}

  async pushTheme(params: ThemePushParams): Promise<Result<ThemePushResult, DomainError>> {
    // 1. Validate theme path (security)
    const pathResult = validateThemePath(params.themePath, this.config.security);
    if (pathResult.isErr()) return pathResult;

    // 2. Execute via CLI
    const cliResult = await this.cli.execute('theme', ['push', '--theme', params.themePath]);
    if (cliResult.isErr()) return cliResult;

    // 3. Parse output
    return ok({ themeId: cliResult.value.themeId, url: cliResult.value.url });
  }

  async previewTheme(params: ThemePreviewParams): Promise<Result<ThemePreviewResult, DomainError>> {
    // ... similar structure
  }
}
```

**Command Definitions** (canonical types from `src/shared/messaging.ts` — see `07-shared-core.md`):

```typescript
// These are the command names used in NativeHostPort.send<T>(command, payload)
// The 'command' parameter maps to these names:
export type NativeCommandName =
  | 'theme.push'
  | 'theme.preview'
  | 'theme.watch'
  | 'system.health';
```

---

### FR-NH-005: Watch Service (Streaming)

Long-running watch with **streaming updates** via native messaging notifications.

```typescript
// src/domain/services/WatchService.ts
export interface WatchEvent {
  readonly type: 'change' | 'error' | 'ready';
  readonly file?: string;
  readonly message?: string;
  readonly timestamp: number;
}

export class WatchService {
  private processes = new Map<string, ChildProcess>();

  async watchTheme(
    themePath: string,
    onEvent: (event: WatchEvent) => void
  ): Promise<Result<{ stop: () => void }, DomainError>> {
    // 1. Validate path
    // 2. Spawn `nube-cli theme watch --theme <path>`
    // 3. Parse stdout lines as JSON events
    // 4. Forward each event via `onEvent`
    // 5. Return `{ stop: () => process.kill() }`
  }

  stopAll(): void {
    this.processes.forEach((p) => p.kill());
    this.processes.clear();
  }
}
```

**Notification Format** (JSON-RPC notification over native messaging):
```json
{
  "jsonrpc": "2.0",
  "method": "watch.event",
  "params": { "type": "change", "file": "sections/product.liquid", "timestamp": 1234567890 }
}
```

---

### FR-NH-006: StdioTransport (JSON-RPC Encapsulation)

```typescript
// src/native-host/StdioTransport.ts
export class StdioTransport {
  private buffer = Buffer.alloc(0);
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // Read framed message from stdin
  async readMessage(): Promise<JsonRpcRequest | null> {
    // 1. Read 4-byte length prefix
    // 2. Read exactly N bytes
    // 3. Parse JSON-RPC 2.0
    // 4. Return request object
  }

  // Write framed response/notification to stdout
  writeMessage(message: JsonRpcResponse | JsonRpcNotification): void {
    const json = JSON.stringify(message);
    const length = Buffer.alloc(4);
    length.writeUInt32LE(json.length, 0);
    process.stdout.write(length);
    process.stdout.write(json);
  }

  // Notifications (watch events, status updates)
  notify(method: string, params: unknown): void {
    this.writeMessage({ jsonrpc: '2.0', method, params });
  }
}
```

**JSON-RPC 2.0 Types**:
```typescript
type JsonRpcRequest = { jsonrpc: '2.0'; id: string | number; method: string; params?: unknown };
type JsonRpcResponse = { jsonrpc: '2.0'; id: string | number; result?: unknown; error?: { code: number; message: string } };
type JsonRpcNotification = { jsonrpc: '2.0'; method: string; params?: unknown };
```

---

### FR-NH-007: Security Hardening

| Control | Implementation |
|---------|----------------|
| **Path traversal** | `path.resolve(userPath).startsWith(allowedBasePath)` + `!normalizedPath.includes('..')` |
| **Arg injection** | Always `execFile(cmd, args, { shell: false })` — args as array |
| **Input sanitization** | Zod schema on all params + `security.forbiddenPatterns` regex |
| **Path allowlist** | Config-driven `security.allowedBasePaths` — rejects anything outside |
| **Max param length** | Reject any string param > `security.maxParamLength` (default 4KB) |
| **Forbidden chars** | Reject params matching `['..', ';', '&&', '\|', '\`', '$(']` |
| **Timeout enforcement** | `child_process.execFile` with `timeout` option + SIGTERM/SIGKILL cascade |
| **Resource limits** | `maxConcurrent` watch processes, `ipcBufferSize` cap |

---

### FR-NH-008: Health Check & Discovery

```typescript
// src/native-host/commands/SystemHealthCommand.ts
export class SystemHealthCommand implements CommandHandler<SystemHealthCommand, HealthResult> {
  readonly commandName = 'system.health';

  async execute(): Promise<Result<HealthResult, DomainError>> {
    const cliPath = await discoverCliPath(this.config);
    const version = await getCliVersion(cliPath);
    const permissions = await checkPermissions(cliPath);

    return ok({
      status: 'healthy',
      cli: { path: cliPath, version },
      permissions,
      timestamp: Date.now(),
    });
  }
}
```

---

## Non-Functional Requirements

### NFR-NH-001: Bundle Size
- **≤ 8 MB** fully bundled (esbuild, CJS target, Node 20 target)

### NFR-NH-002: Startup Latency
- **≤ 500ms** from process spawn to ready for messages

### NFR-NH-003: Cross-Platform
- Binaries for: Linux (x64), macOS (x64 + arm64), Windows (x64)
- `esbuild` with `--platform=node --target=node20`

### NFR-NH-004: Concurrency
- **Max 2 concurrent watch processes** (configurable)
- Command queue for sequential theme pushes

### NFR-NH-005: Graceful Shutdown
- SIGTERM → finish current command → exit(0)
- SIGKILL after `shutdownGracePeriod` (default 5s)

---

## Security Requirements

### SEC-NH-001: No Shell Execution
```typescript
// ALWAYS
await execFile(cliPath, ['theme', 'push', '--theme', themePath], { timeout: 30000, shell: false });

// NEVER
await exec(`nube theme push --theme "${themePath}"`); // ❌ SHELL INJECTION
```

### SEC-NH-002: Path Validation
```typescript
function validateThemePath(input: string, config: HostConfig): Result<string, DomainError> {
  const normalized = path.normalize(input);
  if (normalized.includes('..')) return err({ _tag: 'PathTraversal' });

  const resolved = path.resolve(normalized);
  const allowed = config.security.allowedBasePaths.some((base) =>
    resolved.startsWith(path.resolve(base))
  );
  if (!allowed) return err({ _tag: 'PathNotAllowed', path: resolved });

  if (input.length > config.security.maxParamLength) {
    return err({ _tag: 'ParamTooLong', max: config.security.maxParamLength });
  }
  return ok(resolved);
}
```

### SEC-NH-003: Forbidden Pattern Detection
```typescript
const FORBIDDEN = ['..', ';', '&&', '||', '|', '`', '$(', '>', '<'];
function sanitizeArg(arg: string): Result<string, DomainError> {
  for (const pattern of FORBIDDEN) {
    if (arg.includes(pattern)) return err({ _tag: 'ForbiddenPattern', pattern });
  }
  return ok(arg);
}
```

---

## Interface Contracts

### Canonical NativeHostPort (Shared)

**This is the authoritative external contract** — defined in `src/shared/ports/NativeHostPort.ts` (see `07-shared-core.md`):

```typescript
// src/shared/ports/NativeHostPort.ts
export interface NativeHostPort {
  readonly connect: () => Promise<Result<void, DomainError>>;
  readonly disconnect: () => Promise<void>;
  readonly send<T>(command: string, payload: unknown): Promise<Result<T, DomainError>>;
  readonly onNotification: (handler: (method: string, params: unknown) => void) => void;
  readonly healthCheck: () => Promise<Result<HealthResult, DomainError>>;
}

export interface HealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  cli?: { path: string; version: string };
  permissions?: Record<string, boolean>;
  timestamp: number;
}
```

### Background Adapter (Implements NativeHostPort)

```typescript
// src/background/NativeHostClient.ts
export class NativeHostClient implements NativeHostPort {
  private port: chrome.runtime.Port | null = null;
  private pending = new Map<string, { resolve: (value: Result<any, DomainError>) => void; reject: (err: DomainError) => void }>();
  private notificationHandler?: (method: string, params: unknown) => void;

  async connect(): Promise<Result<void, DomainError>> {
    try {
      this.port = chrome.runtime.connectNative('com.tiendanube.theme-devtools');
      this.port.onMessage.addListener(this.onMessage.bind(this));
      this.port.onDisconnect.addListener(this.onDisconnect.bind(this));
      return ok(undefined);
    } catch (e) {
      return err({ _tag: 'NativeHostUnavailable', reason: String(e) });
    }
  }

  async disconnect(): Promise<void> {
    this.port?.disconnect();
    this.port = null;
    this.pending.clear();
  }

  async send<T>(command: string, payload: unknown): Promise<Result<T, DomainError>> {
    if (!this.port) {
      return err({ _tag: 'NativeHostUnavailable', reason: 'Not connected' });
    }

    const correlationId = crypto.randomUUID();
    const message = { type: 'NATIVE_COMMAND', id: correlationId, command, payload };

    return new Promise((resolve) => {
      this.pending.set(correlationId, { resolve: resolve as any, reject: () => {} });
      this.port!.postMessage(message);

      // 30 second timeout
      setTimeout(() => {
        if (this.pending.has(correlationId)) {
          this.pending.delete(correlationId);
          resolve(err({ _tag: 'MessageTimeout', correlationId }));
        }
      }, 30000);
    });
  }

  onNotification(handler: (method: string, params: unknown) => void): void {
    this.notificationHandler = handler;
  }

  async healthCheck(): Promise<Result<HealthResult, DomainError>> {
    return this.send('system.health', {});
  }

  private onMessage(message: any): void {
    // Handle NATIVE_RESPONSE
    if (message.type === 'NATIVE_RESPONSE' && message.payload.correlationId) {
      const { correlationId, result, error } = message.payload;
      const pending = this.pending.get(correlationId);
      if (pending) {
        this.pending.delete(correlationId);
        if (error) {
          pending.resolve(err({ _tag: 'NativeHostError', code: error.code, message: error.message }));
        } else {
          pending.resolve(ok(result));
        }
      }
    }
    // Handle NATIVE_NOTIFICATION (watch events)
    else if (message.type === 'NATIVE_NOTIFICATION' && this.notificationHandler) {
      this.notificationHandler(message.payload.method, message.payload.params);
    }
  }

  private onDisconnect(): void {
    this.port = null;
    for (const [, { resolve }] of this.pending) {
      resolve(err({ _tag: 'NativeHostUnavailable', reason: 'Port disconnected' }));
    }
    this.pending.clear();
  }
}
```

---

## Test Scenarios

| ID | Type | Description |
|----|------|-------------|
| T-NH-001 | Unit | `StdioTransport` parses 4-byte length + JSON-RPC correctly |
| T-NH-002 | Unit | `CommandBus` dispatches to registered handler |
| T-NH-003 | Unit | `CommandBus` middleware chain executes in order |
| T-NH-004 | Unit | `HostConfigSchema` validates valid/invalid configs |
| T-NH-005 | Unit | `validateThemePath` rejects traversal, allows valid paths |
| T-NH-006 | Unit | `sanitizeArg` rejects forbidden patterns |
| T-NH-007 | Unit | `execFile` called with `shell: false` and args array |
| T-NH-008 | Integration | stdin/stdout roundtrip with JSON-RPC framing |
| T-NH-009 | Integration | `theme.push` executes nube-cli and parses result |
| T-NH-010 | Integration | Watch service emits events via notifications |
| T-NH-011 | E2E | Binary starts, responds to health check |
| T-NH-012 | E2E | Binary executes real `nube-cli theme --version` |

---

## Traceability

| Requirement | Principle | File |
|-------------|-----------|------|
| FR-NH-001 | Chrome native messaging protocol | `StdioTransport.ts` |
| FR-NH-002 | Command Pattern, Middleware | `CommandBus.ts` |
| FR-NH-003 | Configuration as code, Zod | `config.ts` |
| FR-NH-004 | Domain Services, Hexagonal | `ThemeService.ts`, `WatchService.ts` |
| FR-NH-005 | Streaming, AsyncIterator | `WatchService.ts` |
| FR-NH-006 | Encapsulation | `StdioTransport.ts` (JSON-RPC internal) |
| FR-NH-007 | Security by design | `config.ts`, `validateThemePath.ts` |
| SEC-NH-001 | No shell execution | `CliExecutor.ts` |
| SEC-NH-002 | Path validation | `validateThemePath.ts` |
| SEC-NH-003 | Input sanitization | `sanitizeArg.ts` |

---

## Files Created in Scaffold

| Path | Purpose |
|------|---------|
| `src/native-host/main.ts` | Entry point — loads config, builds CommandBus, starts StdioTransport |
| `src/native-host/StdioTransport.ts` | Framed stdin/stdout + JSON-RPC 2.0 |
| `src/native-host/CommandBus.ts` | Handler registry + middleware pipeline |
| `src/native-host/config.ts` | `HostConfigSchema` (Zod) + `loadHostConfig()` |
| `src/native-host/validate.ts` | Path + arg security validators |
| `src/native-host/CliExecutor.ts` | `execFile` wrapper (timeout, no shell) |
| `src/native-host/commands/ThemePushCommand.ts` | Theme push handler |
| `src/native-host/commands/ThemePreviewCommand.ts` | Theme preview handler |
| `src/native-host/commands/ThemeWatchCommand.ts` | Watch handler (streaming) |
| `src/native-host/commands/SystemHealthCommand.ts` | Health check handler |
| `src/native-host/manifest.json` | Native messaging manifest |
| `src/native-host/package.json` | Minimal deps (zod only) |

---

*End of Native Host Spec*