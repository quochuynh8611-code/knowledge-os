import React, { useState, useMemo } from 'react';
import {
  X,
  FolderOpen,
  Search,
  Calendar,
  Layers,
  Archive,
  Edit2,
  Check,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { MindMapDocumentSummary } from '../../types/mindmapDocument';

export interface MindMapDocumentBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: MindMapDocumentSummary[];
  activeDocumentId?: string | null;
  onOpenDocument: (documentId: string) => void;
  onRenameDocument: (documentId: string, newTitle: string) => void;
  onArchiveDocument: (documentId: string) => void;
  isVolatile?: boolean;
}

export function MindMapDocumentBrowserModal({
  isOpen,
  onClose,
  documents,
  activeDocumentId,
  onOpenDocument,
  onRenameDocument,
  onArchiveDocument,
  isVolatile = false,
}: MindMapDocumentBrowserModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        (doc.description && doc.description.toLowerCase().includes(q)) ||
        (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [documents, searchQuery]);

  if (!isOpen) return null;

  const handleStartRename = (doc: MindMapDocumentSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDocId(doc.id);
    setEditTitle(doc.title);
  };

  const handleSaveRename = (docId: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const trimmed = editTitle.trim();
    if (trimmed && trimmed.length <= 120) {
      onRenameDocument(docId, trimmed);
    }
    setEditingDocId(null);
  };

  const handleArchive = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onArchiveDocument(docId);
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      data-testid="mindmap-browser-modal"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-6 py-4 bg-stone-50 dark:bg-stone-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Sơ Đồ Tư Duy Đã Lưu
              </h3>
              <p className="text-xs text-stone-700 dark:text-stone-300">
                {documents.length} tài liệu trong bộ nhớ cục bộ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-browser-modal"
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Volatile Notice */}
        {isVolatile && (
          <div
            className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2.5 text-xs text-amber-700 dark:text-amber-300 shrink-0"
            data-testid="browser-modal-volatile-warning"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Đang hoạt động trên bộ nhớ tạm RAM (dữ liệu sẽ mất khi reload).</span>
          </div>
        )}

        {/* Search Toolbar */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sơ đồ theo tên hoặc nhãn..."
              data-testid="input-search-saved-docs"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 pl-10 pr-4 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
        </div>

        {/* Document List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-stone-700 dark:text-stone-300">
              <FileText className="h-12 w-12 text-stone-300 dark:text-stone-700 mb-3" />
              <p className="text-sm font-medium">Chưa có sơ đồ tư duy nào được lưu</p>
              <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">
                Bấm "Lưu sơ đồ" trên thanh công cụ để tạo bản lưu đầu tiên.
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const isActive = doc.id === activeDocumentId;
              const isEditing = editingDocId === doc.id;

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDocument(doc.id)}
                  data-testid={`doc-card-${doc.id}`}
                  className={`group relative rounded-xl border p-4 transition-all cursor-pointer ${
                    isActive
                      ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-xs'
                      : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <form onSubmit={(e) => handleSaveRename(doc.id, e)} className="flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            maxLength={120}
                            data-testid={`input-rename-${doc.id}`}
                            className="rounded-lg border border-emerald-500 bg-white dark:bg-stone-800 px-2.5 py-1 text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={(e) => handleSaveRename(doc.id, e)}
                            data-testid={`btn-save-rename-${doc.id}`}
                            className="p-1 rounded-md bg-emerald-500 text-white hover:bg-emerald-600"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                            {doc.title}
                          </h4>
                          {isActive && (
                            <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Đang mở
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            v{doc.currentVersionNumber}
                          </span>
                        </div>
                      )}

                      {doc.description && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mb-2">
                          {doc.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-stone-700 dark:text-stone-300">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(doc.updatedAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {doc.totalVersionsCount} phiên bản lưu
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(doc, e)}
                        title="Đổi tên"
                        data-testid={`btn-rename-${doc.id}`}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleArchive(doc.id, e)}
                        title="Lưu trữ (Ẩn)"
                        data-testid={`btn-archive-${doc.id}`}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 dark:border-stone-800 p-4 bg-stone-50 dark:bg-stone-950/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
