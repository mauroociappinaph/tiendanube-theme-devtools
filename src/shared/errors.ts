// src/shared/errors.ts
// DomainError discriminated union — all error types used across the extension

export type DomainError =
  | { _tag: 'NotFound'; resource: string; id: string }
  | { _tag: 'ValidationFailed'; errors: Record<string, string[]> }
  | { _tag: 'StorageError'; operation: 'get' | 'set' | 'remove' | 'observe' | 'migrate' | 'clear'; key: string; cause: unknown }
  | { _tag: 'MessageTimeout'; correlationId: string }
  | { _tag: 'MessageSizeExceeded'; size: number; limit: number }
  | { _tag: 'NativeHostUnavailable'; reason: string }
  | { _tag: 'NativeHostError'; code: number; message: string }
  | { _tag: 'CommandNotFound'; command: string }
  | { _tag: 'PathTraversal'; path: string }
  | { _tag: 'PathNotAllowed'; path: string; allowedBases: string[] }
  | { _tag: 'ParamTooLong'; max: number; actual: number }
  | { _tag: 'ForbiddenPattern'; pattern: string; input: string }
  | { _tag: 'CliExecutionFailed'; command: string; exitCode: number; stderr: string }
  | { _tag: 'CliTimeout'; command: string; timeoutMs: number }
  | { _tag: 'InternalError'; message: string; cause?: unknown };

// Type guards for exhaustiveness checking
export function isNotFound(e: DomainError): e is DomainError & { _tag: 'NotFound' } {
  return e._tag === 'NotFound';
}
export function isValidationFailed(e: DomainError): e is DomainError & { _tag: 'ValidationFailed' } {
  return e._tag === 'ValidationFailed';
}
export function isStorageError(e: DomainError): e is DomainError & { _tag: 'StorageError' } {
  return e._tag === 'StorageError';
}
export function isMessageTimeout(e: DomainError): e is DomainError & { _tag: 'MessageTimeout' } {
  return e._tag === 'MessageTimeout';
}
export function isMessageSizeExceeded(e: DomainError): e is DomainError & { _tag: 'MessageSizeExceeded' } {
  return e._tag === 'MessageSizeExceeded';
}
export function isNativeHostUnavailable(e: DomainError): e is DomainError & { _tag: 'NativeHostUnavailable' } {
  return e._tag === 'NativeHostUnavailable';
}
export function isNativeHostError(e: DomainError): e is DomainError & { _tag: 'NativeHostError' } {
  return e._tag === 'NativeHostError';
}
export function isCommandNotFound(e: DomainError): e is DomainError & { _tag: 'CommandNotFound' } {
  return e._tag === 'CommandNotFound';
}
export function isPathTraversal(e: DomainError): e is DomainError & { _tag: 'PathTraversal' } {
  return e._tag === 'PathTraversal';
}
export function isPathNotAllowed(e: DomainError): e is DomainError & { _tag: 'PathNotAllowed' } {
  return e._tag === 'PathNotAllowed';
}
export function isParamTooLong(e: DomainError): e is DomainError & { _tag: 'ParamTooLong' } {
  return e._tag === 'ParamTooLong';
}
export function isForbiddenPattern(e: DomainError): e is DomainError & { _tag: 'ForbiddenPattern' } {
  return e._tag === 'ForbiddenPattern';
}
export function isCliExecutionFailed(e: DomainError): e is DomainError & { _tag: 'CliExecutionFailed' } {
  return e._tag === 'CliExecutionFailed';
}
export function isCliTimeout(e: DomainError): e is DomainError & { _tag: 'CliTimeout' } {
  return e._tag === 'CliTimeout';
}
export function isInternalError(e: DomainError): e is DomainError & { _tag: 'InternalError' } {
  return e._tag === 'InternalError';
}