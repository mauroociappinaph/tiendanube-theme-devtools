import { useEffect } from 'preact/hooks';
import { usePanelStore } from '../store/panelStore';
import { useChromeRuntime } from './useChromeRuntime';
import type { ExtensionMessage } from '@shared/messaging';

export interface ConnectionState {
  connected: boolean;
}

export function useConnectionState(): ConnectionState {
  const store = usePanelStore();
  const { onMessage } = useChromeRuntime();

  useEffect(() => {
    const unsubscribe = onMessage((msg: ExtensionMessage) => {
      if (msg.type === 'THEME_INFO') {
        store.nativeHostStatus.value = msg.payload.connected ? 'connected' : 'disconnected';
      }
    });

    return unsubscribe;
  }, [onMessage, store]);

  return { connected: store.isConnected.value };
}