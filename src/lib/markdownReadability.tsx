import React from 'react';
import { Sparkles, CheckSquare, Square, ExternalLink, FileText } from 'lucide-react';
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

export interface MarkdownVaultLinkResolver {
  resolve: (rawLink: string) => {
    targetTitle: string;
    heading?: string;
    alias: string;
    filePath: string | null;
  };
}

const ATTACHMENT_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']);
const ATTACHMENT_VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.mkv', '.ogv']);
const ATTACHMENT_AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']);
const ATTACHMENT_PDF_EXTS = new Set(['.pdf']);

/**
 * Phân tích và render các phần tử inline & embeds:
 * - Obsidian Transclusion / Embeds (![[...]])
 * - Markdown Images (![alt](url))
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
  onOpenTopic?: (id: string) => void,
  vaultResolver?: MarkdownVaultLinkResolver,
  onOpenVaultLink?: (filePath: string, heading?: string) => void
): React.ReactNode[] {
  // Regex bắt các token: Embeds ![[...]], Images ![alt](url), Wiki links [[...]], Markdown links [text](url), Bold, Italic, Code, Strike
  const regex =
    /(!\[\[.*?\]\]|!\[.*?\]\(.*?\)|\[\[.*?\]\]|\[.*?\]\(.*?\)|(?:\*\*|__).*?(?:\*\*|__)|(?:\*|_).*?(?:\*|_)|`.*?`|~~.*?~~)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // 1. Obsidian Transclusion / Embeds: ![[attachment.ext]] hoặc ![[attachment.png|300x200]] hoặc ![[attachment.png|300]]
    if (part.startsWith('![[') && part.endsWith(']]')) {
      const rawInner = part.slice(3, -2).trim();
      let target = rawInner;
      let sizeOrAlt: string | undefined = undefined;
      const pipeIdx = rawInner.indexOf('|');
      if (pipeIdx !== -1) {
        target = rawInner.slice(0, pipeIdx).trim();
        sizeOrAlt = rawInner.slice(pipeIdx + 1).trim();
      }

      const dotIdx = target.lastIndexOf('.');
      const ext = dotIdx !== -1 ? target.slice(dotIdx).toLowerCase() : '';

      // 1a. PDF Embed
      if (ATTACHMENT_PDF_EXTS.has(ext)) {
        return (
          <span key={index} className="block my-3 space-y-1.5">
            <embed
              src={`/api/obsidian/vault/attachment?path=${encodeURIComponent(target)}`}
              type="application/pdf"
              className="w-full h-[500px] rounded-xl border border-stone-200 dark:border-stone-700 shadow-xs"
            />
            <span className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between px-1">
              <span>{target.split('/').pop()}</span>
              <a
                href={`/api/obsidian/vault/attachment?path=${encodeURIComponent(target)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-700 dark:text-purple-400 hover:underline"
              >
                Mở PDF toàn màn hình ↗
              </a>
            </span>
          </span>
        );
      }

      // 1b. Video Embed
      if (ATTACHMENT_VIDEO_EXTS.has(ext)) {
        return (
          <span key={index} className="block my-3">
            <video
              controls
              src={`/api/obsidian/vault/attachment?path=${encodeURIComponent(target)}`}
              className="w-full max-h-[500px] rounded-xl border border-stone-200 dark:border-stone-700 bg-black shadow-xs"
            />
          </span>
        );
      }

      // 1c. Audio Embed
      if (ATTACHMENT_AUDIO_EXTS.has(ext)) {
        return (
          <span key={index} className="block my-2">
            <audio
              controls
              src={`/api/obsidian/vault/attachment?path=${encodeURIComponent(target)}`}
              className="w-full"
            />
          </span>
        );
      }

      // 1d. Image Embed (default for image extensions or general image transclusions)
      let style: React.CSSProperties = {};
      let altText = target.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Attachment';
      if (sizeOrAlt) {
        const dimMatch = sizeOrAlt.match(/^(\d+)x(\d+)$/);
        const widthMatch = sizeOrAlt.match(/^(\d+)$/);
        if (dimMatch) {
          style = { width: `${dimMatch[1]}px`, height: `${dimMatch[2]}px` };
        } else if (widthMatch) {
          style = { width: `${widthMatch[1]}px` };
        } else {
          altText = sizeOrAlt;
        }
      }

      return (
        <img
          key={index}
          src={`/api/obsidian/vault/attachment?path=${encodeURIComponent(target)}`}
          alt={altText}
          style={style}
          loading="lazy"
          className="rounded-xl border border-stone-200 dark:border-stone-700 max-w-full my-2 object-contain shadow-xs inline-block"
        />
      );
    }

    // 2. Standard Markdown Images: ![alt](url)
    if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
      const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        const [, alt, rawSrc] = imgMatch;
        const src = rawSrc.trim();

        // Scheme safety check
        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(src);
        const isAllowedScheme = /^(https?:)/i.test(src);

        // Disallow dangerous schemes like javascript:, data:, vbscript:, file:
        if (hasScheme && !isAllowedScheme) {
          return null;
        }

        let finalSrc = src;
        if (!hasScheme) {
          finalSrc = `/api/obsidian/vault/attachment?path=${encodeURIComponent(src)}`;
        }

        return (
          <img
            key={index}
            src={finalSrc}
            alt={alt || 'Image'}
            loading="lazy"
            className="rounded-xl border border-stone-200 dark:border-stone-700 max-w-full my-2 object-contain shadow-xs inline-block"
          />
        );
      }
    }

    // 3. Wiki Links: [[Tên Chủ Đề]] hoặc [[Tên Chủ Đề|Bí danh]] hoặc [[Tệp Obsidian]]
    if (part.startsWith('[[') && part.endsWith(']]')) {
      // 1a. If vaultResolver is provided, resolve against Obsidian Vault
      if (vaultResolver) {
        const resolution = vaultResolver.resolve(part);
        if (resolution.filePath !== null) {
          return (
            <a
              key={index}
              href={`#${resolution.filePath}${resolution.heading ? `#${resolution.heading}` : ''}`}
              data-filepath={resolution.filePath}
              data-heading={resolution.heading}
              onClick={(e) => {
                e.preventDefault();
                if (onOpenVaultLink) {
                  onOpenVaultLink(resolution.filePath!, resolution.heading);
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-950/90 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 font-semibold rounded-md text-xs sm:text-sm border border-purple-300 dark:border-purple-700 transition mx-0.5 cursor-pointer align-baseline"
              title={`Mở ghi chú Obsidian: ${resolution.targetTitle || resolution.alias}`}
            >
              <FileText className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
              <span>{resolution.alias}</span>
            </a>
          );
        }
      }

      // 1b. Knowledge OS Topic resolution
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
      const [, linkText, rawLinkUrl] = linkMatch;
      const linkUrl = rawLinkUrl.trim();

      // Scheme safety check: allow http, https, mailto, obsidian; deny javascript, data, vbscript, file, etc.
      const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(linkUrl);
      const isAllowedScheme = /^(https?:|mailto:|obsidian:)/i.test(linkUrl);

      // Relative path or anchor (#heading, /path) is acceptable, but unallowed explicit schemes are unsafe
      const isSafe = !hasScheme || isAllowedScheme;

      if (!isSafe) {
        return <span key={index}>{linkText}</span>;
      }

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
        <strong key={index} className="font-bold text-stone-900 dark:text-stone-100">
          {renderInlineMarkdownWithWikiLinks(boldText, topics, onOpenTopic, vaultResolver, onOpenVaultLink)}
        </strong>
      );
    }

    // 4. Italic: *text* hoặc _text_
    const italicMatch = part.match(/^(\*|_)(.*?)\1$/);
    if (italicMatch) {
      const italicText = italicMatch[2];
      return (
        <em key={index} className="italic text-stone-800 dark:text-stone-200">
          {renderInlineMarkdownWithWikiLinks(italicText, topics, onOpenTopic, vaultResolver, onOpenVaultLink)}
        </em>
      );
    }

    // 5. Strikethrough: ~~text~~
    const strikeMatch = part.match(/^~~(.*?)~~$/);
    if (strikeMatch) {
      const strikeText = strikeMatch[1];
      return (
        <del key={index} className="line-through text-stone-400 dark:text-stone-500">
          {renderInlineMarkdownWithWikiLinks(strikeText, topics, onOpenTopic, vaultResolver, onOpenVaultLink)}
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

export interface MarkdownReadabilityRendererProps {
  content?: string;
  topics?: Topic[];
  onOpenTopic?: (id: string) => void;
  vaultResolver?: MarkdownVaultLinkResolver;
  onOpenVaultLink?: (filePath: string, heading?: string) => void;
  className?: string;
}

interface ListItem {
  type: 'ordered' | 'unordered' | 'task';
  text: string;
  checked?: boolean;
}

/**
 * Component React render Markdown có cấu trúc đầy đủ, sạch sẽ và giàu tính thẩm mỹ
 * cho chế độ Focus Reading (NoteReaderModal, TopicDetail, ObsidianDocumentViewerModal).
 */
