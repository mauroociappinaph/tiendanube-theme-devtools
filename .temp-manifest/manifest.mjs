// src/shared/types/manifest.ts
function defineManifest(manifest) {
  return manifest;
}

// src/manifest.ts
var manifest_default = defineManifest({
  manifest_version: 3,
  name: "Tienda Nube Theme DevTools",
  version: "0.1.0",
  description: "Chrome DevTools extension for Tienda Nube / Nuvemshop theme development",
  permissions: ["storage", "activeTab", "scripting", "alarms", "nativeMessaging", "devtools"],
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
    extension_pages: "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
  }
});
export {
  manifest_default as default
};
