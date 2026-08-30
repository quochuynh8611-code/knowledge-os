import React from 'react';
import { Sparkles, CheckSquare, Square, ExternalLink } from 'lucide-react';
import { Topic } from '../types';

/**
 * Chuẩn hóa nội dung Markdown thành văn bản thuần (plain text) trơn tru,
 * lọc sạch toàn bộ ký tự điều khiển cú pháp (#, **, _, >, ---, ```, [[ ]], [text](url), tables, html)
 * phục vụ cho card preview, line-clamp và search snippet.
 */
export function toReadablePlainTextPreview(content?: string, maxLength?: number): string {
  if (!content) return '';

  let text = content;

  // 1. Chuyển đổi Wiki Links [[Tên Chủ Đề]] hoặc [[Tên Chủ Đề|Bí danh]] thành văn bản thuần
  text = text.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');

  // 2. Chuyển đổi Markdown images ![alt](url) -> "" và Markdown links [text](url) -> text
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 3. Loại bỏ HTML tags
  text = text.replace(/<\/?[a-zA-Z][^>]*>/g, ' ');

  // 4. Loại bỏ khối code blocks ```lang ... ``` và inline code `code`
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`([^`]+)`/g, '$1');

  // 5. Loại bỏ table separator rows |---|---| và thay pipe | thành khoảng trắng
  text = text.replace(/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/gm, ' ');
  text = text.replace(/\|/g, ' ');

  // 6. Loại bỏ ký hiệu headings (#, ##, ###, ...) ở đầu dòng hoặc sau newline
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\n#{1,6}\s+/g, ' ');

  // 7. Loại bỏ ký hiệu blockquote (>, >>) ở đầu dòng
  text = text.replace(/^>+\s*/gm, '');

  // 8. Loại bỏ đường phân cách ngang (---, ***, ___)
  text = text.replace(/^(?:-{3,}|\*{3,}|_{3,})\s*$/gm, ' ');

  // 9. Loại bỏ task list markers (- [ ] , - [x] ) và bullet / numbered list markers
  text = text.replace(/^\s*[-*+•]\s+\[[ xX]\]\s+/gm, '');
  text = text.replace(/^\s*[-*+•]\s+/gm, '');
  text = text.replace(/^\s*\d+[.)]\s+/gm, '');

  // 10. Loại bỏ ký hiệu in đậm & in nghiêng (**, __, *, _, ~~)
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');

  // 11. Chuẩn hóa khoảng trắng & xuống dòng thành khoảng trắng đơn liền mạch
  text = text.replace(/\s+/g, ' ').trim();

  // 12. Cắt ngắn nếu có maxLength
  if (maxLength && maxLength > 0 && text.length > maxLength) {
    return text.slice(0, maxLength).trim() + '...';
  }

  return text;
}

/**
 * Phân tích và render các phần tử inline:
 * - Wiki Links ([[...]])
 * - Markdown Links ([text](url))
 * - Bold (**text** hoặc __text__)
 * - Italic (*text* hoặc _text_)
 * - Inline Code (`code`)
 * - Strikethrough (~~text~~)
 */
export function renderInlineMarkdownWithWikiLinks(
  text: string,
  topics: Topic[] = [],
  onOpenTopic?: (id: string) => void
): React.ReactNode[] {
  // Regex bắt các token: Wiki links [[...]], Markdown links [text](url), Bold **...**, Italic *...*, Inline code `...`, Strikethrough ~~...~~
  const regex = /(\[\[.*?\]\]|\[.*?\]\(.*?\)|(?:\*\*|__).*?(?:\*\*|__)|(?:\*|_).*?(?:\*|_)|`.*?`|~~.*?~~)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // 1. Wiki Links: [[Tên Chủ Đề]] hoặc [[Tên Chủ Đề|Bí danh]]
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const rawInner = part.slice(2, -2).trim();
      const [targetTitle, alias] = rawInner.includes('|')
        ? rawInner.split('|').map((s) => s.trim())
        : [rawInner, rawInner];

      const matchedTopic = topics.find(
        (t) =>
          t.title.toLowerCase().includes(targetTitle.toLowerCase()) ||
          targetTitle.toLowerCase().includes(t.title.toLowerCase())
      );

      if (matchedTopic && onOpenTopic) {
        return (
          <button
            key={index}
            type="button"
            onClick={() => onOpenTopic(matchedTopic.id)}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/90 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-semibold rounded-md text-xs sm:text-sm border border-amber-300 dark:border-amber-700 transition mx-0.5 cursor-pointer align-baseline"
            title={`Mở chủ đề: ${matchedTopic.title}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>{alias}</span>
          </button>
        );
      }

      return (
        <span
          key={index}
          className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded text-xs sm:text-sm font-medium"
        >
          {alias}
        </span>
      );
    }

    // 2. Markdown Links: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, linkText, linkUrl] = linkMatch;
      const isExternal = linkUrl.startsWith('http://') || linkUrl.startsWith('https://');
      return (
        <a
          key={index}
          href={linkUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-medium underline underline-offset-2 transition"
        >
          <span>{linkText}</span>
          {isExternal && <ExternalLink className="w-3 h-3 inline-block opacity-70" />}
        </a>
      );
    }

    // 3. Bold: **text** hoặc __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-stone-950 dark:text-stone-50">
          {renderInlineMarkdownWithWikiLinks(boldText, topics, onOpenTopic)}
        </strong>
      );
    }

    // 4. Italic: *text* hoặc _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      const italicText = part.slice(1, -1);
      return (
        <em key={index} className="italic text-stone-800 dark:text-stone-200">
          {renderInlineMarkdownWithWikiLinks(italicText, topics, onOpenTopic)}
        </em>
      );
    }

    // 5. Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      const strikeText = part.slice(2, -2);
      return (
        <del key={index} className="line-through text-stone-500 dark:text-stone-400">
          {renderInlineMarkdownWithWikiLinks(strikeText, topics, onOpenTopic)}
        </del>
      );
    }

    // 6. Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeText = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 bg-stone-200/80 dark:bg-stone-800 font-mono text-xs text-amber-900 dark:text-amber-300 rounded border border-stone-300/60 dark:border-stone-700/60"
        >
          {codeText}
        </code>
      );
    }

    // 7. Plain text segment
    return <span key={index}>{part}</span>;
  });
}

