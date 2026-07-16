# Content Inspector Specification

**Change**: `scaffold`
**Spec**: 05-content-inspector
**Date**: 2026-07-16

---

## Purpose

Define the content script inspector that runs on Tiendanube pages. The inspector detects whether the current page is a Tiendanube storefront, admin theme editor, or checkout page; maps DOM elements to their originating Liquid files via data attributes and DOM heuristics; injects hover badges showing the Liquid file path; and communicates with the background service worker and DevTools panel via Chrome runtime messaging.

---

## Functional Requirements

### FR-CI-001: Page Detection

`src/content/inspector.ts` MUST classify the current page into one of the following types:

| Page Type | URL Pattern | Detection Method |
|-----------|-------------|------------------|
| `storefront` | `*.tiendanube.com` / custom domain with Tiendanube DNS | `<meta name="nuvemshop-id">` or `window.Tiendanube` global |
| `admin_themes` | `*.mitiendanube.com/admin/themes/*` | URL path contains `/admin/themes/` |
| `checkout` | `*.mitiendanube.com/checkout/*` | URL path contains `/checkout/` |
| `unknown` | Any other URL | Fallback when no Tiendanube indicators are found |

**Traceability**: Page detection is the entry point — without classification, none of the other features activate.

#### Scenario: Storefront page detected

- GIVEN the user navigates to `mitiendanube.com` or any custom domain serving a Tiendanube store
- WHEN the content script initializes
- THEN it MUST detect `<meta name="nuvemshop-id" content="...">` in the DOM
- AND classify the page as `storefront`
- AND send `{ type: "PAGE_DETECTED", payload: { pageType: "storefront" } }` to the background

#### Scenario: Admin themes page detected

- GIVEN the user navigates to `*.mitiendanube.com/admin/themes/current`
- WHEN the content script initializes
- THEN it MUST match the URL pattern `/admin/themes/`
- AND classify the page as `admin_themes`
- AND enable the Liquid inspector overlay

#### Scenario: Unknown page with Tiendanube meta tag

- GIVEN a page on a custom domain that has `<meta name="nuvemshop-id">` but the URL does not match storefront/admin/checkout patterns
- WHEN the script detects the meta tag
- THEN it MUST classify the page as `storefront` (inference from meta tag presence)
- AND log a warning: `Page classified as storefront via meta tag — URL pattern unrecognized`

#### Scenario: Non-Tiendanube page

- GIVEN the user visits `example.com` (no Tiendanube indicators)
- WHEN the content script initializes
- THEN it MUST classify the page as `unknown`
- AND NOT inject any badges or overlays
- AND NOT send any Tiendanube-specific messages

### FR-CI-002: Liquid File Mapping via Data Attributes

The inspector MUST locate the Liquid file name for a DOM element using the following priority order:

1. `data-liquid-file` attribute (most reliable — injected by theme if available)
2. `data-section-id` attribute — maps to sections via `sections/{id}.liquid`
3. `data-block-id` attribute — maps to blocks via `blocks/{id}.liquid`
4. DOM heuristics fallback: `class` → section name, `id` → template name, parent traversal

**Traceability**: Mapping is the core heuristic — accuracy determines usability.

#### Scenario: Direct data attribute match

- GIVEN a `<div data-liquid-file="sections/product.liquid">` element
- WHEN the user hovers over it in inspect mode
- THEN the badge MUST show `sections/product.liquid`

#### Scenario: Section ID mapping

- GIVEN a `<section data-section-id="product-info">` element
- WHEN the user hovers over it
- THEN the inspector MUST map `product-info` to `sections/product-info.liquid`
- AND show the mapped file in the badge

#### Scenario: DOM heuristic fallback

- GIVEN an element with no data attributes but class `product-gallery-wrapper`
- WHEN the user hovers over it
- THEN the inspector MUST traverse up to find the nearest ancestor with a known mapping
- AND if a section container is found, use its mapping
- AND show "(inferred)" suffix in the badge: `sections/product.liquid (inferred)`

#### Scenario: No mapping found

