# Content Inspector Specification

**Change**: `scaffold`
**Spec**: 05-content-inspector
**Date**: 2026-07-16

---

## Purpose

Define the content script inspector that runs on Tiendanube pages. The inspector is **split into focused modules** (SRP) orchestrated by an `InspectorController`. It classifies the page, maps DOM elements to Liquid files, manages hover inspection with throttling, injects badges, and communicates via Chrome runtime messaging — all while maintaining a clear state machine for inspect mode lifecycle.

---

## Architecture (SRP Split)

```
src/content/
├── inspector.ts                    # Entry point — initializes controller, registers listeners
├── InspectorController.ts          # Orchestrator — wires modules, manages state machine
├── InspectorStateMachine.ts        # State machine: idle → detecting → ready → inspecting → cleaning
├── PageDetector.ts                 # Classifies page type (storefront, admin_themes, checkout, unknown)
├── LiquidMapper.ts                 # Pure function: element → LiquidFileMapping (no DOM, no messaging)
├── HoverHandler.ts                 # Throttled hover (150ms), IntersectionObserver, RAF positioning
├── BadgeManager.ts                 # Badge injection, positioning, cleanup (interface + impl)
├── SPANavigationHandler.ts         # MutationObserver + history.pushState patching for SPA navigation
├── MessageHandler.ts               # Message routing: ACTIVATE/DEACTIVATE_INSPECT, PAGE_DETECTED, HOVER_EVENT
└── Throttle.ts                     # 150ms debounce + RAF helpers
```

**Traceability**: Hexagonal — each module is a focused adapter; `InspectorController` is the composition root.

---

## State Machine (Inspector Lifecycle)

```
                    ┌─────────────┐
                    │    IDLE     │
                    └──────┬──────┘
                           │ content script loads
                           ▼
                    ┌─────────────┐
                    │  DETECTING  │ ── page classification
                    └──────┬──────┘
                           │ pageType !== unknown
                           ▼
                    ┌─────────────┐
                    │    READY    │ ── inspect mode OFF, listening for ACTIVATE_INSPECT
                    └──────┬──────┘
                           │ ACTIVATE_INSPECT received
                           ▼
                    ┌─────────────┐
                    │ INSPECTING  │ ── hover → badge → hover event → background
                    └──────┬──────┘
                           │ DEACTIVATE_INSPECT │ page navigation │ disconnect
                           ▼
                    ┌─────────────┐
                    │  CLEANING   │ ── remove badges, detach listeners, reset state
                    └──────┬──────┘
                           │ cleanup complete
                           ▼
                    ┌─────────────┐
                    │    READY    │ (or IDLE if disconnect)
                    └─────────────┘
```

**Traceability**: Explicit state machine prevents invalid transitions (e.g., badge injection in IDLE).

---

## Functional Requirements

### FR-CI-001: Page Detection (`PageDetector.ts`)

Classifies the current page into one of:

| Page Type | URL Pattern | Detection Method |
|-----------|-------------|------------------|
| `storefront` | `*.tiendanube.com` / custom domain with Tiendanube DNS | `<meta name="nuvemshop-id">` or `window.Tiendanube` global |
| `admin_themes` | `*.mitiendanube.com/admin/themes/*` | URL path contains `/admin/themes/` |
| `checkout` | `*.mitiendanube.com/checkout/*` | URL path contains `/checkout/` |
| `unknown` | Any other URL | Fallback when no Tiendanube indicators are found |

#### Scenario: Storefront page detected
- GIVEN the user navigates to `mitiendanube.com` or custom domain
- WHEN the content script initializes
- THEN it MUST detect `<meta name="nuvemshop-id" content="...">` in the DOM
- AND classify the page as `storefront`
- AND emit `PageDetectedEvent { pageType: "storefront", confidence: "high", method: "meta_tag", nuvemshopId: "..." }`

#### Scenario: Admin themes page detected
- GIVEN the user navigates to `*.mitiendanube.com/admin/themes/current`
- WHEN the content script initializes
- THEN it MUST match the URL pattern `/admin/themes/`
- AND classify the page as `admin_themes`
- AND enable inspect mode capability

#### Scenario: Non-Tiendanube page
- GIVEN the user visits `example.com`
- WHEN the content script initializes
- THEN it MUST classify as `unknown`
- AND NOT inject badges, overlays, or send Tiendanube messages

