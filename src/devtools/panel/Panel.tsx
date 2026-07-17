import { render } from 'preact';
import { useSignal } from '@preact/signals';

function Panel() {
  const status = useSignal('Loading...');

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui', minWidth: '300px' }}>
      <h1>🛠 Tienda Nube</h1>
      <p>{status.value}</p>
      <button onClick={() => (status.value = 'Panel loaded!')}>Test</button>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  render(<Panel />, root);
}
