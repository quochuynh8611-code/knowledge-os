import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Columns2, Square, Plus, Minus, RotateCcw, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { ReaderHeader } from './ReaderHeader';
import { ReaderTocDrawer, TocItem } from './ReaderTocDrawer';
import { ReaderSidebar, ReaderSidebarTab } from './ReaderSidebar';
import { MarkdownReaderAdapter } from './adapters/MarkdownReaderAdapter';
import { EpubReaderAdapter } from './adapters/EpubReaderAdapter';
import { PdfReaderAdapter } from './adapters/PdfReaderAdapter';
import { UnifiedSelectionToolbar, SelectionToolbarAction } from './UnifiedSelectionToolbar';
import { TargetNoteSelectorModal } from './TargetNoteSelectorModal';
import { generateExcerptCitationSnapshot, formatExcerptBlockquote } from '../../lib/excerptCitationService';
import { globalReadingPositionStore } from '../../lib/readingPositionUnified';
import { DataContext, dataRepository } from '../../context/DataContext';
import { ResearchExcerpt, ResearchInboxItem, Note } from '../../types';
import { copyTextToClipboard } from '../../lib/clipboard';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [sidebarTab, setSidebarTab] = useState<ReaderSidebarTab>('outline');
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

  // Selection Toolbar & Note Modal State
  const [activeSelection, setActiveSelection] = useState<{
    text: string;
    position: { top: number; left: number };
    page?: number;
  } | null>(null);
  const [isTargetNoteModalOpen, setIsTargetNoteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dataContext = React.useContext(DataContext) as {
    notes?: Note[];
    researchInboxItems?: ResearchInboxItem[];
    addExcerptToInbox?: (excerpt: ResearchExcerpt) => Promise<any>;
  } | undefined;
  const notes = dataContext?.notes || [];
  const inboxItems = dataContext?.researchInboxItems || [];
  const addExcerptToInbox = dataContext?.addExcerptToInbox;

  // Wave R2.3: Extract active document highlights from researchInboxItems
  const documentHighlights = useMemo(() => {
    return inboxItems
      .map((item) => item.excerpt)
      .filter((excerpt): excerpt is ResearchExcerpt => Boolean(excerpt && excerpt.archivedDocumentId === documentId));
  }, [inboxItems, documentId]);

  // Wave R2.4: Document-scoped notes filtering with 4-tier precedence
  const scopedNotes = useMemo(() => {
    const targetNoteIds = new Set<string>();
    for (const highlight of documentHighlights) {
      if (highlight.targetNoteId) {
        targetNoteIds.add(highlight.targetNoteId);
      }
    }

    const archiveUriMarker = `archive://${documentId}`;
    const normalizedDocId = documentId.trim().toLowerCase();
    const normalizedTitle = title?.trim().toLowerCase();

    return notes.filter((note) => {
      // Tier 1: Explicit targetNoteId from excerpts belonging to active document
      if (targetNoteIds.has(note.id)) {
        return true;
      }

      const noteContent = note.content || '';

      // Tier 2: Archive URI Marker in note content
      if (
        noteContent.includes(archiveUriMarker) ||
        noteContent.includes(`archive://${encodeURIComponent(documentId)}`)
      ) {
        return true;
      }

      // Tier 3: Source path binding
      if (note.sourcePath) {
        const normalizedSourcePath = note.sourcePath.trim().toLowerCase();
        if (
          normalizedSourcePath === normalizedDocId ||
          normalizedSourcePath.endsWith(`/${normalizedDocId}`) ||
          normalizedSourcePath.endsWith(`\\${normalizedDocId}`) ||
          normalizedSourcePath.replace(/\.(md|epub|pdf)$/i, '') === normalizedDocId.replace(/\.(md|epub|pdf)$/i, '')
        ) {
          return true;
        }
      }

      // Tier 4: Heuristic fallback for document title citations
      if (
        normalizedTitle &&
        (noteContent.toLowerCase().includes(`*${normalizedTitle}*`) ||
          noteContent.toLowerCase().includes(`— *${normalizedTitle}*`))
      ) {
        return true;
      }

      return false;
    });
  }, [notes, documentHighlights, documentId, title]);

  const handleSelectExcerpt = useCallback(
    (excerpt: ResearchExcerpt) => {
      const locator =
        excerpt.positionSelector?.headingId ||
        (excerpt.positionSelector?.pageNumber !== undefined ? String(excerpt.positionSelector.pageNumber) : undefined) ||
        excerpt.positionSelector?.cfi;
      if (locator) {
        handlePositionChanged(locator);
      }
    },
    [handlePositionChanged]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2500);
  };

  const handleOpenArchiveLinkFromSidebar = useCallback(
    (targetDocId: string, locator?: string) => {
      if (targetDocId === documentId) {
        if (locator) {
          setTargetHeadingId(locator);
          handlePositionChanged(locator);
          showToast(`Đã chuyển đến: ${locator}`);
        } else {
          showToast('Đang ở tài liệu hiện tại');
        }
      } else {
        showToast(`Trích dẫn thuộc tài liệu khác: ${targetDocId}`);
      }
    },
    [documentId, handlePositionChanged]
  );

  const handleTextSelection = useCallback((selection: { text: string; position: { top: number; left: number }; page?: number }) => {
    setActiveSelection(selection);
  }, []);

  const handleToolbarAction = async (action: SelectionToolbarAction, payload: { text: string }) => {
    const selectedText = payload.text || activeSelection?.text || '';
    if (!selectedText) return;

    const citationSnapshot = generateExcerptCitationSnapshot(
      { documentId, title, format: normalizedFormat, sourceUrl: fileUrl },
      { page: activeSelection?.page, heading: activeTocId }
    );

    const now = new Date().toISOString();
    const excerpt: ResearchExcerpt = {
      id: `excerpt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      archivedDocumentId: documentId,
      selectedText,
      positionSelector: {
        headingId: activeTocId,
        pageNumber: activeSelection?.page,
        cfi: currentPosition,
      },
      highlightColor: '#fef08a',
      citationSnapshot,
      status: 'inbox',
      createdAt: now,
      updatedAt: now,
    };

    if (action === 'copy') {
      showToast('Đã sao chép đoạn trích vào clipboard');
      setActiveSelection(null);
    } else if (action === 'highlight') {
      showToast('Đã đánh dấu đoạn trích nghiên cứu');
      setActiveSelection(null);
    } else if (action === 'citation') {
      const citationText = citationSnapshot.formatted || citationSnapshot.apa || '';
      const success = await copyTextToClipboard(citationText);
      if (success) {
        showToast('Đã sao chép trích dẫn học thuật');
      } else {
        showToast('Trích dẫn đã được tạo');
      }
      setActiveSelection(null);
    } else if (action === 'send_to_note') {
      setIsTargetNoteModalOpen(true);
    } else if (action === 'add_to_inbox') {
      try {
        if (addExcerptToInbox) {
          await addExcerptToInbox(excerpt);
          showToast('Đã thêm trích đoạn vào Research Inbox');
        }
      } catch (err) {
        console.error('Failed to add excerpt to inbox:', err);
        showToast('Không thể thêm vào Research Inbox');
      }
      setActiveSelection(null);
    }
  };

  const handleSelectTargetNote = async (targetNoteId: string) => {
    if (!activeSelection?.text) return;

    const blockquote = formatExcerptBlockquote(
      activeSelection.text,
      { title, format: normalizedFormat, sourceUrl: fileUrl, documentId },
      { page: activeSelection.page, heading: activeTocId, cfi: currentPosition }
    );

    try {
      if (dataRepository.appendExcerptToNote) {
        await dataRepository.appendExcerptToNote(targetNoteId, blockquote);
      }
      showToast('Đã lưu trích đoạn vào ghi chú thành công');
    } catch (err) {
      console.error('Failed to append excerpt to note:', err);
      showToast('Lỗi khi lưu vào ghi chú');
    }
    setActiveSelection(null);
    setIsTargetNoteModalOpen(false);
  };

  // Keyboard navigation & ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isTocOpen && !isTargetNoteModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTocOpen, isTargetNoteModalOpen, onClose]);

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
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Reader Header */}
        <ReaderHeader
          title={title}
          format={normalizedFormat}
          isTocOpen={isTocOpen}
          onToggleToc={() => setIsTocOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onClose={onClose}
          extraControls={epubExtraControls}
        />

        {/* Reader Workspace: Viewport Area & Multi-Tab Sidebar */}
        <div className="flex-1 relative overflow-hidden flex flex-row bg-stone-50 dark:bg-stone-950">
          <div className="flex-1 relative overflow-hidden flex flex-col p-2 sm:p-4">
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
                  fileUrl={fileUrl}
                  documentId={documentId}
                  initialHeadingId={targetHeadingId}
                  onTocGenerated={(items) => setTocItems(items)}
                  onPositionChange={handlePositionChanged}
                  onTextSelection={handleTextSelection}
                />
              </div>
            ) : normalizedFormat === 'pdf' ? (
              <PdfReaderAdapter
                fileUrl={fileUrl}
                documentId={documentId}
                title={title}
                onTextSelection={handleTextSelection}
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

            {/* Selection Toolbar */}
            {activeSelection && (
              <UnifiedSelectionToolbar
                isOpen={Boolean(activeSelection)}
                position={activeSelection.position}
                selectedText={activeSelection.text}
                onAction={handleToolbarAction}
                onClose={() => setActiveSelection(null)}
              />
            )}

            {/* Target Note Selector Modal */}
            {isTargetNoteModalOpen && (
              <TargetNoteSelectorModal
                isOpen={isTargetNoteModalOpen}
                notes={notes}
                selectedExcerptText={activeSelection?.text}
                onSelectNote={handleSelectTargetNote}
                onClose={() => setIsTargetNoteModalOpen(false)}
              />
            )}
          </div>

          {/* Phase R1 Multi-Tab Research Sidebar */}
          <ReaderSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            tocItems={tocItems}
            activeTocId={activeTocId}
            onSelectTocItem={handleSelectTocItem}
            documentId={documentId}
            documentTitle={title}
            notes={scopedNotes}
            excerpts={documentHighlights}
            onSelectExcerpt={handleSelectExcerpt}
            inboxItems={inboxItems}
            onOpenArchiveLink={handleOpenArchiveLinkFromSidebar}
          />
        </div>
      </div>
    </div>
  );
}
