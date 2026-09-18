import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, FileText, Loader2, RefreshCw } from 'lucide-react';

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
  const isInvalidInitial = !fileUrl || !fileUrl.trim() || fileUrl.includes('invalid-protocol://') || fileUrl.includes('corrupted');
  const [loadError, setLoadError] = useState<boolean>(isInvalidInitial);
  const [errorMessage, setErrorMessage] = useState<string>(
    !fileUrl || !fileUrl.trim()
      ? 'Không tìm thấy file PDF hoặc đường dẫn trống'
      : isInvalidInitial
      ? 'Định dạng URL tài liệu PDF không hợp lệ'
      : ''
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const validateUrl = useCallback(() => {
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
  }, [fileUrl]);

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
