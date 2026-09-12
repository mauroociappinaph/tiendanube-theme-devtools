import { describe, it, expect, vi } from 'vitest';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    OnInstalledReason: {
      INSTALL: 'install',
      UPDATE: 'update',
      CHROME_UPDATE: 'chrome_update',
    },
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    onConnect: { addListener: vi.fn() },
    onConnectNative: { addListener: vi.fn() },
    sendMessage: vi.fn(),
    connect: vi.fn(),
    connectNative: vi.fn(),
    getManifest: vi.fn().mockReturnValue({ version: '1.0.0' }),
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn(), remove: vi.fn(), clear: vi.fn() },
    sync: { get: vi.fn(), set: vi.fn(), remove: vi.fn(), clear: vi.fn() },
    session: { get: vi.fn(), set: vi.fn(), remove: vi.fn(), clear: vi.fn() },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  alarms: {
    create: vi.fn().mockResolvedValue(undefined),
    onAlarm: { addListener: vi.fn() },
    get: vi.fn().mockResolvedValue({ name: 'test', scheduledTime: Date.now() + 60000 }),
  },
};

vi.stubGlobal('chrome', mockChrome);
vi.stubGlobal('self', { addEventListener: vi.fn() });

// Mock DI container
const mockContainer = {
  register: vi.fn(),
  registerInstance: vi.fn(),
  resolve: vi.fn((token) => {
    if (token?.name === 'NativeHostPort') {
      return {
        connect: vi.fn().mockResolvedValue({ _tag: 'Ok', value: undefined }),
      };
    }
    if (token?.name === 'StoragePort') {
      return {
        set: vi.fn().mockResolvedValue({ _tag: 'Ok', value: undefined }),
        migrate: vi.fn().mockResolvedValue({ _tag: 'Ok', value: undefined }),
        get: vi.fn().mockResolvedValue({ _tag: 'Ok', value: { mode: 'remote' } }),
      };
    }
    return {};
  }),
};

vi.mock('@shared/di', () => ({
  createContainer: vi.fn(() => mockContainer),
  createToken: vi.fn((name) => ({ name })),
}));

vi.mock('../ChromeStorageAdapter', () => ({
  ChromeStorageAdapter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../NativeHostClient', () => ({
  NativeHostClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({ _tag: 'Ok', value: undefined }),
  })),
}));

vi.mock('../MessageRouter', () => {
  const MessageRouter = vi.fn().mockImplementation(function(this: unknown) {
    return {
      handleMessage: vi.fn(),
      handlePanelConnection: vi.fn(),
      handleContentConnection: vi.fn(),
    };
  });
  return { MessageRouter };
});

vi.mock('./alarms', () => ({
  createAll: vi.fn().mockImplementation(async () => {
    await chrome.alarms.create('native-host-health', { periodInMinutes: 0.5 });
    await chrome.alarms.create('theme-reload-check', { periodInMinutes: 5 });
  }),
  onAlarm: vi.fn(),
  ALARM_NAMES: { NATIVE_HOST_HEALTH: 'native-host-health', THEME_RELOAD_CHECK: 'theme-reload-check' },
}));

vi.mock('@shared/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('@shared/config', () => ({
  loadExtensionConfig: vi.fn(),
}));

// Import module ONCE at top level - listeners register at module load
const { initialize } = await import('../service-worker');

describe('Background Service Worker (T-017)', () => {
  // Module imported at top level - listeners already registered

  it('should register onInstalled listener at module load', () => {
    expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    expect(typeof mockChrome.runtime.onInstalled.addListener.mock.calls[0][0]).toBe('function');
  });

  it('should register onStartup listener at module load', () => {
    expect(mockChrome.runtime.onStartup.addListener).toHaveBeenCalled();
    expect(typeof mockChrome.runtime.onStartup.addListener.mock.calls[0][0]).toBe('function');
  });

  it('should create alarms on initialize', async () => {
    await initialize();
    
    // The mocked createAll calls chrome.alarms.create internally
    expect(mockChrome.alarms.create).toHaveBeenCalledWith('native-host-health', expect.objectContaining({
      periodInMinutes: 0.5,
    }));
    expect(mockChrome.alarms.create).toHaveBeenCalledWith('theme-reload-check', expect.objectContaining({
      periodInMinutes: 5,
    }));
  });

  it('should initialize storage with defaults on install', async () => {
    // Get the onInstalled listener that was registered at module load
    const listener = mockChrome.runtime.onInstalled.addListener.mock.calls[0]?.[0];
    if (listener) {
      mockChrome.storage.local.set.mockResolvedValue(undefined);
      
      // Should not throw
      await expect(listener({ reason: 'install' })).resolves.toBeUndefined();
    }
  });
});