---

### FR-CI-002: Liquid File Mapping (`LiquidMapper.ts` — **Pure Function**)

Maps a DOM element to its originating Liquid file using priority order:

1. `data-liquid-file` attribute (most reliable — injected by theme)
2. `data-section-id` → maps to `sections/{id}.liquid`
3. `data-block-id` → maps to `blocks/{id}.liquid`
4. DOM heuristics: class → section name, id → template name, parent traversal

**Interface**:
```typescript
// src/content/LiquidMapper.ts
export interface LiquidFileMapping {
  liquidFile: string;
  confidence: 'high' | 'medium' | 'low';
  mappingMethod: 'data-liquid-file' | 'data-section-id' | 'data-block-id' | 'heuristic' | 'unknown';
  templateType?: 'section' | 'block' | 'template' | 'snippet';
}

export function mapElementToLiquidFile(element: Element): LiquidFileMapping {
  // 1. data-liquid-file
  const direct = element.getAttribute('data-liquid-file');
  if (direct) return { liquidFile: direct, confidence: 'high', mappingMethod: 'data-liquid-file' };

  // 2. data-section-id
  const sectionId = element.closest('[data-section-id]')?.getAttribute('data-section-id');
  if (sectionId) return { liquidFile: `sections/${sectionId}.liquid`, confidence: 'high', mappingMethod: 'data-section-id', templateType: 'section' };

  // 3. data-block-id
  const blockId = element.closest('[data-block-id]')?.getAttribute('data-block-id');
  if (blockId) return { liquidFile: `blocks/${blockId}.liquid`, confidence: 'high', mappingMethod: 'data-block-id', templateType: 'block' };

  // 4. Heuristics
  const className = element.className;
  if (className.includes('product-')) return { liquidFile: `sections/product.liquid`, confidence: 'medium', mappingMethod: 'heuristic', templateType: 'section' };
  if (className.includes('header-')) return { liquidFile: `sections/header.liquid`, confidence: 'medium', mappingMethod: 'heuristic', templateType: 'section' };
  if (className.includes('footer-')) return { liquidFile: `sections/footer.liquid`, confidence: 'medium', mappingMethod: 'heuristic', templateType: 'section' };

  // 4. Parent traversal
  let parent = element.parentElement;
  while (parent) {
    const mapped = mapElementToLiquidFile(parent);
    if (mapped.confidence !== 'low') return { ...mapped, confidence: 'medium', mappingMethod: 'heuristic' };
    parent = parent.parentElement;
  }

  // 5. Unknown
  return { liquidFile: 'unknown.liquid', confidence: 'low', mappingMethod: 'unknown' };
}
```

**Traceability**: Pure function — no DOM mutation, no messaging, no side effects. Testable in isolation.

---

### FR-CI-003: Hover Handling (`HoverHandler.ts`)

- **Throttle**: 150ms debounce (configurable)
- **IntersectionObserver**: Only process hover for elements currently visible in viewport
- **RAF Positioning**: Badge position updated via `requestAnimationFrame` (not scroll listener)
- **Pointer Events**: Uses `pointermove` (covers mouse + touch) with `pointerenter`/`pointerleave`

#### Scenario: Fast mouse movement
- GIVEN the user moves mouse rapidly across elements
- WHEN hover events fire rapidly
- THEN only ONE badge update per 150ms window
- AND intermediate elements are skipped

#### Scenario: Steady hover
- GIVEN user pauses over element for 300ms
- WHEN debounce resolves
- THEN badge shows for final element
- AND remains while pointer stays on element

#### Scenario: Element leaves viewport
- GIVEN badge is visible
- WHEN element scrolls out of view
- THEN badge is removed (cleanup)

---

### FR-CI-004: Badge Injection (`BadgeManager.ts` — Interface + Implementation)

