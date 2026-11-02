import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportImportModal } from '../../src/components/modals/ExportImportModal';
import { IDataRepository } from '../../src/services/dataRepository';
import { calculateBackupChecksum, ValidatedBackupSnapshot } from '../../src/lib/validation';
import * as autoBackupModule from '../../src/lib/autoBackupScheduler';

import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from '../../src/data/initialData';

const mockReloadAllData = vi.fn().mockResolvedValue(true);
const mockExportAllDataJSON = vi.fn(() => '{}');
const mockImportAllDataJSON = vi.fn(() => true);
const mockResetToDefaultData = vi.fn();

const currentMockData = {
  categories: INITIAL_CATEGORIES,
  topics: INITIAL_TOPICS,
  notes: INITIAL_NOTES,
  resources: INITIAL_RESOURCES,
  tags: INITIAL_TAGS,
};

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    ...currentMockData,
    exportAllDataJSON: mockExportAllDataJSON,
    importAllDataJSON: mockImportAllDataJSON,
    resetToDefaultData: mockResetToDefaultData,
    reloadAllData: mockReloadAllData,
  }),
}));

describe('Server Restore Safety Gate (ExportImportModal Pre-Restore Guard)', () => {
  let mockRepo: IDataRepository;
  let validSnapshot: ValidatedBackupSnapshot;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    const snapshotData = {
      categories: INITIAL_CATEGORIES,
      topics: INITIAL_TOPICS,
      notes: INITIAL_NOTES,
      resources: INITIAL_RESOURCES,
      tags: INITIAL_TAGS,
    };

    validSnapshot = {
      version: '2.0.0',
      exportedAt: '2026-11-02T10:00:00.000Z',
      checksum: calculateBackupChecksum(snapshotData),
      counts: {
        categories: 0,
        topics: 0,
        notes: 0,
        resources: 0,
        tags: 0,
      },
      data: snapshotData,
    };

    mockRepo = {
      restoreBackupSnapshot: vi.fn().mockResolvedValue({ success: true, count: 3 }),
      getBackupManifest: vi.fn().mockResolvedValue([]),
      getDbHealth: vi.fn().mockResolvedValue({
        status: 'healthy',
        healthy: true,
        connected: true,
        database: 'postgresql',
        latencyMs: 5,
        timestamp: new Date().toISOString(),
      }),
      syncHydrate: vi.fn().mockResolvedValue({ success: true }),
      resetAllData: vi.fn().mockResolvedValue(undefined),
    } as unknown as IDataRepository;
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const uploadAndSelectSnapshot = async () => {
    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepo} defaultTab="export" />);

    const importTab = screen.getByTestId('tab-import');
    fireEvent.click(importTab);

    const validFile = new File([JSON.stringify(validSnapshot)], 'valid-snapshot.json', {
      type: 'application/json',
    });

    const fileInput = screen.getByTestId('snapshot-file-input');
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Wait for file parsing and drill preview
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thực Hiện Gộp Dữ Liệu/i })).toBeInTheDocument();
    });
  };

  it('RED Case 1: When pre-restore safety snapshot returns storage-failed, aborts restore before repo.restoreBackupSnapshot', async () => {
    await uploadAndSelectSnapshot();

    // Mock runGuardedAutoBackup returning storage-failed for pre-restore
    vi.spyOn(autoBackupModule, 'runGuardedAutoBackup').mockReturnValue({
      status: 'storage-failed',
      reason: 'Bộ nhớ đầy (localStorage quota exceeded)',
      retainedCount: 0,
    });

    const submitBtn = await screen.findByRole('button', { name: /thực hiện gộp|thực hiện khôi phục/i });
    fireEvent.click(submitBtn);

    // Assert: error message displayed
    await waitFor(() => {
      expect(
        screen.getByText(/Không thể tạo bản lưu an toàn trước khi khôi phục \(lỗi lưu trữ/i)
      ).toBeInTheDocument();
    });

    // CRITICAL SAFETY CHECK: repo.restoreBackupSnapshot MUST NOT BE CALLED
    expect(mockRepo.restoreBackupSnapshot).not.toHaveBeenCalled();
    expect(mockReloadAllData).not.toHaveBeenCalled();

    // UI loading state must be released
    expect(submitBtn).not.toBeDisabled();
  });

  it('RED Case 2: When pre-restore safety snapshot returns rejected-invalid, aborts restore before repo.restoreBackupSnapshot', async () => {
    await uploadAndSelectSnapshot();

    // Mock runGuardedAutoBackup returning rejected-invalid for pre-restore
    vi.spyOn(autoBackupModule, 'runGuardedAutoBackup').mockReturnValue({
      status: 'rejected-invalid',
      reason: 'Field "categories" must be an array',
      retainedCount: 0,
    });

    const submitBtn = await screen.findByRole('button', { name: /thực hiện gộp|thực hiện khôi phục/i });
    fireEvent.click(submitBtn);

    // Assert: error message displayed
    await waitFor(() => {
      expect(
        screen.getByText(/Không thể tạo bản lưu an toàn trước khi khôi phục \(dữ liệu không hợp lệ/i)
      ).toBeInTheDocument();
    });

    // CRITICAL SAFETY CHECK: repo.restoreBackupSnapshot MUST NOT BE CALLED
    expect(mockRepo.restoreBackupSnapshot).not.toHaveBeenCalled();
    expect(mockReloadAllData).not.toHaveBeenCalled();

    // UI loading state must be released
    expect(submitBtn).not.toBeDisabled();
  });

  it('RED Case 3: When pre-restore safety snapshot returns cancelled, aborts restore before repo.restoreBackupSnapshot', async () => {
    await uploadAndSelectSnapshot();

    // Mock runGuardedAutoBackup returning cancelled
    vi.spyOn(autoBackupModule, 'runGuardedAutoBackup').mockReturnValue({
      status: 'cancelled',
      reason: 'Cancelled before commit',
      retainedCount: 0,
    });

    const submitBtn = await screen.findByRole('button', { name: /thực hiện gộp|thực hiện khôi phục/i });
    fireEvent.click(submitBtn);

    // Assert: error message displayed
    await waitFor(() => {
      expect(
        screen.getByText(/Tác vụ lưu an toàn trước khi khôi phục đã bị hủy bỏ/i)
      ).toBeInTheDocument();
    });

    // CRITICAL SAFETY CHECK: repo.restoreBackupSnapshot MUST NOT BE CALLED
    expect(mockRepo.restoreBackupSnapshot).not.toHaveBeenCalled();
    expect(mockReloadAllData).not.toHaveBeenCalled();

    // UI loading state must be released
    expect(submitBtn).not.toBeDisabled();
  });
});
