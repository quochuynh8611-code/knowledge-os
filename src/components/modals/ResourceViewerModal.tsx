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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900 line-clamp-1">{resource.title}</h2>
              <p className="text-xs text-stone-600">
                {resource.author ? `Tác giả: ${resource.author}` : 'Tài liệu nghiên cứu'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewer Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3">
            <div className="flex justify-between items-center text-xs text-stone-500 border-b pb-2">
              <span className="font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                Định dạng: {resource.type.toUpperCase()}
              </span>
              <span>Chủ đề: {resource.topicTitle || 'Nghiên cứu'}</span>
            </div>

            {resource.notes && (
              <div>
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Ghi chú tóm lược:</h4>
                <p className="text-sm text-stone-800 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
                  {resource.notes}
                </p>
              </div>
            )}

            {/* Hierarchical Source Details */}
            <div className="space-y-2 pt-1">
              {/* 1. Open Target (if present) */}
              {resource.openTarget && (
                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1 text-left">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-700" /> Đích mở nội dung ưu tiên (openTarget):
                    </span>
                    <span className="text-[10px] lowercase font-normal text-indigo-700 font-mono">
                      {resolution.sourceField === 'openTarget' ? 'Đang kích hoạt' : ''}
                    </span>
                  </div>
                  <code className="block text-xs font-mono text-indigo-950 bg-white p-2 rounded-lg border border-indigo-100 break-all select-all">
                    {resource.openTarget}
                  </code>
                </div>
              )}

              {/* 2. Reference URL (if present) */}
              {resource.url && (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-left">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-stone-700">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-stone-600" /> Liên kết tham chiếu (URL):
                    </span>
                    {resolution.sourceField === 'url' && (
                      <span className="text-[10px] lowercase font-normal text-emerald-700 font-semibold">
                        Fallback kích hoạt
                      </span>
                    )}
                  </div>
                  <code className="block text-xs font-mono text-stone-800 bg-white p-2 rounded-lg border border-stone-200 break-all select-all">
                    {resource.url}
                  </code>
                </div>
              )}

              {/* 3. Local File Path Display Card */}
              {resource.filePath && (
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-indigo-700" /> Đường dẫn tệp cục bộ trên máy:
                    </span>
                    <button
                      onClick={handleCopyPath}
                      className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedPath ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPath ? 'Đã sao chép đường dẫn!' : 'Sao chép đường dẫn'}</span>
                    </button>
                  </div>
                  <code className="block text-xs font-mono text-stone-800 bg-white p-2.5 rounded-lg border border-stone-200 break-all select-all">
                    {normalizeFilePath(resource.filePath)}
                  </code>
                </div>
              )}
            </div>

            {/* Action Box with Truthful Execution Affordance */}
            <div className="p-4 bg-stone-100 rounded-xl border border-dashed border-stone-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs mx-auto flex items-center justify-center text-indigo-700">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 text-sm">{resource.title}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{resolution.description}</p>
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
                <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl text-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Tài liệu cục bộ trên máy. Trình duyệt không thể tự động mở file hệ thống; vui lòng sao chép đường dẫn để mở qua ứng dụng máy tính.
                    </span>
                  </div>
                  <button
                    onClick={handleCopyPath}
                    className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition"
                  >
                    {copiedPath ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPath ? 'Đã chép!' : 'Sao chép đường dẫn'}</span>
                  </button>
                </div>
              )}

              {/* If unsupported_target: explain honestly */}
              {resolution.targetType === 'unsupported_target' && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Đích mở không được hỗ trợ hoặc không an toàn để kích hoạt trực tiếp trong trình duyệt.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
