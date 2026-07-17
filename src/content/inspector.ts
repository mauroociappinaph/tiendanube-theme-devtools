// Content Script Entry Point - Stub
console.log('[Tiendanube DevTools] Content script loaded');

interface ExtensionMessage {
  type: string;
  payload?: unknown;
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  console.log('[Tiendanube DevTools] Message received:', message.type);
  sendResponse({ success: true, message: 'Content script stub response' });
  return true;
});

export {};
