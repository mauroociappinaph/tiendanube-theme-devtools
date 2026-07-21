import { signal, computed } from '@preact/signals';

export type NativeHostStatus = 'connected' | 'disconnected' | 'pending' | 'error';
export type ThemeMode = 'local' | 'remote';

export type StatusBarState =
  | { type: 'ready' }
  | { type: 'disconnected' }
  | { type: 'host_not_found' }
  | { type: 'loading'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

interface PanelStore {
  nativeHostStatus: ReturnType<typeof signal<NativeHostStatus>>;
  inspectMode: ReturnType<typeof signal<boolean>>;
  themeMode: ReturnType<typeof signal<ThemeMode>>;
  status: ReturnType<typeof signal<StatusBarState>>;
  isConnected: ReturnType<typeof computed<boolean>>;
  setLoading: (message: string) => void;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
}

function createPanelStore(): PanelStore {
  const nativeHostStatus = signal<NativeHostStatus>('pending');
  const inspectMode = signal<boolean>(false);
  const themeMode = signal<ThemeMode>('remote');
  const status = signal<StatusBarState>({ type: 'ready' });

  const isConnected = computed<boolean>(() =>
    nativeHostStatus.value === 'connected' && status.value.type !== 'error',
  );

  return {
    nativeHostStatus,
    inspectMode,
    themeMode,
    status,
    isConnected,
    setLoading(message: string) {
      status.value = { type: 'loading', message };
    },
    setSuccess(message: string) {
      status.value = { type: 'success', message };
      setTimeout(() => {
        if (
          status.value.type === 'success' &&
          status.value.message === message
        ) {
          status.value = { type: 'ready' };
        }
      }, 3000);
    },
    setError(message: string) {
      status.value = { type: 'error', message };
    },
  };
}

export const panelStore = createPanelStore();

export function usePanelStore() {
  return panelStore;
}