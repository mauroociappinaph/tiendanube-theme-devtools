// src/shared/messageRegistry.ts
// Central message handler registry — replaces giant switch in Background

import type { ExtensionMessage } from './messaging';

type MessageHandler<T extends ExtensionMessage> = (
  message: T,
  sender: chrome.runtime.MessageSender
) => Promise<ExtensionMessage>;

export class MessageRegistry {
  private handlers = new Map<string, MessageHandler<ExtensionMessage>>();

  register<T extends ExtensionMessage>(type: T['type'], handler: MessageHandler<T>): void {
    this.handlers.set(type, handler);
  }

  getHandler<T extends ExtensionMessage>(type: T['type']): MessageHandler<T> | undefined {
    return this.handlers.get(type);
  }

  async dispatch(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<ExtensionMessage> {
    const handler = this.handlers.get(message.type);
    if (!handler) {
      throw new Error(`No handler for message type: ${message.type}`);
    }
    return handler(message, sender);
  }
}

// Singleton
export const messageRegistry = new MessageRegistry();