// src/background/MessageRouter.ts
// Routes messages between panel, content script, and native host

import type { PageDetectionPayload, HoverEventPayload } from '@shared/messaging';
import type { StoragePort } from '@shared/ports/StoragePort';
import type { NativeHostPort } from '@shared/ports/NativeHostPort';
import { createLogger } from '@shared/logger';
import { validate } from '@shared/validation';
import { MessageSchema } from '@shared/validation';

const logger = createLogger('background:message-router');

interface PanelConnection {
  port: chrome.runtime.Port;
  tabId: number;
}

interface IncomingMessage {
  type: string;
  payload?: unknown;
}

export class MessageRouter {
  private panelConnections = new Map<number, PanelConnection>();
  private nativeHostStatus = 'disconnected';

  constructor(
    private readonly storage: StoragePort,
    private readonly nativeHost: NativeHostPort
  ) {
    // Register native host notification handler
    nativeHost.onNotification((method, params) => {
      this.handleNativeNotification(method, params);
    });
  }

  async handleMessage(
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): Promise<boolean> {
    const validation = validate(MessageSchema, message);
    if (validation.isErr) {
      logger.error('Invalid message format', { details: validation.error });
      sendResponse({ type: 'ERROR', payload: { message: 'Invalid message format', details: validation.error } });
      return true;
    }

    const msg = validation.value;
    
    try {
      switch (msg.type) {
        case 'PAGE_DETECTED': {
          this.handlePageDetected(msg.payload as PageDetectionPayload);
          sendResponse({ type: 'ACK', payload: { success: true } });
          break;
        }

        case 'HOVER_EVENT': {
          this.handleHoverEvent(msg.payload as HoverEventPayload);
          sendResponse({ type: 'ACK', payload: { success: true } });
          break;
        }

        case 'ACTIVATE_INSPECT': {
          await this.activateInspectMode();
          sendResponse({ type: 'THEME_RELOADED', payload: { success: true, message: 'Inspect mode activated' } });
          break;
        }

        case 'DEACTIVATE_INSPECT': {
          await this.deactivateInspectMode();
          sendResponse({ type: 'THEME_RELOADED', payload: { success: true, message: 'Inspect mode deactivated' } });
          break;
        }

        case 'SET_MODE': {
          const mode = (msg.payload as { mode?: 'local' | 'remote' }).mode;
          if (mode !== 'local' && mode !== 'remote') {
            sendResponse({ type: 'ERROR', payload: { message: 'Invalid mode' } });
            break;
          }
          await this.setThemeMode(mode);
          sendResponse({ type: 'THEME_RELOADED', payload: { success: true, message: `Mode set to ${mode}` } });
          break;
        }

        case 'RELOAD_THEME': {
          await this.reloadTheme((msg.payload as { themePath?: string }).themePath);
          sendResponse({ type: 'THEME_RELOADED', payload: { success: true, message: 'Theme reload triggered' } });
          break;
        }

        case 'GET_THEME_INFO': {
          const info = await this.getThemeInfo();
          sendResponse({ type: 'THEME_INFO', payload: info });
          break;
        }

        case 'NATIVE_COMMAND': {
          const command = (msg.payload as { command?: string }).command;
          if (!command) {
            sendResponse({ type: 'ERROR', payload: { message: 'Missing native command' } });
            break;
          }
          await this.forwardToNativeHost(command, (msg.payload as { payload?: unknown }).payload);
          sendResponse({ type: 'ACK', payload: { success: true } });
          break;
        }

        default: {
          logger.warn('Unknown message type', { type: msg.type });
          sendResponse({ type: 'ERROR', payload: { message: `Unknown message type: ${msg.type}` } });
        }
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Message handling failed', err, { type: msg.type });
      sendResponse({ type: 'ERROR', payload: { message: String(error) } });
    }
    return true; // async response
  }

  handlePanelConnection(port: chrome.runtime.Port): void {
    const tabId = port.sender?.tab?.id ?? 0;
    
    this.panelConnections.set(tabId, { port, tabId });
    logger.info('DevTools panel connected', { tabId });

    port.onMessage.addListener((message) => {
      const handled = this.handleMessage(message, { tab: { id: tabId } } as chrome.runtime.MessageSender, (response) => {
        port.postMessage(response);
      });
      void handled;
    });

    port.onDisconnect.addListener(() => {
      this.panelConnections.delete(tabId);
      logger.info('DevTools panel disconnected', { tabId });
    });
  }

  handleNativePort(port: chrome.runtime.Port): void {
    port.onMessage.addListener((message) => {
      logger.debug('Native host message', { message });
    });

    port.onDisconnect.addListener(() => {
      logger.warn('Native host port disconnected');
    });
  }

  handleContentConnection(port: chrome.runtime.Port): void {
    port.onMessage.addListener((message) => {
      void this.handleMessage(message, { tab: { id: 0 } } as chrome.runtime.MessageSender, (response) => {
        port.postMessage(response);
      });
    });
  }

  private handlePageDetected(payload: PageDetectionPayload): void {
    // Note: pageType is not in StorageSchema, storing in themePath as a workaround
    // or we could extend the schema. For now, log it.
    logger.info('Page detected', { pageType: payload.pageType, confidence: payload.confidence });
    
    // Broadcast to all connected panels
    this.broadcastToPanels({ type: 'PAGE_DETECTED', payload });
  }

  private handleHoverEvent(payload: HoverEventPayload): void {
    // Broadcast to all connected panels
    this.broadcastToPanels({ type: 'HOVER_EVENT', payload });
  }

  private async activateInspectMode(): Promise<void> {
    await this.storage.set({ inspectMode: true });
    this.broadcastToPanels({ type: 'INSPECT_MODE_CHANGED', payload: { active: true } });
  }

  private async deactivateInspectMode(): Promise<void> {
    await this.storage.set({ inspectMode: false });
    this.broadcastToPanels({ type: 'INSPECT_MODE_CHANGED', payload: { active: false } });
  }

  private async setThemeMode(mode: 'local' | 'remote'): Promise<void> {
    await this.storage.set({ mode });
    this.broadcastToPanels({ type: 'MODE_CHANGED', payload: { mode } });
  }

  private async reloadTheme(themePath?: string): Promise<void> {
    if (themePath) {
      await this.storage.set({ themePath });
    }
    // Trigger native host theme reload
    await this.nativeHost.send('theme.reload', { themePath });
  }

  private async getThemeInfo(): Promise<{ connected: boolean; version: string }> {
    const storage = await this.storage.get(['mode', 'themePath']);
    const mode = storage.isOk ? (storage.value?.mode as 'local' | 'remote' | undefined) : undefined;
    return {
      connected: this.nativeHostStatus === 'connected',
      version: mode ?? 'unknown'
    };
  }

  private async forwardToNativeHost(command: string, payload: unknown): Promise<void> {
    // Validate command is allowed (defense in depth - also validated in NativeHostClient)
    const ALLOWED_COMMANDS = new Set<string>([
      'system.health',
      'theme.reload',
      'theme.push',
      'theme.pull',
      'theme.validate',
      'cli.execute',
      'fs.read',
      'fs.write',
      'fs.watch',
      'fs.unwatch',
    ]);
    if (!ALLOWED_COMMANDS.has(command)) {
      logger.warn('Blocked unallowed native command', { command });
      throw new Error(`Command not allowed: ${command}`);
    }
    await this.nativeHost.send(command, payload);
  }

  private handleNativeNotification(method: string, params: unknown): void {
    switch (method) {
      case 'watch.event':
        // Broadcast file watch events to panels
        break;
      case 'theme.reloaded':
        this.broadcastToPanels({ type: 'THEME_RELOADED', payload: params });
        break;
      case 'native.host.status':
        // Update native host status
        break;
    }
  }

  private broadcastToPanels(message: unknown): void {
    for (const connection of this.panelConnections.values()) {
      try {
        connection.port.postMessage(message);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.warn('Failed to send to panel', { error: err.message });
      }
    }
  }
}