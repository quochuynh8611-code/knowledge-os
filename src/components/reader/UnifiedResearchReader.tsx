import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Columns2, Square, Plus, Minus, RotateCcw, AlertTriangle, RefreshCw, CheckCircle, Loader2, Clock } from 'lucide-react';
import { ReaderHeader } from './ReaderHeader';
import { ReaderTocDrawer, TocItem } from './ReaderTocDrawer';
import { ReaderSidebar, ReaderSidebarTab } from './ReaderSidebar';
import { MarkdownReaderAdapter, MarkdownReadingPosition } from './adapters/MarkdownReaderAdapter';
import { PdfReaderAdapter } from './adapters/PdfReaderAdapter';

const EpubReaderAdapter = React.lazy(() =>
  import('./adapters/EpubReaderAdapter').then((m) => ({
    default: m.EpubReaderAdapter,
  }))
);
import { UnifiedSelectionToolbar, SelectionToolbarAction } from './UnifiedSelectionToolbar';
import { TargetNoteSelectorModal } from './TargetNoteSelectorModal';
import { NoteReaderModal } from '../modals/NoteReaderModal';
import { NoteFormModal } from '../modals/NoteFormModal';
import { FlashcardFormModal } from '../modals/FlashcardFormModal';
import type { FlashcardCitationProvenance, ReaderDocumentFormat } from '../../types/flashcard';
import type { NoteCitationProvenance, NoteCitationFormat } from '../../types';
import { generateExcerptCitationSnapshot, formatExcerptBlockquote } from '../../lib/excerptCitationService';
import { globalReadingPositionStore, formatReadingDuration } from '../../lib/readingPositionUnified';
import { DataContext, dataRepository } from '../../context/DataContext';
import { ResearchExcerpt, ResearchInboxItem, Note, Resource } from '../../types';
import { copyTextToClipboard } from '../../lib/clipboard';
import { isExcerptMatchingDocument, normalizeDocumentPath, DocumentMatchContext, resolveCitationTargetDocument } from '../../lib/readerDocumentResolver';
import { extractCitationBacklinks } from '../../lib/readerBacklinksSelector';

export interface UnifiedResearchReaderProps {
  documentId: string;
  title: string;
  format: 'epub' | 'md' | 'markdown' | string;
  fileUrl?: string;
  content?: string;
  sourceType?: 'docs' | 'vault';
  initialPosition?: string;
  initialToc?: TocItem[];
  onPositionChange?: (locator: string) => void;
  /**
   * Phase 19: Called when the user clicks a cross-document archive citation.
   * The callee is responsible for opening the target document in a new reader session.
   * Not called for same-document navigation (handled internally via onPositionChange).
   */
  onNavigateToDocument?: (target: {
    documentId: string;
    title: string;
    format: string;
    fileUrl?: string;
    initialPosition?: string;
  }) => void;
  onClose: () => void;
  onRemoveBrokenSession?: (documentId: string) => void;
  onEditResource?: () => void;
  className?: string;
  layoutMode?: 'embedded' | 'modal';
}

export function parseMarkdownPosition(raw?: string): { headingId?: string; scrollPercentage?: number } {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return {};
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const headingId = typeof parsed.headingId === 'string' && parsed.headingId.trim()
        ? parsed.headingId.trim()
        : undefined;
      const rawPct = typeof parsed.scrollPercentage === 'number'
        ? parsed.scrollPercentage
        : typeof parsed.percentage === 'number'
        ? parsed.percentage
        : undefined;
      const scrollPercentage = (rawPct !== undefined && Number.isFinite(rawPct))
        ? Math.min(100, Math.max(0, Math.round(rawPct)))
        : undefined;
      return { headingId, scrollPercentage };
    } catch {
      return {};
    }
  }
  if (trimmed.includes('?pct=')) {
    const [hId, q] = trimmed.split('?pct=');
    const parsedQ = parseFloat(q);
    const headingId = (hId && hId.trim()) ? hId.trim() : undefined;
    const scrollPercentage = Number.isFinite(parsedQ)
      ? Math.min(100, Math.max(0, Math.round(parsedQ)))
      : undefined;
    return { headingId, scrollPercentage };
  }
  return { headingId: trimmed };
}

