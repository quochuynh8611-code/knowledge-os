import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { HeadingSlugger } from '../../../lib/headingSlugger';
import {
  MarkdownReadabilityRenderer,
  sanitizeVaultMarkdown,
} from '../../../lib/markdownReadability';
import { TocItem } from '../ReaderTocDrawer';
import { ResearchExcerpt } from '../../../types';
import {
  resolveMarkdownAnchor,
  AnchorTarget,
  HeadingSection,
  extractLinearTextFromDom,
  clearDomHighlights,
} from '../../../lib/markdownHighlightAnchor';

export interface MarkdownReaderSelectionDetails {
  text: string;
  position: { top: number; left: number };
}

export interface MarkdownReaderAdapterProps {
  content?: string;
  fileUrl?: string;
  documentId: string;
  sourceType?: 'docs' | 'vault';
  initialHeadingId?: string;
  onTocGenerated?: (items: TocItem[]) => void;
  onPositionChange?: (headingId: string) => void;
  onTextSelection?: (selection: MarkdownReaderSelectionDetails) => void;
  className?: string;
  excerpts?: ResearchExcerpt[];
  activeExcerptId?: string | null;
  onSelectExcerpt?: (excerpt: ResearchExcerpt) => void;
}

export function extractMarkdownToc(rawMarkdown?: string): TocItem[] {
  if (!rawMarkdown || !rawMarkdown.trim()) return [];

  const slugger = new HeadingSlugger();
  const lines = rawMarkdown.split(/\r?\n/);
  const items: TocItem[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const rawText = match[2].trim();
      const id = slugger.slug(rawText);
      // Clean display label
      const label = rawText
        .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_`~]/g, '')
        .trim();

      items.push({
        id,
        label,
        level,
      });
    }
  }

  return items;
}

export function MarkdownReaderAdapter({
  content = '',
  fileUrl,
  documentId,
  sourceType,
  initialHeadingId,
  onTocGenerated,
  onPositionChange,
  onTextSelection,
  className = '',
  excerpts = [],
  activeExcerptId = null,
  onSelectExcerpt,
}: MarkdownReaderAdapterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fetchedContent, setFetchedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeContent = (content && content.trim()) ? content : fetchedContent;

  const fetchContent = useCallback(async () => {
    if (content && content.trim()) {
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    if (!fileUrl || !fileUrl.trim()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const res = await fetch(fileUrl);
      if (!res.ok) {
        throw new Error(`Lỗi tải tài liệu (${res.status})`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const extracted = json.content || json.data || (json.document && json.document.content) || JSON.stringify(json, null, 2);
        setFetchedContent(extracted);
      } else {
        const text = await res.text();
        // Fallback: check if response text is actually JSON
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object' && parsed.content) {
            setFetchedContent(parsed.content);
          } else {
            setFetchedContent(text);
          }
        } catch {
          setFetchedContent(text);
        }
      }
    } catch (err: any) {
      setLoadError(err.message || 'Không thể nạp nội dung tài liệu Markdown.');
    } finally {
      setIsLoading(false);
    }
  }, [content, fileUrl]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const sanitizedContent = useMemo(() => sanitizeVaultMarkdown(activeContent), [activeContent]);

  // Extract TOC items
  const tocItems = useMemo(() => extractMarkdownToc(activeContent), [activeContent]);

  const isDocsSource = useMemo(() => {
    if (sourceType) return sourceType === 'docs';
    if (fileUrl && (fileUrl.includes('/api/docs') || fileUrl.includes('/docs/'))) return true;
    if (documentId && (documentId.startsWith('docs/') || documentId.endsWith('.feature'))) return true;
    if (documentId && documentId.startsWith('vault:')) return false;
    return false;
  }, [fileUrl, documentId, sourceType]);

  const effectiveDocPath = useMemo(() => {
    if (fileUrl && fileUrl.includes('path=')) {
      try {
        const urlParams = new URL(fileUrl, 'http://localhost').searchParams;
        const qPath = urlParams.get('path');
        if (qPath) return decodeURIComponent(qPath);
      } catch {
        // Fallback
      }
    }
    return documentId ? documentId.replace(/^vault:/i, '') : '';
  }, [fileUrl, documentId]);

  // Handle text selection in viewport
  const handleMouseUp = () => {
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
      });
    } catch {
      onTextSelection({
        text,
        position: { top: 200, left: 300 },
      });
    }
  };

  // Notify parent of generated TOC items
  useEffect(() => {
    if (onTocGenerated) {
      onTocGenerated(tocItems);
    }
  }, [tocItems, onTocGenerated]);

  // Scroll to initial heading position if provided
  useEffect(() => {
    if (!initialHeadingId) return;

    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const targetEl = containerRef.current.querySelector(`[id="${initialHeadingId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [initialHeadingId]);

  // ─── Phase R3d-A: Persistent Inline Highlights Reconciliation ──────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Always clear existing marks first
    clearDomHighlights(container);

    if (!excerpts || excerpts.length === 0) return;

    // Extract text nodes and linear string
    const { linearText, charMap } = extractLinearTextFromDom(container);
    if (!linearText || charMap.length === 0) return;

    // Collect headings from container for coarse locator
    const headingElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const sections: HeadingSection[] = [];
    headingElements.forEach((hEl) => {
      const id = hEl.getAttribute('id');
      if (!id) return;
      const firstTextNode = document.createTreeWalker(hEl, NodeFilter.SHOW_TEXT).nextNode() as Text | null;
      let startIndex = 0;
      if (firstTextNode) {
        const found = charMap.findIndex((c) => c.node === firstTextNode);
        if (found !== -1) startIndex = found;
      }
      sections.push({ id, startIndex, endIndex: undefined });
    });
    for (let i = 0; i < sections.length - 1; i++) {
      sections[i].endIndex = sections[i + 1].startIndex - 1;
    }
    if (sections.length > 0) {
      sections[sections.length - 1].endIndex = linearText.length;
    }

    // Resolve anchors
    interface ResolvedItem {
      excerpt: ResearchExcerpt;
      startIndex: number;
      endIndex: number;
    }
    const resolvedItems: ResolvedItem[] = [];

    for (const excerpt of excerpts) {
      const target: AnchorTarget = {
        selectedText: excerpt.selectedText,
        contextPrefix: excerpt.contextPrefix,
        contextSuffix: excerpt.contextSuffix,
        headingId: excerpt.positionSelector?.headingId,
      };

      const res = resolveMarkdownAnchor(linearText, target, sections);
      if (res.success && res.match) {
        resolvedItems.push({
          excerpt,
          startIndex: res.match.startIndex,
          endIndex: res.match.endIndex,
        });
      }
    }

    // Sort descending by startIndex so text splitting preserves lower indices
    resolvedItems.sort((a, b) => b.startIndex - a.startIndex);

    for (const item of resolvedItems) {
      const { excerpt, startIndex, endIndex } = item;
      if (startIndex >= charMap.length || endIndex > charMap.length || startIndex >= endIndex) {
        continue;
      }

      // Collect all TextNodes in [startIndex, endIndex - 1]
      const nodeMap = new Map<Text, { startOffset: number; endOffset: number }>();
      for (let i = startIndex; i < endIndex; i++) {
        const itemChar = charMap[i];
        if (!itemChar) continue;
        const { node, offset } = itemChar;
        const existing = nodeMap.get(node);
        if (!existing) {
          nodeMap.set(node, { startOffset: offset, endOffset: offset + 1 });
        } else {
          existing.endOffset = Math.max(existing.endOffset, offset + 1);
        }
      }

      const isActive = activeExcerptId === excerpt.id;
      const label = `Điểm trích: ${excerpt.selectedText.slice(0, 50)}${excerpt.selectedText.length > 50 ? '...' : ''}`;

      nodeMap.forEach(({ startOffset, endOffset }, textNode) => {
        if (!textNode.parentNode) return;
        try {
          let nodeToWrap = textNode;
          if (endOffset < nodeToWrap.data.length) {
            nodeToWrap.splitText(endOffset);
          }
          if (startOffset > 0) {
            nodeToWrap = nodeToWrap.splitText(startOffset);
          }

          const mark = document.createElement('mark');
          mark.setAttribute('data-highlight-id', excerpt.id);
          mark.setAttribute('data-highlight-color', excerpt.highlightColor || '#fef08a');
          mark.setAttribute('data-active', isActive ? 'true' : 'false');
          mark.setAttribute('tabindex', '0');
          mark.setAttribute('role', 'button');
          mark.setAttribute('aria-label', label);
          mark.style.backgroundColor = excerpt.highlightColor || '#fef08a';
          mark.style.borderRadius = '2px';
          mark.style.cursor = 'pointer';
          mark.className = `research-highlight transition-all ${
            isActive ? 'ring-2 ring-amber-500 shadow-xs' : ''
          }`;

          nodeToWrap.parentNode?.replaceChild(mark, nodeToWrap);
          mark.appendChild(nodeToWrap);
        } catch (e) {
          console.warn('Failed to wrap text node slice with mark:', e);
        }
      });
    }

    return () => {
      clearDomHighlights(container);
    };
  }, [activeContent, excerpts, activeExcerptId]);

  // Event delegation on container for mark activation (Click and Keyboard Enter/Space)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMarkActivation = (targetMark: HTMLElement) => {
      const highlightId = targetMark.getAttribute('data-highlight-id');
      if (!highlightId) return;

      const allMarks = container.querySelectorAll('mark[data-highlight-id]');
      allMarks.forEach((m) => m.setAttribute('data-active', 'false'));
      targetMark.setAttribute('data-active', 'true');

      const matchedExcerpt = excerpts?.find((e) => e.id === highlightId);
      if (matchedExcerpt && onSelectExcerpt) {
        onSelectExcerpt(matchedExcerpt);
      }
    };

    const handleContainerClick = (e: MouseEvent) => {
      const mark = (e.target as HTMLElement)?.closest('mark[data-highlight-id]') as HTMLElement | null;
      if (mark) {
        handleMarkActivation(mark);
      }
    };

    const handleContainerKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const mark = (e.target as HTMLElement)?.closest('mark[data-highlight-id]') as HTMLElement | null;
        if (mark) {
          e.preventDefault();
          handleMarkActivation(mark);
        }
      }
    };

    container.addEventListener('click', handleContainerClick);
    container.addEventListener('keydown', handleContainerKeyDown);

    return () => {
      container.removeEventListener('click', handleContainerClick);
      container.removeEventListener('keydown', handleContainerKeyDown);
    };
  }, [excerpts, onSelectExcerpt]);

  // Scroll active excerpt into view when activeExcerptId changes
  useEffect(() => {
    if (!activeExcerptId) return;
    const container = containerRef.current;
    if (!container) return;
    const activeMark = container.querySelector(`mark[data-highlight-id="${activeExcerptId}"]`);
    if (activeMark) {
      activeMark.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [activeExcerptId]);

  if (isLoading) {
    return (
      <div
        data-testid="markdown-reader-loading"
        className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3 bg-stone-50/50 dark:bg-stone-900/50 rounded-2xl border border-stone-200/80 dark:border-stone-800"
      >
        <Loader2 className="w-8 h-8 text-amber-700 dark:text-amber-400 animate-spin" />
        <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
          Đang nạp nội dung tài liệu...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        data-testid="markdown-reader-error"
        className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800"
      >
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center justify-center border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Không thể tải nội dung tài liệu
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm">
            {loadError}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchContent}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  if (!activeContent || !activeContent.trim()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-50/50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800">
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
          Không có nội dung để hiển thị cho tài liệu này.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      data-testid="markdown-selectable-area"
      className={`markdown-reader-viewport overflow-y-auto px-6 py-8 sm:px-12 sm:py-10 max-w-4xl mx-auto w-full prose prose-stone dark:prose-invert leading-relaxed ${className}`}
    >
      <MarkdownReadabilityRenderer
        content={sanitizedContent}
        docPath={effectiveDocPath}
        sourceType={isDocsSource ? 'docs' : 'vault'}
      />
    </div>
  );
}
