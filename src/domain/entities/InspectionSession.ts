// src/domain/entities/InspectionSession.ts
import { NativeHostStatus } from '../valueObjects/NativeHostStatus';

export interface InspectionSession {
  isActive: boolean;
  inspectMode: boolean;
  currentPageType: 'storefront' | 'admin_themes' | 'checkout' | 'unknown';
  hoverTarget: {
    liquidFile: string;
    confidence: 'high' | 'medium' | 'low';
    elementTag: string;
    elementClasses: string[];
    elementId?: string;
    boundingRect: { top: number; left: number; width: number; height: number };
  } | null;
  nativeHostStatus: NativeHostStatus;
}