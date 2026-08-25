import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  Activity,
  ShieldAlert,
  Database,
} from 'lucide-react';
import {
  IDataRepository,
  ApiDataRepository,
  LocalStorageDataRepository,
} from '../../services/dataRepository';
import {
  BackupSnapshotSchema,
  calculateBackupChecksum,
  ValidatedBackupSnapshot,
  ValidatedDbHealthResponse,
} from '../../lib/validation';

const defaultRepo: IDataRepository =
  typeof window !== 'undefined'
    ? new ApiDataRepository('/api', new LocalStorageDataRepository('phat_hoc_huyen_hoc_clean_v3'))
    : new LocalStorageDataRepository('phat_hoc_huyen_hoc_clean_v3');

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  repository?: IDataRepository;
}

export function ExportImportModal({ isOpen, onClose, repository }: ExportImportModalProps) {
  const repo = repository || defaultRepo;
  const {
    exportAllDataJSON,
    importAllDataJSON,
    resetToDefaultData,
    reloadAllData,
    topics,
    notes,
  } = useData();

  // Tab & General State
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'markdown' | 'reset'>('export');
  const [copied, setCopied] = useState(false);

  // Health State
  const [dbHealth, setDbHealth] = useState<ValidatedDbHealthResponse | null>(null);
  const [isOfflineRepo, setIsOfflineRepo] = useState(false);

  // Snapshot Import / Restore State Machine
  const [parsedSnapshot, setParsedSnapshot] = useState<ValidatedBackupSnapshot | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [confirmReplaceText, setConfirmReplaceText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<
    'idle' | 'submitting' | 'completed' | 'rehydrate_failed' | 'error'
  >('idle');

  // Legacy Text Import State
  const [importText, setImportText] = useState('');
  const [legacyImportStatus, setLegacyImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Polling / Fetching DB Health on open
  useEffect(() => {
    if (!isOpen) return;
    let isActive = true;

    repo
      .getDbHealth()
      .then((health) => {
        if (isActive) {
          setDbHealth(health);
          setIsOfflineRepo(false);
        }
      })
      .catch((err) => {
        if (isActive) {
          setDbHealth(null);
          setIsOfflineRepo(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isOpen, repo]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // Export Actions
  // ---------------------------------------------------------------------------
  const handleDownloadServerSnapshot = async () => {
    try {
      const snapshot = await repo.exportBackupSnapshot();
      const dataStr = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phat-hoc-huyen-hoc-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.message?.includes('UNSUPPORTED_OFFLINE_OPERATION')) {
        setIsOfflineRepo(true);
      }
      // Fallback to local export
      handleDownloadLocalJSON();
    }
  };

  const handleDownloadLocalJSON = () => {
    const dataStr = exportAllDataJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phat-hoc-huyen-hoc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    let md = `# BÁO CÁO TỔNG HỢP NGHIÊN CỨU PHẬT HỌC & HUYỀN HỌC\n*Xuất bản ngày: ${new Date().toLocaleDateString('vi-VN')}*\n\n---\n\n`;

    md += `## 1. DANH MỤC CÁC CHỦ ĐỀ NGHIÊN CỨU (${topics.length} topics)\n\n`;
    topics.forEach((t, i) => {
      md += `### ${i + 1}. [${t.type === 'phat-hoc' ? 'Phật Học' : 'Huyền Học'}] ${t.title}\n`;
      md += `- **Danh mục**: ${t.categoryName}\n`;
      md += `- **Tiến độ**: ${t.studyProgress.progress}% (${t.studyProgress.status})\n`;
      md += `- **Thời gian nghiên cứu**: ${t.studyProgress.timeSpent} phút\n`;
      md += `- **Mô tả**: ${t.description}\n\n`;
      md += `${t.content}\n\n`;
      md += `---\n\n`;
    });

    md += `## 2. TỔNG HỢP GHI CHÚ CHUYÊN SÂU (${notes.length} notes)\n\n`;
    notes.forEach((n, i) => {
      md += `### Ghi chú ${i + 1}: ${n.title} [${n.type.toUpperCase()}]\n`;
      md += `*Gắn liền với: ${n.topicTitle}*\n\n`;
      md += `${n.content}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tong-hop-nghien-cuu-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(exportAllDataJSON());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Snapshot File Parsing & Checksum Verification
  // ---------------------------------------------------------------------------
  const handleSnapshotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setParsedSnapshot(null);
    setRestoreStatus('idle');

    try {
      let text = '';
      if (typeof file.text === 'function') {
        text = await file.text();
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      const rawObj = JSON.parse(text);
      const valResult = BackupSnapshotSchema.safeParse(rawObj);

      if (!valResult.success) {
        setParseError('Định dạng tệp không hợp lệ hoặc sai cấu trúc schema Semver 2.x.');
        return;
      }

      const snapshot = valResult.data;
      const expectedChecksum = calculateBackupChecksum(snapshot.data);

      if (snapshot.checksum !== expectedChecksum) {
        setParseError('SHA-256 Checksum không khớp! Tệp có thể đã bị sửa đổi hoặc lỗi tính toàn vẹn.');
        return;
      }

      setParsedSnapshot(snapshot);
    } catch (err: any) {
      setParseError('Không thể đọc file JSON hoặc tệp không hợp lệ.');
    }
  };

  // ---------------------------------------------------------------------------
  // Restore Submission & Rehydration Lifecycle
  // ---------------------------------------------------------------------------
  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedSnapshot) return;

    setIsSubmitting(true);
    setRestoreStatus('submitting');

    try {
      const res = await repo.restoreBackupSnapshot({
        snapshot: parsedSnapshot,
        mode: restoreMode,
        confirmReplace: restoreMode === 'replace' ? true : undefined,
      });

      if (res.success) {
        const rehydrated = await reloadAllData();
        if (rehydrated) {
          setRestoreStatus('completed');
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          setRestoreStatus('rehydrate_failed');
        }
      } else {
        setRestoreStatus('error');
      }
    } catch (err: any) {
      if (err?.message?.includes('UNSUPPORTED_OFFLINE_OPERATION')) {
        setIsOfflineRepo(true);
      }
      setRestoreStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReplaceActionDisabled =
    restoreMode === 'replace' && confirmReplaceText !== 'XÁC NHẬN THAY THẾ';

  const handleLegacyImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    const success = importAllDataJSON(importText.trim());
    if (success) {
      setLegacyImportStatus('success');
      setTimeout(() => {
        onClose();
        setLegacyImportStatus('idle');
      }, 1200);
    } else {
      setLegacyImportStatus('error');
    }
  };

  const handleResetConfirm = () => {
    if (
      window.confirm(
        'Bạn có chắc chắn muốn khôi phục dữ liệu mẫu gốc ban đầu không? Mọi chỉnh sửa tùy biến sẽ được làm mới.'
      )
    ) {
      resetToDefaultData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-800 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-stone-900">Quản Lý &amp; Sao Lưu Dữ Liệu</h2>
                {dbHealth && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      dbHealth.status === 'healthy'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : dbHealth.status === 'degraded'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <Activity className="w-2.5 h-2.5" />
                    {dbHealth.database === 'postgresql' ? 'PostgreSQL' : 'Database'}{' '}
                    {dbHealth.connected ? 'Đang Kết Nối' : 'Mất Kết Nối'} ({dbHealth.latencyMs}ms)
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600">Disaster Recovery, Snapshot Semver 2.x, Báo cáo &amp; Khôi phục</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline Notice Banner */}
        {isOfflineRepo && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Chế độ ngoại tuyến (Offline): Các tác vụ phục hồi máy chủ chỉ hỗ trợ khi có kết nối máy chủ hoạt động.
            </span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 px-6 bg-stone-100/50">
          <button
            data-testid="tab-export"
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Xuất JSON
          </button>
          <button
            data-testid="tab-markdown"
            onClick={() => setActiveTab('markdown')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'markdown'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Báo cáo Markdown
          </button>
          <button
            data-testid="tab-import"
            onClick={() => setActiveTab('import')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-amber-700 text-amber-900'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Nhập Dữ Liệu
          </button>
          <button
            data-testid="tab-reset"
            onClick={() => setActiveTab('reset')}
            className={`py-3 px-3.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'reset'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Khôi Phục Gốc
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Xuất toàn bộ hệ thống gồm {topics.length} chủ đề, {notes.length} ghi chú, tài liệu và tiến độ học tập thành file JSON tiêu chuẩn Semver 2.x có mã băm SHA-256 để lưu trữ an toàn.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownloadServerSnapshot}
                  className="flex-1 py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Download className="w-4 h-4" /> Tải Xuống Bản Sao Lưu Máy Chủ (.json)
                </button>
                <button
                  onClick={handleCopyJSON}
                  className="py-3 px-4 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Đã sao chép!' : 'Sao chép JSON'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'markdown' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Tổng hợp toàn bộ tài liệu, giáo án phân tích Abhidharma, Tam Thức, Kinh Dịch và ghi chú thành một tài liệu Markdown hoàn chỉnh tương thích Obsidian và Notion.
              </p>
              <button
                onClick={handleDownloadMarkdown}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-xs transition"
              >
                <FileText className="w-4 h-4" /> Xuất Báo Cáo Markdown Toàn Bộ (.md)
              </button>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-5">
              {/* Snapshot File Upload Section */}
              <div className="p-4 bg-white border border-stone-200 rounded-xl space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  1. Nạp Tệp Bản Sao Lưu Snapshot (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  data-testid="snapshot-file-input"
                  onChange={handleSnapshotFileChange}
                  className="block w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100 cursor-pointer"
                />

                {parseError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}

                {parsedSnapshot && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Bản sao lưu hợp lệ (v{parsedSnapshot.version})</p>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Bao gồm: {parsedSnapshot.counts.categories} danh mục, {parsedSnapshot.counts.topics} chủ đề, {parsedSnapshot.counts.notes} ghi chú, {parsedSnapshot.counts.resources} tài liệu, {parsedSnapshot.counts.tags} thẻ.
                        </p>
                      </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-stone-700">
                        2. Chọn Chế Độ Khôi Phục:
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label
                          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                            restoreMode === 'merge'
                              ? 'bg-amber-50 border-amber-600 text-amber-900 font-medium'
                              : 'bg-stone-50 border-stone-200 text-stone-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="restoreMode"
                            value="merge"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="text-amber-700 focus:ring-amber-700"
                          />
                          <span>Gộp Dữ Liệu (Merge)</span>
                        </label>
                        <label
                          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                            restoreMode === 'replace'
                              ? 'bg-rose-50 border-rose-600 text-rose-900 font-medium'
                              : 'bg-stone-50 border-stone-200 text-stone-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="restoreMode"
                            value="replace"
                            checked={restoreMode === 'replace'}
                            onChange={() => setRestoreMode('replace')}
                            className="text-rose-600 focus:ring-rose-600"
                          />
                          <span>Thay Thế Toàn Bộ (Replace)</span>
                        </label>
                      </div>
                    </div>

                    {/* Confirmation Gate for Replace Mode */}
                    {restoreMode === 'replace' && (
                      <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-rose-800 font-semibold">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Cảnh Báo Xóa Dữ Liệu (Confirmation Gate)</span>
                        </div>
                        <p className="text-rose-700">
                          Chế độ thay thế sẽ xóa trắng toàn bộ dữ liệu hiện tại trên máy chủ. Để tiếp tục, vui lòng nhập chính xác cụm từ: <span className="font-mono font-bold">XÁC NHẬN THAY THẾ</span>
                        </p>
                        <input
                          type="text"
                          value={confirmReplaceText}
                          onChange={(e) => setConfirmReplaceText(e.target.value)}
                          placeholder="XÁC NHẬN THAY THẾ"
                          className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-rose-600 focus:border-rose-600"
                        />
                      </div>
                    )}

                    {/* Restore Submit Button */}
                    <button
                      onClick={handleRestoreSubmit}
                      disabled={isSubmitting || !!parseError || isReplaceActionDisabled}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
                        restoreMode === 'replace'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed'
                          : 'bg-amber-700 hover:bg-amber-800 text-white disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      {isSubmitting
                        ? 'Đang Khôi Phục...'
                        : restoreMode === 'replace'
                        ? 'Thực Hiện Thay Thế Dữ Liệu'
                        : 'Thực Hiện Gộp Dữ Liệu'}
                    </button>
                  </div>
                )}
              </div>

              {/* Status Banners */}
              {restoreStatus === 'completed' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Khôi phục dữ liệu thành công! Trạng thái đã được nạp lại.</span>
                </div>
              )}

              {restoreStatus === 'rehydrate_failed' && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Lỗi nạp dữ liệu cục bộ (Rehydration Failed). Dữ liệu máy chủ đã lưu nhưng state cục bộ chưa làm tươi. Vui lòng tải lại.</span>
                </div>
              )}

              {restoreStatus === 'error' && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Không thể hoàn tất khôi phục dữ liệu! Vui lòng thử lại.</span>
                </div>
              )}

              {/* Legacy Textarea Import Form (Fallback) */}
              <form onSubmit={handleLegacyImportSubmit} className="space-y-3 pt-2 border-t border-stone-200">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Hoặc Dán Nội Dung JSON Trực Tiếp:
                </label>
                <textarea
                  rows={4}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='{ "categories": [...], "topics": [...], "notes": [...] }'
                  className="w-full p-3 font-mono text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-700"
                />

                {legacyImportStatus === 'success' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Nhập dữ liệu thành công!
                  </div>
                )}
                {legacyImportStatus === 'error' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" /> Định dạng JSON không hợp lệ! Vui lòng kiểm tra lại cấu trúc.
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" /> Nạp Dữ Liệu Thủ Công (Legacy JSON)
                </button>
              </form>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Khôi phục về dữ liệu nghiên cứu ban đầu?</h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto mt-1">
                  Hệ thống sẽ nạp lại đầy đủ bộ giáo lý Abhidharma 7 bộ, Tam Tạng, Thiền định, Kỳ Môn Độn Giáp, Thái Ất, Tử Vi, Kinh Dịch và các ghi chú mẫu.
                </p>
              </div>
              <button
                onClick={handleResetConfirm}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition"
              >
                Xác Nhận Khôi Phục Gốc
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
