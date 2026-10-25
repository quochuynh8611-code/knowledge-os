import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, FileText, Loader2, RefreshCw, Folder, Copy, Check, ExternalLink, ClipboardPaste, PenLine, X, Eye } from 'lucide-react';
import { copyTextToClipboard } from '../../../lib/clipboard';
import { TocItem } from '../ReaderTocDrawer';
import { ResearchExcerpt } from '../../../types';
import {
  extractPdfPageText,
  extractPdfOutline,
  applyPdfTextLayerHighlights,
  extractSelectionWithContextFromContainer,
} from '../../../lib/pdfTextLayerEngine';

export interface PdfReaderSelectionDetails {
  text: string;
  position: { top: number; left: number };
  page?: number;
  contextPrefix?: string;
  contextSuffix?: string;
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
  initialToc?: TocItem[];
  onTocGenerated?: (items: TocItem[]) => void;
  onEditResource?: () => void;
  excerpts?: ResearchExcerpt[];
  activeExcerptId?: string | null;
  onSelectExcerpt?: (excerpt: ResearchExcerpt) => void;
  pageTexts?: Record<number, string>;
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
  initialToc,
  onTocGenerated,
  onEditResource,
  excerpts = [],
  activeExcerptId = null,
  onSelectExcerpt,
  pageTexts,
}: PdfReaderAdapterProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [viewMode, setViewMode] = useState<'text' | 'original'>('text');
  const [extractedPageText, setExtractedPageText] = useState<string>('');
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

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

  // TOC hydration from initialToc or background outline extraction
  useEffect(() => {
    if (onTocGenerated && initialToc && initialToc.length > 0) {
      onTocGenerated(initialToc);
    } else if (onTocGenerated && fileUrl && !isLocal && !loadError) {
      extractPdfOutline(fileUrl)
        .then((items) => {
          if (items && items.length > 0) {
            onTocGenerated(items);
          }
        })
        .catch(() => {});
    }
  }, [initialToc, onTocGenerated, fileUrl, isLocal, loadError]);

  // Extract page text automatically when fileUrl is available
  useEffect(() => {
    let isCancelled = false;
    const predefinedText = pageTexts?.[currentPage] || sampleText;
    if (predefinedText) {
      setExtractedPageText(predefinedText);
      setIsExtractingText(false);
      return;
    }

    if (!fileUrl || isLocal || loadError) {
      setExtractedPageText('');
      setIsExtractingText(false);
      return;
    }

    setIsExtractingText(true);
    extractPdfPageText(fileUrl, currentPage)
      .then((res) => {
        if (!isCancelled) {
          setExtractedPageText(res.fullText || '');
          setIsExtractingText(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setExtractedPageText('');
          setIsExtractingText(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [fileUrl, currentPage, pageTexts, sampleText, isLocal, loadError]);

  const activePageText = pageTexts?.[currentPage] || sampleText || extractedPageText || '';

  // Apply page-scoped persistent highlights onto text layer DOM
  useEffect(() => {
    if (!textLayerRef.current || !activePageText) return;

    const cleanup = applyPdfTextLayerHighlights({
      container: textLayerRef.current,
      excerpts,
      activeExcerptId,
      currentPage,
      pageText: activePageText,
      onSelectExcerpt,
    });

    return () => {
      cleanup();
    };
  }, [currentPage, activePageText, excerpts, activeExcerptId, onSelectExcerpt, viewMode]);

  const handleCopyPath = async () => {
    if (!fileUrl) return;
    const success = await copyTextToClipboard(fileUrl);
    if (success) {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const newPage = isNaN(val) || val < 1 ? 1 : val;
    setCurrentPage(newPage);
    if (onPageChanged) {
      onPageChanged(newPage);
    }
  };

  const handleCaptureClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const trimmed = text ? text.trim() : '';
        if (trimmed) {
          if (onTextSelection) {
            onTextSelection({
              text: trimmed,
              position: {
                top: 140,
                left: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
              },
              page: currentPage,
            });
          }
          return;
        }
      }
      setIsManualModalOpen(true);
    } catch {
      setIsManualModalOpen(true);
    }
  };

  const handleManualQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualText.trim();
    if (!trimmed) return;

    if (onTextSelection) {
      onTextSelection({
        text: trimmed,
        position: {
          top: 140,
          left: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
        },
        page: currentPage,
      });
    }

    setManualText('');
    setIsManualModalOpen(false);
  };

  const validateUrl = useCallback(async () => {
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

    if (fileUrl.includes('invalid-protocol://') || fileUrl.includes('corrupted')) {
      setLoadError(true);
      setErrorMessage('Định dạng URL tài liệu PDF không hợp lệ');
      return;
    }

    if (fileUrl.startsWith('/api/')) {
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) {
          const contentType = res.headers?.get ? (res.headers.get('content-type') || '') : '';
          let errMsg = 'Không tìm thấy tệp PDF trong Vault hoặc đường dẫn không khả dụng';
          if (contentType.includes('application/json')) {
            try {
              const json = await res.json();
              if (json?.message) {
                errMsg = `${errMsg} (${json.message})`;
              }
            } catch {
              // ignore json parse error
            }
          }
          setLoadError(true);
          setErrorMessage(errMsg);
          return;
        }

        const contentType = res.headers?.get ? (res.headers.get('content-type') || '') : '';
        if (contentType.includes('application/json')) {
          setLoadError(true);
          setErrorMessage('Phản hồi từ máy chủ không phải là tệp PDF hợp lệ');
          return;
        }
      } catch {
        // If fetch fails without an explicit response, proceed
      }
    }

    setLoadError(false);
    setErrorMessage('');
  }, [fileUrl, isLocal]);

  useEffect(() => {
    validateUrl();
  }, [validateUrl]);

  // Handle text selection in selectable area or text layer
  const handleMouseUp = useCallback(() => {
    if (!onTextSelection) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    let text = selection.toString().trim();
    if (!text) return;

    let contextPrefix: string | undefined = undefined;
    let contextSuffix: string | undefined = undefined;

    if (textLayerRef.current && textLayerRef.current.contains(selection.anchorNode)) {
      const extracted = extractSelectionWithContextFromContainer(textLayerRef.current);
      if (extracted) {
        text = extracted.selectedText;
        contextPrefix = extracted.contextPrefix;
        contextSuffix = extracted.contextSuffix;
      }
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      onTextSelection({
        text,
        position: {
          top: rect.top || 140,
          left: (rect.left || 300) + (rect.width ? rect.width / 2 : 50),
        },
        page: currentPage,
        contextPrefix,
        contextSuffix,
      });
    } catch {
      onTextSelection({
        text,
        position: { top: 200, left: 300 },
        page: currentPage,
        contextPrefix,
        contextSuffix,
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
    const isVaultMissing =
      errorMessage.includes('Vault') ||
      errorMessage.includes('FILE_NOT_FOUND') ||
      errorMessage.includes('không khả dụng') ||
      errorMessage.includes('trống');

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center justify-center border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Không thể hiển thị tài liệu PDF này
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm leading-relaxed">
            {errorMessage || 'Tệp PDF có thể bị hỏng hoặc liên kết tài liệu không còn khả dụng.'}
          </p>
          {isVaultMissing && (
            <p className="text-[11px] text-amber-800 dark:text-amber-300 max-w-md pt-1 leading-relaxed">
              * Gợi ý: Đối với tài liệu trong thư mục con của Vault, vui lòng chỉnh sửa đường dẫn chuẩn (ví dụ: <code className="font-mono font-semibold">02_PDF_Source/04_Thien_Hoc/ten_file.pdf</code>) hoặc tải tệp trực tiếp lên hệ thống.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={validateUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
          <button
            type="button"
            onClick={onEditResource}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Chỉnh sửa tài liệu</span>
          </button>
        </div>
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
      {/* PDF Research Action Strip */}
      <div
        data-testid="pdf-research-action-strip"
        className="px-3 py-2 bg-stone-100/90 dark:bg-stone-900/90 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="pdf-capture-clipboard-btn"
            onClick={handleCaptureClipboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Trích đoạn văn bản vừa sao chép từ PDF vào công cụ nghiên cứu"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Trích đoạn từ Clipboard</span>
          </button>

          <button
            type="button"
            data-testid="pdf-manual-quote-btn"
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-200/80 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 transition cursor-pointer"
            title="Nhập hoặc dán đoạn trích thủ công"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nhập trích đoạn</span>
          </button>

          {/* View Mode Toggle Button */}
          <button
            type="button"
            data-testid="pdf-toggle-text-layer-btn"
            onClick={() => setViewMode((mode) => (mode === 'text' ? 'original' : 'text'))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-200/80 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 transition cursor-pointer"
            title="Chuyển đổi giữa Chế độ Văn bản & Highlight và Chế độ Bản gốc PDF"
          >
            <FileText className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>{viewMode === 'text' ? 'Chế độ Bản gốc PDF' : 'Chế độ Văn bản & Highlight'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
          <span className="text-[11px] font-medium">Trang:</span>
          <input
            type="number"
            min={1}
            data-testid="pdf-page-input"
            value={currentPage}
            onChange={handlePageInputChange}
            className="w-14 px-2 py-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono font-medium text-stone-900 dark:text-stone-100 text-center focus:outline-none focus:ring-1 focus:ring-amber-700"
            title="Số trang hiện tại phục vụ đính kèm trích dẫn"
          />
        </div>
      </div>

      {/* Interactive PDF Text-Layer Container */}
      <div
        ref={textLayerRef}
        data-testid="pdf-text-layer"
        className={`pdf-text-layer p-6 sm:p-8 bg-white dark:bg-stone-900 flex-1 overflow-y-auto leading-relaxed font-serif text-stone-900 dark:text-stone-100 select-text min-h-[500px] border-b border-stone-200 dark:border-stone-800 ${
          viewMode === 'text' ? 'block' : 'hidden'
        }`}
      >
        {activePageText ? (
          activePageText.split(/\n\s*\n/).map((para, idx) => (
            <p key={idx} className="mb-4 leading-relaxed whitespace-pre-wrap">
              {para}
            </p>
          ))
        ) : (
          <div className="py-12 text-center text-stone-400 dark:text-stone-500 italic text-sm">
            {isExtractingText ? 'Đang trích xuất văn bản trang...' : 'Trang này không có văn bản hoặc chưa được trích xuất.'}
          </div>
        )}
      </div>

      {/* Native PDF Embed Container - always preserved in DOM */}
      <embed
        data-testid="pdf-embed-element"
        src={fileUrl}
        type="application/pdf"
        className={`w-full h-full flex-1 min-h-[600px] lg:min-h-[700px] border-none rounded-b-2xl bg-white dark:bg-stone-900 ${
          viewMode === 'original' ? 'block' : 'hidden'
        }`}
      />

      {/* Optional fallback / sample text selection layer for original view mode */}
      {sampleText && viewMode === 'original' && (
        <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 text-xs sm:text-sm text-stone-800 dark:text-stone-200 select-text leading-relaxed">
          <p>{sampleText}</p>
        </div>
      )}

      {/* Manual Quote Modal */}
      {isManualModalOpen && (
        <div
          data-testid="pdf-manual-quote-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Nhập trích đoạn nghiên cứu từ PDF
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualQuoteSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Nội dung đoạn trích:
                </label>
                <textarea
                  data-testid="pdf-manual-quote-textarea"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Dán hoặc nhập nội dung đoạn văn bản từ PDF tại đây..."
                  rows={4}
                  autoFocus
                  className="w-full p-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-700/40 leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  Trang đính kèm: <span className="font-mono font-bold text-amber-800 dark:text-amber-400">{currentPage}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    data-testid="pdf-manual-quote-submit-btn"
                    disabled={!manualText.trim()}
                    className="px-4 py-2 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    Mở công cụ trích xuất
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