- GIVEN an element with no data attributes, no section/block ancestors, and no heuristics match
- WHEN the user hovers over it
- THEN the badge MUST show `unknown.liquid`
- AND the hover event data MUST include `confidence: "low"`

### FR-CI-003: Hover Throttling

The inspector MUST throttle hover event processing to 150ms debounce. This prevents badge flickering and excessive DOM mutations during fast mouse movements.

**Traceability**: Performance requirement from NFR-ARCH-003 (performance budgets).

#### Scenario: Fast mouse movement

- GIVEN the user moves the mouse rapidly across multiple elements
- WHEN the inspector processes hover events
- THEN only ONE badge update MUST occur per 150ms window
- AND intermediate elements MUST be skipped

#### Scenario: Steady hover

- GIVEN the user pauses the mouse over an element for 300ms
- WHEN the `debounce(150ms)` resolves
- THEN the inspector MUST show the badge for the final hovered element
- AND the badge MUST remain visible as long as the mouse stays on the element

#### Scenario: Debounce isolation per element

- GIVEN the user hovers element A, then 100ms later moves to element B
- WHEN the 150ms debounce window expires
- THEN the badge MUST show element B's mapping (not A's)
- AND element A MUST NOT get a badge

### FR-CI-004: Badge Injection

When inspect mode is active and a hover event is processed, the inspector MUST inject a floating badge near the hovered element.

**Traceability**: Visual feedback is the primary UX mechanism.

#### Scenario: Badge appears on hover

- GIVEN inspect mode is active (message `{ type: "ACTIVATE_INSPECT" }` received)
- WHEN the user hovers over a mapped element
- THEN a badge SHALL be injected as a child of `<body>`
- AND the badge MUST be positioned 8px above the hovered element's top-left corner
- AND the badge MUST display: `📁 sections/product.liquid`

#### Scenario: Badge styling

- GIVEN a badge is injected
- THEN it MUST have the following CSS properties:
  - `position: fixed` (not absolute, to avoid scroll issues)
  - `z-index: 2147483647` (max safe z-index)
  - `background: #1a1a2e` (dark navy)
  - `color: #e0e0e0` (light grey text)
  - `padding: 4px 10px`
  - `border-radius: 4px`
  - `font-size: 12px`
  - `font-family: monospace`
  - `pointer-events: none` (clicks pass through)
  - `box-shadow: 0 2px 8px rgba(0,0,0,0.3)`

#### Scenario: Badge moves with scroll

- GIVEN a badge is visible
- WHEN the user scrolls the page
- THEN the badge position MUST update via `requestAnimationFrame` (not scroll event listener — performance)
- OR the badge MUST be removed if the hovered element scrolls out of view

#### Scenario: Multiple badges prevented

- GIVEN inspect mode is active
- WHEN the user hovers over multiple elements in sequence
- THEN only ONE badge MUST exist in the DOM at any time
- AND the previous badge MUST be removed before the new one is injected

### FR-CI-005: Badge Cleanup

The inspector MUST clean up all injected badges when inspect mode is deactivated, the page navigates, or the content script is unloaded.

#### Scenario: Deactivation removes badges

- GIVEN inspect mode is active and a badge is visible
- WHEN `{ type: "DEACTIVATE_INSPECT" }` is received
- THEN all injected badges MUST be removed from the DOM
- AND the hover event listener MUST be detached

#### Scenario: SPA navigation

- GIVEN a single-page application navigation occurs (pushState/replaceState)
- WHEN the URL changes
- THEN the inspector MUST detect the navigation via a `popstate` event (or monkeypatched history.pushState)
- AND remove all badges
- AND re-run page detection for the new URL

#### Scenario: Content script unload

- GIVEN the content script is being torn down (tab closed, extension reloaded)
- WHEN the `disconnect` event fires
- THEN all badges MUST be removed from the DOM
- AND all event listeners MUST be detached

### FR-CI-006: Chrome Runtime Messaging

The content script MUST communicate with the background and DevTools panel via `chrome.runtime.sendMessage` (one-shot) and `chrome.runtime.onMessage` (listener).

**Traceability**: Hexagonal — content script as Chrome adapter.

