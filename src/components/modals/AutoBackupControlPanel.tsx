import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  History,
  RotateCcw,
  Trash2,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Settings2,
  Sparkles,
} from 'lucide-react';
import {
  AutoBackupPreferences,
  AutoBackupSnapshotRecord,
  WorkspaceBackupPayload,
  getAutoBackupPreferences,
  saveAutoBackupPreferences,
  getAutoBackupSnapshots,
  deleteAutoBackupSnapshot,
  runGuardedAutoBackup,
} from '../../lib/autoBackupScheduler';

export interface AutoBackupControlPanelProps {
  workspacePayload: WorkspaceBackupPayload;
  onRestoreSnapshot?: (payload: WorkspaceBackupPayload) => Promise<boolean> | boolean;
  onSnapshotCreated?: (snapshot: AutoBackupSnapshotRecord) => void;
  className?: string;
}

export function AutoBackupControlPanel({
  workspacePayload,
  onRestoreSnapshot,
  onSnapshotCreated,
  className = '',
}: AutoBackupControlPanelProps) {
  const [preferences, setPreferences] = useState<AutoBackupPreferences>(() => getAutoBackupPreferences());
  const [snapshots, setSnapshots] = useState<AutoBackupSnapshotRecord[]>(() => getAutoBackupSnapshots());
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [guardFeedback, setGuardFeedback] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    setSnapshots(getAutoBackupSnapshots());
  }, []);

  const handleToggleEnabled = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = saveAutoBackupPreferences({ enabled: e.target.checked });
    setPreferences(updated);
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updated = saveAutoBackupPreferences({ intervalMinutes: Number(e.target.value) });
    setPreferences(updated);
  };

  const handleMaxSnapshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      const updated = saveAutoBackupPreferences({ maxSnapshots: val });
      setPreferences(updated);
    }
  };

  const handleManualSnapshot = () => {
    setGuardFeedback(null);
    const result = runGuardedAutoBackup(workspacePayload, {
      trigger: 'manual',
      label: 'Bản lưu thủ công',
    });

    if (result.status === 'created') {
      const refreshed = getAutoBackupSnapshots();
      setSnapshots(refreshed);
      setStatusMessage({ type: 'success', text: 'Đã tạo snapshot thành công!' });
      if (result.snapshot && onSnapshotCreated) {
        onSnapshotCreated(result.snapshot);
      }
    } else if (result.status === 'skipped-unchanged') {
      setStatusMessage({ type: 'info', text: 'Không đổi: Dữ liệu hiện tại trùng khớp với snapshot gần nhất.' });
    } else if (result.status === 'skipped-empty') {
      const reasonText =
        result.reason || 'Workspace trống (0 thực thể). Tự động từ chối ghi đè lịch sử.';
      setGuardFeedback(reasonText);
      setStatusMessage({ type: 'warning', text: reasonText });
    } else if (result.status === 'rejected-invalid') {
      setStatusMessage({ type: 'error', text: `Dữ liệu không hợp lệ: ${result.reason}` });
    }
  };

  const handleRestore = async (snapshot: AutoBackupSnapshotRecord) => {
    setRestoringId(snapshot.id);
    try {
      // 1. Capture pre-restore safety snapshot of current workspace state
      runGuardedAutoBackup(workspacePayload, {
        trigger: 'pre-restore',
        label: `Bản lưu an toàn trước khi khôi phục [${snapshot.id.slice(0, 8)}]`,
      });
      setSnapshots(getAutoBackupSnapshots());

      // 2. Delegate to restore handler
      if (onRestoreSnapshot) {
        await onRestoreSnapshot(snapshot.payload);
      }
      setStatusMessage({ type: 'success', text: `Đã khôi phục thành công bản sao lưu ${snapshot.id.slice(0, 8)}.` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi trong quá trình khôi phục snapshot.';
      setStatusMessage({ type: 'error', text: message });
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = (id: string) => {
    const remaining = deleteAutoBackupSnapshot(id);
    setSnapshots(remaining);
    setStatusMessage({ type: 'info', text: 'Đã xóa snapshot khỏi lịch sử.' });
  };

  const getTriggerBadge = (trigger: AutoBackupSnapshotRecord['trigger']) => {
    switch (trigger) {
      case 'auto':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Tự động
          </span>
        );
      case 'pre-restore':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Pre-Restore
          </span>
        );
      case 'manual':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Thủ công
          </span>
        );
    }
  };

  return (
    <div
      data-testid="auto-backup-control-panel"
      className={`space-y-4 text-stone-800 dark:text-stone-200 ${className}`}
    >
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Guarded Auto-Backup &amp; Snapshot Ring Buffer
          </h3>
        </div>
        <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
          <History className="w-3.5 h-3.5" />
          Đang lưu: {snapshots.length} / {preferences.maxSnapshots} bản
        </span>
      </div>

      {/* Preferences Bar */}
      <div className="p-3.5 bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Enable Toggle */}
          <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              data-testid="auto-backup-enable-toggle"
              checked={preferences.enabled}
              onChange={handleToggleEnabled}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300 dark:border-stone-600 cursor-pointer"
            />
            <span>Tự động sao lưu định kỳ</span>
          </label>

          {/* Interval & Retention Options */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span>Chu kỳ:</span>
              <select
                data-testid="auto-backup-interval-select"
                value={preferences.intervalMinutes}
                onChange={handleIntervalChange}
                className="py-1 px-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg text-xs cursor-pointer font-medium"
              >
                <option value="5">5 phút</option>
                <option value="15">15 phút</option>
                <option value="30">30 phút</option>
                <option value="60">1 giờ</option>
                <option value="120">2 giờ</option>
                <option value="360">6 giờ</option>
                <option value="1440">24 giờ</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-stone-500" />
              <span>Tối đa:</span>
              <input
                type="number"
                min={3}
                max={50}
                data-testid="auto-backup-max-snapshots-input"
                value={preferences.maxSnapshots}
                onChange={handleMaxSnapshotsChange}
                className="w-14 py-1 px-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg text-xs font-medium text-center"
              />
            </div>
          </div>
        </div>

        {/* Action Trigger */}
        <div className="flex items-center justify-between pt-1 border-t border-stone-200 dark:border-stone-700/40">
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Cơ chế bảo vệ: Từ chối ghi đè khi workspace rỗng • Tự động băm SHA-256 khử trùng lặp.
          </p>
          <button
            type="button"
            data-testid="trigger-manual-snapshot-btn"
            onClick={handleManualSnapshot}
            className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Tạo Snapshot Ngay
          </button>
        </div>
      </div>

      {/* Guard Feedback Alert */}
      {guardFeedback && (
        <div
          data-testid="auto-backup-guard-feedback"
          className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Zero-Data Overwrite Guard: </span>
            <span>{guardFeedback}</span>
          </div>
        </div>
      )}

      {/* General Status Feedback */}
      {statusMessage && !guardFeedback && (
        <div
          className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : statusMessage.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Snapshot History Ring Buffer List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
          <span>Lịch Sử Snapshots (Mới nhất xếp trên)</span>
          <span className="text-[11px] font-normal text-stone-500">
            Tự động tạo Pre-Restore safety snapshot trước khi khôi phục
          </span>
        </div>

        <div
          data-testid="auto-backup-snapshot-list"
          className="space-y-2 max-h-56 overflow-y-auto pr-1"
        >
          {snapshots.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-xl text-xs text-stone-500">
              Chưa có bản snapshot nào trong bộ đệm xoay vòng.
            </div>
          ) : (
            snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs hover:border-amber-400 dark:hover:border-amber-600/60 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getTriggerBadge(snapshot.trigger)}
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      {new Date(snapshot.createdAt).toLocaleString('vi-VN')}
                    </span>
                    <span className="font-mono text-[10px] text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                      #{snapshot.fingerprint.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {snapshot.totalEntities} thực thể
                    </span>
                    <span>•</span>
                    <span>{(snapshot.sizeBytes / 1024).toFixed(1)} KB</span>
                    {snapshot.label && (
                      <>
                        <span>•</span>
                        <span className="italic">{snapshot.label}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    data-testid={`restore-auto-snapshot-btn-${snapshot.id}`}
                    disabled={restoringId === snapshot.id}
                    onClick={() => handleRestore(snapshot)}
                    className="py-1 px-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-300 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {restoringId === snapshot.id ? 'Đang khôi phục...' : 'Khôi phục'}
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-auto-snapshot-btn-${snapshot.id}`}
                    onClick={() => handleDelete(snapshot.id)}
                    className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition cursor-pointer"
                    title="Xóa bản snapshot này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
