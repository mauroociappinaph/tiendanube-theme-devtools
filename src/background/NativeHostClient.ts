// src/background/NativeHostClient.ts
// Implements NativeHostPort using chrome.runtime.connectNative

import type { NativeHostPort, HealthResult } from '@shared/ports/NativeHostPort';
import { Result } from '@shared/result';
import { DomainError } from '@shared/errors';
import { createLogger } from '@shared/logger';

const logger = createLogger('background:native-host-client');

interface PendingRequest {
  resolve: (value: Result<unknown, DomainError>) => void;
  reject?: (err: DomainError) => void;
}

interface NativeMessage {
  correlationId?: string;
  error?: { code: number; message: string };
  result?: unknown;
  method?: string;
  params?: unknown;
  command?: string;
  payload?: unknown;
}

// Allowed commands for native host communication - prevent command injection
const ALLOWED_COMMANDS = new Set<string>([
  'system.health',
  'theme.reload',
  'theme.push',
  'theme.pull',
  'theme.validate',
  'cli.execute',
  'fs.read',
  'fs.write',
  'fs.watch',
  'fs.unwatch',
]);

function assertAllowedCommand(command: string): void {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }
}

export class NativeHostClient implements NativeHostPort {
  private port: chrome.runtime.Port | null = null;
  private pending = new Map<string, PendingRequest>();
  private notificationHandler?: (method: string, params: unknown) => void;
  private reconnectAttempts = 0;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;

  async connect(): Promise<Result<void, DomainError>> {
    if (this.port) {
      return Result.ok(undefined);
    }

    try {
      this.port = chrome.runtime.connectNative('com.tiendanube.theme-devtools');
      
      this.port.onMessage.addListener(this.onMessage.bind(this));
      this.port.onDisconnect.addListener(this.onDisconnect.bind(this));
      
      // Send initial health check
      const health = await this.healthCheck();
      if (health.isOk) {
        logger.info('Native host connected and healthy');
      }
      
      this.reconnectAttempts = 0;
      return Result.ok(undefined);
    } catch (error: unknown) {
      return Result.err(new DomainError(String(error), 'NATIVE_HOST_UNAVAILABLE'));
    }
  }

  disconnect(): Promise<void> {
    this.port?.disconnect();
    this.port = null;
    this.pending.clear();
    this.notificationHandler = undefined;
    return Promise.resolve();
  }

  async send<T>(command: string, payload: unknown): Promise<Result<T, DomainError>> {
    if (!this.port) {
      return Result.err(new DomainError('Not connected', 'NATIVE_HOST_UNAVAILABLE'));
    }

    // Validate command is allowed
    try {
      assertAllowedCommand(command);
    } catch (error) {
      return Result.err(new DomainError(String(error), 'COMMAND_NOT_ALLOWED', { command }));
    }

    const correlationId = crypto.randomUUID();
    
    return new Promise<Result<T, DomainError>>((resolve) => {
      this.pending.set(correlationId, { 
        resolve: resolve as (value: Result<unknown, DomainError>) => void,
      });
      
      const port = this.port;
      if (!port) return;
      port.postMessage({ command, payload, correlationId });
      
      // 30 second timeout
      setTimeout(() => {
        if (this.pending.has(correlationId)) {
          this.pending.delete(correlationId);
          resolve(Result.err(new DomainError(`Message timeout for correlation ${correlationId}`, 'MESSAGE_TIMEOUT', { correlationId })));
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

  private onMessage(message: NativeMessage): void {
    // Handle response to pending request
    if (message.correlationId && this.pending.has(message.correlationId)) {
      const pending = this.pending.get(message.correlationId);
      if (!pending) return;
      const { resolve } = pending;
      this.pending.delete(message.correlationId);
      
      if (message.error) {
        resolve(Result.err(new DomainError(message.error.message, 'NATIVE_HOST_ERROR', { code: message.error.code })));
      } else {
        resolve(Result.ok(message.result));
      }
      return;
    }

    // Handle notification (watch events, etc.)
    if (message.method && this.notificationHandler) {
      this.notificationHandler(message.method, message.params);
    }
  }

  private onDisconnect(): void {
    logger.warn('Native host disconnected');
    this.port = null;
    
    // Reject all pending requests
    for (const [, { resolve }] of this.pending) {
      resolve(Result.err(new DomainError('Port disconnected', 'NATIVE_HOST_UNAVAILABLE')));
    }
    this.pending.clear();
    
    // Attempt reconnection with exponential backoff
    if (this.reconnectAttempts < this.maxRetries) {
      this.reconnectAttempts++;
      const delay = this.retryDelayMs * Math.pow(2, this.reconnectAttempts - 1);
      const attemptStr = String(this.reconnectAttempts);
      const maxStr = String(this.maxRetries);
      logger.info(`Reconnecting to native host (attempt ${attemptStr}/${maxStr}) in ${String(delay)}ms`);
      
      setTimeout(() => {
        void this.connect().catch((error: unknown) => {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('Reconnection failed', err);
        });
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached');
    }
  }
}