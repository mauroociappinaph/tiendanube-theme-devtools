import * as esbuild from 'esbuild';
import { readFileSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const isProduction = process.env.NODE_ENV === 'production';
const isHostOnly = process.argv.includes('--host');

/**
 * Manifest plugin — imports src/manifest.ts, serializes to dist/manifest.json,
 * injects version from package.json, strips dev keys in production.
 */
const manifestPlugin = () => ({
  name: 'manifest',
  setup(build) {
    build.onEnd(async () => {
      const manifestPath = resolve(__dirname, 'src/manifest.ts');
      try {
        readFileSync(manifestPath, 'utf-8');
      } catch {
        throw new Error('manifestPlugin: src/manifest.ts must export a default object');
      }

      // Dynamic import of the manifest module
      const outfile = resolve(__dirname, 'dist/manifest.json');
      const tempFile = resolve(__dirname, '.temp-manifest.mjs');

      // Write a temporary wrapper to import the manifest and serialize it
      const wrapper = [
        `import manifest from ${JSON.stringify(manifestPath)};`,
        `import { writeFileSync } from 'fs';`,
        `const m = typeof manifest === 'function' ? manifest() : manifest;`,
        `m.version = ${JSON.stringify(pkg.version)};`,
        `if (${isProduction}) {`,
        `  delete m.key;`,
        `  if (m.permissions) {`,
        `    m.permissions = m.permissions.filter(p => p !== 'debugger');`,
        `  }`,
        `}`,
        `writeFileSync(${JSON.stringify(outfile)}, JSON.stringify(m, null, 2));`,
      ].join('\n');

      mkdirSync(dirname(outfile), { recursive: true });
      writeFileSync(tempFile, wrapper);

      try {
        // Use esbuild to bundle the wrapper and execute it
        await esbuild.build({
          entryPoints: [tempFile],
          outfile: resolve(__dirname, '.temp-manifest-run.mjs'),
          format: 'esm',
          bundle: true,
          platform: 'node',
          target: 'node20',
          plugins: [
            {
              name: 'alias-ts',
              setup(b) {
                b.onResolve({ filter: /\.ts$/ }, (args) => {
                  return { path: args.path, external: true };
                });
              },
            },
          ],
        });
      } finally {
        try { readFileSync(tempFile); } catch {}
      }
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
