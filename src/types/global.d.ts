// src/types/global.d.ts
// Global ambient type declarations — used across all adapters without explicit imports

interface BuildInfo {
  readonly version: string;
  readonly buildTime: string;
  readonly mode: 'development' | 'production';
}

interface Window {
  __BUILD_INFO__: BuildInfo;
}

// Console extensions for structured logging
interface Console {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

// Global correlation ID for request tracing
declare const __CORRELATION_ID__: string | undefined;

// Module augmentation for Node.js process (native host only)
declare namespace NodeJS {
  interface ProcessEnv {
    CHROME_WEBSTORE_CLIENT_ID: string;
    CHROME_WEBSTORE_CLIENT_SECRET: string;
    CHROME_WEBSTORE_REFRESH_TOKEN: string;
    NUBE_CLI_PATH: string;
    NODE_ENV: 'development' | 'production' | 'test';
    DEBUG: string;
  }
}

// Type-safe JSON parsing
interface JSON {
  parse(text: string, reviver?: (key: string, value: unknown) => unknown): unknown;
}