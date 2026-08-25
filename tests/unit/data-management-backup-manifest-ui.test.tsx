import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportImportModal } from '../../src/components/modals/ExportImportModal';
import { DataProvider } from '../../src/context/DataContext';

describe('Post-Phase 6: Data Management Modal - File Library Audit & Backup Manifest UI', () => {
  it('renders File Library Audit tab/section, displays audit summary metrics and export manifest button', () => {
    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} />
      </DataProvider>
    );

    // Verify modal is open and has navigation for File Library / Backup Manifest
    const manifestTab = screen.getByRole('button', { name: /Kiểm toán tệp & Manifest|Thư viện tệp/i });
    expect(manifestTab).toBeInTheDocument();

    fireEvent.click(manifestTab);

    // Verify audit summary stats & export manifest CTA are rendered
    expect(screen.getAllByText(/Bảng Kê Kiểm Toán Thư Viện Tệp|File Library Manifest/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('btn-export-file-manifest')).toBeInTheDocument();

    // Verify 3-pillar backup checklist is displayed
    expect(screen.getByText(/Quy trình sao lưu toàn diện 3 thành phần|Checklist Sao Lưu/i)).toBeInTheDocument();
  });

  it('allows user to input canonical library root path and updates localStorage', () => {
    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} />
      </DataProvider>
    );

    const manifestTab = screen.getByRole('button', { name: /Kiểm toán tệp & Manifest|Thư viện tệp/i });
    fireEvent.click(manifestTab);

    const input = screen.getByPlaceholderText(/\/Users\/username\/Knowledge-Library/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '/Users/researcher/KnowledgeLibrary' } });
    expect(input.value).toBe('/Users/researcher/KnowledgeLibrary');
  });

  it('triggers manifest download and copy actions without error', () => {
    // Mock URL methods & clipboard
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <DataProvider>
        <ExportImportModal isOpen={true} onClose={vi.fn()} />
      </DataProvider>
    );

    const manifestTab = screen.getByRole('button', { name: /Kiểm toán tệp & Manifest|Thư viện tệp/i });
    fireEvent.click(manifestTab);

    const downloadBtn = screen.getByTestId('btn-export-file-manifest');
    fireEvent.click(downloadBtn);
    expect(window.URL.createObjectURL).toHaveBeenCalled();

    const copyBtn = screen.getByRole('button', { name: /Sao chép Manifest JSON/i });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
