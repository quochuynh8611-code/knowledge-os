/**
 * Core PDF Text-Layer Engine (Phase 4 — Chặng 4A)
 *
 * Responsibilities:
 * 1. Page-Scoped Persistent Highlight Reconciliation (filterExcerptsForPdfPage & applyPdfTextLayerHighlights)
 * 2. Selection Context Extraction with Prefix/Suffix Disambiguation (extractSelectionWithContextFromContainer)
 * 3. Dynamic pdfjs-dist Text & Outline Extraction with LRU Caching & Fail-Closed Guards
 */

import type { ResearchExcerpt } from '../types';
import type { TocItem } from '../components/reader/ReaderTocDrawer';
import {
  extractLinearTextFromDom,
  resolveMarkdownAnchor,
  clearDomHighlights,
  normalizeAnchorText,
  type AnchorTarget,
} from './markdownHighlightAnchor';

export interface PdfPageTextContent {
  pageNumber: number;
  fullText: string;
  paragraphs: string[];
  totalPages: number;
}

export type PdfPageLoader = (pdfUrl: string, pageNumber: number) => Promise<PdfPageTextContent>;
export type PdfOutlineLoader = (pdfUrl: string) => Promise<TocItem[]>;

export interface ApplyPdfHighlightsOptions {
  container: HTMLElement;
  excerpts: ResearchExcerpt[];
  activeExcerptId?: string | null;
  onSelectExcerpt?: (excerpt: ResearchExcerpt) => void;
  currentPage?: number;
  pageText?: string;
}

// ─── Caches ──────────────────────────────────────────────────────────────────
const pageTextCache = new Map<string, PdfPageTextContent>();
const outlineCache = new Map<string, TocItem[]>();

export function clearPdfTextCache(): void {
  pageTextCache.clear();
  outlineCache.clear();
}

// ─── 1. Page-Scoped Highlight Filtering ─────────────────────────────────────
/**
 * Lọc danh sách trích đoạn thuộc về trang hiện tại (pageNumber).
 * Hỗ trợ fallback cho trích đoạn cũ (legacy excerpts) chưa có pageNumber
 * nếu nội dung được tìm thấy trên văn bản trang hiện tại.
 */
export function filterExcerptsForPdfPage(
  excerpts: ResearchExcerpt[],
  currentPage: number,
  pageText?: string
): ResearchExcerpt[] {
  if (!excerpts || excerpts.length === 0) return [];

  const normPageText = pageText ? normalizeAnchorText(pageText).toLowerCase() : null;

  return excerpts.filter((excerpt) => {
    const selector = excerpt.positionSelector;
    const pageNum = selector?.pageNumber ?? selector?.page;

    if (typeof pageNum === 'number') {
      return pageNum === currentPage;
    }

    // Legacy fallback: excerpt chưa có pageNumber
    if (normPageText && excerpt.selectedText) {
      const normSelected = normalizeAnchorText(excerpt.selectedText).toLowerCase();
      if (normSelected && normPageText.includes(normSelected)) {
        return true;
      }
    }

    return false;
  });
}

// ─── 2. DOM Highlight Injection & Cleanup ────────────────────────────────────
/**
 * Tiêm các thẻ <mark> persistent highlight lên cây DOM của trang PDF text-layer.
 * Trả về hàm cleanup để gỡ bỏ toàn bộ highlight và normalize cây DOM.
 */
