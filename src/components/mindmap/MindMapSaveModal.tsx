import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, FileText, Layers, Check } from 'lucide-react';
import { MindMapDocumentSummary } from '../../types/mindmapDocument';

export interface MindMapSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNew: (title: string, description?: string, changeSummary?: string) => void;
  onSaveVersion?: (changeSummary: string) => void;
  activeDocument?: MindMapDocumentSummary | null;
  defaultTitle?: string;
  isVolatile?: boolean;
  nodesCount: number;
  layoutMode: 'tree_horizontal' | 'tree_vertical';
}

export function MindMapSaveModal({
  isOpen,
  onClose,
  onSaveNew,
  onSaveVersion,
  activeDocument,
  defaultTitle = '',
  isVolatile = false,
  nodesCount,
  layoutMode,
}: MindMapSaveModalProps) {
  const isNewDoc = !activeDocument;
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle || (activeDocument ? activeDocument.title : ''));
      setDescription(activeDocument?.description || '');
      setChangeSummary('');
      setError(null);
    }
  }, [isOpen, defaultTitle, activeDocument]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewDoc) {
      const trimmed = title.trim();
      if (!trimmed) {
        setError('Tiêu đề sơ đồ không được để trống.');
        return;
      }
      if (trimmed.length > 120) {
        setError('Tiêu đề không được vượt quá 120 ký tự.');
        return;
      }
      onSaveNew(trimmed, description.trim() || undefined, changeSummary.trim() || undefined);
    } else if (onSaveVersion) {
      onSaveVersion(changeSummary.trim() || `Cập nhật phiên bản ${activeDocument.currentVersionNumber + 1}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      data-testid="mindmap-save-modal"
    >
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-6 py-4 bg-stone-50 dark:bg-stone-950/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Save className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {isNewDoc ? 'Lưu Sơ Đồ Tư Duy Mới' : `Lưu Phiên Bản Mới (v${activeDocument.currentVersionNumber + 1})`}
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                {isNewDoc
                  ? 'Tạo tài liệu độc lập để mở lại và quản lý lịch sử'
                  : `Tài liệu: ${activeDocument.title}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-save-modal"
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Volatile Warning Banner */}
        {isVolatile && (
          <div
            className="flex items-start gap-3 border-b border-amber-500/20 bg-amber-500/10 px-6 py-3 text-amber-700 dark:text-amber-300 text-xs"
            data-testid="save-modal-volatile-warning"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <span className="font-semibold">⚠️ Bộ nhớ tạm thời (RAM):</span> Dữ liệu chỉ được lưu trong phiên hiện tại và sẽ mất khi tải lại trang do trình duyệt hạn chế quyền lưu trữ.
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          {isNewDoc && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                Tiêu Đề Sơ Đồ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tên sơ đồ tư duy..."
                maxLength={120}
                required
                data-testid="input-doc-title"
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
          )}

          {isNewDoc && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                Mô Tả / Ghi Chú (Tùy chọn)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ghi chú mục đích hoặc nội dung tóm tắt của sơ đồ..."
                rows={2}
                maxLength={300}
                data-testid="input-doc-description"
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Ghi Chú Phiên Bản ({isNewDoc ? 'v1' : `v${activeDocument.currentVersionNumber + 1}`})
            </label>
            <input
              type="text"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder={isNewDoc ? 'Bản lưu khởi tạo' : 'Tóm tắt các thay đổi trong phiên bản này...'}
              maxLength={150}
              data-testid="input-change-summary"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          {/* Stats Snapshot */}
          <div className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 p-3 text-xs text-stone-700 dark:text-stone-300">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-stone-400" />
              <span>Số lượng nút: <strong className="text-stone-800 dark:text-stone-200">{nodesCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-stone-400" />
              <span>Bố cục: <strong className="text-stone-800 dark:text-stone-200">{layoutMode === 'tree_horizontal' ? 'Ngang' : 'Dọc'}</strong></span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              data-testid="btn-confirm-save-doc"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-amber-500/20 transition-all hover:shadow-md hover:shadow-amber-500/30 active:scale-98"
            >
              <Check className="h-4 w-4" />
              <span>{isNewDoc ? 'Lưu Sơ Đồ' : 'Lưu Phiên Bản Mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
