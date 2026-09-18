import React, { useEffect, useMemo, useRef } from 'react';
import { HeadingSlugger } from '../../../lib/headingSlugger';
import {
  MarkdownReadabilityRenderer,
  sanitizeVaultMarkdown,
} from '../../../lib/markdownReadability';
import { TocItem } from '../ReaderTocDrawer';

export interface MarkdownReaderAdapterProps {
  content?: string;
  documentId: string;
  initialHeadingId?: string;
  onTocGenerated?: (items: TocItem[]) => void;
  onPositionChange?: (headingId: string) => void;
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
  documentId,
  initialHeadingId,
  onTocGenerated,
  onPositionChange,
  className = '',
}: MarkdownReaderAdapterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sanitizedContent = useMemo(() => sanitizeVaultMarkdown(content), [content]);

  // Extract TOC items
  const tocItems = useMemo(() => extractMarkdownToc(content), [content]);

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

  if (!content || !content.trim()) {
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
      className={`markdown-reader-viewport overflow-y-auto px-6 py-8 sm:px-12 sm:py-10 max-w-4xl mx-auto w-full prose prose-stone dark:prose-invert leading-relaxed ${className}`}
    >
      <MarkdownReadabilityRenderer content={sanitizedContent} />
    </div>
  );
}