export function MarkdownReadabilityRenderer({
  content = '',
  topics = [],
  onOpenTopic,
  vaultResolver,
  onOpenVaultLink,
  className = '',
}: MarkdownReadabilityRendererProps) {
  if (!content || !content.trim()) {
    return <p className="text-stone-400 italic text-sm">Chưa có nội dung ghi chú.</p>;
  }

  // Tách nội dung theo dòng để xử lý các block elements
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];

  const renderInline = (val: string) =>
    renderInlineMarkdownWithWikiLinks(val, topics, onOpenTopic, vaultResolver, onOpenVaultLink);

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let blockquoteBuffer: string[] = [];
  let listBuffer: ListItem[] = [];
  let tableBuffer: string[] = [];

  const flushBlockquote = (keyIndex: number) => {
    if (blockquoteBuffer.length > 0) {
      blocks.push(
        <blockquote
          key={`quote-${keyIndex}`}
          className="border-l-4 border-amber-600 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 my-3.5 rounded-r-xl space-y-1.5 italic text-stone-700 dark:text-stone-300 text-xs sm:text-sm"
        >
          {blockquoteBuffer.map((quoteText, qIdx) => (
            <p key={`quote-line-${keyIndex}-${qIdx}`} className="leading-relaxed">
              {renderInline(quoteText)}
            </p>
          ))}
        </blockquote>
      );
      blockquoteBuffer = [];
    }
  };

  const flushList = (keyIndex: number) => {
    if (listBuffer.length > 0) {
      const isTask = listBuffer.some((item) => item.type === 'task');
      const isOrdered = listBuffer.every((item) => item.type === 'ordered');

      if (isTask) {
        blocks.push(
          <ul key={`task-list-${keyIndex}`} className="space-y-1.5 my-3 pl-1">
            {listBuffer.map((item, lIdx) => (
              <li key={`task-${keyIndex}-${lIdx}`} className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed text-stone-800 dark:text-stone-200">
                <span className="mt-0.5 text-stone-500 dark:text-stone-400 shrink-0">
                  {item.checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                  )}
                </span>
                <span className={item.checked ? 'line-through text-stone-400 dark:text-stone-500' : ''}>
                  {renderInline(item.text)}
                </span>
              </li>
            ))}
          </ul>
        );
      } else if (isOrdered) {
        blocks.push(
          <ol key={`ordered-list-${keyIndex}`} className="list-decimal list-outside ml-5 space-y-1 my-3 text-stone-800 dark:text-stone-200 text-xs sm:text-sm leading-relaxed">
            {listBuffer.map((item, lIdx) => (
              <li key={`ol-${keyIndex}-${lIdx}`}>
                {renderInline(item.text)}
              </li>
            ))}
          </ol>
        );
      } else {
        blocks.push(
          <ul key={`unordered-list-${keyIndex}`} className="list-disc list-outside ml-5 space-y-1 my-3 text-stone-800 dark:text-stone-200 text-xs sm:text-sm leading-relaxed">
            {listBuffer.map((item, lIdx) => (
              <li key={`ul-${keyIndex}-${lIdx}`}>
                {renderInline(item.text)}
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
      const headerRow = tableBuffer[0].split('|').map((s) => s.trim()).filter(Boolean);
      const dataRows = tableBuffer.slice(2).map((row) =>
        row.split('|').map((s) => s.trim()).filter(Boolean)
      );

      blocks.push(
        <div key={`table-wrapper-${keyIndex}`} className="overflow-x-auto my-4 border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xs">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
              <tr>
                {headerRow.map((h, hIdx) => (
                  <th key={`th-${keyIndex}-${hIdx}`} className="p-2.5 font-bold text-stone-900 dark:text-stone-100">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-950">
              {dataRows.map((row, rIdx) => (
                <tr key={`tr-${keyIndex}-${rIdx}`} className="hover:bg-stone-50 dark:hover:bg-stone-900/50 transition">
                  {row.map((cell, cIdx) => (
                    <td key={`td-${keyIndex}-${rIdx}-${cIdx}`} className="p-2.5 text-stone-700 dark:text-stone-300">
                      {renderInline(cell)}
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
            {renderInline(line)}
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
            {renderInline(headingText)}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2
            key={`h2-${i}`}
            data-heading="2"
            className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 font-serif-title mt-4 mb-2"
          >
            {renderInline(headingText)}
          </h2>
        );
      } else {
        blocks.push(
          <h3
            key={`h3-${i}`}
            data-heading="3"
            className="text-base sm:text-lg font-bold text-stone-850 dark:text-stone-150 font-serif-title mt-3 mb-1.5"
          >
            {renderInline(headingText)}
          </h3>
        );
      }
      continue;
    }

    // 5. Blockquote (> quote)
    if (trimmed.startsWith('>')) {
      flushList(i);
      flushTable(i);
      const quoteContent = line.replace(/^>\s?/, '');
      blockquoteBuffer.push(quoteContent);
      continue;
    }

    flushBlockquote(i);

    // 6. Ordered list (1. item)
    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (olMatch) {
      flushTable(i);
      listBuffer.push({ type: 'ordered', text: olMatch[2] });
      continue;
    }

    // 7. Task list (- [ ] or - [x])
    const taskMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      flushTable(i);
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      listBuffer.push({ type: 'task', text: taskMatch[2], checked: isChecked });
      continue;
    }

    // 8. Unordered list (- item or * item)
    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      flushTable(i);
      listBuffer.push({ type: 'unordered', text: ulMatch[1] });
      continue;
    }

    flushList(i);

    // 9. Regular paragraph line / empty line
    if (!trimmed) {
      blocks.push(<div key={`spacer-${i}`} className="h-2.5" />);
    } else {
      blocks.push(
        <p key={`p-${i}`} className="leading-relaxed text-stone-800 dark:text-stone-200 text-xs sm:text-sm">
          {renderInline(line)}
        </p>
      );
    }
  }

  flushBlockquote(lines.length);
  flushList(lines.length);
  flushTable(lines.length);

  return <div className={`space-y-1.5 ${className}`}>{blocks}</div>;
}
