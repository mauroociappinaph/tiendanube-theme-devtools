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
      if (msg.type === 'NATIVE_HOST_STATUS_CHANGED') {
        store.nativeHostStatus.value = 'connected';
      }
    });

    return unsubscribe;
  }, [onMessage, store]);

  return { connected: store.isConnected.value };
}