#### Scenario: Forward inspect event to background

- GIVEN inspect mode is active
- WHEN the user hovers over a mapped element
- THEN the content script MUST send:
  ```json
  {
    "type": "HOVER_EVENT",
    "payload": {
      "liquidFile": "sections/product.liquid",
      "confidence": "high",
      "elementTag": "div",
      "elementClasses": ["product-gallery", "wrapper"]
    },
    "correlationId": "uuid-...",
    "timestamp": 1234567890
  }
  ```
- AND MUST fire-and-forget (no response expected)

#### Scenario: Receive activate/deactivate from DevTools

- GIVEN the DevTools panel sends `{ type: "ACTIVATE_INSPECT" }`
- WHEN the message is dispatched via `chrome.runtime.onMessage`
- THEN the content script MUST activate inspect mode
- AND send a confirmation response: `{ type: "INSPECT_MODE_CHANGED", payload: { active: true } }`

#### Scenario: Connection loss handling

- GIVEN the background service worker is suspended
- WHEN the content script attempts to send a message
- THEN `chrome.runtime.sendMessage` MUST reject with an error
- AND the content script MUST catch the error and queue the message for retry
- AND retry up to 3 times with 1-second exponential backoff

---

## Non-Functional Requirements

### NFR-CI-001: Content Script Size

The bundled content script MUST NOT exceed 15KB gzipped. The script runs on every Tiendanube page and must not impact page load time.

### NFR-CI-002: Runtime Performance

Badge injection and hover processing MUST NOT cause layout jank. All DOM mutations MUST happen in `requestAnimationFrame` callbacks, not in the event handler directly.

#### Scenario: No forced layout

- GIVEN the content script processes a hover event
- WHEN it reads `getBoundingClientRect` on the hovered element
- THEN it MUST do so once, cache the result, and NOT call any other layout-triggering properties (offsetTop, clientHeight, etc.) within the same frame

### NFR-CI-003: Memory Cleanup

The content script MUST NOT leak DOM event listeners or badge elements. After deactivation, a heap snapshot MUST show zero references to badge DOM nodes.

### NFR-CI-004: CSP Compliance

The content script MUST NOT use `eval()`, `new Function()`, or inline `<script>` tags. Badge HTML MUST be created via `document.createElement` and `element.textContent` (not `.innerHTML`).

---

## Interface Contracts

```typescript
// Inspector classification result
type PageType = 'storefront' | 'admin_themes' | 'checkout' | 'unknown';

interface PageDetectionResult {
  pageType: PageType;
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: 'meta_tag' | 'url_pattern' | 'global_var' | 'fallback';
  nuvemshopId?: string;
}

// Liquid file mapping result
interface LiquidFileMapping {
  liquidFile: string;
  confidence: 'high' | 'medium' | 'low';
  mappingMethod: 'data-liquid-file' | 'data-section-id' | 'data-block-id' | 'heuristic' | 'unknown';
  templateType?: 'section' | 'block' | 'template' | 'snippet';
}

// Hover event payload sent to background
interface HoverEventPayload {
  liquidFile: string;
  confidence: 'high' | 'medium' | 'low';
  mappingMethod: LiquidFileMapping['mappingMethod'];
  elementTag: string;
  elementClasses: string[];
  elementId?: string;
  boundingRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

// Inspector message types (discriminated union)
type InspectorMessage =
  | { type: 'PAGE_DETECTED'; payload: PageDetectionResult; correlationId: string; timestamp: number }
  | { type: 'HOVER_EVENT'; payload: HoverEventPayload; correlationId: string; timestamp: number }
  | { type: 'ACTIVATE_INSPECT'; correlationId: string; timestamp: number }
  | { type: 'DEACTIVATE_INSPECT'; correlationId: string; timestamp: number }
  | { type: 'INSPECT_MODE_CHANGED'; payload: { active: boolean }; correlationId: string; timestamp: number }
  | { type: 'CLEANUP_BADGES'; correlationId: string; timestamp: number };

// Debounce utility (used in throttling)
type DebouncedFunction<T extends (...args: unknown[]) => unknown> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};
```

