// src/shared/logger.ts
// Structured logging interface + transports

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;      // ISO 8601
  readonly correlationId?: string;
  readonly context: string;        // module name
  readonly metadata?: Record<string, unknown>;
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, error?: Error, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

// ---------- ConsoleLogger (extension contexts) ----------
export class ConsoleLogger implements Logger {
  constructor(
    private readonly context: string,
    private readonly bindings: Record<string, unknown> = {}
  ) {}

  private log(level: LogLevel, msg: string, meta?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message: msg,
      timestamp: new Date().toISOString(),
      context: this.context,
      metadata: { ...this.bindings, ...meta, ...(error ? { error: error.message, stack: error.stack } : {}) },
    };
    // eslint-disable-next-line no-console
    console[level](`[${entry.timestamp}] [${level.toUpperCase()}] [${entry.context}] ${msg}`, entry.metadata ?? '');
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.log('debug', msg, meta);
  }
  info(msg: string, meta?: Record<string, unknown>): void {
    this.log('info', msg, meta);
  }
  warn(msg: string, meta?: Record<string, unknown>): void {
    this.log('warn', msg, meta);
  }
  error(msg: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log('error', msg, meta, error);
  }
  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger(this.context, { ...this.bindings, ...bindings });
  }
}

// ---------- FileLogger (native host - JSONL) ----------
export class FileLogger implements Logger {
  constructor(
    private readonly context: string,
    private readonly bindings: Record<string, unknown> = {},
    private readonly filePath: string
  ) {
    // Note: In real implementation, open file handle here
    // For now, we'll use a dummy value
  }

  private write(entry: LogEntry): void {
    // In production: write JSONL to file
    // For now, we'll just console.log in native host context
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }

  private log(level: LogLevel, msg: string, meta?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message: msg,
      timestamp: new Date().toISOString(),
      context: this.context,
      metadata: { ...this.bindings, ...meta, ...(error ? { error: error.message, stack: error.stack } : {}) },
    };
    this.write(entry);
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.log('debug', msg, meta);
  }
  info(msg: string, meta?: Record<string, unknown>): void {
    this.log('info', msg, meta);
  }
  warn(msg: string, meta?: Record<string, unknown>): void {
    this.log('warn', msg, meta);
  }
  error(msg: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log('error', msg, meta, error);
  }
  child(bindings: Record<string, unknown>): Logger {
    return new FileLogger(this.context, { ...this.bindings, ...bindings }, this.filePath);
  }
}

// ---------- MemoryLogger (tests) ----------
export class MemoryLogger implements Logger {
  readonly entries: LogEntry[] = [];
  constructor(
    private readonly context: string,
    private readonly bindings: Record<string, unknown> = {}
  ) {}

  private log(level: LogLevel, msg: string, meta?: Record<string, unknown>, error?: Error): void {
    this.entries.push({
      level,
      message: msg,
      timestamp: new Date().toISOString(),
      context: this.context,
      metadata: { ...this.bindings, ...meta, ...(error ? { error: error.message, stack: error.stack } : {}) },
    });
  }

  debug(msg: string, meta?: Record<string, unknown>): void {
    this.log('debug', msg, meta);
  }
  info(msg: string, meta?: Record<string, unknown>): void {
    this.log('info', msg, meta);
  }
  warn(msg: string, meta?: Record<string, unknown>): void {
    this.log('warn', msg, meta);
  }
  error(msg: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log('error', msg, meta, error);
  }
  child(bindings: Record<string, unknown>): Logger {
    return new MemoryLogger(this.context, { ...this.bindings, ...bindings });
  }
  clear(): void {
    this.entries.length = 0;
  }
}

// ---------- Factory ----------
export function createLogger(
  context: string,
  transport: 'console' | 'file' | 'memory' = 'console',
  options?: { filePath?: string; bindings?: Record<string, unknown> }
): Logger {
  const bindings = options?.bindings ?? {};
  switch (transport) {
    case 'file':
      return new FileLogger(context, bindings, options.filePath ?? 'app.log');
    case 'memory':
      return new MemoryLogger(context, bindings);
    default:
      return new ConsoleLogger(context, bindings);
  }
}