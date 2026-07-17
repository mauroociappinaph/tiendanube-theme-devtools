// src/domain/entities/Theme.ts
export interface ThemeFile {
  path: string;
  content: string;
  lastModified: number;
}

export interface ThemeManifest {
  name: string;
  version: string;
  author?: string;
  description?: string;
  preview_image?: string;
  settings_schema?: unknown;
}