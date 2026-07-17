// src/domain/services/NativeHostService.ts

export interface NativeHostService {
  healthCheck(): Promise<Result<HealthResult, DomainError>>;
  discoverCliPath(): Promise<Result<string, DomainError>>;
  validateThemePath(themePath: string): Result<void, DomainError>;
  executeCommand(command: string, args: string[]): Promise<Result<{ stdout: string; stderr: string; exitCode: number }, DomainError>>;
}