export function UnifiedResearchReader({
  documentId,
  title,
  format,
  fileUrl,
  content,
  sourceType,
  initialPosition,
  initialToc,
  onPositionChange,
  onNavigateToDocument,
  onClose,
  onRemoveBrokenSession,
  onEditResource,
  className = '',
  layoutMode = 'modal',
}: UnifiedResearchReaderProps) {
  const normalizedFormat = (format || 'md').toLowerCase();
  const isSessionBrokenRef = useRef<boolean>(false);
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [sidebarTab, setSidebarTab] = useState<ReaderSidebarTab>('outline');
  const [tocItems, setTocItems] = useState<TocItem[]>(initialToc || []);
  const [activeTocId, setActiveTocId] = useState<string | undefined>(undefined);
  const [targetHeadingId, setTargetHeadingId] = useState<string | undefined>(() => {
    if (normalizedFormat === 'md' || normalizedFormat === 'markdown') {
      const raw = (initialPosition && initialPosition.trim())
        ? initialPosition.trim()
        : globalReadingPositionStore.getPosition(documentId, 'md') || undefined;
      if (raw) {
        return parseMarkdownPosition(raw).headingId;
      }
    }
    if (initialPosition && initialPosition.trim()) return initialPosition.trim();
    return undefined;
  });

  const [targetScrollPercentage, setTargetScrollPercentage] = useState<number | undefined>(() => {
    if (normalizedFormat === 'md' || normalizedFormat === 'markdown') {
      const raw = (initialPosition && initialPosition.trim())
        ? initialPosition.trim()
        : globalReadingPositionStore.getPosition(documentId, 'md') || undefined;
      if (raw) {
        return parseMarkdownPosition(raw).scrollPercentage;
      }
    }
    return undefined;
  });

  const markdownPositionRef = useRef<MarkdownReadingPosition | undefined>(undefined);

  // Completion state (Slice 4C)
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const isCompletedRef = useRef<boolean>(false);
  const completedAtRef = useRef<string | null>(null);

  // Analytics display state (Slice 5A)
  const [totalReadingSeconds, setTotalReadingSeconds] = useState<number | undefined>(undefined);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
    completedAtRef.current = completedAt;
  }, [isCompleted, completedAt]);

  // Analytics state (Slice 4D)
  const isTabVisibleRef = useRef<boolean>(
    typeof document !== 'undefined' && document.visibilityState ? document.visibilityState === 'visible' : true
  );
  const sessionStartTimeRef = useRef<number>(Date.now());
  const accumulatedVisibleMsRef = useRef<number>(0);
  const hasFlushedOnCloseRef = useRef<boolean>(false);

  const consumeActiveReadingSeconds = useCallback(() => {
    const now = Date.now();
    let totalMs = accumulatedVisibleMsRef.current;
    if (isTabVisibleRef.current) {
      const elapsed = now - sessionStartTimeRef.current;
      if (Number.isFinite(elapsed) && elapsed > 0) {
        totalMs += elapsed;
      }
      sessionStartTimeRef.current = now;
    }
    accumulatedVisibleMsRef.current = 0;
    if (!Number.isFinite(totalMs) || totalMs <= 0) {
      return 0;
    }
    return Math.max(0, Math.round(totalMs / 1000));
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
      const now = Date.now();
      if (isVisible) {
        if (!isTabVisibleRef.current) {
          isTabVisibleRef.current = true;
          sessionStartTimeRef.current = now;
        }
      } else {
        if (isTabVisibleRef.current) {
          const elapsed = now - sessionStartTimeRef.current;
          if (Number.isFinite(elapsed) && elapsed > 0) {
            accumulatedVisibleMsRef.current += elapsed;
          }
          isTabVisibleRef.current = false;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // EPUB-specific viewing controls
  const [fontSize, setFontSize] = useState<number>(100);
  const [pageMode, setPageMode] = useState<'single' | 'double'>('double');

  // Load initial position from in-memory store if not provided directly
  const [currentPosition, setCurrentPosition] = useState<string | undefined>(() => {
    if (initialPosition && initialPosition.trim()) return initialPosition.trim();
    return globalReadingPositionStore.getPosition(documentId, normalizedFormat) || undefined;
  });

  const latestPositionRef = useRef<string | undefined>(currentPosition);
  latestPositionRef.current = currentPosition;

  // Sync initialPosition prop updates (e.g. from citation or direct navigation)
  useEffect(() => {
    if (initialPosition && initialPosition.trim()) {
      const pos = initialPosition.trim();
      setCurrentPosition(pos);
      latestPositionRef.current = pos;
      if (normalizedFormat === 'md' || normalizedFormat === 'markdown') {
        const parsed = parseMarkdownPosition(pos);
        if (parsed.headingId) setTargetHeadingId(parsed.headingId);
        if (parsed.scrollPercentage !== undefined) setTargetScrollPercentage(parsed.scrollPercentage);
      }
    }
  }, [initialPosition, normalizedFormat]);

  // Hydrate persisted lastPosition and completion status from archive
  useEffect(() => {
    let isCancelled = false;
    async function hydratePersistedPosition() {
      try {
        const res = await fetch(`/api/archive/document/${encodeURIComponent(documentId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const doc = data.document;
        if (!doc || !doc.lastPosition || isCancelled) return;

        const pos = doc.lastPosition;
        if (pos && typeof pos === 'object') {
          if (typeof pos.totalReadingSeconds === 'number' && Number.isFinite(pos.totalReadingSeconds)) {
            setTotalReadingSeconds(pos.totalReadingSeconds);
          }
          if (pos.isCompleted) {
            setIsCompleted(true);
            setCompletedAt(pos.completedAt || null);
            isCompletedRef.current = true;
            completedAtRef.current = pos.completedAt || null;
          }
        }

        if (initialPosition && initialPosition.trim()) return;

        // Resume hierarchy: RAM store (active session) takes precedence over persisted DB position
        const existingRamPos = globalReadingPositionStore.getPosition(documentId, normalizedFormat);
        if (existingRamPos && existingRamPos.trim()) {
          return;
        }

        let hydratedLocator: string | undefined = undefined;

        if (normalizedFormat === 'epub' && pos.cfi) {
          hydratedLocator = pos.cfi;
        } else if (normalizedFormat === 'md' || normalizedFormat === 'markdown') {
          const heading = typeof pos.headingId === 'string' && pos.headingId.trim()
            ? pos.headingId.trim()
            : undefined;
          const rawPct = typeof pos.scrollPercentage === 'number'
            ? pos.scrollPercentage
            : typeof pos.percentage === 'number'
            ? pos.percentage
            : undefined;
          const pct = (rawPct !== undefined && Number.isFinite(rawPct))
            ? Math.min(100, Math.max(0, Math.round(rawPct)))
            : undefined;

          if (heading) {
            setTargetHeadingId(heading);
          }
          if (typeof pct === 'number') {
            setTargetScrollPercentage(pct);
          }

          if (heading || typeof pct === 'number') {
            hydratedLocator = heading || (typeof pct === 'number' ? `scroll:${pct}` : undefined);
          }
        } else if (normalizedFormat === 'pdf' && pos.pageNumber) {
          hydratedLocator = `page=${pos.pageNumber}`;
        }

        if (hydratedLocator && !isCancelled) {
          setCurrentPosition(hydratedLocator);
          latestPositionRef.current = hydratedLocator;
          globalReadingPositionStore.setPosition(documentId, normalizedFormat, hydratedLocator);
        }
      } catch (err) {
        // Fallback gracefully on fetch failure
      }
    }

    hydratePersistedPosition();
    return () => {
      isCancelled = true;
    };
  }, [documentId, normalizedFormat, initialPosition]);

  // Slice 2: Record document open event on mount if reader remains open without immediate close/change
  const openTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAdapterReady = useCallback(() => {
    if (isSessionBrokenRef.current) return;
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
    }
    openTimerRef.current = setTimeout(async () => {
      if (isSessionBrokenRef.current) return;
      try {
        await fetch(`/api/archive/document/${encodeURIComponent(documentId)}/position`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lastReadAt: new Date().toISOString(),
          }),
        });
      } catch {
        // Fallback gracefully on fetch failure or offline
      }
    }, 200);
  }, [documentId]);

  useEffect(() => {
    if (normalizedFormat !== 'md' && normalizedFormat !== 'markdown') return;
    openTimerRef.current = setTimeout(async () => {
      if (isSessionBrokenRef.current) return;
      try {
        await fetch(`/api/archive/document/${encodeURIComponent(documentId)}/position`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lastReadAt: new Date().toISOString(),
          }),
        });
      } catch {
        // Fallback gracefully on fetch failure or offline
      }
    }, 200);

    return () => {
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    };
  }, [documentId, normalizedFormat]);

  // Persist position to server / repository
  const persistPositionAsync = useCallback(
    async (locator?: string, options?: { keepalive?: boolean }) => {
      const locToSave = locator || latestPositionRef.current;
      const safeLoc = locToSave?.trim();

      let mdHeading: string | undefined = undefined;
      let mdScrollPct: number | undefined = undefined;

      if (normalizedFormat === 'md' || normalizedFormat === 'markdown') {
        const parsed = parseMarkdownPosition(safeLoc);
        mdHeading = markdownPositionRef.current?.headingId || parsed.headingId || targetHeadingId;
        const candidatePct = markdownPositionRef.current?.scrollPercentage !== undefined
          ? markdownPositionRef.current.scrollPercentage
          : (parsed.scrollPercentage !== undefined ? parsed.scrollPercentage : targetScrollPercentage);
        mdScrollPct = (candidatePct !== undefined && Number.isFinite(candidatePct))
          ? Math.min(100, Math.max(0, Math.round(candidatePct)))
          : undefined;
      }

      const positionData = (safeLoc || mdScrollPct !== undefined || isCompletedRef.current)
        ? {
            cfi: normalizedFormat === 'epub' ? safeLoc : undefined,
            headingId: (normalizedFormat === 'md' || normalizedFormat === 'markdown') ? mdHeading : undefined,
            percentage: (normalizedFormat === 'md' || normalizedFormat === 'markdown') ? mdScrollPct : undefined,
            scrollPercentage: (normalizedFormat === 'md' || normalizedFormat === 'markdown') ? mdScrollPct : undefined,
            pageNumber: normalizedFormat === 'pdf' ? (parseInt(safeLoc?.replace('page=', '') || '1', 10) || 1) : undefined,
            isCompleted: isCompletedRef.current,
            completedAt: completedAtRef.current,
            updatedAt: new Date().toISOString(),
          }
        : undefined;

      const activeSecs = consumeActiveReadingSeconds();

      try {
        await fetch(`/api/archive/document/${encodeURIComponent(documentId)}/position`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          keepalive: options?.keepalive ?? false,
          body: JSON.stringify({
            lastPosition: positionData,
            lastReadAt: new Date().toISOString(),
            activeReadingSeconds: activeSecs,
          }),
        });
      } catch (err: any) {
        if (!err?.message?.includes('[Hermetic Guard]')) {
          console.warn('[UnifiedResearchReader] Failed to persist reading position:', err);
        }
      }
    },
    [documentId, normalizedFormat, targetHeadingId, targetScrollPercentage, consumeActiveReadingSeconds]
  );

  const handleMarkdownScrollPositionChange = useCallback(
    (pos: { headingId?: string; scrollPercentage?: number }) => {
      if (pos.scrollPercentage !== undefined) {
        setTargetScrollPercentage(pos.scrollPercentage);
        if (pos.scrollPercentage >= 100 && !isCompletedRef.current) {
          isCompletedRef.current = true;
          setIsCompleted(true);
          const now = new Date().toISOString();
          setCompletedAt(now);
          completedAtRef.current = now;
          const activeSecs = consumeActiveReadingSeconds();
          fetch(`/api/archive/document/${encodeURIComponent(documentId)}/position`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              completed: true,
              completedAt: now,
              activeReadingSeconds: activeSecs,
              lastPosition: {
                headingId: pos.headingId,
                scrollPercentage: pos.scrollPercentage,
                isCompleted: true,
                completedAt: now,
              },
              lastReadAt: now,
            }),
          }).catch(() => {});
        }
      }
      if (pos.headingId) {
        setTargetHeadingId(pos.headingId);
      }
      markdownPositionRef.current = {
        headingId: pos.headingId,
        scrollPercentage: pos.scrollPercentage,
        updatedAt: new Date().toISOString(),
      };
    },
    [documentId, consumeActiveReadingSeconds]
  );

  const handleToggleComplete = useCallback(async () => {
    const nextCompleted = !isCompleted;
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;
    setIsCompleted(nextCompleted);
    setCompletedAt(nextCompletedAt);
    isCompletedRef.current = nextCompleted;
    completedAtRef.current = nextCompletedAt;

    const activeSecs = consumeActiveReadingSeconds();

    try {
      await fetch(`/api/archive/document/${encodeURIComponent(documentId)}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: nextCompleted,
          completedAt: nextCompletedAt,
          activeReadingSeconds: activeSecs,
          lastPosition: {
            ...(latestPositionRef.current && normalizedFormat === 'epub' ? { cfi: latestPositionRef.current } : {}),
            ...(latestPositionRef.current && normalizedFormat === 'pdf' ? { pageNumber: parseInt(latestPositionRef.current.replace('page=', '') || '1', 10) || 1 } : {}),
            ...(markdownPositionRef.current?.headingId ? { headingId: markdownPositionRef.current.headingId } : {}),
            ...(markdownPositionRef.current?.scrollPercentage !== undefined ? { scrollPercentage: markdownPositionRef.current.scrollPercentage } : {}),
            isCompleted: nextCompleted,
            completedAt: nextCompletedAt,
          },
          lastReadAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.warn('[UnifiedResearchReader] Failed to toggle completion:', err);
    }
  }, [documentId, isCompleted, normalizedFormat, consumeActiveReadingSeconds]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse PDF initial page from currentPosition / initialPosition
  const pdfInitialPage = useMemo(() => {
    const raw = currentPosition || initialPosition;
    if (!raw) return 1;
    const match = String(raw).match(/page=(\d+)/i);
    if (match) return parseInt(match[1], 10) || 1;
    const parsed = parseInt(String(raw), 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }, [initialPosition, currentPosition]);

  // Track position change in in-memory store and debounced persistence
  const handlePositionChanged = useCallback(
    (newLocator: string) => {
      if (!newLocator || !newLocator.trim()) return;
      const safeLoc = newLocator.trim();
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
      setCurrentPosition(safeLoc);
      latestPositionRef.current = safeLoc;
      globalReadingPositionStore.setPosition(documentId, normalizedFormat, safeLoc);
      if (onPositionChange) {
        onPositionChange(safeLoc);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        persistPositionAsync(safeLoc);
      }, 1000);
    },
    [documentId, normalizedFormat, onPositionChange, persistPositionAsync]
  );

  const persistPositionRef = useRef(persistPositionAsync);
  persistPositionRef.current = persistPositionAsync;

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (!hasFlushedOnCloseRef.current && !isSessionBrokenRef.current) {
        const loc = latestPositionRef.current;
        persistPositionRef.current?.(loc && loc.trim() ? loc.trim() : undefined, { keepalive: true }).catch(() => {});
      }
    };
  }, []);

  // Close handler with guaranteed persist on close
  const handleCloseReader = useCallback(() => {
    hasFlushedOnCloseRef.current = true;
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (isSessionBrokenRef.current) {
      onClose();
      return;
    }
    const loc = latestPositionRef.current || currentPosition;
    if (loc && loc.trim()) {
      persistPositionAsync(loc.trim(), { keepalive: true }).catch((err) => {
        console.warn('[UnifiedResearchReader] Failed to persist position on close:', err);
      });
    } else {
      persistPositionAsync(undefined, { keepalive: true }).catch((err) => {
        console.warn('[UnifiedResearchReader] Failed to persist read timestamp on close:', err);
      });
    }
    onClose();
  }, [currentPosition, persistPositionAsync, onClose]);

  const handleAdapterError = useCallback((_err: Error) => {
    isSessionBrokenRef.current = true;
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const handleRemoveBrokenSession = useCallback((docId: string) => {
    isSessionBrokenRef.current = true;
    hasFlushedOnCloseRef.current = true;
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    globalReadingPositionStore.clearPosition(docId, normalizedFormat);
    if (onRemoveBrokenSession) {
      onRemoveBrokenSession(docId);
    } else {
      onClose();
    }
  }, [normalizedFormat, onRemoveBrokenSession, onClose]);

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
    cfi?: string;
  } | null>(null);
  const [isTargetNoteModalOpen, setIsTargetNoteModalOpen] = useState(false);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);
  const [noteInitialProvenance, setNoteInitialProvenance] = useState<NoteCitationProvenance | undefined>(undefined);
  const [noteInitialContent, setNoteInitialContent] = useState<string>('');
  const [isCreateFlashcardModalOpen, setIsCreateFlashcardModalOpen] = useState(false);
  const [flashcardProvenance, setFlashcardProvenance] = useState<FlashcardCitationProvenance | undefined>(undefined);
  const [flashcardInitialFront, setFlashcardInitialFront] = useState<string>('');
  const [activePromotingInboxItem, setActivePromotingInboxItem] = useState<ResearchInboxItem | null>(null);
  const readerViewportRef = useRef<HTMLDivElement>(null);
  const [viewingBacklinkNote, setViewingBacklinkNote] = useState<Note | null>(null);
  const [viewingBacklinkTargetCitation, setViewingBacklinkTargetCitation] = useState<{ documentId: string; locator?: string } | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dataContext = React.useContext(DataContext) as {
    notes?: Note[];
    resources?: Resource[];
    researchInboxItems?: ResearchInboxItem[];
    researchExcerpts?: ResearchExcerpt[];
    addExcerpt?: (excerpt: ResearchExcerpt) => Promise<ResearchExcerpt>;
    updateExcerpt?: (id: string, updates: Partial<ResearchExcerpt>) => Promise<ResearchExcerpt | void>;
    deleteExcerpt?: (id: string) => Promise<void>;
    addExcerptToInbox?: (excerpt: ResearchExcerpt) => Promise<any>;
    updateNote?: (id: string, noteData: Partial<Note>) => void;
    deleteInboxItem?: (id: string) => Promise<void>;
    processInboxItem?: (id: string) => Promise<void>;
  } | undefined;
  const notes = dataContext?.notes || [];
  const resources = dataContext?.resources || [];
  const inboxItems = dataContext?.researchInboxItems || [];
  const researchExcerpts = dataContext?.researchExcerpts || [];
  const addExcerpt = dataContext?.addExcerpt;
  const updateExcerpt = dataContext?.updateExcerpt;
  const deleteExcerpt = dataContext?.deleteExcerpt;
  const addExcerptToInbox = dataContext?.addExcerptToInbox;
  const deleteInboxItem = dataContext?.deleteInboxItem;
  const processInboxItem = dataContext?.processInboxItem;

  // Phase 21A: Extract active document reverse citations (backlinks)
  const backlinks = useMemo(() => {
    return extractCitationBacklinks(notes, documentId);
  }, [notes, documentId]);

  // Wave R5A: Extract active document highlights using Dual-Read (Dedicated Store + Legacy Inbox Fallback) with Deduplication & Store Precedence
  const documentHighlights = useMemo(() => {
    const matchContext: DocumentMatchContext = {
      documentId,
      title,
      fileUrl,
      resources,
    };
    const dedicated = researchExcerpts.filter((e) => isExcerptMatchingDocument(e, matchContext));
    const legacy = inboxItems
      .map((item) => item.excerpt)
      .filter((excerpt): excerpt is ResearchExcerpt => Boolean(excerpt && isExcerptMatchingDocument(excerpt, matchContext)));

    const map = new Map<string, ResearchExcerpt>();
    // Legacy inbox excerpts are loaded first
    legacy.forEach((e) => map.set(e.id, e));
    // Dedicated excerpts are loaded second to override legacy on ID collision (store precedence)
    dedicated.forEach((e) => map.set(e.id, e));

    return Array.from(map.values());
  }, [researchExcerpts, inboxItems, documentId, title, fileUrl, resources]);

  // Wave R4: Extract active document inbox items using Canonical Document Matcher
  const documentInboxItems = useMemo(() => {
    const matchContext: DocumentMatchContext = {
      documentId,
      title,
      fileUrl,
      resources,
    };
    return inboxItems.filter((item) => Boolean(item.excerpt && isExcerptMatchingDocument(item.excerpt, matchContext)));
  }, [inboxItems, documentId, title, fileUrl, resources]);

  // Wave R2.4: Document-scoped notes filtering with 4-tier precedence & canonical paths
  const scopedNotes = useMemo(() => {
    const targetNoteIds = new Set<string>();
    for (const highlight of documentHighlights) {
      if (highlight.targetNoteId) {
        targetNoteIds.add(highlight.targetNoteId);
      }
    }

    const archiveUriMarker = `archive://${documentId}`;
    const normalizedDocId = documentId.trim().toLowerCase();
    const canonicalPath = normalizeDocumentPath(documentId).toLowerCase();
    const normalizedTitle = title?.trim().toLowerCase();
    const normalizedFileUrl = fileUrl ? fileUrl.trim().toLowerCase() : '';

    return notes.filter((note) => {
      // Tier 0: Structured Citation Provenance binding (Phase 3/R3 Canonical)
      if (
        note.citationProvenances &&
        note.citationProvenances.some(
          (p) =>
            p.documentId === documentId ||
            p.documentId.toLowerCase() === normalizedDocId ||
            (canonicalPath && p.documentId.toLowerCase() === canonicalPath)
        )
      ) {
        return true;
      }

      // Tier 1: Explicit targetNoteId from excerpts belonging to active document
      if (targetNoteIds.has(note.id)) {
        return true;
      }

      const noteContent = note.content || '';
      const noteContentLower = noteContent.toLowerCase();

      // Tier 2: Archive URI Marker in note content
      if (
        noteContent.includes(archiveUriMarker) ||
        noteContent.includes(`archive://${encodeURIComponent(documentId)}`) ||
        (canonicalPath &&
          (noteContent.includes(`archive://${canonicalPath}`) ||
            noteContent.includes(`archive://${encodeURIComponent(canonicalPath)}`)))
      ) {
        return true;
      }

      // Tier 2.5: Direct URL reference (fileUrl / sourceUrl / attachment path)
      if (
        (normalizedFileUrl && noteContentLower.includes(normalizedFileUrl)) ||
        (fileUrl && noteContent.includes(fileUrl)) ||
        ((note as any).sourceUrl && ((note as any).sourceUrl === fileUrl || (note as any).sourceUrl === documentId))
      ) {
        return true;
      }

      // Tier 3: Source path binding
      if (note.sourcePath) {
        const normalizedSourcePath = note.sourcePath.trim().toLowerCase();
        const canonicalSourcePath = normalizeDocumentPath(note.sourcePath).toLowerCase();
        if (
          normalizedSourcePath === normalizedDocId ||
          normalizedSourcePath.endsWith(`/${normalizedDocId}`) ||
          normalizedSourcePath.endsWith(`\\${normalizedDocId}`) ||
          normalizedSourcePath.replace(/\.(md|epub|pdf)$/i, '') === normalizedDocId.replace(/\.(md|epub|pdf)$/i, '') ||
          (canonicalPath &&
            (canonicalSourcePath === canonicalPath ||
              canonicalSourcePath.endsWith(`/${canonicalPath}`) ||
              canonicalPath.endsWith(`/${canonicalSourcePath}`)))
        ) {
          return true;
        }
      }

      // Tier 4: Heuristic fallback for document title citations
      if (
        normalizedTitle &&
        (noteContentLower.includes(`*${normalizedTitle}*`) ||
          noteContentLower.includes(`— *${normalizedTitle}*`))
      ) {
        return true;
      }

      return false;
    });
  }, [notes, documentHighlights, documentId, title, fileUrl]);


  const [activeExcerptId, setActiveExcerptId] = useState<string | null>(null);

  const handleSelectExcerpt = useCallback(
    (excerpt: ResearchExcerpt) => {
      setActiveExcerptId(excerpt.id);
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
      // Tier 1: Same-document fast path — handled internally
      if (targetDocId === documentId) {
        if (locator) {
          setTargetHeadingId(locator);
          handlePositionChanged(locator);
          showToast('Đã chuyển đến vị trí trích dẫn');
        } else {
          showToast('Đang ở tài liệu hiện tại (không có vị trí cụ thể)');
        }
        return;
      }

      // Cross-document: use 5-tier resolver
      const resolved = resolveCitationTargetDocument(
        targetDocId,
        locator,
        { documentId, title, format: normalizedFormat, fileUrl },
        resources
      );

      if (resolved && resolved.document) {
        if (onNavigateToDocument) {
          onNavigateToDocument({
            documentId: resolved.document.documentId,
            title: resolved.document.title,
            format: resolved.document.format,
            fileUrl: resolved.document.fileUrl,
            initialPosition: resolved.locator,
          });
        } else {
          // No navigation handler registered — graceful degradation
          showToast(`Trích dẫn thuộc tài liệu khác: ${targetDocId}`);
        }
      } else {
        // Tier 6: unresolved — gentle toast, no crash
        showToast('Không tìm thấy tài liệu nguồn tương ứng');
      }
    },
    [documentId, title, normalizedFormat, fileUrl, resources, handlePositionChanged, onNavigateToDocument]
  );

  const handleTextSelection = useCallback(
    (selection: { text: string; position: { top: number; left: number }; page?: number; cfi?: string } | null) => {
      setActiveSelection(selection);
    },
    []
  );

  const handleToolbarAction = async (
    action: SelectionToolbarAction,
    payload: { text: string; success?: boolean; color?: string }
  ) => {
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
        cfi: activeSelection?.cfi || currentPosition,
      },
      highlightColor: payload.color || '#fef08a',
      citationSnapshot,
      status: 'inbox',
      createdAt: now,
      updatedAt: now,
    };

    if (action === 'copy') {
      if (payload.success === false) {
        showToast('Không thể sao chép vào clipboard');
      } else {
        showToast('Đã sao chép đoạn trích vào clipboard');
        setActiveSelection(null);
      }
    } else if (action === 'highlight') {
      try {
        if (addExcerpt) {
          await addExcerpt(excerpt);
          showToast('Đã lưu điểm trích nghiên cứu');
        } else if (addExcerptToInbox) {
          await addExcerptToInbox(excerpt);
          showToast('Đã lưu điểm trích nghiên cứu');
        } else {
          showToast('Không thể lưu điểm trích');
        }
      } catch (err) {
        console.error('Failed to save highlight excerpt:', err);
        showToast('Không thể lưu điểm trích');
      }
      setActiveSelection(null);
    } else if (action === 'citation') {
      const citationText = citationSnapshot.formatted || citationSnapshot.apa || '';
      const success = await copyTextToClipboard(citationText);
      if (success) {
        showToast('Đã sao chép trích dẫn học thuật');
      } else {
        showToast('Không thể sao chép trích dẫn vào clipboard');
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
    } else if (action === 'create_flashcard') {
      const formatNormalized: ReaderDocumentFormat =
        normalizedFormat === 'epub' ? 'epub' : normalizedFormat === 'pdf' ? 'pdf' : 'md';

      let canonicalLoc: string | undefined = undefined;
      if (formatNormalized === 'epub') {
        canonicalLoc = activeSelection?.cfi || currentPosition;
      } else if (formatNormalized === 'pdf') {
        canonicalLoc = activeSelection?.page
          ? `page=${activeSelection.page}`
          : currentPosition
          ? currentPosition.startsWith('page=')
            ? currentPosition
            : `page=${currentPosition}`
          : undefined;
      } else {
        canonicalLoc = activeTocId || targetHeadingId;
      }

      const provenance: FlashcardCitationProvenance = {
        documentId,
        documentTitle: title,
        format: formatNormalized,
        locator: canonicalLoc,
        sourceUrl: fileUrl,
        excerptText: selectedText,
        citationFormatted: citationSnapshot.formatted || citationSnapshot.apa,
      };

      setActivePromotingInboxItem(null);
      setFlashcardProvenance(provenance);
      setFlashcardInitialFront(selectedText);
      setIsCreateFlashcardModalOpen(true);
    }
  };

  const handlePromoteInboxItemToFlashcard = useCallback(
    (item: ResearchInboxItem) => {
      if (!item || item.isProcessed || isCreateFlashcardModalOpen) {
        return;
      }

      const excerpt = item.excerpt;
      const formatNormalized: ReaderDocumentFormat =
        normalizedFormat === 'epub' ? 'epub' : normalizedFormat === 'pdf' ? 'pdf' : 'md';

      const canonicalLoc =
        excerpt?.positionSelector?.headingId ||
        (excerpt?.positionSelector?.pageNumber !== undefined
          ? `page=${excerpt.positionSelector.pageNumber}`
          : undefined) ||
        excerpt?.positionSelector?.cfi;

      const provenance: FlashcardCitationProvenance = {
        documentId: excerpt?.archivedDocumentId || documentId,
        documentTitle: excerpt?.citationSnapshot?.title || title,
        format: formatNormalized,
        locator: canonicalLoc,
        sourceUrl: fileUrl,
        excerptText: excerpt?.selectedText,
        citationFormatted: excerpt?.citationSnapshot?.formatted || excerpt?.citationSnapshot?.apa,
      };

      setActivePromotingInboxItem(item);
      setFlashcardProvenance(provenance);
      setFlashcardInitialFront(excerpt?.selectedText || '');
      setIsCreateFlashcardModalOpen(true);
    },
    [isCreateFlashcardModalOpen, normalizedFormat, documentId, title, fileUrl]
  );

  const handleOpenCreateNewNote = () => {
    if (!activeSelection?.text) return;
    const formatNormalized: NoteCitationFormat =
      normalizedFormat === 'epub' ? 'epub' : normalizedFormat === 'pdf' ? 'pdf' : 'md';

    let canonicalLoc: string | undefined = undefined;
    if (formatNormalized === 'epub') {
      canonicalLoc = activeSelection?.cfi || currentPosition;
    } else if (formatNormalized === 'pdf') {
      canonicalLoc = activeSelection?.page
        ? `page=${activeSelection.page}`
        : currentPosition
        ? currentPosition.startsWith('page=')
          ? currentPosition
          : `page=${currentPosition}`
        : undefined;
    } else {
      canonicalLoc = activeTocId || targetHeadingId;
    }

    const prov: NoteCitationProvenance = {
      documentId,
      documentTitle: title,
      format: formatNormalized,
      locator: canonicalLoc,
      sourceUrl: fileUrl,
      excerptText: activeSelection.text,
    };

    setNoteInitialProvenance(prov);
    setNoteInitialContent(`> ${activeSelection.text}\n\n`);
    setIsTargetNoteModalOpen(false);
    setIsCreateNoteModalOpen(true);
  };

  const handleSelectTargetNote = async (targetNoteId: string) => {
    if (!activeSelection?.text) return;

    const blockquote = formatExcerptBlockquote(
      activeSelection.text,
      { title, format: normalizedFormat, sourceUrl: fileUrl, documentId },
      { page: activeSelection.page, heading: activeTocId, cfi: activeSelection.cfi || currentPosition }
    );

    const now = new Date().toISOString();
    const excerpt: ResearchExcerpt = {
      id: `excerpt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      archivedDocumentId: documentId,
      targetNoteId,
      selectedText: activeSelection.text,
      positionSelector: {
        headingId: activeTocId,
        pageNumber: activeSelection.page,
        cfi: activeSelection.cfi || currentPosition,
      },
      highlightColor: '#fef08a',
      citationSnapshot: generateExcerptCitationSnapshot(
        { documentId, title, format: normalizedFormat, sourceUrl: fileUrl },
        { page: activeSelection.page, heading: activeTocId }
      ),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const formatNormalized: NoteCitationFormat =
      normalizedFormat === 'epub' ? 'epub' : normalizedFormat === 'pdf' ? 'pdf' : 'md';

    let canonicalLoc: string | undefined = undefined;
    if (formatNormalized === 'epub') {
      canonicalLoc = activeSelection?.cfi || currentPosition;
    } else if (formatNormalized === 'pdf') {
      canonicalLoc = activeSelection?.page
        ? `page=${activeSelection.page}`
        : currentPosition
        ? currentPosition.startsWith('page=')
          ? currentPosition
          : `page=${currentPosition}`
        : undefined;
    } else {
      canonicalLoc = activeTocId || targetHeadingId;
    }

    const newProvenance: NoteCitationProvenance = {
      documentId,
      documentTitle: title,
      format: formatNormalized,
      locator: canonicalLoc,
      sourceUrl: fileUrl,
      excerptText: activeSelection.text,
      createdAt: now,
    };

    try {
      if (!dataRepository.appendExcerptToNote) {
        throw new Error('dataRepository.appendExcerptToNote is not available');
      }

      const updated = await dataRepository.appendExcerptToNote(targetNoteId, blockquote);
      if (!updated?.content) {
        throw new Error('appendExcerptToNote did not return valid updated content');
      }

      const existingNote = notes.find((n) => n.id === targetNoteId);
      const existingProvenances = existingNote?.citationProvenances || [];
      const isDuplicate = existingProvenances.some(
        (p) =>
          p.documentId === newProvenance.documentId &&
          p.locator === newProvenance.locator &&
          p.excerptText === newProvenance.excerptText
      );
      const updatedProvenances = isDuplicate
        ? existingProvenances
        : [...existingProvenances, newProvenance];

      if (dataContext?.updateNote) {
        dataContext.updateNote(targetNoteId, {
          content: updated.content,
          citationProvenances: updatedProvenances,
        });
      }

      if (addExcerptToInbox) {
        await addExcerptToInbox(excerpt);
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
        handleCloseReader();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTocOpen, isTargetNoteModalOpen, handleCloseReader]);

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

  const readerContent = (
    <div className={layoutMode === 'embedded' ? `w-full h-full min-h-[650px] lg:min-h-[calc(100vh-160px)] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col overflow-hidden relative ${className}` : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-6xl h-[92vh] shadow-2xl flex flex-col overflow-hidden relative"}>
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
        onClose={handleCloseReader}
        extraControls={
          <div className="flex items-center gap-2">
            {epubExtraControls}
            {totalReadingSeconds !== undefined && totalReadingSeconds > 0 && (
              <div
                data-testid="reader-analytics-pill"
                title={`Thời gian đọc tích lũy: ${formatReadingDuration(totalReadingSeconds)}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 shadow-2xs font-mono"
              >
                <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>{formatReadingDuration(totalReadingSeconds)}</span>
              </div>
            )}
            <button
              data-testid="mark-completed-btn"
              data-completed={isCompleted ? "true" : "false"}
              type="button"
              onClick={handleToggleComplete}
              aria-label={isCompleted ? "Đánh dấu chưa hoàn thành" : "Đánh dấu đã hoàn thành"}
              title={isCompleted ? "Đã đọc xong (Click để bỏ đánh dấu)" : "Đánh dấu đã đọc xong"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium text-xs transition cursor-pointer border ${
                isCompleted
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 shadow-2xs font-semibold"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200/80 dark:hover:bg-stone-700"
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-stone-400"}`} />
              <span>{isCompleted ? "Đã hoàn thành" : "Hoàn thành"}</span>
            </button>
          </div>
        }
      />

      {/* Reader Workspace: Viewport Area & Multi-Tab Sidebar */}
      <div className="flex-1 relative overflow-hidden flex flex-row bg-stone-50 dark:bg-stone-950">
        <div
          ref={readerViewportRef}
          data-testid="reader-viewport-container"
          tabIndex={-1}
          role="region"
          aria-label="Vùng hiển thị nội dung tài liệu đọc"
          className="flex-1 relative overflow-hidden flex flex-col p-1 sm:p-2.5 outline-none"
        >
          {normalizedFormat === 'epub' ? (
            <React.Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="text-sm font-medium">Đang chuẩn bị nội dung đọc...</span>
                </div>
              }
            >
              <EpubReaderAdapter
                fileUrl={fileUrl}
                documentId={documentId}
                initialLocation={currentPosition}
                onLocationChanged={handlePositionChanged}
                onTocGenerated={(items) => setTocItems(items)}
                onTextSelection={handleTextSelection}
                fontSize={fontSize}
                pageMode={pageMode}
                excerpts={documentHighlights}
                activeExcerptId={activeExcerptId}
                onSelectExcerpt={handleSelectExcerpt}
                onClose={handleCloseReader}
                onRemoveBrokenSession={handleRemoveBrokenSession}
                onLoadError={handleAdapterError}
                onReady={handleAdapterReady}
              />
            </React.Suspense>
          ) : normalizedFormat === 'md' || normalizedFormat === 'markdown' ? (
            <div className="w-full h-full bg-white dark:bg-stone-900 rounded-2xl shadow-2xs border border-stone-200/80 dark:border-stone-800 overflow-hidden flex flex-col">
              <MarkdownReaderAdapter
                content={content}
                fileUrl={fileUrl}
                documentId={documentId}
                sourceType={sourceType}
                initialHeadingId={targetHeadingId}
                initialScrollPercentage={targetScrollPercentage}
                onTocGenerated={(items) => setTocItems(items)}
                onPositionChange={handlePositionChanged}
                onScrollPositionChange={handleMarkdownScrollPositionChange}
                onTextSelection={handleTextSelection}
                excerpts={documentHighlights}
                activeExcerptId={activeExcerptId}
                onSelectExcerpt={handleSelectExcerpt}
              />
            </div>
          ) : normalizedFormat === 'pdf' ? (
            <PdfReaderAdapter
              fileUrl={fileUrl}
              documentId={documentId}
              title={title}
              initialPage={pdfInitialPage}
              onPageChanged={(newPage) => handlePositionChanged(String(newPage))}
              initialToc={initialToc}
              onTocGenerated={(items) => setTocItems(items)}
              onTextSelection={handleTextSelection}
              onEditResource={onEditResource}
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
              onCreateNewNote={handleOpenCreateNewNote}
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
          backlinks={backlinks}
          onOpenBacklinkNote={(noteId, locator) => {
            const matched = notes.find((n) => n.id === noteId);
            if (matched) {
              setViewingBacklinkNote(matched);
              setViewingBacklinkTargetCitation({ documentId, locator });
            }
          }}
          excerpts={documentHighlights}
          onSelectExcerpt={handleSelectExcerpt}
          onUpdateExcerpt={updateExcerpt}
          onDeleteExcerpt={(excerptId) => {
            if (deleteExcerpt) {
              deleteExcerpt(excerptId);
            } else if (deleteInboxItem) {
              const matchedItem = inboxItems.find((i) => i.excerpt?.id === excerptId || i.id === excerptId);
              if (matchedItem) {
                deleteInboxItem(matchedItem.id);
              }
            }
          }}
          inboxItems={documentInboxItems}
          onDeleteInboxItem={(id) => {
            if (deleteInboxItem) {
              deleteInboxItem(id);
            }
          }}
          onPromoteToFlashcard={handlePromoteInboxItemToFlashcard}
          onOpenArchiveLink={handleOpenArchiveLinkFromSidebar}
          onOpenNoteDetail={(noteId) => {
            const matched = notes.find((n) => n.id === noteId);
            if (matched) {
              setViewingBacklinkNote(matched);
            }
          }}
        />
      </div>

      {/* Phase 21A/21B: Note Context Viewer Modal from Backlink Explorer */}
      {viewingBacklinkNote && (
        <NoteReaderModal
          isOpen={Boolean(viewingBacklinkNote)}
          note={viewingBacklinkNote}
          targetCitation={viewingBacklinkTargetCitation}
          onClose={() => {
            setViewingBacklinkNote(null);
            setViewingBacklinkTargetCitation(undefined);
          }}
          onEdit={() => {
            setViewingBacklinkNote(null);
            setViewingBacklinkTargetCitation(undefined);
          }}
          onOpenArchiveLink={handleOpenArchiveLinkFromSidebar}
        />
      )}

      {/* Phase 3: Note Creation Modal with Provenance Handoff */}
      {isCreateNoteModalOpen && (
        <NoteFormModal
          isOpen={isCreateNoteModalOpen}
          initialContent={noteInitialContent}
          initialProvenance={noteInitialProvenance}
          restoreFocusRef={readerViewportRef}
          onClose={() => {
            setIsCreateNoteModalOpen(false);
            setActiveSelection(null);
          }}
        />
      )}

      {/* Phase 2B: Flashcard Creation Modal with Provenance Handoff */}
      {isCreateFlashcardModalOpen && (
        <FlashcardFormModal
          isOpen={isCreateFlashcardModalOpen}
          initialFront={flashcardInitialFront}
          initialProvenance={flashcardProvenance}
          restoreFocusRef={readerViewportRef}
          onClose={() => {
            setIsCreateFlashcardModalOpen(false);
            setActivePromotingInboxItem(null);
            setActiveSelection(null);
          }}
          onSuccess={async (card) => {
            if (activePromotingInboxItem && processInboxItem) {
              try {
                await processInboxItem(activePromotingInboxItem.id);
              } catch (err) {
                console.error('Failed to mark inbox item as processed:', err);
              }
            }
            setIsCreateFlashcardModalOpen(false);
            setActivePromotingInboxItem(null);
            setActiveSelection(null);
            showToast(`Đã tạo flashcard: "${card.front.slice(0, 30)}..."`);
          }}
        />
      )}
    </div>
  );

  if (layoutMode === 'embedded') {
    return readerContent;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150 ${className}`}
    >
      {readerContent}
    </div>
  );
}
