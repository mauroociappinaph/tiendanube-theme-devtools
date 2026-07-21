import type { ExtensionMessage, NativeHostStatus, ThemeMode } from '@shared/messaging';

export type { ExtensionMessage, NativeHostStatus, ThemeMode };

export interface StatusBarProps {
  status: StatusBarState;
}

export type StatusBarState =
  | { type: 'ready' }
  | { type: 'disconnected' }
  | { type: 'host_not_found' }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

export interface LocalRemoteToggleProps {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  disabled: boolean;
}

export interface ReloadThemeButtonProps {
  onReload: () => Promise<unknown>;
  disabled: boolean;
  nativeHostStatus: NativeHostStatus;
}

export interface InspectModeToggleProps {
  active: boolean;
  onToggle: (active: boolean) => void;
  disabled: boolean;
}

export interface ChromeRuntimeHook {
  connected: boolean;
  nativeHostStatus: NativeHostStatus;
  sendMessage: <T>(message: ExtensionMessage) => Promise<T>;
}