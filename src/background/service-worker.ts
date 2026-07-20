// src/background/service-worker.ts
// Background Service Worker entry point — initializes DI, registers handlers, starts alarms

import { createContainer } from '@shared/di';
import { StoragePortToken, NativeHostPortToken, MessagingPortToken } from '@shared/ports/tokens';
import type { ExtensionMessage } from '@shared/messaging';
import { ChromeStorageAdapter } from './ChromeStorageAdapter';
import { NativeHostClient } from './NativeHostClient';
import { MessageRouter } from './MessageRouter';
import { createAll, onAlarm } from './alarms';
import { createLogger } from '@shared/logger';
import type { DomainError } from '@shared/errors';

const logger = createLogger('background:service-worker');

function domainErrorToError(e: DomainError): Error {
  if (e._tag === 'InternalError') {
    const err = new Error(e.message);
    err.cause = e.cause;
    return err;
  }
  if (e._tag === 'StorageError') {
    const err = new Error(`${e.operation} failed for ${e.key}`);
    err.cause = e.cause;
    return err;
  }
  const err = new Error(`${e._tag}: ${JSON.stringify(e)}`);
  return err;
}

// ---- DI Container Setup ----
const container = createContainer();

// Use canonical tokens from shared/ports/tokens.ts
container.register(StoragePortToken, () => new ChromeStorageAdapter());
container.register(NativeHostPortToken, () => new NativeHostClient());
container.register(MessagingPortToken, () => ({
  send: <T>(_message: ExtensionMessage): Promise<T> => { /* handled by router */ return Promise.resolve(undefined as unknown as T); },
  onMessage: () => { /* handled by router */ },
  connect: () => Promise.resolve(),
  disconnect: () => {
    // Intentionally empty - cleanup handled by message router
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  },
}));

// ---- Service Worker Lifecycle ----
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info('Extension installed/updated', { reason: details.reason });
   
  // BLOCKER: Initialize on install/update
  await initialize();

  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Initialize default settings
    const storage = container.resolve(StoragePortToken);
    const result = await storage.set({
      mode: 'remote',
      themePath: '',
      inspectMode: false,
      schemaVersion: '1.0.0'
    });
    if (result._tag === 'Err') {
      logger.error('Failed to initialize defaults', domainErrorToError(result.error), { error: result.error });
    }
  } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    // Migrate settings if needed
    const storage = container.resolve(StoragePortToken);
    const result = await storage.migrate('1.0.0', '1.0.0', (old) => old); // no-op for now
    if (result._tag === 'Err') {
      logger.error('Migration failed', domainErrorToError(result.error), { error: result.error });
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  logger.info('Browser startup - initializing background');
  await initialize();
});

// ---- Initialization ----
let initialized = false;
let messageRouter: MessageRouter | null = null;
let nativeHostClient: import('@shared/ports/NativeHostPort').NativeHostPort | null = null;

async function initialize(): Promise<void> {
  if (initialized) return;
  
  try {
    // Create alarms
    await createAll();
    
    // Initialize native host client
    nativeHostClient = container.resolve(NativeHostPortToken);
    const connectResult = await nativeHostClient.connect();
    if (connectResult._tag === 'Err') {
      logger.warn('Native host not available', { error: connectResult.error });
    }
    
    // Create message router (needs native host client)
    messageRouter = new MessageRouter(
      container.resolve(StoragePortToken),
      nativeHostClient
    );
    
    // Register messaging port with the router itself
    container.registerInstance(MessagingPortToken, {
      send: <T>(message: ExtensionMessage): Promise<T> => messageRouter!.handleMessage(message, { tab: { id: 0 } } as chrome.runtime.MessageSender, () => {}) as Promise<T>,
      onMessage: () => { /* handled by router */ },
      connect: async () => {},
      disconnect: () => {},
    });
    
    // Set up message listeners
    setupMessageListeners();
    
    // Set up alarm handlers
    setupAlarmHandlers();
    
    initialized = true;
    logger.info('Background service worker initialized');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to initialize background', err);
    throw error;
  }
}

function setupMessageListeners(): void {
  // External messages (from content scripts, devtools panel)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!messageRouter) return false;
    
    const handled = messageRouter.handleMessage(message, sender, sendResponse);
    return handled; // true = async response
  });

  // Port connections (devtools panel, content scripts)
  chrome.runtime.onConnect.addListener((port) => {
    if (!messageRouter) return;
    
    if (port.name === 'devtools-panel') {
      messageRouter.handlePanelConnection(port);
    } else if (port.name === 'content-script') {
      messageRouter.handleContentConnection(port);
    }
  });
}

function setupAlarmHandlers(): void {
  onAlarm('native-host-health', async () => {
    if (nativeHostClient) {
      const result = await nativeHostClient.healthCheck();
      if (result._tag === 'Ok') {
        logger.debug('Native host health check passed', { status: result.value.status });
      } else {
        logger.warn('Native host health check failed', { error: result.error });
      }
    }
  });

  onAlarm('theme-reload-check', async () => {
    // Check if theme needs reload (for remote mode)
    logger.debug('Theme reload check triggered');
    // Implementation would check remote theme changes
  });
}

// Handle service worker shutdown gracefully
self.addEventListener('beforeunload', () => {
  if (nativeHostClient) {
    nativeHostClient.disconnect();
  }
});

// Export for testing
export { initialize, messageRouter, nativeHostClient };