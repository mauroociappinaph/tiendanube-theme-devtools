import { usePanelStore } from '../store/panelStore';

export function InspectModeToggle() {
  const store = usePanelStore();

  const handleClick = () => {
    store.inspectMode.value = !store.inspectMode.value;
  };

  return (
    <button
      class={`toggle${store.inspectMode.value ? ' active' : ''}`}
      onClick={handleClick}
      type="button"
    >
      <span class="toggle-label">
        <span class="toggle-indicator" />
        Inspect
      </span>
      <span>{store.inspectMode.value ? 'ON' : 'OFF'}</span>
    </button>
  );
}