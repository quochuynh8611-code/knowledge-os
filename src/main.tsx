import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ---------------------------------------------------------------------------
// Phase 6k.d: DEV-only global crash listeners
// Tree-shakes completely in production (import.meta.env.DEV = false at build time).
// Captures errors that occur before React renders or outside the Error Boundary.
// ---------------------------------------------------------------------------
if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
  window.addEventListener('error', (event) => {
    console.error('[RUNTIME-CRASH] window.onerror:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[RUNTIME-CRASH] unhandledrejection:', {
      reason: String(event.reason),
      stack: (event.reason as Error | undefined)?.stack,
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
