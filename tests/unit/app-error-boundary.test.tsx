/**
 * Phase 6k.d — Runtime Crash Instrumentation: Verification Tests
 *
 * PURPOSE:
 *   Verify that AppErrorBoundary:
 *     1. Renders fallback UI when a child throws during render.
 *     2. Logs [RUNTIME-CRASH] prefix via console.error (with componentStack).
 *     3. Is transparent (no fallback) when children render normally.
 *
 * RED BASELINE:
 *   This test file fails at import time until
 *   src/components/error/AppErrorBoundary.tsx is created.
 *   That import error IS the RED evidence for Phase 6k.d.
 *   Once GREEN is desired, create AppErrorBoundary.tsx and all tests below should pass.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
// Static import — FAILS until AppErrorBoundary.tsx exists (RED baseline)
import { AppErrorBoundary } from '../../src/components/error/AppErrorBoundary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A component that always throws on render */
function BombComponent({ message }: { message: string }): React.ReactNode {
  throw new Error(message);
}

/** A component that renders normally */
function SafeComponent() {
  return <div data-testid="safe-child">I am safe</div>;
}

// Silence React's own console.error noise about uncaught errors in tests
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe('Post-Phase 6k.d: AppErrorBoundary Runtime Crash Instrumentation Tests', () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // A. Fallback rendered when child throws
  // -------------------------------------------------------------------------
  it('A. AppErrorBoundary renders fallback UI when a child component throws', () => {
    render(
      <AppErrorBoundary>
        <BombComponent message="Test crash" />
      </AppErrorBoundary>
    );

    // Fallback UI must be visible — not a blank page
    const fallback = screen.getByTestId('crash-fallback');
    expect(fallback).toBeInTheDocument();
  });

  it('A2. Fallback UI contains visible text indicating an error occurred', () => {
    render(
      <AppErrorBoundary>
        <BombComponent message="Specific crash message" />
      </AppErrorBoundary>
    );

    const fallback = screen.getByTestId('crash-fallback');
    expect(fallback.textContent).toBeTruthy();
    expect(fallback.textContent!.length).toBeGreaterThan(5);
  });

  it('A3. Fallback UI contains a Tải lại trang reload button', () => {
    render(
      <AppErrorBoundary>
        <BombComponent message="Test crash" />
      </AppErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /tải lại|reload/i });
    expect(reloadButton).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // B. console.error with [RUNTIME-CRASH] prefix
  // -------------------------------------------------------------------------
  it('B. AppErrorBoundary calls console.error with [RUNTIME-CRASH] prefix on crash', () => {
    render(
      <AppErrorBoundary>
        <BombComponent message="Instrumented crash" />
      </AppErrorBoundary>
    );

    const runtimeCrashCalls = consoleErrorSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('[RUNTIME-CRASH]')
    );
    expect(runtimeCrashCalls.length).toBeGreaterThan(0);
  });

  it('B2. [RUNTIME-CRASH] log includes error.message', () => {
    render(
      <AppErrorBoundary>
        <BombComponent message="Detectable crash payload" />
      </AppErrorBoundary>
    );

    const allCallArgs = consoleErrorSpy.mock.calls.flat();
    const hasCrashMessage = allCallArgs.some(
      (arg) =>
        typeof arg === 'string'
          ? arg.includes('Detectable crash payload')
          : typeof arg === 'object' &&
            arg !== null &&
            JSON.stringify(arg).includes('Detectable crash payload')
    );
    expect(hasCrashMessage).toBe(true);
  });

  it('B3. [RUNTIME-CRASH] log includes componentStack from React.ErrorInfo', () => {
    render(
      <AppErrorBoundary>
        <BombComponent message="Stack trace check" />
      </AppErrorBoundary>
    );

    const allCallArgs = consoleErrorSpy.mock.calls.flat();
    const hasComponentStack = allCallArgs.some(
      (arg) =>
        typeof arg === 'object' &&
        arg !== null &&
        'componentStack' in arg &&
        typeof (arg as { componentStack: unknown }).componentStack === 'string'
    );
    expect(hasComponentStack).toBe(true);
  });

  // -------------------------------------------------------------------------
  // C. Transparent on normal render
  // -------------------------------------------------------------------------
  it('C. AppErrorBoundary is transparent when children render normally', () => {
    render(
      <AppErrorBoundary>
        <SafeComponent />
      </AppErrorBoundary>
    );

    expect(screen.getByTestId('safe-child')).toBeInTheDocument();

    const fallback = document.querySelector('[data-testid="crash-fallback"]');
    expect(fallback).toBeNull();
  });

  it('C2. console.error NOT called with [RUNTIME-CRASH] on normal render', () => {
    render(
      <AppErrorBoundary>
        <SafeComponent />
      </AppErrorBoundary>
    );

    const runtimeCrashCalls = consoleErrorSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('[RUNTIME-CRASH]')
    );
    expect(runtimeCrashCalls.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // D. Deeply nested error is still caught
  // -------------------------------------------------------------------------
  it('D. AppErrorBoundary catches errors from deeply nested components', () => {
    function Level3() { return <BombComponent message="Nested crash" />; }
    function Level2() { return <Level3 />; }
    function Level1() { return <Level2 />; }

    render(
      <AppErrorBoundary>
        <Level1 />
      </AppErrorBoundary>
    );

    expect(screen.getByTestId('crash-fallback')).toBeInTheDocument();

    const runtimeCrashCalls = consoleErrorSpy.mock.calls.filter(
      (args) => typeof args[0] === 'string' && args[0].includes('[RUNTIME-CRASH]')
    );
    expect(runtimeCrashCalls.length).toBeGreaterThan(0);
  });
});
