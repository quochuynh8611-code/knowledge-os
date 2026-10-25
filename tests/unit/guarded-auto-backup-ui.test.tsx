import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutoBackupControlPanel } from '../../src/components/modals/AutoBackupControlPanel';
import {
  getAutoBackupPreferences,
  saveAutoBackupPreferences,
  getAutoBackupSnapshots,
  clearAutoBackupSnapshots,
  runGuardedAutoBackup,
  WorkspaceBackupPayload,
} from '../../src/lib/autoBackupScheduler';

describe('Phase 6B: Guarded Auto-Backup UI Integration & Control Panel', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const samplePayload: WorkspaceBackupPayload = {
    categories: [{ id: 'cat-1', name: 'Philosophy' }],
    topics: [{ id: 'top-1', title: 'Epistemology', categoryId: 'cat-1' }],
    notes: [{ id: 'n-1', title: 'Knowledge Theory', content: 'Justified true belief', updatedAt: '2026-10-25T12:00:00Z' }],
    resources: [{ id: 'r-1', title: 'Stanford Encyclopedia' }],
    tags: [{ id: 't-1', name: 'epistemic' }],
  };

  // Test 1: Preferences Configuration UI
  it('renders preferences controls and persists changes to localStorage', async () => {
    render(<AutoBackupControlPanel workspacePayload={samplePayload} />);

    expect(screen.getByTestId('auto-backup-control-panel')).toBeInTheDocument();

    const toggle = screen.getByTestId('auto-backup-enable-toggle') as HTMLInputElement;
    const intervalSelect = screen.getByTestId('auto-backup-interval-select') as HTMLSelectElement;
    const maxSnapshotsInput = screen.getByTestId('auto-backup-max-snapshots-input') as HTMLInputElement;

    // Check defaults
    expect(toggle.checked).toBe(true);
    expect(intervalSelect.value).toBe('30');
    expect(maxSnapshotsInput.value).toBe('10');

    // Update interval
    fireEvent.change(intervalSelect, { target: { value: '60' } });
    expect(intervalSelect.value).toBe('60');

    // Update max snapshots
    fireEvent.change(maxSnapshotsInput, { target: { value: '15' } });
    expect(maxSnapshotsInput.value).toBe('15');

    // Toggle enabled off
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);

    // Verify persisted preferences in storage
    const saved = getAutoBackupPreferences();
    expect(saved.enabled).toBe(false);
    expect(saved.intervalMinutes).toBe(60);
    expect(saved.maxSnapshots).toBe(15);
  });

  // Test 2: Manual Guarded Snapshot Creation
  it('triggers manual backup, provides status feedback, and renders newly created snapshot card', async () => {
    render(<AutoBackupControlPanel workspacePayload={samplePayload} />);

    const manualBtn = screen.getByTestId('trigger-manual-snapshot-btn');
    fireEvent.click(manualBtn);

    // Status feedback should indicate success
    await waitFor(() => {
      const snapshots = getAutoBackupSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].totalEntities).toBe(5);
    });

    const snapshotList = screen.getByTestId('auto-backup-snapshot-list');
    expect(snapshotList).toBeInTheDocument();
    expect(screen.getByText(/5 thực thể/i)).toBeInTheDocument();

    // Clicking again with identical data shows unchanged feedback
    fireEvent.click(manualBtn);
    await waitFor(() => {
      expect(screen.getByText(/Không đổi/i)).toBeInTheDocument();
    });
    expect(getAutoBackupSnapshots()).toHaveLength(1);
  });

  // Test 3: Zero-Data Overwrite Guard Feedback in UI
  it('displays Zero-Data Overwrite Guard warning when trying to backup empty workspace', async () => {
    // Seed an existing valid backup first
    runGuardedAutoBackup(samplePayload, { trigger: 'manual' });
    expect(getAutoBackupSnapshots()).toHaveLength(1);

    const emptyPayload: WorkspaceBackupPayload = {
      categories: [],
      topics: [],
      notes: [],
      flashcards: [],
      resources: [],
      tags: [],
    };

    render(<AutoBackupControlPanel workspacePayload={emptyPayload} />);

    const manualBtn = screen.getByTestId('trigger-manual-snapshot-btn');
    fireEvent.click(manualBtn);

    // Guard feedback notice appears
    await waitFor(() => {
      const guardFeedback = screen.getByTestId('auto-backup-guard-feedback');
      expect(guardFeedback).toBeInTheDocument();
      expect(guardFeedback).toHaveTextContent(/trống|0 thực thể|từ chối/i);
    });

    // Existing snapshot was preserved
    expect(getAutoBackupSnapshots()).toHaveLength(1);
  });

  // Test 4: One-Click Snapshot Restore with Pre-Restore Safety Guard
  it('captures pre-restore safety snapshot before executing restore', async () => {
    // Seed an older snapshot
    const olderPayload: WorkspaceBackupPayload = {
      notes: [{ id: 'n-old', title: 'Old Draft', content: 'Archived content' }],
    };
    const seedResult = runGuardedAutoBackup(olderPayload, { trigger: 'manual', label: 'Archived V1' });
    const targetSnapshotId = seedResult.snapshot!.id;

    // Current workspace has new active work
    const currentWorkspace: WorkspaceBackupPayload = {
      notes: [
        { id: 'n-active', title: 'Active Research', content: 'Brand new discoveries' },
        { id: 'n-active-2', title: 'Active Research 2', content: 'More discoveries' },
      ],
    };

    const mockRestoreHandler = vi.fn().mockResolvedValue(true);

    render(
      <AutoBackupControlPanel
        workspacePayload={currentWorkspace}
        onRestoreSnapshot={mockRestoreHandler}
      />
    );

    const restoreBtn = screen.getByTestId(`restore-auto-snapshot-btn-${targetSnapshotId}`);
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(mockRestoreHandler).toHaveBeenCalledTimes(1);
    });

    // Verify that a pre-restore safety snapshot was captured before the restore
    const allSnapshots = getAutoBackupSnapshots();
    const preRestoreSnapshots = allSnapshots.filter((s) => s.trigger === 'pre-restore');
    expect(preRestoreSnapshots.length).toBeGreaterThanOrEqual(1);
    expect(preRestoreSnapshots[0].totalEntities).toBe(2);
  });

  // Test 5: Snapshot Deletion
  it('deletes a specific snapshot and updates the list', async () => {
    const snap1 = runGuardedAutoBackup({ notes: [{ id: '1', title: 'N1' }] }, { trigger: 'manual' }).snapshot!;
    const snap2 = runGuardedAutoBackup({ notes: [{ id: '2', title: 'N2' }] }, { trigger: 'manual' }).snapshot!;

    expect(getAutoBackupSnapshots()).toHaveLength(2);

    render(<AutoBackupControlPanel workspacePayload={samplePayload} />);

    const deleteBtn = screen.getByTestId(`delete-auto-snapshot-btn-${snap1.id}`);
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      const remaining = getAutoBackupSnapshots();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(snap2.id);
    });
  });
});
