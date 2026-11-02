import React, { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutoBackupControlPanel } from '../../src/components/modals/AutoBackupControlPanel';
import {
  runGuardedAutoBackup,
  getAutoBackupSnapshots,
  setLastAutoBackupResult,
  WorkspaceBackupPayload,
} from '../../src/lib/autoBackupScheduler';
import * as storageModule from '../../src/lib/storage';

describe('PR 1 (Phase 25): Auto-Backup Restore Safety & Confirmation Gate', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const sampleWorkspace: WorkspaceBackupPayload = {
    categories: [{ id: 'cat-1', name: 'Khoa Học' }],
    topics: [{ id: 'top-1', title: 'Vật Lý Lượng Tử', categoryId: 'cat-1' }],
    notes: [{ id: 'n-1', title: 'Ghi chú hiện tại', content: 'Dữ liệu đang nghiên cứu', updatedAt: '2026-10-29T12:00:00Z' }],
  };

  it('Test 1: When user clicks "Khôi phục", opens confirmation modal with destructive warning and does NOT call onRestoreSnapshot immediately', async () => {
    const olderPayload: WorkspaceBackupPayload = {
      notes: [{ id: 'n-archived', title: 'Bản thảo cũ', content: 'Dữ liệu quá khứ' }],
    };
    const seed = runGuardedAutoBackup(olderPayload, { trigger: 'manual', label: 'Bản lưu v1' });
    const snapshotId = seed.snapshot!.id;

    const mockRestoreHandler = vi.fn().mockResolvedValue(true);

    render(
      <AutoBackupControlPanel
        workspacePayload={sampleWorkspace}
        onRestoreSnapshot={mockRestoreHandler}
      />
    );

    const restoreBtn = screen.getByTestId(`restore-auto-snapshot-btn-${snapshotId}`);
    fireEvent.click(restoreBtn);

    // Confirmation dialog MUST be visible
    const dialog = screen.getByTestId('auto-backup-restore-confirm-dialog');
    expect(dialog).toBeInTheDocument();

    // Check destructive warning text
    expect(dialog).toHaveTextContent(/ghi đè|thay thế|chắc chắn muốn khôi phục/i);

    // Snapshot details must be displayed in modal
    expect(dialog).toHaveTextContent(/Bản lưu v1/i);
    expect(dialog).toHaveTextContent(/1 thực thể/i);

    // Crucial: Restore handler has NOT been called yet!
    expect(mockRestoreHandler).not.toHaveBeenCalled();
  });

  it('Test 2: When user clicks "Hủy" (Cancel) in confirmation dialog, modal closes and restore is NOT executed', async () => {
    const olderPayload: WorkspaceBackupPayload = {
      notes: [{ id: 'n-archived', title: 'Bản thảo cũ', content: 'Dữ liệu quá khứ' }],
    };
    const seed = runGuardedAutoBackup(olderPayload, { trigger: 'manual', label: 'Bản lưu v1' });
    const snapshotId = seed.snapshot!.id;

    const mockRestoreHandler = vi.fn().mockResolvedValue(true);

    render(
      <AutoBackupControlPanel
        workspacePayload={sampleWorkspace}
        onRestoreSnapshot={mockRestoreHandler}
      />
    );

    // Open confirmation modal
    fireEvent.click(screen.getByTestId(`restore-auto-snapshot-btn-${snapshotId}`));
    expect(screen.getByTestId('auto-backup-restore-confirm-dialog')).toBeInTheDocument();

    // Click cancel button
    const cancelBtn = screen.getByTestId('auto-backup-restore-cancel-btn');
    fireEvent.click(cancelBtn);

    // Dialog closes
    await waitFor(() => {
      expect(screen.queryByTestId('auto-backup-restore-confirm-dialog')).not.toBeInTheDocument();
    });

    // Restore was never executed
    expect(mockRestoreHandler).not.toHaveBeenCalled();
  });

  it('Test 3: When user clicks "Xác nhận khôi phục" in confirmation dialog, captures pre-restore safety snapshot and executes restore', async () => {
    const olderPayload: WorkspaceBackupPayload = {
      notes: [{ id: 'n-archived', title: 'Bản thảo cũ', content: 'Dữ liệu quá khứ' }],
    };
    const seed = runGuardedAutoBackup(olderPayload, { trigger: 'manual', label: 'Bản lưu v1' });
    const snapshotId = seed.snapshot!.id;

    const mockRestoreHandler = vi.fn().mockResolvedValue(true);

    render(
      <AutoBackupControlPanel
        workspacePayload={sampleWorkspace}
        onRestoreSnapshot={mockRestoreHandler}
      />
    );

    // Open confirmation modal
    fireEvent.click(screen.getByTestId(`restore-auto-snapshot-btn-${snapshotId}`));
    expect(screen.getByTestId('auto-backup-restore-confirm-dialog')).toBeInTheDocument();

    // Click confirm button
    const confirmBtn = screen.getByTestId('auto-backup-restore-confirm-btn');
    fireEvent.click(confirmBtn);

    // Restore is executed with the target snapshot payload
    await waitFor(() => {
      expect(mockRestoreHandler).toHaveBeenCalledTimes(1);
      expect(mockRestoreHandler).toHaveBeenCalledWith(olderPayload);
    });

    // Dialog closes after confirmation
    await waitFor(() => {
      expect(screen.queryByTestId('auto-backup-restore-confirm-dialog')).not.toBeInTheDocument();
    });

    // Pre-restore safety snapshot was captured before the restore
    const allSnapshots = getAutoBackupSnapshots();
    const preRestore = allSnapshots.filter((s) => s.trigger === 'pre-restore');
    expect(preRestore.length).toBeGreaterThanOrEqual(1);
    expect(preRestore[0].totalEntities).toBe(3); // from sampleWorkspace
  });

  it('Test 4: Pressing Escape key closes the confirmation dialog without restoring', async () => {
    const seed = runGuardedAutoBackup(sampleWorkspace, { trigger: 'manual' });
    const snapshotId = seed.snapshot!.id;

    const mockRestoreHandler = vi.fn().mockResolvedValue(true);

    render(
      <AutoBackupControlPanel
        workspacePayload={sampleWorkspace}
        onRestoreSnapshot={mockRestoreHandler}
      />
    );

    // Open confirmation modal
    fireEvent.click(screen.getByTestId(`restore-auto-snapshot-btn-${snapshotId}`));
    expect(screen.getByTestId('auto-backup-restore-confirm-dialog')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    // Dialog closes
    await waitFor(() => {
      expect(screen.queryByTestId('auto-backup-restore-confirm-dialog')).not.toBeInTheDocument();
    });

    expect(mockRestoreHandler).not.toHaveBeenCalled();
  });

  it('Test 5: Aborts restore operation when pre-restore safety snapshot fails to persist (storage-failed)', async () => {
    const olderPayload: WorkspaceBackupPayload = {
      notes: [{ id: 'n-archived', title: 'Bản thảo cũ', content: 'Dữ liệu quá khứ' }],
    };
    const seed = runGuardedAutoBackup(olderPayload, { trigger: 'manual', label: 'Bản lưu v1' });
    const snapshotId = seed.snapshot!.id;

    const mockRestoreHandler = vi.fn().mockResolvedValue(true);

    render(
      <AutoBackupControlPanel
        workspacePayload={sampleWorkspace}
        onRestoreSnapshot={mockRestoreHandler}
      />
    );

    // Open confirmation modal
    fireEvent.click(screen.getByTestId(`restore-auto-snapshot-btn-${snapshotId}`));
    expect(screen.getByTestId('auto-backup-restore-confirm-dialog')).toBeInTheDocument();

    // Mock storage failure (e.g., localStorage quota exceeded) via safeSetLocalStorageItem
    const storageSpy = vi.spyOn(storageModule, 'safeSetLocalStorageItem').mockReturnValue(false);

    // Click confirm button
    const confirmBtn = screen.getByTestId('auto-backup-restore-confirm-btn');
    fireEvent.click(confirmBtn);

    // Assert: error message displayed
    await waitFor(() => {
      expect(
        screen.getByText(/Không thể tạo bản lưu an toàn trước khi khôi phục \(lỗi lưu trữ\)\. Đã hủy thao tác/i)
      ).toBeInTheDocument();
    });

    // Assert: onRestoreSnapshot callback is NOT called!
    expect(mockRestoreHandler).not.toHaveBeenCalled();

    // Assert: snapshot history remains intact (older seed only, no broken partial entries)
    storageSpy.mockRestore();
    const currentSnapshots = getAutoBackupSnapshots();
    expect(currentSnapshots).toHaveLength(1);
    expect(currentSnapshots[0].id).toBe(snapshotId);
  });

  it('Test 6: Aborts restore operation when pre-restore safety snapshot returns rejected-invalid', async () => {
    const olderPayload: WorkspaceBackupPayload = {
      notes: [{ id: 'n-archived', title: 'Bản thảo cũ', content: 'Dữ liệu quá khứ' }],
    };
    const seed = runGuardedAutoBackup(olderPayload, { trigger: 'manual', label: 'Bản lưu v1' });
    const snapshotId = seed.snapshot!.id;

    const mockRestoreHandler = vi.fn().mockResolvedValue(true);

    // Non-empty payload that fails integrity inspection: e.g. categories is not an array, but notes has an array
    const invalidWorkspacePayload: any = {
      categories: 'not-an-array-invalid',
      notes: [{ id: 'valid-note-id', title: 'Valid note', content: 'hello' }],
    };

    render(
      <AutoBackupControlPanel
        workspacePayload={invalidWorkspacePayload}
        onRestoreSnapshot={mockRestoreHandler}
      />
    );

    // Open confirmation modal
    fireEvent.click(screen.getByTestId(`restore-auto-snapshot-btn-${snapshotId}`));
    expect(screen.getByTestId('auto-backup-restore-confirm-dialog')).toBeInTheDocument();

    // Click confirm button
    const confirmBtn = screen.getByTestId('auto-backup-restore-confirm-btn');
    fireEvent.click(confirmBtn);

    // Assert: error message displayed
    await waitFor(() => {
      expect(
        screen.getByText(/Không thể tạo bản lưu an toàn trước khi khôi phục \(dữ liệu không hợp lệ: Field "categories" must be an array if provided\.\)\. Đã hủy thao tác/i)
      ).toBeInTheDocument();
    });

    // Assert: onRestoreSnapshot callback is NOT called!
    expect(mockRestoreHandler).not.toHaveBeenCalled();

    // Assert: snapshot history remains intact
    const currentSnapshots = getAutoBackupSnapshots();
    expect(currentSnapshots).toHaveLength(1);
    expect(currentSnapshots[0].id).toBe(snapshotId);
  });

  it('Test 7: When auto-backup encountered storage-failed in background while panel was closed, opening panel immediately surfaces the error', async () => {
    // Background auto-backup runs while panel is NOT mounted
    // Simulate auto-backup storage failure by setting runtime error status
    setLastAutoBackupResult({
      status: 'storage-failed',
      reason: 'Không thể ghi bản sao lưu vào bộ nhớ cục bộ (localStorage đầy dung lượng hoặc bị chặn).',
      retainedCount: 0,
    });

    // Now user opens the panel
    render(
      <AutoBackupControlPanel
        workspacePayload={sampleWorkspace}
      />
    );

    // Panel must immediately display the auto-backup error WITHOUT clicking manual/restore
    expect(
      screen.getByText(/Lỗi sao lưu tự động ngầm: Không thể ghi bản sao lưu vào bộ nhớ cục bộ/i)
    ).toBeInTheDocument();

    // And verify no success message is falsely shown
    expect(screen.queryByText(/thành công/i)).not.toBeInTheDocument();
  });

  it('Test 8: When panel is already open and background auto-backup encounters rejected-invalid, panel immediately surfaces error via same-tab event', async () => {
    // Mount panel while runtime error is null
    setLastAutoBackupResult(null);

    render(
      <AutoBackupControlPanel
        workspacePayload={sampleWorkspace}
      />
    );

    // Initial state: no error message
    expect(screen.queryByText(/Lỗi sao lưu tự động ngầm/i)).not.toBeInTheDocument();

    // Now background auto-backup finishes with rejected-invalid and updates runtime status
    act(() => {
      setLastAutoBackupResult({
        status: 'rejected-invalid',
        reason: 'Field "categories" must be an array if provided.',
        retainedCount: 0,
      });
    });

    // Panel is ALREADY OPEN: it must update and display the error via same-tab listener
    await waitFor(() => {
      expect(
        screen.getByText(/Lỗi sao lưu tự động ngầm: Field "categories" must be an array if provided\./i)
      ).toBeInTheDocument();
    });

    // Clear error by simulating subsequent successful auto-backup
    act(() => {
      setLastAutoBackupResult({
        status: 'created',
        retainedCount: 1,
      });
    });

    // Panel automatically clears the error message
    await waitFor(() => {
      expect(screen.queryByText(/Lỗi sao lưu tự động ngầm/i)).not.toBeInTheDocument();
    });
  });
});

