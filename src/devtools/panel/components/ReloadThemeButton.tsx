import { usePanelStore } from '../store/panelStore';

export function ReloadThemeButton() {
  const store = usePanelStore();
  const s = store.status.value;
  const isLoading = s.type === 'loading';
  const isDisabled = !store.isConnected.value || isLoading;

  const handleClick = () => {
    if (isDisabled) return;
    store.setLoading('Reloading theme...');
  };

  return (
    <button
      class={`button${isLoading ? ' loading' : ''}`}
      onClick={handleClick}
      disabled={isDisabled}
      type="button"
      title={!store.isConnected.value ? 'Native host not connected' : undefined}
    >
      {isLoading && <span class="spinner" />}
      {isLoading ? 'Reloading...' : 'Reload Theme'}
    </button>
  );
}