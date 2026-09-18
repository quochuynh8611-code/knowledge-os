import React, { useState, useEffect, useCallback } from 'react';
import { Columns2, Square, Plus, Minus, RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';
import { ReaderHeader } from './ReaderHeader';
import { ReaderTocDrawer, TocItem } from './ReaderTocDrawer';
import { MarkdownReaderAdapter } from './adapters/MarkdownReaderAdapter';
import { EpubReaderAdapter } from './adapters/EpubReaderAdapter';
import { PdfReaderAdapter } from './adapters/PdfReaderAdapter';
import { globalReadingPositionStore } from '../../lib/readingPositionUnified';

export interface UnifiedResearchReaderProps {
  documentId: string;
  title: string;
  format: 'epub' | 'md' | 'markdown' | string;
  fileUrl?: string;
  content?: string;
  initialPosition?: string;
  onPositionChange?: (locator: string) => void;
  onClose: () => void;
  className?: string;
}

export function UnifiedResearchReader({
  documentId,
  title,
  format,
  fileUrl,
  content,
  initialPosition,
  onPositionChange,
  onClose,
  className = '',
}: UnifiedResearchReaderProps) {
  const normalizedFormat = (format || 'md').toLowerCase();
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeTocId, setActiveTocId] = useState<string | undefined>(undefined);
  const [targetHeadingId, setTargetHeadingId] = useState<string | undefined>(initialPosition);

  // EPUB-specific viewing controls
  const [fontSize, setFontSize] = useState<number>(100);
  const [pageMode, setPageMode] = useState<'single' | 'double'>('double');

  // Load initial position from in-memory store if not provided directly
  const [currentPosition, setCurrentPosition] = useState<string | undefined>(() => {
    if (initialPosition) return initialPosition;
    return globalReadingPositionStore.getPosition(documentId, normalizedFormat) || undefined;
  });

  // Track position change in in-memory store
  const handlePositionChanged = useCallback(
    (newLocator: string) => {
      setCurrentPosition(newLocator);
      globalReadingPositionStore.setPosition(documentId, normalizedFormat, newLocator);
      if (onPositionChange) {
        onPositionChange(newLocator);
      }
    },
    [documentId, normalizedFormat, onPositionChange]
  );

  // Handle TOC item selection
  const handleSelectTocItem = (item: TocItem) => {
    setActiveTocId(item.id);
    setTargetHeadingId(item.id);
    handlePositionChanged(item.id);
  };

  // Keyboard navigation & ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isTocOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTocOpen, onClose]);

  // EPUB extra controls in header
  const epubExtraControls = normalizedFormat === 'epub' && (
    <div className="flex items-center gap-2">
      {/* Page Mode Toggle */}
      <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs">
        <button
          type="button"
          onClick={() => setPageMode('double')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
            pageMode === 'double'
              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 shadow-2xs font-semibold'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
          title="Trang đôi"
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trang đôi</span>
        </button>
        <button
          type="button"
          onClick={() => setPageMode('single')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
            pageMode === 'single'
              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 shadow-2xs font-semibold'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
          }`}
          title="Trang đơn"
        >
          <Square className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trang đơn</span>
        </button>
      </div>

      {/* Font Size Controls */}
      <div className="flex items-center bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs">
        <button
          type="button"
          onClick={() => setFontSize((prev) => Math.max(prev - 10, 70))}
          disabled={fontSize <= 70}
          aria-label="Giảm cỡ chữ"
          className="p-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg transition disabled:opacity-40 cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="px-1.5 py-0.5 font-semibold text-stone-800 dark:text-stone-200 text-xs min-w-[38px] text-center select-none">
          {fontSize}%
        </span>
        <button
          type="button"
          onClick={() => setFontSize((prev) => Math.min(prev + 10, 200))}
          disabled={fontSize >= 200}
          aria-label="Tăng cỡ chữ"
          className="p-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg transition disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setFontSize(100)}
          aria-label="Đặt lại cỡ chữ"
          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition cursor-pointer"
          title="Mặc định 100%"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150 ${className}`}
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-6xl h-[92vh] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Reader Header */}
        <ReaderHeader
          title={title}
          format={normalizedFormat}
          isTocOpen={isTocOpen}
          onToggleToc={() => setIsTocOpen((prev) => !prev)}
          onClose={onClose}
          extraControls={epubExtraControls}
        />

        {/* Reader Viewport Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-stone-50 dark:bg-stone-950 p-2 sm:p-4">
          {normalizedFormat === 'epub' ? (
            <EpubReaderAdapter
              fileUrl={fileUrl}
              documentId={documentId}
              initialLocation={currentPosition}
              onLocationChanged={handlePositionChanged}
              onTocGenerated={(items) => setTocItems(items)}
              fontSize={fontSize}
              pageMode={pageMode}
            />
          ) : normalizedFormat === 'md' || normalizedFormat === 'markdown' ? (
            <div className="w-full h-full bg-white dark:bg-stone-900 rounded-2xl shadow-2xs border border-stone-200/80 dark:border-stone-800 overflow-hidden flex flex-col">
              <MarkdownReaderAdapter
                content={content}
                documentId={documentId}
                initialHeadingId={targetHeadingId}
                onTocGenerated={(items) => setTocItems(items)}
                onPositionChange={handlePositionChanged}
              />
            </div>
          ) : normalizedFormat === 'pdf' ? (
            <PdfReaderAdapter
              fileUrl={fileUrl}
              documentId={documentId}
              title={title}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-stone-100 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Định dạng tài liệu chưa được hỗ trợ
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm">
                  Trình đọc hiện hỗ trợ định dạng Markdown (.md), EPUB (.epub) và PDF (.pdf).
                </p>
              </div>
            </div>
          )}

          {/* Table of Contents Drawer */}
          <ReaderTocDrawer
            isOpen={isTocOpen}
            onClose={() => setIsTocOpen(false)}
            toc={tocItems}
            activeId={activeTocId}
            onSelectTocItem={handleSelectTocItem}
          />
        </div>
      </div>
    </div>
  );
}
