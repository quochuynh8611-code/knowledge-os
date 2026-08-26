/**
 * Phase 6k.c — DataProvider / App Storage Boundary Isolation Tests
 *
 * PURPOSE:
 *   Prove (or disprove) that the full-app white screen originates inside DataProvider.
 *   If all 4 tests pass GREEN, the crash must lie outside the DataProvider layer.
 *   If any test is RED, we have found the storage boundary that needs hardening.
 *
 * STRATEGY:
 *   - Mount the FULL App (DataProvider + AppContent + Navbar) not just isolated components.
 *   - Mock localStorage at the window level before mounting.
 *   - Assert that Navbar is present in DOM — absence = white-screen confirmed.
 *
 * DEPENDENCY NOTE:
 *   DataContext.tsx module-level code runs `new ApiDataRepository(...)` at import time.
 *   vitest module mocking is required to observe that seam.
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../../src/App';
import { DataProvider } from '../../src/context/DataContext';

// ---------------------------------------------------------------------------
// Helper: force fetch to hang so ApiDataRepository bootstrap effect never resolves
// (prevents fetch-related test pollution)
// ---------------------------------------------------------------------------
function mockFetchHang() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    () => new Promise(() => {}) // never resolves
  );
}

describe('Post-Phase 6k.c: DataProvider / App Storage Boundary Isolation Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear any residual spy state on localStorage
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // A. SecurityError on localStorage.getItem — full App must survive
  // -------------------------------------------------------------------------
  it('A. Full App renders without white-screen when localStorage.getItem throws SecurityError', () => {
    mockFetchHang();

    // Mock BEFORE mounting so the useState lazy initializers get the throw
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException(
        'Access to localStorage is denied for this document.',
        'SecurityError'
      );
    });

    // Render full App (DataProvider → AppContent → Navbar)
    expect(() => {
      render(<App />);
    }).not.toThrow();

    // Navbar must exist — if white-screen, this would not be in DOM
    const navbar = document.querySelector('nav, header, [data-testid="navbar"]');
    expect(navbar).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // B. QuotaExceededError on localStorage.setItem — persistence effect must not crash
  // -------------------------------------------------------------------------
  it('B. Full App renders without crash when localStorage.setItem throws QuotaExceededError', () => {
    mockFetchHang();

    // getItem works normally (so useState initializers are fine)
    // only setItem throws — targets the auto-sync useEffect
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError: localStorage is full.', 'QuotaExceededError');
    });

    expect(() => {
      render(<App />);
    }).not.toThrow();

    // Navbar must exist after the persistence effect fires
    const navbar = document.querySelector('nav, header, [data-testid="navbar"]');
    expect(navbar).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // C. Malformed JSON — DataProvider falls back to seed data, no crash
  // -------------------------------------------------------------------------
  it('C. DataProvider falls back to seed data and does not crash when stored JSON is malformed', () => {
    mockFetchHang();

    // Return malformed JSON for every getItem call
    vi.spyOn(window.localStorage, 'getItem').mockReturnValue('NOT_VALID_JSON{{{');
    // Silence the setItem calls so they don't interfere
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {});

    expect(() => {
      render(<App />);
    }).not.toThrow();

    const navbar = document.querySelector('nav, header, [data-testid="navbar"]');
    expect(navbar).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // D. Navbar present in DOM after full App mount under storage restriction
  // -------------------------------------------------------------------------
  it('D. Navbar is present in DOM after full App mount in SecurityError environment', () => {
    mockFetchHang();

    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException(
        'Access to localStorage is denied for this document.',
        'SecurityError'
      );
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException(
        'Access to localStorage is denied for this document.',
        'SecurityError'
      );
    });

    render(<App />);

    // Look for the backup/export button that lives in Navbar
    // (if white-screen, the Navbar's entire subtree is absent from DOM)
    const downloadButtons = document.querySelectorAll('button, [role="button"]');
    expect(downloadButtons.length).toBeGreaterThan(0);

    // Confirm the page title / brand text is rendered
    // (any element that would only appear if the Navbar renders successfully)
    const anyNavbar = document.querySelector('nav, header');
    expect(anyNavbar).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // E. DataProvider alone survives SecurityError (seam isolation)
  //    Tests that the issue is NOT in DataProvider's own boundary
  // -------------------------------------------------------------------------
  it('E. DataProvider mounts and provides context when localStorage is fully blocked', () => {
    mockFetchHang();

    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError', 'SecurityError');
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('SecurityError', 'SecurityError');
    });

    let contextAvailable = false;

    function Probe() {
      // If DataProvider renders children, this component mounts
      contextAvailable = true;
      return <div data-testid="probe">mounted</div>;
    }

    expect(() => {
      render(
        <DataProvider>
          <Probe />
        </DataProvider>
      );
    }).not.toThrow();

    expect(contextAvailable).toBe(true);
    expect(screen.getByTestId('probe')).toBeInTheDocument();
  });
});
