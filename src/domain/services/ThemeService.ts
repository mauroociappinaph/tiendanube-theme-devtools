// src/domain/services/ThemeService.ts

export interface ThemeService {
  pushTheme(themePath: string, force?: boolean): Promise<Result<void, DomainError>>;
  previewTheme(themePath: string): Promise<Result<string, DomainError>>; // returns preview URL
  watchTheme(themePath: string): Promise<Result<void, DomainError>>;
  getManifest(themePath: string): Promise<Result<ThemeManifest, DomainError>>;
  listThemeFiles(themePath: string): Promise<Result<ThemeFile[], DomainError>>;
}