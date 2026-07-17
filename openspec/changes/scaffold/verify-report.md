# Verification Report — PR #1 Foundation

**Change**: `scaffold`
**PR**: #1 (`feat/scaffold-01-foundation`)
**Date**: 2026-07-17
**Mode**: Full (Tasks + Specs + Architecture + ADR)

---

## Completeness

| Task | Status | Files Created |
|------|--------|--------------|
| T-001 | ✅ Complete | `package.json` |
| T-002 | ✅ Complete | `tsconfig.json`, `tsconfig.extension.json`, `tsconfig.native-host.json` |
| T-003 | ✅ Complete | `esbuild.config.mjs` |
| T-004 | ✅ Complete | `eslint.config.mjs`, `.prettierrc`, `.prettierignore` |
| T-005 | ✅ Complete | `vitest.config.ts`, `vitest.native-host.config.ts`, `vitest.setup.ts`, `vitest.native-host.setup.ts` |
| T-006 | ✅ Complete | `.github/dependabot.yml`, `.env.example` |

All 6 tasks are implemented. All 14 root config files exist. 7 src stubs exist. **No incomplete tasks.**

---

## Build Evidence

| Command | Exit Code | Output Hash | Notes |
|---------|-----------|-------------|-------|
| `npm install` | 0 | — | 667 packages, clean |
| `npm run build` | 0 | `sha256:...` | Extension builds (4 entry points) |
| `npx tsc --noEmit -p tsconfig.extension.json` | **2** | `sha256:...` | **2 errors** — see below |
| `npx tsc --noEmit -p tsconfig.native-host.json` | 0 | `sha256:...` | Clean |
| `npm run lint` | 0 | — | 0 errors, 8 warnings (expected console stubs) |
| `npm run format` | 0 | — | All files match Prettier |
| `npm test` | **1** | — | No test files found (expected — tests come in PR #2) |
| `npm run validate:arch` | 0 | — | No circular dependencies |
| `node esbuild.config.mjs --host` | **1** | — | Expected — `src/native-host/main.ts` doesn't exist (PR #6) |

**Build time**: 0.19s user (NFR-ARCH-001 ✅ — well under 2s)

---

## Per-Task Acceptance Criteria

### T-001: package.json

| AC | Status | Evidence |
|----|--------|----------|
| AC-RC-01: npm install | ✅ | `npm install` completes in 3s, 667 packages |
| AC-RC-05: All scripts resolve | ✅ | All 22 scripts reference existing files/commands |
| AC-RC-06: clean + rebuild | ✅ | `npm run clean` removes dist/; `npm run build` recreates it |
| Workspaces: extension, native-host | ✅ | `"workspaces": ["extension", "native-host"]` |
| Node >=20 engine | ✅ | `"engines": {"node": ">=20.0.0"}` |
| Path aliases @shared, etc. | ✅ | `_moduleAliases` block with all 5 aliases |

**Note**: `build:host` points to `scripts/build-host.mjs` (T-035, PR #7) — non-existent currently. Verified `esbuild.config.mjs --host` also fails because `src/native-host/main.ts` doesn't exist (PR #6). The script assignment is correct per spec FR-CONF-POL-002, but won't resolve until PR #7.

### T-002: TypeScript configs (3 files)

| AC | Status | Evidence |
|----|--------|----------|
| AC-RC-03: project references | ✅ | `tsconfig.json` has `references: ["./tsconfig.extension.json", "./tsconfig.native-host.json"]` |
| AC-RC-07: ext typecheck | **❌** | `tsc --noEmit -p tsconfig.extension.json` fails with 2 errors |
| AC-RC-07: native-host typecheck | ✅ | `tsc --noEmit -p tsconfig.native-host.json` passes clean |
| Extension: strict | ✅ | `"strict": true` in tsconfig |
| Extension: path aliases | ✅ | 5 path aliases defined in tsconfig.extension.json |
| Extension: types chrome | ✅ | `"types": ["chrome"]` |
| Extension: jsx react-jsx | ✅ | `"jsx": "react-jsx"` |
| Extension: jsxImportSource preact | ✅ | `"jsxImportSource": "preact"` |
| Native-host: types node | ✅ | `"types": ["node"]` |
| Native-host: rootDir | ✅ | `"rootDir": "src/native-host"` |

**Typecheck errors**:
1. `src/content/inspector.ts(9,66)`: `error TS6133: 'sender' is declared but its value is never read` — `noUnusedLocals`/`noUnusedParameters` catches this via `strict`.
2. `src/shared/types/manifest.ts(1,39)`: `error TS2306: File '...@types/chrome/index.d.ts' is not a module` and `error TS6137: Cannot import type declaration files. Consider importing 'chrome' instead of '@types/chrome'` — the import `import type { ManifestV3Export } from '@types/chrome'` is incorrect; should use the `chrome` global type namespace.

### T-003: esbuild.config.mjs

| AC | Status | Evidence |
|----|--------|----------|
| AC-RC-02: All entries build | ⚠️ | 4 extension entries build. Native host entry blocked — `src/native-host/main.ts` not yet written (PR #6). `build:host` script doesn't exist (PR #7). |
| AC-RC-08: manifestPlugin | ✅ | `dist/manifest.json` generated with `"version": "0.1.0"` matching package.json. Production `key`/`debugger` stripping logic implemented. |
| Static assets copy | ✅ | `copyPlugin` configured for icons + native-host manifest; graceful warning on missing files |
| Native host CJS | ✅ | `--host` mode outputs ESM... actually CJS: `format: 'cjs'` ✓ |

**Deviation**: `esbuild.config.mjs` is 163 lines, exceeding the FR-ARCH-010 budget of 150 lines for this file specifically.

### T-004: ESLint + Prettier

| AC | Status | Evidence |
|----|--------|----------|
| AC-RC-04: eslint passes | ✅ | 0 errors, 8 warnings (all `no-console` in service-worker.ts, inspector.ts, devtools.ts — explicitly allowed per NFR-CONF-003) |
| no-explicit-any: error | ✅ | `'@typescript-eslint/no-explicit-any': 'error'` |
| react/jsx-key | ✅ | `'react/jsx-key': 'error'` |
| max-lines 300 | ✅ | `'max-lines': ['warn', { max: 300 }]` |
| max-lines-per-function 40 | ✅ | `'max-lines-per-function': ['warn', { max: 40 }]` |
| Prettier integration | ✅ | `eslint-config-prettier` is the last entry in the config |

### T-005: Vitest configs + mocks

| AC | Status | Evidence |
|----|--------|----------|
| AC-RC-05: vitest.config.ts | ⚠️ | Config exists with jsdom, aliases, coverage 80/80/70/80, setupFiles. But `npm test` exits 1 (no test files exist yet). |
| AC-RC-09: native-host config | ✅ | `vitest.native-host.config.ts` with `environment: 'node'` |
| vitest.setup.ts mocks | ✅ | Comprehensive chrome.* mocks: storage (local/sync/session), runtime, devtools, tabs, scripting, alarms + Preact signals mock + crypto.randomUUID polyfill |
| vitest.native-host.setup.ts | ✅ | Node env setup with dotenv mock + crypto polyfill |

**Note**: `npm test` failing with exit code 1 is expected for PR #1 — actual test files come in PR #2 onward. The vitest config is correctly structured; it just has nothing to run.

### T-006: Dependabot + .env.example

| AC | Status | Evidence |
|----|--------|----------|
| Weekly Monday 09:00 | ✅ | `interval: weekly`, `day: monday`, `time: "09:00"` |
| target-branch develop | ✅ | `target-branch: "develop"` |
| Group minor/patch | ✅ | `groups.minor-patch` with `update-types: ["minor", "patch"]` |
| Ignore majors | ✅ | `ignore` for `@types/chrome`, `typescript`, `esbuild` with `version-update:semver-major` |
| .env.example vars | ✅ | `NUBE_CLI_PATH`, `NODE_ENV`, `DEBUG`, `CHROME_WEBSTORE_CLIENT_ID`, `CHROME_WEBSTORE_CLIENT_SECRET`, `CHROME_WEBSTORE_REFRESH_TOKEN` |

---

## Architecture Compliance (Spec 00)

| Rule | Status | Evidence |
|------|--------|----------|
| FR-ARCH-001: Layer dirs | ✅ | `src/shared/`, `src/background/`, `src/devtools/`, `src/content/`, `src/native-host/` exist |
| FR-ARCH-002: Port interfaces | ⚠️ | Port interface stubs expected in `src/shared/ports/` but directory is empty (PR #2a) |
| FR-ARCH-009: strict, noImplicitAny, strictNullChecks | ✅ | All three enabled in `tsconfig.json` |
| FR-ARCH-010: esbuild ≤150 lines | **❌** | `esbuild.config.mjs` is 163 lines (162 excluding final newline) |
| NFR-ARCH-001: Build <2s | ✅ | 0.19s user time, 0.3s wall clock |
| NFR-ARCH-002: No timestamps | ✅ | `dist/manifest.json` has no timestamp or dynamic date fields |

---

## Issues Summary

### ❌ CRITICAL (blocking merge to develop)

| # | Issue | File | Fix |
|---|-------|------|-----|
| C1 | Typecheck fails: unused `sender` param | `src/content/inspector.ts:9` | Prefix parameter with `_sender` or remove it |
| C2 | Typecheck fails: `@types/chrome` import not a module | `src/shared/types/manifest.ts:1` | Change `import type { ManifestV3Export } from '@types/chrome'` to use `chrome.runtime.ManifestV3` directly, or change import to `import type { ManifestV3Export } from 'chrome'` |
| C3 | `npm test` exits with code 1 | `vitest.config.ts` | No test files found. Either add a minimal placeholder test (e.g., `src/shared/__tests__/placeholder.test.ts`) or configure `passWithNoTests: true` |

### ⚠️ WARNING

| # | Issue | File | Details |
|---|-------|------|---------|
| W1 | `esbuild.config.mjs` exceeds 150-line budget | `esbuild.config.mjs` | 163 lines vs 150 max per FR-ARCH-010 |
| W2 | `build:host` script broken until PR #7 | `package.json` | Points to `scripts/build-host.mjs` — doesn't exist yet |
| W3 | Missing `public/icons/` directory | — | Expected for PR #1 — icons are part of PR #7 (T-037) |
| W4 | `src/shared/ports/` directories exist but are empty | `src/shared/ports/` | Port interfaces expected per FR-ARCH-002, deferred to PR #2a |

### 💡 SUGGESTION

| # | Suggestion | Details |
|---|-----------|---------|
| S1 | Add `passWithNoTests: true` to vitest config | Allows `npm test` to pass 0-exit even without test files. Compatible with spec. |
| S2 | Add `"build:host:direct": "node esbuild.config.mjs --host"` fallback script | Would make native host build work from PR #1 when `src/native-host/main.ts` exists (PR #6) |

---

## Behavioral Compliance Matrix

| Scenario ID | Description | Coverage | Result |
|-------------|-------------|----------|--------|
| FR-CONF-001: Basic manifest | manifest.json created with version | Manual + build | ✅ PASS |
| FR-CONF-001: Production strips keys | key/debugger removal | Code review | ✅ PASS |
| FR-CONF-001: Missing manifest export | Error thrown | Code review | ✅ PASS |
| FR-CONF-002: All entries build | Build output | Build run | ⚠️ PASS (extension only; host deferred) |
| FR-CONF-002: Single entry failure | Error reporting | Code review | ✅ PASS |
| FR-CONF-003: Static asset copy | Files copied | Build output | ⚠️ PASS (warns on missing icons as designed) |
| FR-CONF-003: Missing icon file | Warning emitted | Build output | ✅ PASS |
| FR-CONF-004: Native host builds | --host mode | Code review | ⚠️ PASS (config present; source deferred to PR #6) |
| FR-CONF-006: Extension type checks | tsc --noEmit | **FAIL** | ❌ FAIL |
| FR-CONF-006: Native host type checks | tsc --noEmit | ✅ PASS |
| FR-CONF-007: All scripts resolve | npm run | ✅ PASS |
| FR-CONF-007: Clean removes dist | rm -rf dist/ | ✅ PASS |
| NFR-CONF-003: Lint catches any | eslint rule | ✅ PASS |
| NFR-CONF-004: Prettier integration | eslint-config-prettier | ✅ PASS |
| NFR-CONF-005: Node >=20 | engines field | ✅ PASS |
| NFR-CONF-006: Test setup | vitest config | ⚠️ PASS (config present; no tests yet) |
| FR-ARCH-009: Strict mode enabled | tsconfig | ✅ PASS |
| FR-ARCH-010: File size budget | max-lines rule | ⚠️ WARNING (esbuild.config.mjs over 150) |

---

## Final Verdict

```
╔══════════════════════════════════════════════════════╗
║              FAIL — Requires Fixes                   ║
╠══════════════════════════════════════════════════════╣
║ CRITICAL: 3                                          ║
║ WARNING:  4                                          ║
║ SUGGESTION: 2                                        ║
╚══════════════════════════════════════════════════════╝
```

### Required fixes before archive:

1. **C1** — Fix unused `sender` parameter in `src/content/inspector.ts:9` (prefix with `_`)
2. **C2** — Fix `@types/chrome` import in `src/shared/types/manifest.ts:1` (use `chrome` global type)
3. **C3** — Either add placeholder test or configure `passWithNoTests: true` in vitest config

### Recommendation:

Once the 3 critical issues are resolved, re-run `typecheck:ext`, `test`, and `validate:arch` to confirm green. The warnings are acceptable for PR #1 (deferred work in later PRs) and do not block merge. Proceed to **archive** phase after fixes are confirmed.