interface MarkdownReadabilityRendererProps {
  content?: string;
  topics?: Topic[];
  onOpenTopic?: (id: string) => void;
  className?: string;
}

interface ListItem {
  type: 'ordered' | 'unordered' | 'task';
  text: string;
  checked?: boolean;
}

/**
 * Component React render Markdown có cấu trúc đầy đủ, sạch sẽ và giàu tính thẩm mỹ
 * cho chế độ Focus Reading (NoteReaderModal, TopicDetail).
 */
export function MarkdownReadabilityRenderer({
  content = '',
  topics = [],
  onOpenTopic,
  className = '',
}: MarkdownReadabilityRendererProps) {
  if (!content || !content.trim()) {
    return <p className="text-stone-400 italic text-sm">Chưa có nội dung ghi chú.</p>;
  }

  // Tách nội dung theo dòng để xử lý các block elements
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];
  let listBuffer: ListItem[] = [];
  let tableBuffer: string[] = [];

  const flushBlockquote = (keyIndex: number) => {
    if (blockquoteBuffer.length > 0) {
      const quoteText = blockquoteBuffer.join('\n');
      blocks.push(
        <blockquote
          key={`quote-${keyIndex}`}
          data-blockquote="true"
          className="border-l-4 border-amber-600 dark:border-amber-500 pl-4 sm:pl-5 py-2 my-3.5 bg-amber-50/60 dark:bg-amber-950/30 text-stone-800 dark:text-stone-200 italic rounded-r-2xl leading-relaxed"
        >
          {renderInlineMarkdownWithWikiLinks(quoteText, topics, onOpenTopic)}
        </blockquote>
      );
      blockquoteBuffer = [];
    }
  };

  const flushList = (keyIndex: number) => {
    if (listBuffer.length > 0) {
      const firstType = listBuffer[0].type;
      if (firstType === 'task') {
        blocks.push(
          <ul key={`tasklist-${keyIndex}`} className="space-y-1.5 my-2.5 pl-1 text-stone-800 dark:text-stone-200">
            {listBuffer.map((item, i) => (
              <li key={i} className="flex items-start gap-2 leading-relaxed text-xs sm:text-sm">
                {item.checked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0 mt-0.5" />
                )}
                <span className={item.checked ? 'line-through text-stone-400 dark:text-stone-500' : ''}>
                  {renderInlineMarkdownWithWikiLinks(item.text, topics, onOpenTopic)}
                </span>
              </li>
            ))}
          </ul>
        );
      } else if (firstType === 'ordered') {
        blocks.push(
          <ol
            key={`ol-${keyIndex}`}
            className="list-decimal list-outside ml-5 space-y-1 my-2.5 text-stone-800 dark:text-stone-200 text-xs sm:text-sm"
          >
            {listBuffer.map((item, i) => (
              <li key={i} className="leading-relaxed pl-1">
                {renderInlineMarkdownWithWikiLinks(item.text, topics, onOpenTopic)}
              </li>
            ))}
          </ol>
        );
      } else {
        blocks.push(
          <ul
            key={`ul-${keyIndex}`}
            className="list-disc list-outside ml-5 space-y-1 my-2.5 text-stone-800 dark:text-stone-200 text-xs sm:text-sm"
          >
            {listBuffer.map((item, i) => (
              <li key={i} className="leading-relaxed pl-1">
                {renderInlineMarkdownWithWikiLinks(item.text, topics, onOpenTopic)}
              </li>
            ))}
          </ul>
        );
      }
      listBuffer = [];
    }
  };

  const flushTable = (keyIndex: number) => {
    if (tableBuffer.length >= 2) {
      const headerLine = tableBuffer[0];
      const dataLines = tableBuffer.slice(2); // Bỏ qua dòng separator |---|---|

      const parseCells = (line: string) =>
        line
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseCells(headerLine);
      const rows = dataLines.map(parseCells);

      blocks.push(
        <div key={`table-${keyIndex}`} className="overflow-x-auto my-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <table className="w-full text-xs sm:text-sm text-left text-stone-800 dark:text-stone-200 border-collapse">
            <thead className="bg-stone-100 dark:bg-stone-800/90 text-stone-900 dark:text-stone-100 font-semibold border-b border-stone-200 dark:border-stone-700">
              <tr>
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-3.5 py-2.5">
                    {renderInlineMarkdownWithWikiLinks(h, topics, onOpenTopic)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2">
                      {renderInlineMarkdownWithWikiLinks(cell, topics, onOpenTopic)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableBuffer = [];
    } else if (tableBuffer.length > 0) {
      // Fallback nếu không đủ cấu trúc bảng
      tableBuffer.forEach((line, tIdx) => {
        blocks.push(
          <p key={`table-fallback-${keyIndex}-${tIdx}`} className="leading-relaxed text-stone-800 dark:text-stone-200 text-xs sm:text-sm">
            {renderInlineMarkdownWithWikiLinks(line, topics, onOpenTopic)}
          </p>
        );
      });
      tableBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code block delimiter (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        blocks.push(
          <pre
            key={`codeblock-${i}`}
            className="p-4 bg-stone-900 text-stone-100 dark:bg-stone-950 rounded-2xl font-mono text-xs sm:text-sm overflow-x-auto my-3.5 border border-stone-800 leading-relaxed"
          >
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        flushBlockquote(i);
        flushList(i);
        flushTable(i);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // 2. Table row detection (| col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      flushBlockquote(i);
      flushList(i);
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable(i);
    }

    // 3. Horizontal Rule (---, ***, ___)
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushBlockquote(i);
      flushList(i);
      flushTable(i);
      blocks.push(
        <hr
          key={`hr-${i}`}
          data-divider="true"
          className="border-t border-stone-200 dark:border-stone-800 my-5"
        />
      );
      continue;
    }

    // 4. Headings (# H1, ## H2, ### H3, #### H4)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushBlockquote(i);
      flushList(i);
      flushTable(i);
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (level === 1) {
        blocks.push(
          <h1
            key={`h1-${i}`}
            data-heading="1"
            className="text-xl sm:text-2xl font-bold text-stone-950 dark:text-stone-50 font-serif-title mt-5 mb-2.5 pb-1.5 border-b border-stone-200 dark:border-stone-800"
          >
            {renderInlineMarkdownWithWikiLinks(headingText, topics, onOpenTopic)}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2
            key={`h2-${i}`}
            data-heading="2"
            className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 font-serif-title mt-4 mb-2"
          >
            {renderInlineMarkdownWithWikiLinks(headingText, topics, onOpenTopic)}
          </h2>
        );
      } else {
        blocks.push(
          <h3
            key={`h3-${i}`}
            data-heading="3"
            className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 mt-3.5 mb-1.5"
          >
            {renderInlineMarkdownWithWikiLinks(headingText, topics, onOpenTopic)}
          </h3>
        );
      }
      continue;
    }

    // 5. Blockquote (> ...)
    if (line.startsWith('>')) {
      flushList(i);
      flushTable(i);
      blockquoteBuffer.push(line.replace(/^>+\s?/, ''));
      continue;
    } else {
      flushBlockquote(i);
    }

    // 6. Task list (- [ ] or - [x])
    const taskMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      flushTable(i);
      const checked = taskMatch[1].toLowerCase() === 'x';
      listBuffer.push({ type: 'task', text: taskMatch[2], checked });
      continue;
    }

    // 7. Ordered list (1. item, 2. item)
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushTable(i);
      listBuffer.push({ type: 'ordered', text: orderedMatch[1] });
      continue;
    }

    // 8. Unordered list (- item, * item, + item)
    const unorderedMatch = line.match(/^\s*[-*+•]\s+(.*)$/);
    if (unorderedMatch) {
      flushTable(i);
      listBuffer.push({ type: 'unordered', text: unorderedMatch[1] });
      continue;
    }

    flushList(i);

    // 9. Regular paragraph line / empty line
    if (!trimmed) {
      blocks.push(<div key={`spacer-${i}`} className="h-2.5" />);
    } else {
      blocks.push(
        <p key={`p-${i}`} className="leading-relaxed text-stone-800 dark:text-stone-200 text-xs sm:text-sm">
          {renderInlineMarkdownWithWikiLinks(line, topics, onOpenTopic)}
        </p>
      );
    }
  }

  flushBlockquote(lines.length);
  flushList(lines.length);
  flushTable(lines.length);

  return <div className={`space-y-1.5 ${className}`}>{blocks}</div>;
}
