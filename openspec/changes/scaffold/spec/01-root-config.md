# Root Configuration Specification

**Change**: `scaffold`
**Spec**: 01-root-config
**Date**: 2026-07-16

---

## Purpose

Define the root-level project configuration files that establish the build pipeline, language settings, code quality tooling, and development scripts. This spec covers `package.json`, `tsconfig.json` (and project references), `esbuild.config.mjs`, `.eslintrc.cjs`, `.prettierrc`, `.prettierignore`, `vitest.config.ts`, and `scripts/build-zip.mjs`.

---

## Functional Requirements

### FR-CONF-001: Manifest Generation Plugin

The esbuild config MUST include a custom `manifestPlugin` that:

1. Imports the default export from `src/manifest.ts`
2. Serializes it to `dist/manifest.json`
3. Injects the version from `package.json` into the manifest at build time
4. Supports an optional `--env production` flag to strip development-only manifest keys

#### Scenario: Basic manifest generation

- GIVEN `src/manifest.ts` defines a valid manifest object
- WHEN `npm run build` is executed
- THEN `dist/manifest.json` MUST be created
- AND its `version` field MUST match `package.json`'s `version`
- AND its `manifest_version` MUST be `3`

#### Scenario: Production manifest omits dev keys

- GIVEN `NODE_ENV=production` is set
- WHEN `npm run build` runs
- THEN the generated `dist/manifest.json` MUST NOT include `"key"` or debugger permissions

#### Scenario: Missing manifest export

- GIVEN `src/manifest.ts` has no default export
- WHEN the manifest plugin runs
- THEN it MUST throw a clear error: `manifestPlugin: src/manifest.ts must export a default object`
- AND the build MUST fail with non-zero exit code

### FR-CONF-002: Multi-Entry Build

The esbuild config MUST support multiple entry points in a single pass:

| Entry Point | Output | Format |
|-------------|--------|--------|
| `src/background/service-worker.ts` | `dist/background/service-worker.js` | ESM |
| `src/devtools/devtools.html` | `dist/devtools/devtools.html` | Copied + HTML |
| `src/devtools/panel/Panel.tsx` | Bundled with devtools entry | ESM (via JSX) |
| `src/content/inspector.ts` | `dist/content/inspector.js` | IIFE (for content script) |
| `src/manifest.ts` | `dist/manifest.json` | JSON (via plugin) |

#### Scenario: All entries build

- GIVEN the esbuild config is valid
- WHEN `npm run build` completes
- THEN all output files from the table above MUST exist
- AND `dist/` MUST contain exactly the expected directory structure

#### Scenario: Single entry failure

- GIVEN `src/content/inspector.ts` has a syntax error
- WHEN `npm run build` runs
- THEN esbuild MUST report the error with filename and line number
- AND the exit code MUST be non-zero
- AND `dist/` MUST NOT contain `dist/content/inspector.js`

### FR-CONF-003: Static Asset Copy

The esbuild config MUST copy the following files without transformation:

| Source | Destination |
|--------|-------------|
| `public/icons/icon16.png` | `dist/icons/icon16.png` |
| `public/icons/icon48.png` | `dist/icons/icon48.png` |
| `public/icons/icon128.png` | `dist/icons/icon128.png` |
| `src/native-host/manifest.json` | `dist/native-host/manifest.json` |

#### Scenario: Missing icon file

- GIVEN `public/icons/icon128.png` does not exist
- WHEN `npm run build` runs
- THEN the build SHOULD emit a warning but NOT fail
- AND `dist/icons/` MAY be missing that icon file

### FR-CONF-004: Native Host Build

A separate esbuild pass MUST bundle `src/native-host/main.ts` targeting Node.js:

- Output: `dist/native-host/host.node.js`
- Target: `node20`
- Format: `cjs` (CommonJS, not ESM)
- External packages: none (fully bundled)

#### Scenario: Native host builds

- GIVEN `src/native-host/main.ts` exists
- WHEN `npm run build:host` runs
- THEN `dist/native-host/host.node.js` MUST be created
- AND running `node dist/native-host/host.node.js --help` MUST exit with code 0

### FR-CONF-005: Zip Script

