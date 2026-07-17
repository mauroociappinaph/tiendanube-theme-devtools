// Background Service Worker - Stub for PR #1 validation
console.log('[Tiendanube DevTools] Background SW loaded');

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Tiendanube DevTools] Installed:', details.reason);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Tiendanube DevTools] Startup');
});

export {};
