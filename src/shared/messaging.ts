// src/shared/messaging.ts
// Canonical message types for all inter-adapter communication

import type { DomainError } from './errors';

export interface BaseMessage {
  correlationId: string;
  timestamp: number;
  source?: 'content' | 'background' | 'devtools' | 'native-host';
}

export type ExtensionMessage =
  // Content → Background
  | (BaseMessage & { type: 'PAGE_DETECTED'; payload: PageDetectionPayload })
  | (BaseMessage & { type: 'HOVER_EVENT'; payload: HoverEventPayload })
  // DevTools → Background → Content
  | (BaseMessage & { type: 'ACTIVATE_INSPECT'; payload?: undefined })
  | (BaseMessage & { type: 'DEACTIVATE_INSPECT'; payload?: undefined })
  // DevTools → Background
  | (BaseMessage & { type: 'SET_MODE'; payload: { mode: 'local' | 'remote' } })
  | (BaseMessage & { type: 'RELOAD_THEME'; payload: { themePath?: string } })
  // Background → DevTools
  | (BaseMessage & { type: 'THEME_RELOADED'; payload: { success: boolean; message: string } })
  | (BaseMessage & { type: 'GET_THEME_INFO'; payload?: undefined })
  | (BaseMessage & { type: 'THEME_INFO'; payload: { connected: boolean; version: string } })
  // Background ↔ Native Host
  | (BaseMessage & { type: 'NATIVE_COMMAND'; payload: { command: string; payload: unknown } })
  | (BaseMessage & { type: 'NATIVE_RESPONSE'; payload: { result?: unknown; error?: DomainError } })
  | (BaseMessage & { type: 'NATIVE_NOTIFICATION'; payload: { method: string; params: unknown } })
  // Native Host → Background (watch events)
  | (BaseMessage & { type: 'WATCH_EVENT'; payload: WatchEventPayload });

export interface PageDetectionPayload {
  pageType: 'storefront' | 'admin_themes' | 'checkout' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: 'meta_tag' | 'url_pattern' | 'global_var' | 'fallback';
  nuvemshopId?: string;
}

export interface HoverEventPayload {
  liquidFile: string;
  confidence: 'high' | 'medium' | 'low';
  mappingMethod: 'data-liquid-file' | 'data-section-id' | 'data-block-id' | 'heuristic' | 'unknown';
  elementTag: string;
  elementClasses: string[];
  elementId?: string;
  boundingRect: { top: number; left: number; width: number; height: number };
}

export interface WatchEventPayload {
  type: 'change' | 'error' | 'ready';
  file?: string;
  message?: string;
  timestamp: number;
}

export type MessagePayload<T extends ExtensionMessage['type']> =
  Extract<ExtensionMessage, { type: T }>['payload'];

export function createMessage<T extends ExtensionMessage['type']>(
  type: T,
  payload: MessagePayload<T>,
  source?: BaseMessage['source']
): Extract<ExtensionMessage, { type: T }> {
  return {
    type,
    payload,
    correlationId: crypto.randomUUID(),
    timestamp: Date.now(),
    source,
  } as Extract<ExtensionMessage, { type: T }>;
}