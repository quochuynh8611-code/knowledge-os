import React from 'react';
import { Resource } from '../../types';
import { X, ExternalLink, FileText, Book, Video, Headphones, Globe, Download } from 'lucide-react';

interface ResourceViewerModalProps {
  resource: Resource | null;
  onClose: () => void;
}

export function ResourceViewerModal({ resource, onClose }: ResourceViewerModalProps) {
  if (!resource) return null;

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

            {/* Simulated Reader / Content preview */}
            <div className="p-4 bg-stone-100 rounded-xl border border-dashed border-stone-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs mx-auto flex items-center justify-center text-indigo-700">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 text-sm">{resource.title}</h3>
                <p className="text-xs text-stone-500 mt-0.5">Tài liệu đã sẵn sàng để truy cập và tham khảo.</p>
              </div>

              {resource.url && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Mở Tài Liệu Trực Tiếp
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-xl"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