`scripts/build-zip.mjs` MUST create `dist/extension.zip` containing:

- All files from `dist/` EXCEPT `native-host/`
- ZIP structure MUST match Chrome Web Store expectations (flat under `dist/`)
- The script SHALL fail with a clear message if `dist/` is missing

#### Scenario: Zip generation

- GIVEN `dist/` exists with built files
- WHEN `npm run zip` runs
- THEN `dist/extension.zip` MUST be created
- AND `unzip -l dist/extension.zip` MUST list `manifest.json` at the root

### FR-CONF-006: TypeScript Project References

`tsconfig.json` MUST use project references to separate three compilation contexts:

```
tsconfig.json (root — references only)
├── tsconfig.extension.json   → src/ (excluding native-host/)
└── tsconfig.native-host.json → src/native-host/
```

Each project-specific config MUST extend the root `tsconfig.json`.

#### Scenario: Extension type checks

- GIVEN `tsconfig.extension.json` is valid
- WHEN running `npx tsc -p tsconfig.extension.json --noEmit`
- THEN type checking MUST pass for all extension source files
- AND native-host source files MUST be excluded

#### Scenario: Native host type checks independently

- GIVEN `tsconfig.native-host.json` is valid
- WHEN running `npx tsc -p tsconfig.native-host.json --noEmit`
- THEN type checking MUST pass for all native-host source files
- AND Chrome type definitions MUST be excluded (Node.js environment)

### FR-CONF-007: Dev Scripts

`package.json` MUST define these scripts:

| Script | Command | Purpose |
|--------|---------|---------|
| `build` | `node esbuild.config.mjs` | Extension build |
| `build:host` | `node esbuild.config.mjs --host` | Native host build |
| `typecheck` | `tsc --noEmit -p tsconfig.extension.json` | Type check extension |
| `typecheck:host` | `tsc --noEmit -p tsconfig.native-host.json` | Type check native host |
| `lint` | `eslint src/ --ext .ts,.tsx` | Lint all source |
| `lint:fix` | `eslint src/ --ext .ts,.tsx --fix` | Auto-fix lint issues |
| `test` | `vitest run` | Run all tests |
| `test:watch` | `vitest` | Watch mode |
| `zip` | `node scripts/build-zip.mjs` | Create Chrome Web Store zip |
| `clean` | `rm -rf dist/` | Clean build output |
| `format` | `prettier --write src/` | Format all source |

#### Scenario: All scripts resolve

- GIVEN `package.json` is valid
- WHEN running `npm run` (no args)
- THEN all listed scripts MUST appear in the output
- AND each script MUST reference an existing file or command

#### Scenario: Clean removes dist

- GIVEN `dist/` exists with files
- WHEN `npm run clean` runs
- THEN `dist/` MUST be removed
- AND `npm run build` MUST recreate it

---

## Non-Functional Requirements

### NFR-CONF-001: Build Performance

A full extension build (`npm run build`) MUST complete in under 2 seconds on a modern machine (M-series Mac, 16GB RAM).

**Traceability**: esbuild speed advantage from exploration.

### NFR-CONF-002: Deterministic Builds

Running `npm run build` twice from the same source MUST produce identical output (modulo timestamps). The manifest MUST NOT include dynamic build timestamps.

**Traceability**: Reproducibility for CI/CD.

### NFR-CONF-003: ESLint Strictness

The ESLint config MUST enable:

- `@typescript-eslint/strict-type-checked`
- `@typescript-eslint/no-explicit-any` as error (not warn)
- `react/jsx-key` (Preact JSX key checks)
- `no-console` as warn (service worker MAY use console)
- `prefer-const` as error

#### Scenario: Lint catches `any`

- GIVEN a file uses `any` without an eslint-disable comment
- WHEN `npm run lint` runs
- THEN ESLint MUST report `@typescript-eslint/no-explicit-any` as an error
- AND the lint run MUST exit with code 1

### NFR-CONF-004: Prettier Integration

ESLint and Prettier MUST NOT conflict. The ESLint config MUST use `eslint-config-prettier` to disable formatting rules that Prettier handles.

### NFR-CONF-005: Minimum Node.js Version

`package.json` MUST specify `"engines": { "node": ">=20.0.0" }` to ensure Native Host SEA compatibility.

