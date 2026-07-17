import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Native Host Test Setup
// ---------------------------------------------------------------------------

// Mock dotenv for native host tests
vi.mock('dotenv', () => ({
  config: vi.fn().mockReturnValue({ parsed: { NODE_ENV: 'test' } }),
}));

// Mock crypto.randomUUID for environments that don't have it
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () =>
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        }),
    },
    writable: true,
  });
}
