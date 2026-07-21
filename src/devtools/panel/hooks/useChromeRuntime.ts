import type { ExtensionMessage } from '@shared/messaging';

export interface UseChromeRuntime {
  sendMessage: <T>(message: ExtensionMessage) => Promise<T>;
  onMessage: (handler: (msg: ExtensionMessage) => void) => () => void;
}

export function useChromeRuntime(): UseChromeRuntime {
  function sendMessage<T>(message: ExtensionMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: T) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  function onMessage(handler: (msg: ExtensionMessage) => void): () => void {
    const listener = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void,
    ) => {
      handler(message as ExtensionMessage);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }

  return { sendMessage, onMessage };
}