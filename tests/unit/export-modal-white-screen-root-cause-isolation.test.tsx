import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from '../../src/components/layout/Navbar';
import { NoteFormModal } from '../../src/components/modals/NoteFormModal';
import { ResourceFormModal } from '../../src/components/modals/ResourceFormModal';
import { ExportImportModal } from '../../src/components/modals/ExportImportModal';
import { DataProvider } from '../../src/context/DataContext';

describe('Post-Phase 6k.b: Export / Backup Modal White-Screen Root-Cause Isolation Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Reproducing Sibling Modal Crash: NoteFormModal top-level localStorage call
  // ---------------------------------------------------------------------------
  it('1. NoteFormModal renders without throwing when localStorage.getItem throws SecurityError', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: Access to localStorage is denied.');
    });

    expect(() => {
      render(
        <DataProvider>
          <NoteFormModal isOpen={false} onClose={vi.fn()} />
        </DataProvider>
      );
    }).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 2. Reproducing Sibling Modal Crash: ResourceFormModal top-level localStorage call
  // ---------------------------------------------------------------------------
  it('2. ResourceFormModal renders without throwing when localStorage.getItem throws SecurityError', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: Access to localStorage is denied.');
    });

    expect(() => {
      render(
        <DataProvider>
          <ResourceFormModal isOpen={false} onClose={vi.fn()} />
        </DataProvider>
      );
    }).not.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 3. Reproducing the Navbar Subtree Render in Storage-Blocked Environment
  // NOTE: Tests 1 & 2 already prove NoteFormModal and ResourceFormModal are safe.
  // This test verifies ExportImportModal mounts correctly when rendered
  // with isOpen=true directly (simulating the state post-click), which is the
  // actual crash scenario: ExportImportModal rendered while storage is blocked.
  // ---------------------------------------------------------------------------
  it('3. ExportImportModal mounts without white-screen crash when rendered in a storage-blocked environment', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: Access to localStorage is denied.');
    });

    expect(() => {
      render(
        <DataProvider>
          <ExportImportModal isOpen={true} onClose={vi.fn()} />
        </DataProvider>
      );
    }).not.toThrow();

    // Verify modal header is fully rendered — no white-screen
    expect(screen.getByText(/Quản Lý & Sao Lưu Dữ Liệu/i)).toBeInTheDocument();

    // Verify tab navigation is present
    expect(screen.getByTestId('tab-export')).toBeInTheDocument();
    expect(screen.getByTestId('tab-import')).toBeInTheDocument();
  });
});