**Interface** (for testability / future renderers):
```typescript
// src/content/BadgeManager.ts
export interface BadgeManager {
  show(mapping: LiquidFileMapping, rect: DOMRect): void;
  hide(): void;
  destroy(): void;
}

export class DOMBadgeManager implements BadgeManager {
  private badge: HTMLElement | null = null;

  show(mapping: LiquidFileMapping, rect: DOMRect): void {
    this.hide(); // Only one badge at a time
    const badge = document.createElement('div');
    badge.className = 'tiendanube-inspector-badge';
    badge.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      background: #1a1a2e;
      color: #e0e0e0;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 300px;
    `;
    badge.textContent = `📁 ${mapping.liquidFile.length > 60 ? mapping.liquidFile.slice(0, 57) + '...' : mapping.liquidFile}`;
    document.body.appendChild(badge);
    this.badge = badge;
    this.updatePosition(rect);
  }

  updatePosition(rect: DOMRect): void {
    if (!this.badge) return;
    this.badge.style.left = `${rect.left + 8}px`;
    this.badge.style.top = `${rect.top - this.badge.offsetHeight - 8}px`;
  }

  hide(): void {
    this.badge?.remove();
    this.badge = null;
  }

  destroy(): void {
    this.hide();
  }
}
```

**Traceability**: Interface allows `CanvasBadgeManager` (future) without changing `HoverHandler`.

---

### FR-CI-005: SPA Navigation (`SPANavigationHandler.ts`)

Uses `MutationObserver` + `history.pushState` patching + monkey-patched `history.pushState`/`replaceState`:

```typescript
// src/content/SPANavigationHandler.ts
export function initSPANavigationHandler(onNavigate: () => void): () => void {
  const observer = new MutationObserver(() => {
    // Detect theme editor content replacement
    if (document.querySelector('[data-nuvemshop-theme-editor]')) {
      onNavigate();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    onNavigate();
  };
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    onNavigate();
  };
  window.addEventListener('popstate', onNavigate);

  return () => {
    observer.disconnect();
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', onNavigate);
  };
}
```

#### Scenario: Theme editor content replacement
- GIVEN user is in admin theme editor
- WHEN Liquid editor saves and page content is replaced via AJAX
- THEN `MutationObserver` detects DOM replacement
- AND `onNavigate()` triggers full re-detection + cleanup

---

### FR-CI-005: Badge Cleanup

`InspectorController.cleanup()` orchestrates:
1. `badgeManager.destroy()`
2. `hoverHandler.destroy()` (removes listeners)
3. `spaNavigationHandler.destroy()`
4. State machine → `CLEANING` → `READY`

#### Scenario: Deactivation
- GIVEN inspect mode active with visible badge
- WHEN `DEACTIVATE_INSPECT` received
- THEN all badges removed, listeners detached, state → `CLEANING` → `READY`

#### Scenario: Tab close / extension reload
- GIVEN content script unloading
- WHEN `disconnect` event fires
- THEN `InspectorController.destroy()` called
- THEN all resources released

---

### FR-CI-006: Chrome Runtime Messaging (`MessageHandler.ts`)

Uses **shared message types** from `src/shared/messaging.ts` (no duplication).

#### Incoming Messages (from Background/DevTools)
| Type | Payload | Response |
|------|---------|----------|
| `ACTIVATE_INSPECT` | `{}` | `{ active: true }` |
| `DEACTIVATE_INSPECT` | `{}` | `{ active: false }` |
| `PAGE_DETECTED` | `PageDetectionResult` | Acknowledged |

#### Outgoing Messages (to Background)
| Type | Payload |
|------|---------|
| `PAGE_DETECTED` | `{ pageType, confidence, method, nuvemshopId }` |
| `HOVER_EVENT` | `{ liquidFile, confidence, mappingMethod, elementTag, elementClasses, boundingRect }` |

#### Message Retry (Background Unavailable)
```typescript
// MessageHandler.ts
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

async function sendWithRetry(message: InspectorMessage): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await chrome.runtime.sendMessage(message);
      return;
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt - 1)));
    }
  }
}
```

---

### FR-CI-007: Inspector Controller (Composition Root)

`InspectorController.ts` wires all modules:

```typescript
// src/content/InspectorController.ts
export class InspectorController {
  private stateMachine: InspectorStateMachine;
  private pageDetector: PageDetector;
  private liquidMapper: LiquidMapper;
  private hoverHandler: HoverHandler;
  private badgeManager: BadgeManager;
  private spaHandler: SPANavigationHandler;
  private messageHandler: MessageHandler;

