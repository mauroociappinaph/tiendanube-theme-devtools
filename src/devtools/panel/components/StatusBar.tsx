import { usePanelStore } from '../store/panelStore';

function statusClass(store: ReturnType<typeof usePanelStore>): string {
  switch (store.status.value.type) {
    case 'loading':
      return 'status-loading';
    case 'success':
      return 'status-connected';
    case 'error':
      return 'status-error';
    case 'host_not_found':
      return 'status-host-not-found';
    case 'disconnected':
      return 'status-disconnected';
    case 'ready':
      return 'status-connected';
  }
}

function statusText(store: ReturnType<typeof usePanelStore>): string {
  switch (store.status.value.type) {
    case 'loading':
      return store.status.value.message;
    case 'success':
      return store.status.value.message;
    case 'error':
      return `Error: ${store.status.value.message}`;
    case 'host_not_found':
      return 'Native host not found';
    case 'disconnected':
      return 'Not connected';
    case 'ready':
      return 'Ready';
  }
}

export function StatusBar() {
  const store = usePanelStore();
  const cls = statusClass(store);
  const text = statusText(store);

  return (
    <div class={`status-bar ${cls}`}>
      <span class="status-dot" />
      <span>{text}</span>
    </div>
  );
}