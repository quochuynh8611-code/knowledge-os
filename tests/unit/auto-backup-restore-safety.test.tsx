import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutoBackupControlPanel } from '../../src/components/modals/AutoBackupControlPanel';
import {
  runGuardedAutoBackup,
  getAutoBackupSnapshots,
  WorkspaceBackupPayload,
} from '../../src/lib/autoBackupScheduler';

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
});

