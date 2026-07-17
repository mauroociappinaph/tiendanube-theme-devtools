// src/domain/entities/NativeHostSession.ts
import { CorrelationId } from '../valueObjects/CorrelationId';

export interface NativeHostSession {
  correlationId: CorrelationId;
  startedAt: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  cliPath?: string;
  cliVersion?: string;
  permissions: Record<string, boolean>;
}