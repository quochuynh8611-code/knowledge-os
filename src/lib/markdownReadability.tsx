import React from 'react';
import { Sparkles } from 'lucide-react';
import { Topic } from '../types';

/**
 * Chuẩn hóa nội dung Markdown thành văn bản thuần (plain text) trơn tru,
 * lọc sạch toàn bộ ký tự điều khiển cú pháp (#, **, _, >, ---, ```, [[ ]])
 * phục vụ cho card preview, line-clamp và search snippet.
 */
export function toReadablePlainTextPreview(content?: string, maxLength?: number): string {
  if (!content) return '';

  let text = content;

  // 1. Chuyển đổi Wiki Links [[Tên Chủ Đề]] hoặc [[Tên Chủ Đề|Bí danh]] thành văn bản thuần
  text = text.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');

  // 2. Loại bỏ khối code blocks ```lang ... ``` và inline code `code`
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`([^`]+)`/g, '$1');

  // 3. Loại bỏ ký hiệu headings (#, ##, ###, ...) ở đầu dòng hoặc giữa dòng
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\n#{1,6}\s+/g, ' ');

  // 4. Loại bỏ ký hiệu blockquote (>) ở đầu dòng
  text = text.replace(/^>\s*/gm, '');

  // 5. Loại bỏ đường phân cách ngang (---, ***, ___)
  text = text.replace(/^(?:-{3,}|\*{3,}|_{3,})\s*$/gm, ' ');

  // 6. Loại bỏ ký tự danh sách (- item, * item, + item, 1. item)
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // 7. Loại bỏ ký hiệu in đậm & in nghiêng (**, __, *, _, ~~)
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');

  // 8. Chuẩn hóa khoảng trắng & xuống dòng thành khoảng trắng đơn liền mạch
  text = text.replace(/\s+/g, ' ').trim();

  // 9. Cắt ngắn nếu có maxLength
  if (maxLength && maxLength > 0 && text.length > maxLength) {
    return text.slice(0, maxLength).trim() + '...';
  }

  return text;
}

/**
 * Phân tích và render các phần tử inline: Bold (**), Italic (*), Inline Code (`), Wiki Links ([[...]])
 */
export function renderInlineMarkdownWithWikiLinks(
  text: string,
  topics: Topic[] = [],
  onOpenTopic?: (id: string) => void
): React.ReactNode[] {
  // Regex bắt các token: Wiki links [[...]], Bold **...**, Italic *...*, Inline code `...`
  const regex = /(\[\[.*?\]\]|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // 1. Wiki Links: [[Tên Chủ Đề]]
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const rawInner = part.slice(2, -2).trim();
      // Hỗ trợ alias dạng [[Topic|Alias]]
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

    // 2. Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-stone-950 dark:text-stone-50">
          {renderInlineMarkdownWithWikiLinks(boldText, topics, onOpenTopic)}
        </strong>
      );
    }

    // 3. Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const italicText = part.slice(1, -1);
      return (
        <em key={index} className="italic text-stone-800 dark:text-stone-200">
          {renderInlineMarkdownWithWikiLinks(italicText, topics, onOpenTopic)}
        </em>
      );
    }

    // 4. Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeText = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 bg-stone-200/80 dark:bg-stone-800 font-mono text-xs text-amber-900 dark:text-amber-300 rounded"
        >
          {codeText}
        </code>
      );
    }

    // 5. Plain text segment
    return <span key={index}>{part}</span>;
  });
}

interface MarkdownReadabilityRendererProps {
  content?: string;
  topics?: Topic[];
  onOpenTopic?: (id: string) => void;
  className?: string;
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
  let listBuffer: string[] = [];

  const flushBlockquote = (keyIndex: number) => {
    if (blockquoteBuffer.length > 0) {
      const quoteText = blockquoteBuffer.join('\n');
      blocks.push(
        <blockquote
          key={`quote-${keyIndex}`}
          data-blockquote="true"
          className="border-l-4 border-amber-600 dark:border-amber-500 pl-4 py-1.5 my-3 bg-amber-50/50 dark:bg-amber-950/20 text-stone-800 dark:text-stone-200 italic rounded-r-xl"
        >
          {renderInlineMarkdownWithWikiLinks(quoteText, topics, onOpenTopic)}
        </blockquote>
      );
      blockquoteBuffer = [];
    }
  };

  const flushList = (keyIndex: number) => {
    if (listBuffer.length > 0) {
      blocks.push(
        <ul
          key={`list-${keyIndex}`}
          className="list-disc list-inside space-y-1 my-2 pl-2 text-stone-800 dark:text-stone-200"
        >
          {listBuffer.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {renderInlineMarkdownWithWikiLinks(item, topics, onOpenTopic)}
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
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
            className="p-3.5 bg-stone-900 text-stone-100 dark:bg-stone-950 rounded-xl font-mono text-xs overflow-x-auto my-3 border border-stone-800"
          >
            <code>{codeBlockBuffer.join('\n')}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        flushBlockquote(i);
        flushList(i);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // 2. Horizontal Rule (---, ***, ___)
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushBlockquote(i);
      flushList(i);
      blocks.push(
        <hr
          key={`hr-${i}`}
          data-divider="true"
          className="border-t border-stone-300 dark:border-stone-700 my-4"
        />
      );
      continue;
    }

    // 3. Headings (# H1, ## H2, ### H3, #### H4)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushBlockquote(i);
      flushList(i);
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (level === 1) {
        blocks.push(
          <h1
            key={`h1-${i}`}
            data-heading="1"
            className="text-lg sm:text-xl font-bold text-stone-950 dark:text-stone-50 font-serif-title mt-4 mb-2 pb-1 border-b border-stone-200 dark:border-stone-800"
          >
            {renderInlineMarkdownWithWikiLinks(headingText, topics, onOpenTopic)}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2
            key={`h2-${i}`}
            data-heading="2"
            className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-serif-title mt-3.5 mb-1.5"
          >
            {renderInlineMarkdownWithWikiLinks(headingText, topics, onOpenTopic)}
          </h2>
        );
      } else {
        blocks.push(
          <h3
            key={`h3-${i}`}
            data-heading="3"
            className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 mt-3 mb-1"
          >
            {renderInlineMarkdownWithWikiLinks(headingText, topics, onOpenTopic)}
          </h3>
        );
      }
      continue;
    }

    // 4. Blockquote (> ...)
    if (line.startsWith('>')) {
      flushList(i);
      blockquoteBuffer.push(line.replace(/^>\s?/, ''));
      continue;
    } else {
      flushBlockquote(i);
    }

    // 5. List items (- item, * item, 1. item)
    const listMatch = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      listBuffer.push(listMatch[1]);
      continue;
    } else {
      flushList(i);
    }

    // 6. Regular paragraph line / empty line
    if (!trimmed) {
      // Empty line adds natural spacing
      blocks.push(<div key={`spacer-${i}`} className="h-2" />);
    } else {
      blocks.push(
        <p key={`p-${i}`} className="leading-relaxed text-stone-800 dark:text-stone-200">
          {renderInlineMarkdownWithWikiLinks(line, topics, onOpenTopic)}
        </p>
      );
    }
  }

  flushBlockquote(lines.length);
  flushList(lines.length);

  return <div className={`space-y-1.5 ${className}`}>{blocks}</div>;
}