---

## Dependencies

| Module | Direction | Purpose |
|--------|-----------|---------|
| `src/shared/messaging.ts` | Imports types | Message type definitions |
| `src/shared/utils.ts` | Imports functions | `debounce`, `throttle`, `uuid`, `getBoundingRect` |
| `src/shared/storage.ts` | May import | For reading inspect mode toggle state |
| Chrome `runtime` API | Runtime | Messaging with background and DevTools |

---

## Test Scenarios

| ID | Type | Description | Automation |
|----|------|-------------|------------|
| T-CI-001 | Unit | `classifyPage()` returns correct type for each URL pattern | Vitest with URL mock |
| T-CI-002 | Unit | `mapElement()` returns correct Liquid file for each data attribute priority | Vitest with DOM mock |
| T-CI-003 | Unit | `debounce(150)` skips intermediate calls and fires final value | Vitest with fake timers |
| T-CI-004 | Unit | `injectBadge()` creates element with correct styles and position | Vitest with DOM mock |
| T-CI-005 | Unit | `removeBadges()` cleans up all injected elements | Vitest — count child nodes |
| T-CI-006 | Unit | `classifyPage()` returns `unknown` for non-Tiendanube URLs | Vitest with URL mock |
| T-CI-007 | Unit | `mapElement()` traverses up to find ancestor mapping | Vitest with nested DOM mock |
| T-CI-008 | Unit | Confidence level is `low` when no mapping found | Vitest with bare div mock |
| T-CI-009 | Unit | Badge position updates via RAF during scroll | Vitest with `requestAnimationFrame` mock |
| T-CI-010 | Integration | Messaging roundtrip: content ↔ background | Vitest with `chrome.runtime` mock |
| T-CI-011 | Integration | SPA navigation triggers re-classification | Vitest with `popstate` event mock |
| T-CI-012 | Integration | Content script recovers from `runtime.sendMessage` failure | Vitest with retry mock |
| T-CI-013 | E2E | Real Tiendanube storefront loads without errors | Playwright on `mitiendanube.com` |
| T-CI-014 | E2E | Badge appears when hovering over theme sections | Playwright — hover + assert badge visible |
| T-CI-015 | E2E | Badge cleanup on tab navigation | Playwright — navigate + assert no badge |

---

## Error Scenarios

| Error | Cause | Behavior |
|-------|-------|----------|
| No meta tag found | Page is not a Tiendanube store | Content script is silent — no badges, no messages |
| Badge overlap with page UI | Target element has high z-index | Badge uses `z-index: 2147483647` and `pointer-events: none` |
| CSP blocks badge style | Page has strict CSP | Badge uses inline styles via JS `element.style.*` (permitted by content script CSP rules) |
| `chrome.runtime` port disconnected | Service worker suspended | Messages queued, retried 3x with backoff, then silently dropped |
| DOM element removed mid-hover | SPA unmounts element during inspect | Badge removed, next RAF cycle detects orphan and cleans up |
| Very long Liquid file name | `data-liquid-file` has 200+ chars | Badge truncates to 60 chars with ellipsis: `sections/very-long-section-name-prod...liquid` |

---

## Traceability

| Requirement | Principle | File |
|-------------|-----------|------|
| FR-CI-001 | Hexagonal — Content Script Adapter | `src/content/inspector.ts` (classifyPage) |
| FR-CI-002 | Liquid file attribution | `src/content/inspector.ts` (mapElement) |
| FR-CI-003 | Performance budget | `src/shared/utils.ts` (debounce) |
| FR-CI-004 | Visual feedback | `src/content/inspector.ts` (injectBadge) |
| FR-CI-005 | Cleanup discipline | `src/content/inspector.ts` (cleanup) |
| FR-CI-006 | Messaging protocol | `src/content/inspector.ts` (messageHandlers) |
| NFR-CI-001 | Bundle size budget | `esbuild.config.mjs` (IIFE format) |
| NFR-CI-002 | No layout thrashing | `raf.ts` throttle helper |
| NFR-CI-004 | CSP compliance | Badge HTML via `createElement` |
