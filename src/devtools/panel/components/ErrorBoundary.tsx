import { Component, type ComponentChildren } from 'preact';
import { panelStore } from '../store/panelStore';

interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback: ComponentChildren;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    panelStore.setError(`Panel error: ${error.message}`);
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return <div class="panel-error">{this.props.fallback}</div>;
    }
    return <>{this.props.children}</>;
  }
}