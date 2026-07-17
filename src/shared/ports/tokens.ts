// src/shared/ports/tokens.ts
// Canonical port tokens for DI container

import type { StoragePort } from './StoragePort';
import type { NativeHostPort } from './NativeHostPort';
import type { MessagingPort } from './MessagingPort';

import { createToken } from '../di';

export const StoragePortToken = createToken<StoragePort>('StoragePort');
export const NativeHostPortToken = createToken<NativeHostPort>('NativeHostPort');
export const MessagingPortToken = createToken<MessagingPort>('MessagingPort');

// Re-export createToken for convenience
export { createToken };