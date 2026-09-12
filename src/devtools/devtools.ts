chrome.devtools.panels.create(
  '\u{1F6E0} Tienda Nube',
  'icons/icon48.png',
  'devtools.html',
  (panel: chrome.devtools.panels.ExtensionPanel) => {
    panel.onShown.addListener(() => {
      console.log('[Tiendanube DevTools] Panel shown');
    });
    panel.onHidden.addListener(() => {
      console.log('[Tiendanube DevTools] Panel hidden');
    });
  },
);

export {};