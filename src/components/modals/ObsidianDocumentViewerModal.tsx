import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  ExternalLink,
  Tag,
  ListTree,
  AlertCircle,
  FileText,
  Loader2,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { Resource } from '../../types';
import { MarkdownReadabilityRenderer } from '../../lib/markdownReadability';
import { ObsidianWikiLinkResolver } from '../../lib/obsidianWikiLinkResolver';
import { ObsidianTransclusionResolver } from '../../lib/obsidianTransclusionResolver';

interface OutlineItem {
  level: number;
  text: string;
  id: string;
}

interface FrontmatterData {
  title?: string;
  tags?: string[];
  aliases?: string[];
  [key: string]: any;
}

interface VaultFileResponse {
  relativePath: string;
  fileName: string;
  frontmatter: FrontmatterData;
  outline: OutlineItem[];
  content: string;
  sizeBytes: number;
  lastModified: string;
}

interface ObsidianDocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  onUnlink?: (resourceId: string) => void;
}

/**
 * Sanitize raw markdown from Vault to prevent script execution, dangerous HTML attributes,
 * and unsafe URI schemes (javascript:, data:, vbscript:).
 */
function sanitizeVaultMarkdown(rawMarkdown: string): string {
  if (!rawMarkdown) return '';

  let sanitized = rawMarkdown;

  // 1. Strip raw HTML dangerous tags (<script>...</script>, <iframe>...</iframe>, etc.)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // Strip dangerous single tags like <img ... onerror=...>, <script .../>
  sanitized = sanitized.replace(/<\/?[a-z][a-z0-9]*\b[^>]*>/gi, (match) => {
    if (/^(<script|<iframe|<style|<object|<embed)/i.test(match)) {
      return '';
    }
    // Disallow event handlers inside remaining HTML tags
    if (/\bon\w+\s*=/i.test(match)) {
      return '';
    }
    return match;
  });

  // 2. Neutralize dangerous javascript:, vbscript:, data: URIs in Markdown links [text](javascript:...)
  sanitized = sanitized.replace(
    /\[([^\]]+)\]\((javascript|vbscript|data):[^)]*\)/gi,
    '$1'
  );

  return sanitized;
}

function scrollToHeading(headingText?: string) {
  if (!headingText) return;
  const clean = headingText.trim().toLowerCase();

  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  for (const el of Array.from(headings)) {
    if (el.textContent?.trim().toLowerCase() === clean) {
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
  }

  const slug = clean
    .replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s-]/gi, '')
    .replace(/\s+/g, '-');
  const elById = document.getElementById(clean) || document.getElementById(slug);
  if (elById && typeof elById.scrollIntoView === 'function') {
    elById.scrollIntoView({ behavior: 'smooth' });
  }
}

