import React, { useState } from 'react';
import { X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Resource } from '../../types';

interface ObsidianTopicResourceLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  vaultName: string;
  onLinked: (resource: Partial<Resource>) => void;
}

export function ObsidianTopicResourceLinkModal({
  isOpen,
  onClose,
  topicId,
  vaultName,
  onLinked,
}: ObsidianTopicResourceLinkModalProps) {
  const [relativePath, setRelativePath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = relativePath.trim();
    if (!cleanPath) {
      setErrorMessage('Vui lòng nhập đường dẫn tương đối của tệp Markdown trong Vault.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/obsidian/vault/file?path=${encodeURIComponent(cleanPath)}`);
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || 'Lỗi khi kiểm tra tệp tin trong Vault');
        return;
      }

      // Preflight succeeded: prepare canonical metadata
      const displayTitle = data.frontmatter?.title || data.fileName || cleanPath;
      const deepLink = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(cleanPath)}`;

      const resourcePayload: Partial<Resource> = {
        topicId,
        type: 'md',
        filePath: cleanPath,
        title: displayTitle,
        url: deepLink,
        notes: JSON.stringify({
          vaultName,
          lastKnownMtime: data.lastModified,
        }),
      };

      onLinked(resourcePayload);
      onClose();
    } catch (err) {
      setErrorMessage('Không thể kết nối tới máy chủ Knowledge OS');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-700" />
            <h2 className="text-sm font-bold text-stone-900">Liên kết ghi chú Obsidian</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="obsidian-relative-path"
              className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1"
            >
              Đường dẫn tương đối trong Vault
            </label>
            <input
              id="obsidian-relative-path"
              type="text"
              value={relativePath}
              onChange={(e) => {
                setRelativePath(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Ví dụ: Phat-Hoc/Bat-Chanh-Dao.md"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-stone-500">
              Đường dẫn bắt đầu từ gốc của Vault <strong>{vaultName || 'Obsidian'}</strong>, bao gồm đuôi .md hoặc .markdown.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Xác nhận liên kết</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