### NFR-CONF-006: Test Setup

`vitest.config.ts` MUST:

- Use `jsdom` environment for DevTools panel tests
- Provide `chrome` global mock via `globals.setup`
- Enable TypeScript via `vite` tsconfig
- Set `testSetup` to a file that polyfills `chrome.*` APIs as no-ops

---

## Interface Contracts

```typescript
// BuildConfig — structure expected by esbuild.config.mjs
interface BuildConfig {
  entries: Array<{
    in: string;      // Source path
    out: string;     // Relative output path
    format: 'esm' | 'iife' | 'cjs';
    target?: string; // e.g., 'chrome110', 'node20'
    jsx?: 'automatic' | 'transform';
    loader?: Record<string, 'text' | 'copy' | 'file'>;
  }>;
  copy: Array<{
    from: string;
    to: string;
  }>;
  outdir: string;          // Default: 'dist'
  manifestEntry: string;   // Path to manifest.ts
  production: boolean;      // NODE_ENV === 'production'
}
```

---

## Dependencies

| Dependency | Version | Purpose | Type |
|-----------|---------|---------|------|
| `typescript` | `~5.5.0` | Type checking | dev |
| `esbuild` | `^0.24.0` | Bundler | dev |
| `preact` | `^10.25.0` | UI framework | dependency |
| `@types/chrome` | latest | Chrome API types | dev |
| `vitest` | `^2.0.0` | Test runner | dev |
| `eslint` | `^9.0.0` | Linter | dev |
| `@typescript-eslint/*` | latest | TS lint rules | dev |
| `eslint-config-prettier` | latest | Prettier integration | dev |
| `prettier` | `^3.3.0` | Formatter | dev |
| `jsdom` | `^24.0.0` | DOM env for tests | dev |
| `madge` | `^7.0.0` | Circular dep detection | dev |

**Dependency direction**: Root `package.json` is the single source. Native host has its own `package.json` with only Node.js built-in deps.

---

## Project Policy Integration

### FR-CONF-POL-001: Environment Validation Script

`package.json` MUST include a `validate:env` script that runs before any CI build:

```json
{
  "scripts": {
    "validate:env": "node scripts/validate-env.js",
    "prebuild": "npm run validate:env"
  }
}
```

`scripts/validate-env.js`:
```javascript
// scripts/validate-env.js
const required = [
  'CHROME_WEBSTORE_CLIENT_ID',
  'CHROME_WEBSTORE_CLIENT_SECRET',
  'CHROME_WEBSTORE_REFRESH_TOKEN'
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`  - ${key}`));
  process.exit(1);
}

console.log('✅ All required environment variables present');
process.exit(0);
```

**Traceability**: Project policy — Environment Validation (FR-POL-015).

---

### FR-CONF-POL-002: Native Host Build Scripts

`package.json` MUST include scripts for native host cross-compilation:

```json
{
  "scripts": {
    "build:host": "node scripts/build-host.js",
    "build:host:linux": "npm run build:host -- --os=linux",
    "build:host:macos": "npm run build:host -- --os=macos",
    "build:host:windows": "npm run build:host -- --os=windows",
    "build:all": "npm run build && npm run build:host:linux && npm run build:host:macos && npm run build:host:windows"
  }
}
```

`scripts/build-host.js` uses esbuild targeting Node.js for the current platform (or cross-compiled via `--platform` flag).

**Traceability**: Project policy — Native Host Security (FR-POL-013) + GitHub Releases (FR-POL-010).

---

### FR-CONF-POL-003: Quality Gate Scripts

`package.json` MUST expose explicit scripts for each quality gate:

```json
{
  "scripts": {
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --check src/",
    "format:fix": "prettier --write src/",
    "typecheck": "tsc --noEmit -p tsconfig.extension.json -p tsconfig.native-host.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "validate:arch": "madge --circular --extensions ts src/",
    "audit:deps": "npm audit --audit-level=high",
    "validate:all": "npm run lint && npm run format && npm run typecheck && npm run test && npm run validate:arch && npm run audit:deps"
  }
}
```

CI workflow runs `npm run validate:all` as the single quality gate.

