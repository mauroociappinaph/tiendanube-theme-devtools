// src/domain/services/NativeHostService.ts

import type { Result } from '../../shared/result';
import type { DomainError } from '../../shared/errors';
import type { HealthResult } from '../../shared/ports/NativeHostPort';

export interface NativeHostService {
  healthCheck(): Promise<Result<HealthResult, DomainError>>;
  discoverCliPath(): Promise<Result<string, DomainError>>;
  validateThemePath(themePath: string): Result<void, DomainError>;
  executeCommand(command: string, args: string[]): Promise<Result<{ stdout: string; stderr: string; exitCode: number }, DomainError>>;
}