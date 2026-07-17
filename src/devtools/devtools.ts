// DevTools Panel Registration - Stub
chrome.devtools.panels.create('🛠 Tienda Nube', 'icons/icon48.png', 'devtools.html', (panel) => {
  console.log('[Tiendanube DevTools] Panel created');
  panel.onShown.addListener(() => {
    console.log('[Tiendanube DevTools] Panel shown');
  });
  panel.onHidden.addListener(() => {
    console.log('[Tiendanube DevTools] Panel hidden');
  });
});

export {};