  constructor() {
    this.stateMachine = new InspectorStateMachine();
    this.pageDetector = new PageDetector();
    this.liquidMapper = new LiquidMapper();
    this.badgeManager = new DOMBadgeManager();
    this.hoverHandler = new HoverHandler(this.badgeManager, this.liquidMapper);
    this.spaHandler = new SPANavigationHandler(() => this.onNavigate());
    this.messageHandler = new MessageHandler(this);
  }

  async init(): Promise<void> {
    const detection = await this.pageDetector.detect();
    if (detection.pageType !== 'unknown') {
      this.stateMachine.transition('DETECTING', 'READY');
      this.spaHandler.init(() => this.onNavigate());
      this.messageHandler.init();
      this.sendPageDetected(detection);
    } else {
      this.stateMachine.transition('DETECTING', 'IDLE');
    }
  }

  private onNavigate(): void {
    this.cleanup();
    this.init(); // Re-detect page type
  }

  async activateInspect(): Promise<void> {
    this.stateMachine.transition('READY', 'INSPECTING');
    this.hoverHandler.activate();
  }

  async deactivateInspect(): Promise<void> {
    this.stateMachine.transition('INSPECTING', 'CLEANING');
    this.cleanup();
    this.stateMachine.transition('CLEANING', 'READY');
  }

  private cleanup(): void {
    this.badgeManager.destroy();
    this.hoverHandler.destroy();
    this.spaHandler.destroy();
  }
}
```

---

## Non-Functional Requirements

### NFR-CI-001: Bundle Size
- **Content script ≤ 10 KB gzipped** (esbuild IIFE format, tree-shaken)

### NFR-CI-002: Performance Budgets
| Metric | Budget | Enforcement |
|--------|--------|-------------|
| Hover latency (pointermove → badge visible) | ≤ 50ms | Unit test with fake timers |
| Badge render time | ≤ 10ms | RAF callback measurement |
| Memory (badges + listeners) | ≤ 5MB | Heap snapshot after deactivation |
| Bundle size (gz) | ≤ 10 KB | `esbuild --analyze` in CI |

### NFR-CI-003: No Layout Thrashing
- `getBoundingClientRect` called **once per hover** → cached → passed to badge
- All DOM mutations in `requestAnimationFrame` callback
- No `offsetTop`, `offsetHeight`, `clientHeight` in event handlers

### NFR-CI-004: CSP Compliance
- Badge HTML via `document.createElement` + `textContent` (no `innerHTML`)
- Styles via `element.style.*` (inline styles permitted for content scripts)
- No `eval`, `new Function`, or dynamic script injection

### NFR-CI-005: Memory Cleanup
- Post-deactivation heap snapshot: **0 references** to badge DOM nodes
- All `EventListener` detached (`removeEventListener` with same reference)
- `MutationObserver.disconnect()`, `IntersectionObserver.disconnect()`

---

## Interface Contracts (Shared with Background/DevTools)

From `src/shared/messaging.ts`:

```typescript
// Page detection
export interface PageDetectionResult {
  pageType: 'storefront' | 'admin_themes' | 'checkout' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: 'meta_tag' | 'url_pattern' | 'global_var' | 'fallback';
  nuvemshopId?: string;
}

// Liquid mapping
export interface LiquidFileMapping {
  liquidFile: string;
  confidence: 'high' | 'medium' | 'low';
  mappingMethod: 'data-liquid-file' | 'data-section-id' | 'data-block-id' | 'heuristic' | 'unknown';
  templateType?: 'section' | 'block' | 'template' | 'snippet';
}

// Hover event (content → background)
export interface HoverEventPayload {
  liquidFile: string;
  confidence: 'high' | 'medium' | 'low';
  mappingMethod: LiquidFileMapping['mappingMethod'];
  elementTag: string;
  elementClasses: string[];
  elementId?: string;
  boundingRect: { top: number; left: number; width: number; height: number };
}

