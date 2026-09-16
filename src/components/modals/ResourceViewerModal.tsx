import React, { useState } from 'react';
import { Resource } from '../../types';
import {
  X,
  ExternalLink,
  FileText,
  Book,
  Video,
  Headphones,
  Globe,
  Copy,
  CheckCircle2,
  Folder,
  AlertTriangle,
  Link,
  Sparkles,
} from 'lucide-react';
import { normalizeFilePath } from '../../lib/fileLibraryAudit';
import { resolveResourceOpenTarget } from '../../lib/resourceOpenResolver';

interface ResourceViewerModalProps {
  resource: Resource | null;
  onClose: () => void;
}

export function ResourceViewerModal({ resource, onClose }: ResourceViewerModalProps) {
  const [copiedPath, setCopiedPath] = useState(false);

  if (!resource) return null;

  const resolution = resolveResourceOpenTarget(resource);

  const handleCopyPath = () => {
    if (!resource.filePath && !resolution.targetUrl) return;
    const pathToCopy = resource.filePath ? normalizeFilePath(resource.filePath) : resolution.targetUrl || '';
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pathToCopy).catch(() => {});
    }
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const getIcon = () => {
    switch (resource.type) {
      case 'pdf': return FileText;
      case 'book': return Book;
      case 'video': return Video;
      case 'audio': return Headphones;
      default: return Globe;
    }
  };

  const Icon = getIcon();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết tài liệu: ${resource.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 flex items-center justify-center font-bold border border-indigo-200 dark:border-indigo-800">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif-title line-clamp-1">{resource.title}</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {resource.author ? `Tác giả: ${resource.author}` : 'Tài liệu nghiên cứu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewer Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="p-4 bg-stone-50/60 dark:bg-stone-850 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800 pb-2">
              <span className="font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                Định dạng: {resource.type.toUpperCase()}
              </span>
              <span>Chủ đề: {resource.topicTitle || 'Nghiên cứu'}</span>
            </div>

            {resource.notes && (
              <div>
                <h4 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">Ghi chú tóm lược:</h4>
                <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed bg-white dark:bg-stone-800/80 p-3 rounded-xl border border-stone-200 dark:border-stone-700">
                  {resource.notes}
                </p>
              </div>
            )}

            {/* Hierarchical Source Details */}
            <div className="space-y-2 pt-1">
              {/* 1. Open Target (if present) */}
              {resource.openTarget && (
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-1 text-left">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" /> Đích mở nội dung ưu tiên (openTarget):
                    </span>
                    <span className="text-[10px] lowercase font-normal text-indigo-700 dark:text-indigo-400 font-mono">
                      {resolution.sourceField === 'openTarget' ? 'Đang kích hoạt' : ''}
                    </span>
                  </div>
                  <code className="block text-xs font-mono text-indigo-950 dark:text-indigo-200 bg-white dark:bg-stone-900 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800 break-all select-all">
                    {resource.openTarget}
                  </code>
                </div>
              )}

              {/* 2. Reference URL (if present) */}
              {resource.url && (
                <div className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1 text-left">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" /> Liên kết tham chiếu (URL):
                    </span>
                    {resolution.sourceField === 'url' && (
                      <span className="text-[10px] lowercase font-normal text-emerald-700 dark:text-emerald-400 font-semibold">
                        Fallback kích hoạt
                      </span>
                    )}
                  </div>
                  <code className="block text-xs font-mono text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-700 break-all select-all">
                    {resource.url}
                  </code>
                </div>
              )}

              {/* 3. Local File Path Display Card */}
              {resource.filePath && (
                <div className="p-3.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" /> Đường dẫn tệp cục bộ trên máy:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPath}
                      className="px-2.5 py-1 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer border border-stone-200 dark:border-stone-600"
                    >
                      {copiedPath ? <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPath ? 'Đã sao chép!' : 'Sao chép đường dẫn'}</span>
                    </button>
                  </div>
                  <code className="block text-xs font-mono text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 break-all select-all">
                    {normalizeFilePath(resource.filePath)}
                  </code>
                </div>
              )}
            </div>

            {/* Action Box with Truthful Execution Affordance */}
            <div className="p-4 bg-stone-100/80 dark:bg-stone-800/60 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-stone-800 shadow-xs mx-auto flex items-center justify-center text-indigo-700 dark:text-indigo-400 border border-stone-200 dark:border-stone-700">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{resource.title}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{resolution.description}</p>
              </div>

              {/* Only render active link if canOpenDirectly is TRUE */}
              {resolution.canOpenDirectly && resolution.targetUrl && (
                <div className="pt-1">
                  <a
                    href={resolution.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {resolution.targetType === 'custom_scheme' ? 'Mở Trong Ứng Dụng' : 'Mở Tài Liệu Trực Tiếp'}
                  </a>
                </div>
              )}

              {/* If local_path: explain clearly and offer copy path */}
              {resolution.targetType === 'local_path' && (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Tài liệu cục bộ trên máy. Trình duyệt không thể tự động mở file hệ thống; vui lòng sao chép đường dẫn để mở qua ứng dụng máy tính.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPath}
                    className="px-3 py-1.5 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-950 dark:text-amber-100 text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition"
                  >
                    {copiedPath ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPath ? 'Đã chép!' : 'Sao chép đường dẫn'}</span>
                  </button>
                </div>
              )}

              {/* If unsupported_target: explain honestly */}
              {resolution.targetType === 'unsupported_target' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-center gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>
                    Đích mở không được hỗ trợ hoặc không an toàn để kích hoạt trực tiếp trong trình duyệt.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 cursor-pointer transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