export function applyPdfTextLayerHighlights(options: ApplyPdfHighlightsOptions): () => void {
  const { container, excerpts, activeExcerptId, onSelectExcerpt, currentPage, pageText } = options;
  if (!container) return () => {};

  // Luôn dọn dẹp các thẻ mark cũ trước khi xử lý
  clearDomHighlights(container);

  if (!excerpts || excerpts.length === 0) {
    return () => clearDomHighlights(container);
  }

  const { linearText, charMap } = extractLinearTextFromDom(container);
  if (!linearText || charMap.length === 0) {
    return () => clearDomHighlights(container);
  }

  const pageExcerpts = typeof currentPage === 'number'
    ? filterExcerptsForPdfPage(excerpts, currentPage, pageText || linearText)
    : excerpts;

  if (pageExcerpts.length === 0) {
    return () => clearDomHighlights(container);
  }

  interface ResolvedItem {
    excerpt: ResearchExcerpt;
    startIndex: number;
    endIndex: number;
  }
  const resolvedItems: ResolvedItem[] = [];

  for (const excerpt of pageExcerpts) {
    const target: AnchorTarget = {
      selectedText: excerpt.selectedText,
      contextPrefix: excerpt.contextPrefix,
      contextSuffix: excerpt.contextSuffix,
    };

    const res = resolveMarkdownAnchor(linearText, target);
    if (res.success && res.match) {
      resolvedItems.push({
        excerpt,
        startIndex: res.match.startIndex,
        endIndex: res.match.endIndex,
      });
    }
  }

  // Sắp xếp giảm dần theo startIndex để thao tác cắt TextNode không làm lệch index phía trước
  resolvedItems.sort((a, b) => b.startIndex - a.startIndex);

  for (const item of resolvedItems) {
    const { excerpt, startIndex, endIndex } = item;
    if (startIndex >= charMap.length || endIndex > charMap.length || startIndex >= endIndex) {
      continue;
    }

    // Gom toàn bộ TextNode nằm trong dải [startIndex, endIndex - 1]
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
    const color = excerpt.highlightColor || '#fef08a';
    const label = `Điểm trích PDF: ${excerpt.selectedText.slice(0, 50)}${excerpt.selectedText.length > 50 ? '...' : ''}`;
    const pageAttr = String(currentPage ?? excerpt.positionSelector?.pageNumber ?? 1);

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
        mark.setAttribute('data-highlight-color', color);
        mark.setAttribute('data-pdf-page', pageAttr);
        mark.setAttribute('data-active', isActive ? 'true' : 'false');
        mark.setAttribute('tabindex', '0');
        mark.setAttribute('role', 'button');
        mark.setAttribute('aria-label', label);
        mark.style.backgroundColor = color;
        mark.style.borderRadius = '2px';
        mark.style.cursor = 'pointer';
        mark.className = `research-highlight transition-all ${
          isActive ? 'ring-2 ring-amber-500 shadow-xs' : ''
        }`;

        if (onSelectExcerpt) {
          const handleClick = (e: MouseEvent) => {
            e.stopPropagation();
            onSelectExcerpt(excerpt);
          };
          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onSelectExcerpt(excerpt);
            }
          };
          mark.addEventListener('click', handleClick);
          mark.addEventListener('keydown', handleKeyDown);
        }

        nodeToWrap.parentNode?.replaceChild(mark, nodeToWrap);
        mark.appendChild(nodeToWrap);
      } catch (e) {
        console.warn('Failed to wrap text node slice with mark in PDF text-layer:', e);
      }
    });
  }

  return () => {
    clearDomHighlights(container);
  };
}

// ─── 3. Selection Context Window Extraction ──────────────────────────────────
/**
 * Trích xuất selectedText cùng cửa sổ ngữ cảnh contextPrefix và contextSuffix
 * từ vùng bôi đen (window.getSelection) bên trong container text-layer.
 */
export function extractSelectionWithContextFromContainer(
  container: HTMLElement,
  maxContextLen = 60
): {
  selectedText: string;
  contextPrefix: string;
  contextSuffix: string;
} | null {
  if (typeof window === 'undefined') return null;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  const selectedText = selection.toString().trim();
  if (!selectedText) return null;

  const { linearText, charMap } = extractLinearTextFromDom(container);
  if (!linearText || charMap.length === 0) {
    return {
      selectedText,
      contextPrefix: '',
      contextSuffix: '',
    };
  }

  const startNode = range.startContainer;
  const startOffset = range.startOffset;
  const endNode = range.endContainer;
  const endOffset = range.endOffset;

  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < charMap.length; i++) {
    const item = charMap[i];
    if (startIndex === -1 && item.node === startNode && item.offset >= startOffset) {
      startIndex = i;
    }
    if (item.node === endNode && item.offset < endOffset) {
      endIndex = i + 1;
    }
  }

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    // Fallback: tìm vị trí chuỗi trực tiếp trên linearText
    const normSel = normalizeAnchorText(selectedText);
    const pos = linearText.indexOf(normSel);
    if (pos !== -1) {
      startIndex = pos;
      endIndex = pos + normSel.length;
    } else {
      return {
        selectedText,
        contextPrefix: '',
        contextSuffix: '',
      };
    }
  }

  const rawPrefix = linearText.slice(Math.max(0, startIndex - maxContextLen * 2), startIndex);
  const rawSuffix = linearText.slice(endIndex, endIndex + maxContextLen * 2);

  const contextPrefix = normalizeAnchorText(rawPrefix).slice(-maxContextLen);
  const contextSuffix = normalizeAnchorText(rawSuffix).slice(0, maxContextLen);

  return {
    selectedText,
    contextPrefix,
    contextSuffix,
  };
}

