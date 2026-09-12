// src/background/ChromeStorageAdapter.ts
// Implements StoragePort using chrome.storage.local

import type { StoragePort, StorageSchema, StorageArea } from '@shared/ports/StoragePort';
import { InternalServerError } from '@shared/errors';
import { Result } from '@shared/result';
import { createLogger } from '@shared/logger';

const logger = createLogger('background:chrome-storage-adapter');

function toDomainError(operation: 'get' | 'set' | 'remove' | 'observe' | 'migrate' | 'clear', key: string, cause: unknown): InternalServerError {
  return new InternalServerError(`${operation} failed for ${key}`, { operation, key }, cause);
}

function domainErrorToError(e: InternalServerError): Error {
  const err = new Error(e.message);
  err.cause = e.cause;
  return err;
}

export class ChromeStorageAdapter implements StoragePort {
  async get<T extends keyof StorageSchema>(
    keys: T[],
    area: StorageArea = 'local'
  ): Promise<Result<Pick<StorageSchema, T> | null, DomainError>> {
    try {
      const storage = this.getStorage(area);
      const result = await storage.get(keys) as Partial<StorageSchema>;
      const picked: Partial<StorageSchema> = {};
      let hasAny = false;

      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(result, key)) {
          picked[key] = result[key];
          hasAny = true;
        }
      }

      return Result.ok(hasAny ? (picked as Pick<StorageSchema, T>) : null);
    } catch (error: unknown) {
      const domainErr = toDomainError('get', String(keys), error);
      logger.error('Storage get failed', domainErrorToError(domainErr), { keys, area });
      return Result.err(domainErr);
    }
  }

  async set<T extends keyof StorageSchema>(
    data: Pick<StorageSchema, T>,
    area: StorageArea = 'local'
  ): Promise<Result<void, InternalServerError>> {
    try {
      const storage = this.getStorage(area);
      await storage.set(data);
      return Result.ok(undefined);
    } catch (error: unknown) {
      const domainErr = toDomainError('set', JSON.stringify(data), error);
      logger.error('Storage set failed', domainErrorToError(domainErr), { data, area });
      return Result.err(domainErr);
    }
  }

  async remove(keys: string[], area: StorageArea = 'local'): Promise<Result<void, DomainError>> {
    try {
      const storage = this.getStorage(area);
      await storage.remove(keys);
      return Result.ok(undefined);
    } catch (error: unknown) {
      const domainErr = toDomainError('remove', JSON.stringify(keys), error);
      logger.error('Storage remove failed', domainErrorToError(domainErr), { keys, area });
      return Result.err(domainErr);
    }
  }

  async clear(area: StorageArea = 'local'): Promise<Result<void, DomainError>> {
    try {
      const storage = this.getStorage(area);
      await storage.clear();
      return Result.ok(undefined);
    } catch (error: unknown) {
      const domainErr = toDomainError('clear', 'all', error);
      logger.error('Storage clear failed', domainErrorToError(domainErr), { area });
      return Result.err(domainErr);
    }
  }

  observe<T extends keyof StorageSchema>(
    key: T,
    callback: (newValue: StorageSchema[T] | null, oldValue?: StorageSchema[T] | null) => void,
    area: StorageArea = 'local'
  ): () => void {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === area && changes[key]) {
        const change = changes[key];
        callback(change.newValue as StorageSchema[T] | null, change.oldValue as StorageSchema[T] | null);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => { chrome.storage.onChanged.removeListener(listener); };
  }

  async migrate(
    fromVersion: string,
    _toVersion: string,
    migrationFn: (oldData: Record<string, unknown>) => Record<string, unknown>
  ): Promise<Result<void, DomainError>> {
    try {
      const currentResult = await this.get(['schemaVersion'] as const);
      if (currentResult.isErr) return currentResult.map(() => {});

      if (currentResult.value?.schemaVersion === fromVersion) {
        const allDataResult = await this.get(['mode', 'themePath', 'inspectMode', 'schemaVersion'] as const);
        if (allDataResult._tag === 'Ok' && allDataResult.value) {
          const migrated = migrationFn(allDataResult.value);
          const setResult = await this.set(migrated as Pick<StorageSchema, keyof StorageSchema>);
          if (setResult._tag === 'Err') return setResult;
        }
      }
      return Result.ok(undefined);
    } catch (error: unknown) {
      const domainErr = toDomainError('migrate', fromVersion, error);
      logger.error('Storage migrate failed', domainErrorToError(domainErr), { fromVersion });
      return Result.err(domainErr);
    }
  }

  private getStorage(area: StorageArea): chrome.storage.StorageArea {
    switch (area) {
      case 'sync': return chrome.storage.sync;
      case 'session': return chrome.storage.session;
      default: return chrome.storage.local;
    }
  }
}