import * as esbuild from 'esbuild';
import { readFileSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const isProduction = process.env.NODE_ENV === 'production';
const isHostOnly = process.argv.includes('--host');

/**
 * Manifest plugin — uses esbuild to transform src/manifest.ts to JS,
 * then imports and serializes to dist/manifest.json.
 */
const manifestPlugin = () => ({
  name: 'manifest',
  setup(build) {
    build.onEnd(async () => {
      const manifestPath = resolve(__dirname, 'src/manifest.ts');
      const tempDir = resolve(__dirname, '.temp-manifest');
      const tempFile = resolve(tempDir, 'manifest.mjs');
      const outfile = resolve(__dirname, 'dist/manifest.json');

      try {
        readFileSync(manifestPath, 'utf-8');
      } catch {
        throw new Error('manifestPlugin: src/manifest.ts not found');
      }

      mkdirSync(tempDir, { recursive: true });
      mkdirSync(dirname(outfile), { recursive: true });

      // Use esbuild to transform manifest.ts to a runnable .mjs file
      await esbuild.build({
        entryPoints: [manifestPath],
        outfile: tempFile,
        format: 'esm',
        bundle: true,
        platform: 'node',
        target: 'node20',
        sourcemap: false,
        plugins: [
          {
            name: 'manifest-transform',
            setup(b) {
              b.onResolve({ filter: /\.ts$/ }, (args) => {
                return { path: args.path };
              });
            },
          },
        ],
      });

      // Dynamically import the transformed manifest
      const manifestModule = await import(tempFile);
      const manifest = manifestModule.default;

      // Apply version and production stripping
      const finalManifest = typeof manifest === 'function' ? manifest() : manifest;
      finalManifest.version = pkg.version;
      
      if (isProduction) {
        delete finalManifest.key;
        if (finalManifest.permissions) {
          finalManifest.permissions = finalManifest.permissions.filter((p) => p !== 'debugger');
        }
      }

      writeFileSync(outfile, JSON.stringify(finalManifest, null, 2));
      
      // Cleanup
      try { readFileSync(tempFile); } catch {}
      try { readFileSync(resolve(tempDir, 'manifest.mjs.map')); } catch {}
    });
  },
});

/**
 * Copy plugin — copies files without transformation.
 */
const copyPlugin = (assets) => ({
  name: 'copy',
  setup(build) {
    build.onEnd(() => {
      for (const { from, to } of assets) {
        const src = resolve(__dirname, from);
        const dest = resolve(__dirname, to);
        try {
          mkdirSync(dirname(dest), { recursive: true });
          copyFileSync(src, dest);
        } catch (err) {
          if (err.code === 'ENOENT') {
            console.warn(`[copy] Warning: ${from} not found, skipping`);
          } else {
            throw err;
          }
        }
      }
    });
  },
});

// Assets to copy
const staticAssets = [
  { from: 'public/icons/icon16.png', to: 'dist/icons/icon16.png' },
  { from: 'public/icons/icon48.png', to: 'dist/icons/icon48.png' },
  { from: 'public/icons/icon128.png', to: 'dist/icons/icon128.png' },
  { from: 'src/native-host/manifest.json', to: 'dist/native-host/manifest.json' },
];

async function main() {
  if (isHostOnly) {
    // Native host build
    await esbuild.build({
      entryPoints: [resolve(__dirname, 'src/native-host/main.ts')],
      outfile: resolve(__dirname, 'dist/native-host/host.node.js'),
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      minify: isProduction,
      sourcemap: !isProduction,
      external: [],
    });
    return;
  }

  // Extension build
  const ctx = await esbuild.context({
    entryPoints: [
      { in: resolve(__dirname, 'src/background/service-worker.ts'), out: 'background/service-worker' },
      { in: resolve(__dirname, 'src/devtools/devtools.html'), out: 'devtools/devtools' },
      { in: resolve(__dirname, 'src/devtools/panel/Panel.tsx'), out: 'devtools/panel/Panel' },
      { in: resolve(__dirname, 'src/content/inspector.ts'), out: 'content/inspector' },
    ],
    outdir: resolve(__dirname, 'dist'),
    bundle: true,
    platform: 'browser',
    target: 'chrome110',
    format: 'esm',
    jsx: 'automatic',
    jsxImportSource: 'preact',
    minify: isProduction,
    sourcemap: !isProduction,
    loader: {
      '.html': 'copy',
      '.css': 'local-css',
    },
    plugins: [
      manifestPlugin(),
      copyPlugin(staticAssets),
    ],
  });

  // One-shot build (not watch mode)
  await ctx.rebuild();
  await ctx.dispose();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});