// ─── 4. PDF Page Text & Outline Extraction (Fail-Closed) ─────────────────────
/**
 * Trích xuất nội dung văn bản của một trang PDF.
 * Áp dụng LRU / Map cache theo `${pdfUrl}::${pageNumber}`.
 * Tự động fail-closed an toàn (trả về văn bản rỗng) khi gặp lỗi hoặc file 404.
 */
export async function extractPdfPageText(
  pdfUrl: string,
  pageNumber: number,
  loaderImpl?: PdfPageLoader
): Promise<PdfPageTextContent> {
  const cacheKey = `${pdfUrl}::${pageNumber}`;
  if (pageTextCache.has(cacheKey)) {
    return pageTextCache.get(cacheKey)!;
  }

  try {
    if (loaderImpl) {
      const res = await loaderImpl(pdfUrl, pageNumber);
      pageTextCache.set(cacheKey, res);
      return res;
    }

    // Dynamic import pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const items = textContent.items as Array<{ str?: string; hasEOL?: boolean }>;
    const lines: string[] = [];
    let currentLine = '';

    for (const item of items) {
      if (item.str) {
        currentLine += item.str;
      }
      if (item.hasEOL) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = '';
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    const fullText = lines.join('\n');
    const result: PdfPageTextContent = {
      pageNumber,
      fullText,
      paragraphs: lines,
      totalPages,
    };

    pageTextCache.set(cacheKey, result);
    return result;
  } catch (err) {
    return {
      pageNumber,
      fullText: '',
      paragraphs: [],
      totalPages: 0,
    };
  }
}

/**
 * Trích xuất mục lục tài liệu PDF sang danh sách TocItem[].
 * Fail-closed an toàn trả về mảng rỗng [] nếu file không có mục lục hoặc bị lỗi.
 */
export async function extractPdfOutline(
  pdfUrl: string,
  loaderImpl?: PdfOutlineLoader
): Promise<TocItem[]> {
  if (outlineCache.has(pdfUrl)) {
    return outlineCache.get(pdfUrl)!;
  }

  try {
    if (loaderImpl) {
      const res = await loaderImpl(pdfUrl);
      outlineCache.set(pdfUrl, res);
      return res;
    }

    const pdfjsLib = await import('pdfjs-dist');
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdfDoc = await loadingTask.promise;
    const outline = await pdfDoc.getOutline();

    if (!outline || outline.length === 0) {
      return [];
    }

    const items: TocItem[] = [];
    async function traverse(nodes: any[], level = 1) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        let page = 1;
        if (node.dest) {
          try {
            const dest = typeof node.dest === 'string' ? await pdfDoc.getDestination(node.dest) : node.dest;
            if (dest && Array.isArray(dest) && dest[0]) {
              const pageIndex = await pdfDoc.getPageIndex(dest[0]);
              page = pageIndex + 1;
            }
          } catch {
            // fallback page 1
          }
        }
        const itemTitle = node.title || 'Mục không tên';
        items.push({
          id: `pdf-toc-${level}-${i}-${page}`,
          label: itemTitle,
          title: itemTitle,
          level,
          page,
        });
        if (node.items && node.items.length > 0) {
          await traverse(node.items, level + 1);
        }
      }
    }

    await traverse(outline);
    outlineCache.set(pdfUrl, items);
    return items;
  } catch {
    return [];
  }
}
