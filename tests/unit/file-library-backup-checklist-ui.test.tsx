import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportImportModal } from '../../src/components/modals/ExportImportModal';
import { DataProvider } from '../../src/context/DataContext';

describe('Post-Phase 6b: UI - Recommended Structure, Browser Limitation Warning & Backup Checklist', () => {
  it('renders recommended folder structure guidance (Knowledge-Library/PDF, Notes, Attachments, Inbox, Exports)', () => {
    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} />
      </DataProvider>
    );

    const manifestTab = screen.getByRole('button', { name: /Kiểm toán tệp & Manifest|Thư viện tệp/i });
    fireEvent.click(manifestTab);

    // Verify recommended structure is visible
    expect(screen.getAllByText(/Cấu trúc thư mục đề xuất|Knowledge-Library/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PDF\//i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Notes\//i).length).toBeGreaterThan(0);
  });

  it('provides a save button for Canonical Library Root and shows feedback', () => {
    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} />
      </DataProvider>
    );

    const manifestTab = screen.getByRole('button', { name: /Kiểm toán tệp & Manifest|Thư viện tệp/i });
    fireEvent.click(manifestTab);

    const input = screen.getByPlaceholderText(/\/Users\/username\/Knowledge-Library/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '/Users/test/MyLibrary' } });

    const saveBtn = screen.getByRole('button', { name: /Lưu cấu hình|Lưu thư mục/i });
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Đã lưu cấu hình thư viện!|Đã lưu/i)).toBeInTheDocument();
  });

  it('displays the 3-pillar + Obsidian Vault backup readiness checklist with incomplete backup warning', () => {
    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} />
      </DataProvider>
    );

    const manifestTab = screen.getByRole('button', { name: /Kiểm toán tệp & Manifest|Thư viện tệp/i });
    fireEvent.click(manifestTab);

    // Verify 3 pillars and warning
    expect(screen.getAllByText(/App Snapshot/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/File Manifest/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Thư Mục File Thật/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Manifest không chứa file PDF thật/i)).toBeInTheDocument();
  });
});
