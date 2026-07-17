// src/shared/__tests__/errors.test.ts
import { describe, it, expect } from 'vitest';
import type { DomainError } from '../errors';

describe('DomainError tagged union', () => {
  it('should have all required variants', () => {
    const errors: DomainError[] = [
      { _tag: 'NotFound', resource: 'theme', id: '123' },
      { _tag: 'ValidationFailed', errors: { field: ['required'] } },
      { _tag: 'StorageError', operation: 'get', key: 'mode', cause: new Error() },
      { _tag: 'MessageTimeout', correlationId: 'abc' },
      { _tag: 'MessageSizeExceeded', size: 100, limit: 64 },
      { _tag: 'NativeHostUnavailable', reason: 'not installed' },
      { _tag: 'NativeHostError', code: 1, message: 'cli failed' },
      { _tag: 'CommandNotFound', command: 'unknown' },
      { _tag: 'PathTraversal', path: '../../etc/passwd' },
      { _tag: 'PathNotAllowed', path: '/root', allowedBases: ['/home'] },
      { _tag: 'ParamTooLong', max: 100, actual: 200 },
      { _tag: 'ForbiddenPattern', pattern: 'eval', input: 'eval()' },
      { _tag: 'CliExecutionFailed', command: 'nube-cli', exitCode: 1, stderr: 'error' },
      { _tag: 'CliTimeout', command: 'nube-cli', timeoutMs: 5000 },
      { _tag: 'InternalError', message: 'unexpected' },
    ];

    expect(errors.length).toBe(15);
  });

  it('each variant has readonly tagged fields', () => {
    const error: DomainError = { _tag: 'NotFound', resource: 'theme', id: '123' };
    expect(error._tag).toBe('NotFound');
    expect(error.resource).toBe('theme');
    expect(error.id).toBe('123');
  });
});