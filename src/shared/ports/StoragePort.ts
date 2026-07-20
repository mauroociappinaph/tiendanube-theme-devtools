import type { Result } from '@shared/result';
import type { DomainError } from '@shared/errors';

export interface StorageSchema {
  mode: 'local' | 'remote';
  themePath: string;
  inspectMode: boolean;
  schemaVersion: string;
}

export type StorageArea = 'local' | 'sync' | 'session';

export interface StoragePort {
  get<T extends keyof StorageSchema>(
    keys: T[],
    area?: StorageArea
  ): Promise<Result<Pick<StorageSchema, T> | null, DomainError>>;

  set<T extends keyof StorageSchema>(
    data: Pick<StorageSchema, T>,
    area?: StorageArea
  ): Promise<Result<void, DomainError>>;

  remove(keys: string[], area?: StorageArea): Promise<Result<void, DomainError>>;
  clear(area?: StorageArea): Promise<Result<void, DomainError>>;

  observe<T extends keyof StorageSchema>(
    key: T,
    callback: (newValue: StorageSchema[T] | null, oldValue?: StorageSchema[T] | null) => void
  ): () => void; // returns unsubscribe function

  migrate(
    fromVersion: string,
    toVersion: string,
    migrationFn: (oldData: Record<string, unknown>) => Record<string, unknown>
  ): Promise<Result<void, DomainError>>;
}