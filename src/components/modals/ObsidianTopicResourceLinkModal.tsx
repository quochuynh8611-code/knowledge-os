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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Liên kết ghi chú Obsidian"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-serif-title">
              Liên kết ghi chú Obsidian
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
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
              className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1"
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
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
              Đường dẫn bắt đầu từ gốc của Vault <strong>{vaultName || 'Obsidian'}</strong>, bao gồm đuôi .md hoặc .markdown.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2 text-rose-800 dark:text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
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
