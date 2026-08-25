import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * AppErrorBoundary — Root React Error Boundary for runtime crash instrumentation.
 *
 * Phase 6k.d: Replaces the full white-screen with a visible fallback UI and
 * logs a [RUNTIME-CRASH] prefixed error to the console for DevTools diagnosis.
 *
 * This component is TRANSPARENT when children render normally.
 * It does NOT modify any business logic or data flows.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[RUNTIME-CRASH] React Error Boundary caught:', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
    const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
      return (
        <div
          data-testid="crash-fallback"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#1c1917',
            color: '#e7e5e4',
            textAlign: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            Đã xảy ra lỗi không mong đợi
          </h1>
          {isDev && this.state.error && (
            <pre
              style={{
                background: '#292524',
                border: '1px solid #44403c',
                borderRadius: '6px',
                padding: '1rem',
                fontSize: '0.75rem',
                textAlign: 'left',
                overflowX: 'auto',
                maxWidth: '600px',
                width: '100%',
                color: '#fca5a5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack?.split('\n').slice(0, 10).join('\n')}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1.5rem',
              background: '#d97706',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Tải lại trang
          </button>
          <p style={{ fontSize: '0.75rem', color: '#78716c', margin: 0 }}>
            Nếu lỗi tiếp tục, hãy kiểm tra DevTools Console để xem chi tiết [RUNTIME-CRASH].
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
