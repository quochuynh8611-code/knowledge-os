/**
 * Phase 6k.e — ExportImportModal Hook Order Consistency & Resilience Tests
 *
 * Validates that toggling ExportImportModal between isOpen=false and isOpen=true
 * does NOT violate React Rules of Hooks ("Rendered more hooks than during the previous render").
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportImportModal } from '../../src/components/modals/ExportImportModal';
import { Navbar } from '../../src/components/layout/Navbar';
import { DataProvider } from '../../src/context/DataContext';

describe('Post-Phase 6k.e: ExportImportModal Hook Order Resilience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Toggling ExportImportModal from isOpen=false to isOpen=true does not throw hook order violation', () => {
    const { rerender } = render(
      <DataProvider>
        <ExportImportModal isOpen={false} onClose={vi.fn()} />
      </DataProvider>
    );

    // Initial render with isOpen=false should be null
    expect(screen.queryByText(/Quản Lý & Sao Lưu Dữ Liệu/i)).toBeNull();

    // Rerender with isOpen=true — MUST NOT throw Rules of Hooks error
    expect(() => {
      rerender(
        <DataProvider>
          <ExportImportModal isOpen={true} onClose={vi.fn()} />
        </DataProvider>
      );
    }).not.toThrow();

    expect(screen.getByText(/Quản Lý & Sao Lưu Dữ Liệu/i)).toBeInTheDocument();

    // Rerender back to isOpen=false
    expect(() => {
      rerender(
        <DataProvider>
          <ExportImportModal isOpen={false} onClose={vi.fn()} />
        </DataProvider>
      );
    }).not.toThrow();

    expect(screen.queryByText(/Quản Lý & Sao Lưu Dữ Liệu/i)).toBeNull();
  });

  it('2. Clicking Export / Backup button in Navbar mounts ExportImportModal without hook order crash', () => {
    render(
      <DataProvider>
        <Navbar onOpenCommandPalette={vi.fn()} onOpenShortcutsModal={vi.fn()} />
      </DataProvider>
    );

    const downloadButton = screen.getByTitle('Sao lưu / Xuất dữ liệu');
    expect(downloadButton).toBeInTheDocument();

    // Click to toggle modal from closed to open
    expect(() => {
      fireEvent.click(downloadButton);
    }).not.toThrow();

    // Modal should now be open
    expect(screen.getByText(/Quản Lý & Sao Lưu Dữ Liệu/i)).toBeInTheDocument();
  });
});