export function ObsidianDocumentViewerModal({
  isOpen,
  onClose,
  resource,
  onUnlink,
}: ObsidianDocumentViewerModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fileData, setFileData] = useState<VaultFileResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOutline, setShowOutline] = useState(true);

  // In-place navigation states for wiki-links
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [vaultResolver, setVaultResolver] = useState<ObsidianWikiLinkResolver | null>(null);
  const [transclusionResolver, setTransclusionResolver] = useState<ObsidianTransclusionResolver | null>(null);
  const [pendingHeading, setPendingHeading] = useState<string | null>(null);
  const [isAutoRefreshed, setIsAutoRefreshed] = useState(false);

  const fetchVaultDocument = useCallback(async (filePathToFetch: string, isRefresh = false) => {
    if (!filePathToFetch) return;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/obsidian/vault/file?path=${encodeURIComponent(filePathToFetch)}`
      );
      if (!response) return;
      const data = await response.json();

      if (!response.ok) {
        // Guarantee no absolute path is displayed
        const safeMsg = (data.message || 'Lỗi khi đọc tệp tin từ Obsidian Vault')
          .replace(/\/Users\/[^\s/]+/gi, '[VAULT_ROOT]')
          .replace(/[A-Z]:\\[^\s\\]+/gi, '[VAULT_ROOT]');
        setErrorMessage(safeMsg);
        setFileData(null);
        return;
      }

      setFileData(data);
    } catch (err) {
      setErrorMessage('Không thể kết nối đến API Obsidian Vault Bridge.');
      setFileData(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadVaultDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/obsidian/vault/search?q=*');
      if (res && res.ok) {
        const data = await res.json();
        if (data?.results && Array.isArray(data.results)) {
          const docs = data.results.map((r: any) => ({
            title: r.title,
            filePath: r.path,
          }));
          setVaultResolver(new ObsidianWikiLinkResolver(docs));

          const defaultFetcher = async (filePath: string): Promise<string | null> => {
            try {
              const resp = await fetch(`/api/obsidian/vault/file?path=${encodeURIComponent(filePath)}`);
              if (!resp.ok) return null;
              const fileJson = await resp.json();
              return fileJson.content ?? null;
            } catch {
              return null;
            }
          };

          setTransclusionResolver(new ObsidianTransclusionResolver(docs, defaultFetcher));
        }
      }
    } catch {
      // Graceful fallback if search API not yet ready
    }
  }, []);

  useEffect(() => {
    if (isOpen && resource && resource.filePath) {
      setCurrentPath(resource.filePath);
      setHistoryStack([]);
      // Step 1: Fetch requested note
      fetchVaultDocument(resource.filePath, false);
    } else {
      setCurrentPath(null);
      setHistoryStack([]);
      setFileData(null);
      setErrorMessage(null);
    }
  }, [isOpen, resource, fetchVaultDocument]);

  // Step 2: Fetch vault index for wiki-link resolution and note transclusions
  useEffect(() => {
    if (!fileData || !fileData.content) return;
    const hasLinksOrTransclusions = /(!?\[\[.+?\]\])/.test(fileData.content);
    if (hasLinksOrTransclusions && (!vaultResolver || !transclusionResolver)) {
      loadVaultDocs();
    }
  }, [fileData, vaultResolver, transclusionResolver, loadVaultDocs]);

  const activePath = currentPath || resource?.filePath;

  // Step 3: SSE File Watcher connection for automatic refresh on disk change
  useEffect(() => {
    if (!isOpen || !activePath) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(
        `/api/obsidian/vault/watch?path=${encodeURIComponent(activePath)}`
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "file-changed") {
            fetchVaultDocument(activePath, false);
            setIsAutoRefreshed(true);
            setTimeout(() => {
              setIsAutoRefreshed(false);
            }, 3500);
          }
        } catch {
          // Skip non-json ping or heartbeat
        }
      };
    } catch {
      // Safe fallback if EventSource is unsupported or fails
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isOpen, activePath, fetchVaultDocument]);

  // Navigate to another note when a wiki-link is clicked
  const handleOpenVaultLink = (targetFilePath: string, heading?: string) => {
    const activePath = currentPath || resource?.filePath;
    if (!targetFilePath || targetFilePath === activePath) {
      if (heading) {
        scrollToHeading(heading);
      }
      return;
    }

    if (activePath) {
      setHistoryStack((prev) => [...prev, activePath]);
    }
    setCurrentPath(targetFilePath);
    setPendingHeading(heading || null);
    fetchVaultDocument(targetFilePath, false);
  };

  // Back navigation to previously viewed note
  const handleGoBack = () => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    setHistoryStack((prevStack) => prevStack.slice(0, -1));
    setCurrentPath(prev);
    fetchVaultDocument(prev, false);
  };

  // Scroll to heading after destination file content loaded
  useEffect(() => {
    if (fileData && pendingHeading) {
      const timer = setTimeout(() => {
        scrollToHeading(pendingHeading);
        setPendingHeading(null);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [fileData, pendingHeading]);

  if (!isOpen || !resource) return null;

  const sanitizedContent = fileData ? sanitizeVaultMarkdown(fileData.content) : '';
  const tags = fileData?.frontmatter?.tags || [];
  const activeDisplayPath = currentPath || resource.filePath;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/70 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-stone-900 truncate">
                  {fileData?.frontmatter?.title ||
                    (currentPath ? currentPath.split('/').pop()?.replace(/\.md$/i, '') : resource.title) ||
                    fileData?.fileName ||
                    'Obsidian Note'}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-purple-50 text-purple-800 rounded">
                  Obsidian Read-Only
                </span>
                {isAutoRefreshed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                    <span>Đã tự động cập nhật từ đĩa</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 truncate">
                {activeDisplayPath}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            {historyStack.length > 0 && (
              <button
                onClick={handleGoBack}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title="Quay lại ghi chú trước"
                aria-label="Quay lại"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>
            )}

            <button
              onClick={() => fetchVaultDocument(activeDisplayPath, true)}
              disabled={isRefreshing || isLoading}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              title="Đọc lại nội dung mới nhất từ đĩa"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Làm mới từ Vault</span>
            </button>

            {resource.url && (
              <a
                href={resource.url}
                className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                title="Mở tài liệu trực tiếp trong ứng dụng Obsidian"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Obsidian</span>
              </a>
            )}

            {onUnlink && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Hủy liên kết tài liệu này khỏi Topic? Ghi chú gốc trong Obsidian Vault sẽ hoàn toàn không bị ảnh hưởng.'
                    )
                  ) {
                    onUnlink(resource.id);
                    onClose();
                  }
                }}
                className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg"
                title="Hủy liên kết"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg ml-1"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-stone-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-700" />
                <p className="text-xs font-medium">Đang tải tài liệu từ Obsidian Vault...</p>
              </div>
            )}

            {errorMessage && (
              <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-900">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-700" />
                  <span>Không thể tải tài liệu</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {fileData && (
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-2xs space-y-4">
                {/* Tags if present */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-stone-100">
                    <Tag className="w-3.5 h-3.5 text-stone-400" />
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md text-[11px] font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Markdown Renderer with Wiki-Link Resolver & Transclusion Resolver */}
                <div className="prose prose-stone max-w-none">
                  <MarkdownReadabilityRenderer
                    content={sanitizedContent}
                    vaultResolver={vaultResolver || undefined}
                    onOpenVaultLink={handleOpenVaultLink}
                    transclusionResolver={transclusionResolver || undefined}
                    transclusionDepth={1}
                    transclusionAncestors={activePath ? [activePath] : []}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Outline Drawer (Table of Contents) */}
          {fileData?.outline && fileData.outline.length > 0 && (
            <div className="w-64 border-l border-stone-200 bg-white p-4 overflow-y-auto hidden md:block">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
                <ListTree className="w-4 h-4 text-purple-700" />
                <span>Mục lục (Outline)</span>
              </div>
              <nav className="space-y-1">
                {fileData.outline.map((heading, idx) => (
                  <a
                    key={idx}
                    href={`#${heading.id}`}
                    className={`block text-xs text-stone-600 hover:text-purple-900 py-1 transition truncate ${
                      heading.level === 1
                        ? 'font-bold'
                        : heading.level === 2
                          ? 'pl-3'
                          : 'pl-6 text-stone-500'
                    }`}
                    title={heading.text}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
