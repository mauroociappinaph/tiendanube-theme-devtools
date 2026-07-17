import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Chrome API Mocks
// ---------------------------------------------------------------------------

const createStorageArea = () => ({
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getBytesInUse: vi.fn().mockResolvedValue(0),
  onChanged: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
});

const createPort = () => ({
  name: '',
  postMessage: vi.fn(),
  onMessage: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
  onDisconnect: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
  disconnect: vi.fn(),
});

const mockStorage = {
  local: createStorageArea(),
  sync: createStorageArea(),
  session: createStorageArea(),
};

const mockRuntime = {
  sendMessage: vi.fn().mockResolvedValue({}),
  sendNativeMessage: vi.fn().mockResolvedValue({}),
  onMessage: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
  onConnect: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
  onInstalled: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
  onStartup: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
  connect: vi.fn(() => createPort()),
  connectNative: vi.fn(() => createPort()),
  getURL: vi.fn((path: string) => `chrome-extension://abc/${path}`),
  getManifest: vi.fn(() => ({ version: '0.1.0', manifest_version: 3 })),
  id: 'test-extension-id',
  lastError: null,
};

const mockDevtools = {
  panels: {
    create: vi.fn().mockResolvedValue({}),
    elements: { createPanel: vi.fn() },
    sources: { createPanel: vi.fn() },
    themeName: 'default',
  },
  inspectedWindow: {
    tabId: 123,
    eval: vi.fn(),
    reload: vi.fn(),
  },
};

const mockTabs = {
  query: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockResolvedValue({}),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue(undefined),
  onActivated: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
  onUpdated: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
};

const mockScripting = {
  executeScript: vi.fn().mockResolvedValue([{}]),
  insertCSS: vi.fn().mockResolvedValue(undefined),
  removeCSS: vi.fn().mockResolvedValue(undefined),
  registerContentScripts: vi.fn().mockResolvedValue(undefined),
  unregisterContentScripts: vi.fn().mockResolvedValue(undefined),
};

const mockAlarms = {
  create: vi.fn(),
  clear: vi.fn(),
  clearAll: vi.fn(),
  get: vi.fn().mockResolvedValue(null),
  getAll: vi.fn().mockResolvedValue([]),
  onAlarm: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn() },
};

Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: mockStorage,
    runtime: mockRuntime,
    devtools: mockDevtools,
    tabs: mockTabs,
    scripting: mockScripting,
    alarms: mockAlarms,
  },
  writable: true,
  configurable: true,
});

// ---------------------------------------------------------------------------
// Preact Signals Mock
// ---------------------------------------------------------------------------
vi.mock('@preact/signals', () => ({
  signal: <T>(initial: T) => {
    let value = initial;
    return {
      get value() { return value; },
      set value(v: T) { value = v; },
      peek: () => value,
      subscribe: vi.fn(),
    };
  },
  computed: <T>(fn: () => T) => ({
    get value() { return fn(); },
    peek: () => fn(),
  }),
  effect: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Global Mocks
// ---------------------------------------------------------------------------

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
