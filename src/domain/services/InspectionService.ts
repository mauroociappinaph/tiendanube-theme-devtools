// src/domain/services/InspectionService.ts

export interface LiquidFileMapping {
  liquidFile: string;
  confidence: 'high' | 'medium' | 'low';
  mappingMethod: 'data-liquid-file' | 'data-section-id' | 'data-block-id' | 'heuristic' | 'unknown';
}

export interface HoverEvent {
  liquidFile: string;
  confidence: 'high' | 'medium' | 'low';
  mappingMethod: 'data-liquid-file' | 'data-section-id' | 'data-block-id' | 'heuristic' | 'unknown';
  elementTag: string;
  elementClasses: string[];
  elementId?: string;
  boundingRect: { top: number; left: number; width: number; height: number };
}

export interface InspectionService {
  activateInspectMode(): void;
  deactivateInspectMode(): void;
  mapElementToLiquidFile(element: Element): LiquidFileMapping;
  handleHoverEvent(element: Element): HoverEvent;
  detectPageType(url: string, document: Document): 'storefront' | 'admin_themes' | 'checkout' | 'unknown';
}