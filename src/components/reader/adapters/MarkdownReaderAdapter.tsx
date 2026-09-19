import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { HeadingSlugger } from '../../../lib/headingSlugger';
import {
  MarkdownReadabilityRenderer,
  sanitizeVaultMarkdown,
} from '../../../lib/markdownReadability';
import { TocItem } from '../ReaderTocDrawer';

export interface MarkdownReaderSelectionDetails {
  text: string;
  position: { top: number; left: number };
}

export interface MarkdownReaderAdapterProps {
  content?: string;
  fileUrl?: string;
  documentId: string;
  initialHeadingId?: string;
  onTocGenerated?: (items: TocItem[]) => void;
  onPositionChange?: (headingId: string) => void;
  onTextSelection?: (selection: MarkdownReaderSelectionDetails) => void;
  className?: string;
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
  initialHeadingId,
  onTocGenerated,
  onPositionChange,
  onTextSelection,
  className = '',
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
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [initialHeadingId]);

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
      <MarkdownReadabilityRenderer content={sanitizedContent} />
    </div>
  );
}