**Traceability**: Project policy — Quality Validation (FR-POL-019).

---

### FR-CONF-POL-004: Dependabot Configuration

`.github/dependabot.yml` MUST be present:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    target-branch: "develop"
    groups:
      minor-patch:
        patterns: ["*"]
        update-types: ["minor", "patch"]
    auto-merge:
      patch: true
      minor: true
      major: false
    ignore:
      - dependency-name: "@types/chrome"
        update-type: "version-update:semver-major"
      - dependency-name: "typescript"
        update-type: "version-update:semver-major"
      - dependency-name: "esbuild"
        update-type: "version-update:semver-major"
```

**Traceability**: Project policy — Dependency Management (FR-POL-007).

---

### FR-CONF-POL-005: Release Workflow Scripts

`package.json` MUST include release automation:

```json
{
  "scripts": {
    "release": "standard-version --release-as",
    "release:patch": "npm run release patch",
    "release:minor": "npm run release minor",
    "release:major": "npm run release major",
    "postrelease": "git push --follow-tags origin main && npm run build:all && npm run zip"
  }
}
```

Uses `standard-version` with Conventional Commits to generate changelog and tag.

**Traceability**: Project policy — Semantic Versioning (FR-POL-008), Changelog (FR-POL-009), GitHub Releases (FR-POL-010).

---

## Dependencies

| Dependency | Version | Purpose | Type |
|-----------|---------|---------|------|
| `typescript` | `~5.5.0` | Type checking | dev |
| `esbuild` | `^0.24.0` | Bundler | dev |
| `preact` | `^10.25.0` | UI framework | dependency |
| `@types/chrome` | latest | Chrome API types | dev |
| `vitest` | `^2.0.0` | Test runner | dev |
| `eslint` | `^9.0.0` | Linter | dev |
| `@typescript-eslint/*` | latest | TS lint rules | dev |
| `eslint-config-prettier` | latest | Prettier integration | dev |
| `prettier` | `^3.3.0` | Formatter | dev |
| `jsdom` | `^24.0.0` | DOM env for tests | dev |
| `madge` | `^7.0.0` | Circular dep detection | dev |
| `standard-version` | `^9.5.0` | Automated versioning/changelog | dev |
| `zod` | `^3.23.0` | Schema validation | dependency |
| `dotenv` | `^16.4.0` | Env loading (native host) | dependency |

**Dependency direction**: Root `package.json` is the single source. Native host has its own `package.json` with only Node.js built-in deps.

---

## Test Scenarios

| ID | Type | Description | Automation |
|----|------|-------------|------------|
| T-CONF-001 | Unit | `package.json` scripts are all callable | `npm run` check |
| T-CONF-002 | Unit | TypeScript strict mode is enabled | Parse `tsconfig.*.json` |
| T-CONF-003 | Integration | Build produces expected file structure | `npm run build && ls dist/` |
| T-CONF-004 | Integration | ESLint runs without errors on valid code | `npm run lint` |
| T-CONF-005 | Integration | Prettier formats without changing valid code | `npm run format --check` |
| T-CONF-006 | Integration | Native host builds and runs | `npm run build:host && node dist/native-host/host.node.js --help` |
| T-CONF-007 | Integration | Zip script creates valid archive | `npm run zip && unzip -t dist/extension.zip` |
| T-CONF-008 | Integration | Clean and rebuild cycle | `npm run clean && npm run build && ls dist/` |
| T-CONF-009 | E2E | Circular dependency check passes | `npx madge --circular dist/` |
| T-CONF-010 | E2E | Full pipeline: clean → build → lint → typecheck → test → zip | Sequential `npm run` commands exit 0 |

---

## Error Scenarios

| Error | Cause | Behavior |
|-------|-------|----------|
| Missing `src/manifest.ts` | File not created | Build fails with "ENOENT: manifest.ts not found" |
| Invalid `tsconfig.json` | Syntax error in JSONC | `tsc` reports parse error with line number |
| Missing icon file | Developer hasn't added icons | Warning emitted, build continues |
| Node.js < 20 | Developer on older Node | `npm install` fails with engines warning |
| Circular import | Accidental cycle in sources | `npm run lint` catches via `madge` |
