import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, FileText, Loader2, RefreshCw, Folder, Copy, Check, ExternalLink } from 'lucide-react';
import { copyTextToClipboard } from '../../../lib/clipboard';

export interface PdfReaderSelectionDetails {
  text: string;
  position: { top: number; left: number };
  page?: number;
}

export interface PdfReaderAdapterProps {
  fileUrl?: string;
  documentId: string;
  title?: string;
  initialPage?: number;
  onPageChanged?: (page: number) => void;
  onTextSelection?: (selection: PdfReaderSelectionDetails) => void;
  sampleText?: string;
  className?: string;
}

export function isLocalFilesystemPath(url?: string): boolean {
  if (!url || !url.trim()) return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('file://')) return true;
  if (trimmed.startsWith('/') && !trimmed.startsWith('/api/')) return true;
  if (trimmed.startsWith('\\')) return true;
  if (/^[a-zA-Z]:[/\\]/.test(trimmed)) return true;
  return false;
}

export function PdfReaderAdapter({
  fileUrl,
  documentId,
  title,
  initialPage = 1,
  onPageChanged,
  onTextSelection,
  sampleText,
  className = '',
}: PdfReaderAdapterProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);

  const isLocal = isLocalFilesystemPath(fileUrl);
  const isInvalidInitial = !isLocal && (!fileUrl || !fileUrl.trim() || fileUrl.includes('invalid-protocol://') || fileUrl.includes('corrupted'));
  const [loadError, setLoadError] = useState<boolean>(isInvalidInitial);
  const [errorMessage, setErrorMessage] = useState<string>(
    !fileUrl || !fileUrl.trim()
      ? 'Không tìm thấy file PDF hoặc đường dẫn trống'
      : isInvalidInitial
      ? 'Định dạng URL tài liệu PDF không hợp lệ'
      : ''
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopyPath = async () => {
    if (!fileUrl) return;
    const success = await copyTextToClipboard(fileUrl);
    if (success) {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const validateUrl = useCallback(() => {
    if (isLocal) {
      setLoadError(false);
      setErrorMessage('');
      return;
    }

    if (!fileUrl || !fileUrl.trim()) {
      setLoadError(true);
      setErrorMessage('Không tìm thấy file PDF hoặc đường dẫn trống');
      return;
    }

    // Check invalid protocol
    if (fileUrl.includes('invalid-protocol://') || fileUrl.includes('corrupted')) {
      setLoadError(true);
      setErrorMessage('Định dạng URL tài liệu PDF không hợp lệ');
      return;
    }

    setLoadError(false);
    setErrorMessage('');
  }, [fileUrl, isLocal]);

  useEffect(() => {
    validateUrl();
  }, [validateUrl]);

  // Handle text selection in selectable area or document layer
  const handleMouseUp = useCallback(() => {
    if (!onTextSelection) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      onTextSelection({
        text,
        position: {
          top: rect.top,
          left: rect.left + rect.width / 2,
        },
        page: currentPage,
      });
    } catch {
      // Fallback position if rect calculation fails
      onTextSelection({
        text,
        position: { top: 200, left: 300 },
        page: currentPage,
      });
    }
  }, [onTextSelection, currentPage]);

  if (isLocal) {
    return (
      <div
        data-testid="pdf-local-path-fallback"
        className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center space-y-4 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800 my-auto max-w-xl mx-auto"
      >
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-800 shadow-2xs">
          <Folder className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            Tệp PDF lưu trên máy cục bộ
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed max-w-md">
            Trình duyệt web không cho phép nhúng trực tiếp tệp từ hệ thống tập tin cục bộ vì lý do bảo mật. Bạn có thể sao chép đường dẫn để mở bằng ứng dụng đọc PDF chuyên dụng (Adobe Acrobat, Preview, Chrome).
          </p>
        </div>

        {fileUrl && (
          <div className="w-full bg-stone-100 dark:bg-stone-800/80 p-3 rounded-xl border border-stone-200 dark:border-stone-700 text-left space-y-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Đường dẫn tệp:</span>
            <p className="text-xs font-mono text-stone-800 dark:text-stone-200 break-all select-all">
              {fileUrl}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleCopyPath}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            {copiedPath ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đã sao chép đường dẫn</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép đường dẫn</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center justify-center border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Không thể hiển thị tài liệu PDF này
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm">
            {errorMessage || 'Tệp PDF có thể bị hỏng hoặc liên kết tài liệu không còn khả dụng.'}
          </p>
        </div>
        <button
          type="button"
          onClick={validateUrl}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      data-testid="pdf-selectable-area"
      className={`pdf-reader-viewport w-full h-full flex flex-col relative bg-stone-100 dark:bg-stone-950 rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800 ${className}`}
    >
      {/* Native PDF Embed Container */}
      <embed
        data-testid="pdf-embed-element"
        src={fileUrl}
        type="application/pdf"
        className="w-full flex-1 min-h-[500px] border-none rounded-2xl bg-white dark:bg-stone-900"
      />

      {/* Optional fallback / sample text selection layer */}
      {sampleText && (
        <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 text-xs sm:text-sm text-stone-800 dark:text-stone-200 select-text leading-relaxed">
          <p>{sampleText}</p>
        </div>
      )}
    </div>
  );
}
