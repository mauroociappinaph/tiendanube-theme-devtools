// src/shared/ports/NativeHostPort.ts
// Canonical native messaging host interface

import type { Result } from '../result';
import type { DomainError } from '../errors';

export interface NativeHostPort {
  connect(): Promise<Result<void, DomainError>>;
  disconnect(): Promise<void>;
  send<T>(command: string, payload: unknown): Promise<Result<T, DomainError>>;
  onNotification(handler: (method: string, params: unknown) => void): void;
  healthCheck(): Promise<Result<HealthResult, DomainError>>;
}

export interface HealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  cli?: { path: string; version: string };
  permissions?: Record<string, boolean>;
  timestamp: number;
}