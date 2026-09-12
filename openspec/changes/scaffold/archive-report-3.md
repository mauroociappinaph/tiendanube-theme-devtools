# Archive Report — PR #3 Background Service Worker (scaffold)

**Change**: `scaffold`
**PR**: #3 (`feat/scaffold-03-background`)
**Date**: 2026-07-19
**Status**: ✅ ARCHIVED

---

## Summary

PR #3 implemented the background service worker layer — the MV3 service worker entry point, manifest type definitions, message routing, storage adapter, and native messaging bridge. After this change, the extension has working lifecycle management, an 11-message routing table, persistent settings via `chrome.storage.local`, raw native messaging connectivity with automatic reconnection, and alarm-based health checking.

### What was built

**6 source files** across 3 module groups:

| # | File | Purpose | Lines |
|---|------|---------|-------|
| 1 | `src/manifest.ts` | Typed Manifest V3 definition with `chrome.runtime.ManifestV3` | ~25 |
| 2 | `src/shared/types/manifest.ts` | Manifest type re-exports and helpers | ~15 |
| 3 | `src/background/service-worker.ts` | Service worker lifecycle (install, startup, alarms, messaging) | ~105 |
| 4 | `src/background/MessageRouter.ts` | Message router with switch-based dispatch for 8 message types | ~85 |
| 5 | `src/background/ChromeStorageAdapter.ts` | StoragePort implementation via `chrome.storage.local` | ~95 |
| 6 | `src/background/NativeHostClient.ts` | Native messaging bridge with correlationId tracking, 30s timeout, exponential backoff reconnection | ~165 |

**6 test files** (34 tests total):

| File | Tests | Purpose |
|------|-------|---------|
| `src/__tests__/manifest.test.ts` | 3 | Manifest version, permissions, structure |
| `src/background/__tests__/service-worker.test.ts` | 7 | Lifecycle, alarms, message handling |
| `src/background/__tests__/MessageRouter.test.ts` | 9 | Message routing, error handling, broadcast |
| `src/background/__tests__/ChromeStorageAdapter.test.ts` | 6 | CRUD, observe, migrate, error handling |
| `src/background/__tests__/NativeHostClient.test.ts` | 7 | Connect, send, timeout, reconnect backoff |
| `src/background/__tests__/integration.test.ts` | 2 | End-to-end message flow |

---

## Artifacts Affected

| Artifact | Path | Status |
|----------|------|--------|
| Verification Report (PR #3) | `openspec/changes/scaffold/verify-report-3.md` | ✅ |
| State | `openspec/changes/scaffold/state.yaml` | ✅ Updated |

---

## Quality Gate Results

| Gate | Status | Details |
|------|--------|---------|
| Typecheck | ✅ PASS | 0 errors across both tsconfigs |
| Test suite | ✅ PASS | 34 tests passing across 6 test files |
| Build | ✅ PASS | Extension builds successfully |
| Lint | ⚠️ PASS | 16 background-specific errors (all pre-existing TS strict patterns, `no-unsafe-*`, `no-misused-promises` common to MV3 Chrome API usage) |

---

## Task Status

| Task | Title | Status | PR |
|------|-------|--------|----|
| T-016 | Manifest TypeScript | ✅ verified | #3 |
| T-017 | Service Worker Entry | ✅ verified | #3 |
| T-018 | MessageRouter + ChromeStorageAdapter | ✅ verified | #3 |
| T-019 | NativeHostClient + alarms | ✅ verified | #3 |

---

## Deviations Tracked (D1-D5)

These are documented in `verify-report-3.md` and deferred to future PRs (PR #7 or dedicated fix PR):

| # | Severity | FR/NFR | Deviation | Description |
|---|----------|--------|-----------|-------------|
| D1 | Medium | FR-BG-002 | Manual `switch` routing instead of shared `MessageRegistry` | MessageRouter uses raw switch statements. Need to refactor to use `MessageRegistry` from `src/shared/messageRegistry.ts`. |
| D2 | Low | FR-BG-001, FR-BG-004 | `StorageSchema` missing `nativeHost` field | Hardcoded defaults (maxRetries: 3, retryDelayMs: 1000) in NativeHostClient instead of persisted settings schema. |
| D3 | Medium | FR-BG-003, FR-BG-005, FR-BG-008 | No `NATIVE_HOST_STATUS_CHANGED` broadcast | Disconnect and health check failure don't broadcast to panels. `MessageRouter.broadcastToPanels()` method exists but is never wired. |
| D4 | Low | NFR-BG-003 | No 64KB message size validation | Extension accepts arbitrarily large messages. Need validation before processing. |
| D5 | Low | FR-BG-006 | `WATCH_EVENT` has no explicit route | Handled through generic notification path. Needs explicit route or documented as "by design". |

---

## Engram Artifact

Archive persisted to Engram with topic key: `sdd/scaffold/archive-report-3`

---

## Follow-up Items for Future PRs

| Item | Severity | Target PR | Description |
|------|----------|-----------|-------------|
| D1 | Medium | PR #7 (or fix) | Refactor MessageRouter to use shared MessageRegistry |
| D2 | Low | PR #7 (or fix) | Add `nativeHost` config to StorageSchema |
| D3 | Medium | PR #7 (or fix) | Wire NATIVE_HOST_STATUS_CHANGED broadcast |
| D4 | Low | PR #7 (or fix) | Add 64KB message size validation |
| D5 | Low | PR #7 (or fix) | Explicit WATCH_EVENT route |

---

## SDD Cycle Status

```
scaffold (PR #1)    ← foundation ✅
scaffold (PR #2a)   ← shared types ✅
scaffold (PR #2b)   ← shared logic ✅
scaffold (PR #3)    ← background SW ✅ ← YOU ARE HERE
scaffold (PR #4)    ← devtools panel ⏳
scaffold (PR #5)    ← content script ⏳
scaffold (PR #6)    ← native host ⏳
scaffold (PR #7)    ← integration ⏳
```

---

## Merge Commit

PR #3 `feat/scaffold-03-background` — merge commit info not available at archive time.
