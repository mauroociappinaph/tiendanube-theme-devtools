// src/shared/types/manifest.ts
function defineManifest(manifest) {
  return manifest;
}

// src/manifest.ts
var manifest_default = defineManifest({
  manifest_version: 3,
  name: "Tienda Nube Theme DevTools",
  version: "__VERSION__",
  description: "Chrome DevTools extension for Tienda Nube / Nuvemshop theme development",
  permissions: ["storage", "scripting", "nativeMessaging"],
  host_permissions: ["https://*.tiendanube.com/*", "https://*.nuvemshop.com.br/*"],
  background: {
    service_worker: "background/service-worker.js",
    type: "module"
  },
  devtools_page: "devtools/devtools.html",
  content_scripts: [
    {
      matches: ["https://*.tiendanube.com/*", "https://*.nuvemshop.com.br/*"],
      js: ["content/inspector.js"],
      run_at: "document_idle"
    }
  ],
  icons: {
    16: "icons/icon16.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png"
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; style-src 'self'; connect-src 'self' https://*.tiendanube.com https://*.nuvemshop.com.br; frame-src 'none'; worker-src 'self';"
  }
});
export {
  manifest_default as default,
  defineManifest
};
