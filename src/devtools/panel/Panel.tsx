import { render } from 'preact';
import { ErrorBoundary } from './components/ErrorBoundary';
import { App } from './App';

function Panel() {
  return (
    <ErrorBoundary fallback={<div class="panel-error">Panel error — recargá DevTools</div>}>
      <App />
    </ErrorBoundary>
  );
}

const root = document.getElementById('root');
if (root) {
  render(<Panel />, root);
}

export { Panel };