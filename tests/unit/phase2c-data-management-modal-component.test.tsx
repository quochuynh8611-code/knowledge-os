/**
 * Phase 2C.4: Data Management Modal & Confirmation Gate UI Component Test Suite
 *
 * ADR: ADR-009 (docs/architecture-decisions.md)
 * Specs: docs/specs/phase-2c4-data-management-modal.md
 * Gherkin: docs/gherkin/phase-2c4-data-management-modal.feature
 * Target: src/components/modals/ExportImportModal.tsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportImportModal } from '../../src/components/modals/ExportImportModal';
import { IDataRepository, LocalStorageDataRepository } from '../../src/services/dataRepository';
import {
  calculateBackupChecksum,
  ValidatedBackupSnapshot,
  ValidatedRestoreResponse,
  ValidatedDbHealthResponse,
} from '../../src/lib/validation';
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from '../../src/data/initialData';

const mockReloadAllData = vi.fn();
const mockExportAllDataJSON = vi.fn(() => '{}');
const mockImportAllDataJSON = vi.fn(() => true);
const mockResetToDefaultData = vi.fn();

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    categories: INITIAL_CATEGORIES,
    topics: INITIAL_TOPICS,
    notes: INITIAL_NOTES,
    resources: INITIAL_RESOURCES,
    tags: INITIAL_TAGS,
    exportAllDataJSON: mockExportAllDataJSON,
    importAllDataJSON: mockImportAllDataJSON,
    resetToDefaultData: mockResetToDefaultData,
    reloadAllData: mockReloadAllData,
  }),
}));

describe('Phase 2C.4: Data Management Modal Component Tests', () => {
  const canonicalData = {
    categories: INITIAL_CATEGORIES,
    topics: INITIAL_TOPICS,
    notes: INITIAL_NOTES,
    resources: INITIAL_RESOURCES,
    tags: INITIAL_TAGS,
  };
  const validChecksum = calculateBackupChecksum(canonicalData);
  const sampleValidSnapshot: ValidatedBackupSnapshot = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    checksum: validChecksum,
    counts: {
      categories: 8,
      topics: 35,
      notes: 5,
      resources: 4,
      tags: 12,
    },
    data: canonicalData,
  };

  let mockRepository: IDataRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReloadAllData.mockResolvedValue(true);

    mockRepository = {
      loadInitialData: vi.fn().mockResolvedValue(canonicalData),
      syncHydrate: vi.fn(),
      saveTopic: vi.fn(),
      deleteTopic: vi.fn(),
      saveNote: vi.fn(),
      deleteNote: vi.fn(),
      saveResource: vi.fn(),
      deleteResource: vi.fn(),
      saveStudyProgress: vi.fn(),
      exportBackupSnapshot: vi.fn().mockResolvedValue(sampleValidSnapshot),
      restoreBackupSnapshot: vi.fn().mockResolvedValue({
        success: true,
        mode: 'merge',
        restoredCounts: sampleValidSnapshot.counts,
        restoredAt: new Date().toISOString(),
      } as ValidatedRestoreResponse),
      getDbHealth: vi.fn().mockResolvedValue({
        status: 'healthy',
        latencyMs: 14,
        database: 'postgresql',
        connected: true,
        timestamp: new Date().toISOString(),
      } as ValidatedDbHealthResponse),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Render Health Badge when repository reports healthy
  // ---------------------------------------------------------------------------
  it('1. Render health badge hiển thị trạng thái kết nối PostgreSQL và độ trễ 14ms', async () => {
    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepository} />);

    await waitFor(() => {
      expect(mockRepository.getDbHealth).toHaveBeenCalled();
    });

    const healthText = await screen.findByText(/PostgreSQL|Kết Nối|14ms|healthy/i);
    expect(healthText).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 2: Server snapshot export button calls exportBackupSnapshot
  // ---------------------------------------------------------------------------
  it('2. Xuất snapshot máy chủ kích hoạt repository.exportBackupSnapshot', async () => {
    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepository} />);

    // Switch to export tab if needed
    const exportTab = screen.getByTestId('tab-export');
    fireEvent.click(exportTab);

    // Look for server-authoritative export button
    const serverExportBtn = screen.getByRole('button', {
      name: /bản sao lưu máy chủ|server snapshot|sao lưu postgresql/i,
    });
    fireEvent.click(serverExportBtn);

    await waitFor(() => {
      expect(mockRepository.exportBackupSnapshot).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Invalid snapshot JSON blocks submit
  // ---------------------------------------------------------------------------
  it('3. Nạp file snapshot sai schema bị chặn trước khi submit', async () => {
    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepository} />);

    const importTab = screen.getByTestId('tab-import');
    fireEvent.click(importTab);

    const badFile = new File(['{ "invalid": "structure" }'], 'bad-snapshot.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('snapshot-file-input');
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByText(/không hợp lệ|sai cấu trúc|invalid schema/i)).toBeInTheDocument();
    });

    const submitBtn = screen.queryByRole('button', { name: /thực hiện gộp|thực hiện thay thế/i });
    if (submitBtn) {
      expect(submitBtn).toBeDisabled();
    }
  });

  // ---------------------------------------------------------------------------
  // Test 4: Checksum mismatch blocks submit
  // ---------------------------------------------------------------------------
  it('4. Checksum không khớp bị chặn và hiển thị lỗi tính toàn vẹn', async () => {
    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepository} />);

    const importTab = screen.getByTestId('tab-import');
    fireEvent.click(importTab);

    const tamperedSnapshot = {
      ...sampleValidSnapshot,
      checksum: 'a'.repeat(64), // Invalid checksum
    };
    const tamperedFile = new File([JSON.stringify(tamperedSnapshot)], 'tampered-snapshot.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('snapshot-file-input');
    fireEvent.change(fileInput, { target: { files: [tamperedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/checksum không khớp|sha-256|integrity/i)).toBeInTheDocument();
    });

    const submitBtn = screen.queryByRole('button', { name: /thực hiện gộp|thực hiện thay thế/i });
    if (submitBtn) {
      expect(submitBtn).toBeDisabled();
    }
  });

  // ---------------------------------------------------------------------------
  // Test 5: Replace mode Confirmation Gate is locked when text is incorrect
  // ---------------------------------------------------------------------------
  it('5. Replace mode bị khóa khi chưa nhập đúng "XÁC NHẬN THAY THẾ"', async () => {
    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepository} />);

    const importTab = screen.getByTestId('tab-import');
    fireEvent.click(importTab);

    const validFile = new File([JSON.stringify(sampleValidSnapshot)], 'valid-snapshot.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('snapshot-file-input');
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Switch to replace mode
    const replaceModeRadio = await screen.findByRole('radio', { name: /thay thế|replace/i });
    fireEvent.click(replaceModeRadio);

    // Confirmation input appears
    const confirmInput = screen.getByPlaceholderText(/XÁC NHẬN THAY THẾ/i);
    expect(confirmInput).toBeInTheDocument();

    // Type incorrect text (lowercase)
    fireEvent.change(confirmInput, { target: { value: 'xác nhận thay thế' } });

    const replaceSubmitBtn = screen.getByRole('button', { name: /thực hiện thay thế|khôi phục thay thế/i });
    expect(replaceSubmitBtn).toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // Test 6: Replace mode Confirmation Gate unlocks when exact phrase is entered
  // ---------------------------------------------------------------------------
  it('6. Replace mode được mở khóa khi nhập chính xác "XÁC NHẬN THAY THẾ"', async () => {
    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepository} />);

    const importTab = screen.getByTestId('tab-import');
    fireEvent.click(importTab);

    const validFile = new File([JSON.stringify(sampleValidSnapshot)], 'valid-snapshot.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('snapshot-file-input');
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const replaceModeRadio = await screen.findByRole('radio', { name: /thay thế|replace/i });
    fireEvent.click(replaceModeRadio);

    const confirmInput = screen.getByPlaceholderText(/XÁC NHẬN THAY THẾ/i);
    fireEvent.change(confirmInput, { target: { value: 'XÁC NHẬN THAY THẾ' } });

    const replaceSubmitBtn = screen.getByRole('button', { name: /thực hiện thay thế|khôi phục thay thế/i });
    expect(replaceSubmitBtn).not.toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // Test 7: Restore success triggers reloadAllData()
  // ---------------------------------------------------------------------------
  it('7. Restore thành công tự động kích hoạt reloadAllData()', async () => {
    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepository} />);

    const importTab = screen.getByTestId('tab-import');
    fireEvent.click(importTab);

    const validFile = new File([JSON.stringify(sampleValidSnapshot)], 'valid-snapshot.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('snapshot-file-input');
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const submitBtn = await screen.findByRole('button', { name: /thực hiện gộp|thực hiện khôi phục/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRepository.restoreBackupSnapshot).toHaveBeenCalled();
      expect(mockReloadAllData).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 8: Rehydration failure preserves state and shows error banner
  // ---------------------------------------------------------------------------
  it('8. Rehydrate thất bại không xóa state và hiển thị cảnh báo', async () => {
    mockReloadAllData.mockResolvedValue(false); // Simulate rehydrate failure

    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepository} />);

    const importTab = screen.getByTestId('tab-import');
    fireEvent.click(importTab);

    const validFile = new File([JSON.stringify(sampleValidSnapshot)], 'valid-snapshot.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('snapshot-file-input');
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const submitBtn = await screen.findByRole('button', { name: /thực hiện gộp|thực hiện khôi phục/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/lỗi nạp dữ liệu|rehydration failed|tải lại/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 9: Offline LocalStorage repository displays unsupported operation notice
  // ---------------------------------------------------------------------------
  it('9. LocalStorage offline repository hiển thị thông báo unsupported an toàn', async () => {
    const offlineRepo = new LocalStorageDataRepository();

    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={offlineRepo} />);

    await waitFor(() => {
      expect(screen.getByText(/ngoại tuyến|offline|chỉ hỗ trợ khi có máy chủ|kho lưu trữ cục bộ/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 10: Capability Error distinctly identifies UNSUPPORTED_OFFLINE_OPERATION
  // ---------------------------------------------------------------------------
  it('10. Capability Error hiển thị thông báo kho lưu trữ cục bộ không hỗ trợ disaster recovery', async () => {
    const customOfflineRepo: IDataRepository = {
      ...mockRepository,
      getDbHealth: vi.fn().mockRejectedValue(
        new Error('UNSUPPORTED_OFFLINE_OPERATION: Disaster recovery and database health checks require an active server connection.')
      ),
    };

    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={customOfflineRepo} />);

    await waitFor(() => {
      expect(screen.getByText(/kho lưu trữ cục bộ|không được hỗ trợ ở chế độ offline/i)).toBeInTheDocument();
    });

    // Health badge is not rendered for unsupported offline capability
    expect(screen.queryByText(/Đang Kết Nối/i)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 11: Connectivity/Runtime Error displays server connection failure, not offline repo
  // ---------------------------------------------------------------------------
  it('11. Connectivity Error hiển thị trạng thái mất kết nối máy chủ, không giả thành LocalStorage unsupported', async () => {
    const networkFailRepo: IDataRepository = {
      ...mockRepository,
      getDbHealth: vi.fn().mockRejectedValue(new Error('Failed to fetch: Connection refused (ECONNREFUSED)')),
    };

    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={networkFailRepo} />);

    // Should display PostgreSQL Mất Kết Nối badge or server connection error banner
    await waitFor(() => {
      expect(screen.getByText(/Mất Kết Nối|Lỗi kết nối máy chủ/i)).toBeInTheDocument();
    });

    // MUST NOT display the LocalStorage offline capability banner
    expect(screen.queryByText(/Kho lưu trữ cục bộ/i)).not.toBeInTheDocument();
  });
});
