export interface MessagingPort {
  send<T>(message: ExtensionMessage): Promise<T>;
  onMessage(handler: (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => void): void;
  connect(): Promise<void>;
  disconnect(): void;
}

// Re-export from messaging to avoid circular deps
export type ExtensionMessage = import('../messaging').ExtensionMessage;