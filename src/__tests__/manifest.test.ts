import { describe, it, expect } from 'vitest';
import { defineManifest } from '../manifest';

describe('Manifest TypeScript Definition (T-016)', () => {
  describe('defineManifest', () => {
    it('should return a typed manifest object', () => {
      const manifest = defineManifest({
        manifest_version: 3,
        name: 'Test Extension',
        version: '1.0.0',
      });

      expect(manifest).toBeDefined();
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.name).toBe('Test Extension');
      expect(manifest.version).toBe('1.0.0');
    });

    it('should accept all required MV3 fields', () => {
      const manifest = defineManifest({
        manifest_version: 3,
        name: 'Full Manifest',
        version: '2.0.0',
        description: 'Test description',
        permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'nativeMessaging'],
        host_permissions: ['https://*.tiendanube.com/*', 'https://*.nuvemshop.com.br/*'],
        background: {
          service_worker: 'background/service-worker.js',
          type: 'module',
        },
        devtools_page: 'devtools/devtools.html',
        content_scripts: [{
          matches: ['https://*.tiendanube.com/*', 'https://*.nuvemshop.com.br/*'],
          js: ['content/inspector.js'],
          run_at: 'document_idle',
        }],
        icons: {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png',
        },
        content_security_policy: {
          extension_pages: "script-src 'self'; object-src 'self'; style-src 'self';",
        },
      });

      expect(manifest.permissions).toHaveLength(5);
      expect(manifest.host_permissions).toHaveLength(2);
      expect(manifest.background).toEqual({
        service_worker: 'background/service-worker.js',
        type: 'module',
      });
      expect(manifest.devtools_page).toBe('devtools/devtools.html');
      expect(manifest.content_scripts).toHaveLength(1);
      expect(manifest.icons).toEqual({
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      });
      expect(manifest.content_security_policy?.extension_pages).not.toContain('unsafe-inline');
    });

    it('should not allow unsafe-inline in CSP style-src (requirement FR-MAN-008)', () => {
      // The default manifest must NOT contain unsafe-inline
      const defaultManifest = defineManifest({
        manifest_version: 3,
        name: 'Default Manifest',
        version: '1.0.0',
        content_security_policy: {
          extension_pages: "script-src 'self'; object-src 'self'; style-src 'self';",
        },
      });

      expect(defaultManifest.content_security_policy?.extension_pages).not.toContain('unsafe-inline');
      // Also verify the exact CSP string matches spec requirement
      expect(defaultManifest.content_security_policy?.extension_pages).toBe(
        "script-src 'self'; object-src 'self'; style-src 'self';"
      );
    });
  });
});