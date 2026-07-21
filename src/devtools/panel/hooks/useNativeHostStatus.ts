import { useEffect } from 'preact/hooks';
import { usePanelStore } from '../store/panelStore';
import { useChromeRuntime } from './useChromeRuntime';
import type { ExtensionMessage } from '@shared/messaging';

export function useNativeHostStatus(): void {
  const store = usePanelStore();
  const { onMessage, sendMessage } = useChromeRuntime();

  useEffect(() => {
    const unsubscribe = onMessage((msg: ExtensionMessage) => {
      if (msg.type === 'NATIVE_HOST_STATUS_CHANGED') {
        store.nativeHostStatus.value = 'connected';
      }
    });

    // Initial health check
    sendMessage({ type: 'GET_THEME_INFO' })
      .then(() => {
        store.nativeHostStatus.value = 'connected';
      })
      .catch(() => {
        store.nativeHostStatus.value = 'disconnected';
      });

    return unsubscribe;
  }, [onMessage, sendMessage, store]);
}