import { useEffect } from 'preact/hooks';
import { usePanelStore } from '../store/panelStore';
import { useChromeRuntime } from './useChromeRuntime';
import { createMessage } from '@shared/messaging';

export function useNativeHostStatus(): void {
  const store = usePanelStore();
  const { onMessage, sendMessage } = useChromeRuntime();

  useEffect(() => {
    const unsubscribe = onMessage(() => {
      store.nativeHostStatus.value = 'connected';
    });

    sendMessage(createMessage('GET_THEME_INFO', undefined, 'devtools'))
      .then(() => {
        store.nativeHostStatus.value = 'connected';
      })
      .catch(() => {
        store.nativeHostStatus.value = 'disconnected';
      });

    return unsubscribe;
  }, [onMessage, sendMessage, store]);
}