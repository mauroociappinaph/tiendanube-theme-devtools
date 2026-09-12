import { usePanelStore } from '../store/panelStore';

export function LocalRemoteToggle() {
  const store = usePanelStore();

  const handleClick = () => {
    const next = store.themeMode.value === 'local' ? 'remote' : 'local';
    store.themeMode.value = next;
  };

  const isActive = store.themeMode.value === 'remote';

  return (
    <button
      class={`toggle${isActive ? ' active' : ''}`}
      onClick={handleClick}
      type="button"
    >
      <span class="toggle-label">
        <span class="toggle-indicator" />
        {store.themeMode.value === 'local' ? 'Local' : 'Remote'}
      </span>
      <span>{store.themeMode.value}</span>
    </button>
  );
}