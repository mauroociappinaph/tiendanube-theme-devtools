// src/shared/__tests__/messaging.test.ts
import { describe, it, expect } from 'vitest';
import { createMessage, type ExtensionMessage, type PageDetectionPayload } from '../messaging';

describe('Messaging types', () => {
  describe('createMessage', () => {
    it('creates message with correlationId and timestamp', () => {
      const msg = createMessage('GET_THEME_INFO', undefined, 'devtools');
      expect(msg.type).toBe('GET_THEME_INFO');
      expect(msg.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(typeof msg.timestamp).toBe('number');
      expect(msg.source).toBe('devtools');
    });

    it('includes payload when provided', () => {
      const payload: PageDetectionPayload = {
        pageType: 'storefront',
        confidence: 'high',
        detectionMethod: 'meta_tag',
        nuvemshopId: '12345',
      };
      const msg = createMessage('PAGE_DETECTED', payload, 'content');
      expect(msg.payload).toEqual(payload);
    });
  });

  describe('ExtensionMessage discriminated union', () => {
    it('narrows payload type on type check', () => {
      const msg: ExtensionMessage = createMessage('HOVER_EVENT', {
        liquidFile: 'sections/header.liquid',
        confidence: 'high',
        mappingMethod: 'data-liquid-file',
        elementTag: 'div',
        elementClasses: ['header'],
        boundingRect: { top: 10, left: 20, width: 100, height: 50 },
      }, 'content');

      if (msg.type === 'HOVER_EVENT') {
        // TypeScript should narrow payload to HoverEventPayload
        expect(msg.payload.liquidFile).toBe('sections/header.liquid');
        expect(msg.payload.confidence).toBe('high');
      }
    });

    it('has all required message types', () => {
      const types = [
        'PAGE_DETECTED',
        'HOVER_EVENT',
        'ACTIVATE_INSPECT',
        'DEACTIVATE_INSPECT',
        'SET_MODE',
        'RELOAD_THEME',
        'GET_THEME_INFO',
        'THEME_RELOADED',
        'THEME_INFO',
        'NATIVE_HOST_STATUS_CHANGED',
        'NATIVE_COMMAND',
        'NATIVE_RESPONSE',
        'NATIVE_NOTIFICATION',
        'WATCH_EVENT',
      ] as const;

      types.forEach((type) => {
        // Just verify the type exists in the union
        const msg = createMessage(type as ExtensionMessage['type'], undefined, 'test');
        expect(msg.type).toBe(type);
      });
    });
  });

  describe('correlationId uniqueness', () => {
    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const msg = createMessage('GET_THEME_INFO');
        ids.add(msg.correlationId);
      }
      expect(ids.size).toBe(100);
    });
  });
});