// Content script messages use shared types from src/shared/messaging.ts
// Import with:
// import type { ExtensionMessage, PageDetectionResult, HoverEventPayload } from '@/shared/messaging';
//
// The relevant message types for content script are:
// - ExtensionMessage (discriminated union from shared/messaging.ts)
// - PageDetectionResult
// - HoverEventPayload
//
// This spec uses shared message types — NO local ContentMessage definition.
```

---

## Dependencies

| Module | Direction | Purpose |
|--------|-----------|---------|
| `src/shared/messaging.ts` | Imports | Shared message types (no duplication) |
| `src/shared/utils.ts` | Imports | `debounce`, `throttle`, `uuid`, `getBoundingRect`, `raf` |
| `src/shared/ports/StoragePort.ts` | May import | Read inspect mode toggle state |
| Chrome `runtime` API | Runtime | Messaging with background/DevTools |

---

## Test Scenarios

| ID | Type | Description |
|----|------|-------------|
| T-CI-001 | Unit | `PageDetector.detect()` returns correct type for each URL pattern |
| T-CI-002 | Unit | `LiquidMapper.map()` returns correct file for each data attribute priority |
| T-CI-003 | Unit | `debounce(150)` skips intermediate calls, fires final value |
| T-CI-004 | Unit | `DOMBadgeManager.show()` creates element with correct styles/position |
| T-CI-005 | Unit | `SPANavigationHandler` fires on `popstate` and `pushState` |
| T-CI-006 | Unit | `InspectorStateMachine` rejects invalid transitions |
| T-CI-007 | Unit | `HoverHandler` skips intermediate elements during fast movement |
| T-CI-008 | Unit | `InspectorController` transitions through state machine correctly |
| T-CI-009 | Integration | `InspectorController.init()` → detects page → sends `PAGE_DETECTED` |
| T-CI-010 | Integration | `ACTIVATE_INSPECT` → `hover` → `HOVER_EVENT` sent to background |
| T-CI-011 | Integration | SPA navigation → `onNavigate` → re-detection + cleanup |
| T-CI-012 | Integration | Background unreachable → message queued → retry with backoff |
| T-CI-013 | E2E | Real Tiendanube storefront loads without errors |
| T-CI-014 | E2E | Badge appears when hovering theme section in inspect mode |
| T-CI-015 | E2E | Badge cleanup on tab navigation / tab close |

---

## Error Scenarios

| Error | Cause | Behavior |
|-------|-------|----------|
| No meta tag | Page not Tiendanube | Content script silent — no badges, no messages |
| Badge overlap | Target has high z-index | Badge uses `z-index: 2147483647` + `pointer-events: none` |
| CSP blocks badge | Page has strict CSP | Badge uses `element.style.*` (permitted by content script CSP) |
| `chrome.runtime` disconnected | SW suspended | Messages queued, retried 3x with backoff, then dropped |
| DOM removed mid-hover | SPA unmounts element | Badge removed, next RAF detects orphan → cleanup |
| Long Liquid filename | `data-liquid-file` > 200 chars | Badge truncates to 60 chars + ellipsis |

---

## Traceability

| Requirement | Principle | File |
|-------------|-----------|------|
| FR-CI-001 | Hexagonal — Content Script Adapter | `PageDetector.ts` |
| FR-CI-002 | Pure domain logic | `LiquidMapper.ts` |
| FR-CI-003 | Performance budget | `HoverHandler.ts`, `Throttle.ts` |
| FR-CI-004 | Visual feedback | `BadgeManager.ts` |
| FR-CI-005 | Cleanup discipline | `InspectorController.cleanup()` |
| FR-CI-006 | Messaging protocol | `MessageHandler.ts` |
| FR-CI-007 | Composition root | `InspectorController.ts` |
| NFR-CI-001 | Bundle size budget | `esbuild.config.mjs` (IIFE) |
| NFR-CI-002 | No layout thrashing | `HoverHandler.ts` (RAF) |
| NFR-CI-004 | CSP compliance | `BadgeManager.ts` (createElement) |
| NFR-CI-005 | Memory cleanup | `InspectorController.destroy()` |

---

## Files Created in Scaffold

| Path | Purpose |
|------|---------|
| `src/content/inspector.ts` | Entry point |
| `src/content/InspectorController.ts` | Composition root + state machine |
| `src/content/InspectorStateMachine.ts` | State machine |
| `src/content/PageDetector.ts` | Page classification |
| `src/content/LiquidMapper.ts` | Pure Liquid mapping |
| `src/content/HoverHandler.ts` | Throttled hover + RAF |
| `src/content/BadgeManager.ts` | Interface + DOM implementation |
| `src/content/SPANavigationHandler.ts` | MutationObserver + history patching |
| `src/content/MessageHandler.ts` | Message routing + retry |
| `src/content/Throttle.ts` | 150ms debounce + RAF helpers |