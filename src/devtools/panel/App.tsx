import { StatusBar } from './components/StatusBar';
import { LocalRemoteToggle } from './components/LocalRemoteToggle';
import { InspectModeToggle } from './components/InspectModeToggle';
import { ReloadThemeButton } from './components/ReloadThemeButton';

export function App() {
  return (
    <div class="panel">
      <header class="panel-header">
        <h1>Tienda Nube Theme DevTools</h1>
      </header>

      <section class="connection-status">
        <StatusBar />
      </section>

      <section class="tools">
        <LocalRemoteToggle />
        <InspectModeToggle />
        <ReloadThemeButton />
      </section>

      <footer class="status-bar-section">
        <StatusBar />
      </footer>
    </div>
  );
}