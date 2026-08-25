import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportImportModal } from '../../src/components/modals/ExportImportModal';
import { DataProvider } from '../../src/context/DataContext';

describe('Post-Phase 6e: Backup Verification & Restore Drill UI Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders 3-layer backup verification readiness section in Manifest tab', () => {
    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} defaultTab="manifest" />
      </DataProvider>
    );

    // Verify 3 Layers are visible
    expect(screen.getByText(/1\. App Snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. File Manifest/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Thư Mục File Thật/i)).toBeInTheDocument();

    // Verify readiness advice
    expect(screen.getByText(/Quy trình sao lưu toàn diện/i)).toBeInTheDocument();
  });

  it('renders Restore Drill dry-run simulation in Import tab', async () => {
    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} defaultTab="import" />
      </DataProvider>
    );

    expect(screen.getByText(/Nạp Tệp Bản Sao Lưu Snapshot/i)).toBeInTheDocument();
  });
});
