import { usePanelStore } from '../store/panelStore';

function statusClass(status: ReturnType<typeof usePanelStore>['status']['value']): string {
  switch (status.type) {
    case 'loading': return 'status-loading';
    case 'success': return 'status-connected';
    case 'error': return 'status-error';
    case 'host_not_found': return 'status-host-not-found';
    case 'disconnected': return 'status-disconnected';
    default: return 'status-connected';
  }
}

function statusText(status: ReturnType<typeof usePanelStore>['status']['value']): string {
  switch (status.type) {
    case 'loading': return status.message;
    case 'success': return status.message;
    case 'error': return `Error: ${status.message}`;
    case 'host_not_found': return 'Native host not found';
    case 'disconnected': return 'Not connected';
    case 'ready': return 'Ready';
    default: return '';
  }
}

export function StatusBar() {
  const store = usePanelStore();

  const cls = statusClass(store.status.value);
  const text = statusText(store.status.value);

  return (
    <div class={`status-bar ${cls}`}>
      <span class="status-dot" />
      <span>{text}</span>
    </div>
  );
}