import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  X,
  Share2,
  Download,
  ExternalLink,
  CheckCircle2,
  FolderSync,
  FileCode,
  Copy,
  Sparkles,
  Layers,
  BookOpen,
  PlusCircle,
  FileText,
  Upload,
  Tablet,
  Eye,
  Hash,
  Link as LinkIcon,
  Quote,
} from 'lucide-react';
import {
  getStoredVaultName,
  setStoredVaultName,
  getObsidianOpenUri,
  getObsidianNewNoteUri,
  generateObsidianVaultZip,
  formatTopicForObsidian,
  sanitizeFileName,
} from '../../lib/obsidian';
import {
  formatScholarlyTopicMarkdown,
  compileEInkStudyPackMarkdown,
  parseScholarlyMarkdownNote,
  buildScholarlyVaultFileMap,
} from '../../lib/academicVaultSync';
import type { Topic, Note, Resource, Category, ResearchExcerpt, KnowledgeLink } from '../../types';
import type { Flashcard } from '../../types/flashcard';

interface ObsidianBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: Topic;
}

interface ExtendedDataContext {
  topics?: Topic[];
  notes?: Note[];
  resources?: Resource[];
  categories?: Category[];
  researchExcerpts?: ResearchExcerpt[];
  flashcards?: Flashcard[];
  addNote?: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => string | Promise<string>;
  addExcerpt?: (excerpt: ResearchExcerpt) => Promise<ResearchExcerpt>;
  addKnowledgeLink?: (linkData: Omit<KnowledgeLink, 'id'>) => void;
}

export function ObsidianBridgeModal({ isOpen, onClose, topic }: ObsidianBridgeModalProps) {
  const dataContext = useData() as unknown as ExtendedDataContext;
  const topics = dataContext.topics ?? [];
  const notes = dataContext.notes ?? [];
  const resources = dataContext.resources ?? [];
  const categories = dataContext.categories ?? [];
  const researchExcerpts = dataContext.researchExcerpts ?? [];
  const flashcards = dataContext.flashcards ?? [];
  const addNote = dataContext.addNote;
  const addExcerpt = dataContext.addExcerpt;
  const addKnowledgeLink = dataContext.addKnowledgeLink;

  const [vaultName, setVaultName] = useState(getStoredVaultName());
  const [isExporting, setIsExporting] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedScholarlyNote, setCopiedScholarlyNote] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // E-Ink Study Pack states
  const [showEInkPreview, setShowEInkPreview] = useState(false);
  const [einkContent, setEinkContent] = useState('');

  // Round-Trip Ingestion states
  const [roundtripMarkdown, setRoundtripMarkdown] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    setVaultName(getStoredVaultName());
  }, [isOpen]);

  const currentTopic = topic || topics[0];

  // Compute virtual vault file telemetry
  const vaultFiles = useMemo(() => {
    return buildScholarlyVaultFileMap({
      topics,
      notes,
      resources,
      categories,
      excerpts: researchExcerpts,
      flashcards,
      vaultName,
    });
  }, [topics, notes, resources, categories, researchExcerpts, flashcards, vaultName]);

  const topicFileCount = vaultFiles.filter((f) => f.category === 'topic').length;
  const litFileCount = vaultFiles.filter((f) => f.category === 'literature').length;
  const einkFileCount = vaultFiles.filter((f) => f.category === 'eink-pack').length;

  // Live parsed round-trip Markdown
  const parsedRoundtrip = useMemo(() => {
    if (!roundtripMarkdown.trim()) return null;
    return parseScholarlyMarkdownNote(roundtripMarkdown);
  }, [roundtripMarkdown]);

  if (!isOpen) return null;

  const handleSaveVaultName = (val: string) => {
    setVaultName(val);
    setStoredVaultName(val);
  };

  const handleDownloadVaultZip = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const blob = await generateObsidianVaultZip(topics, notes, resources, categories, vaultName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vaultName || 'Obsidian-Vault'}-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setExportSuccess(true);
    } catch (e) {
      console.error('Failed to export vault zip', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyFormattedMarkdown = async () => {
    if (!currentTopic) return;
    try {
      const md = formatTopicForObsidian(currentTopic, notes);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(md);
      }
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown to clipboard', err);
    }
  };

  const handleCopyScholarlyMarkdown = async () => {
    if (!currentTopic) return;
    try {
      const md = formatScholarlyTopicMarkdown({
        topic: currentTopic,
        notes,
        resources,
        excerpts: researchExcerpts,
        flashcards,
      });
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(md);
      }
      setCopiedScholarlyNote(true);
      setTimeout(() => setCopiedScholarlyNote(false), 2500);
    } catch (err) {
      console.error('Failed to copy scholarly markdown to clipboard', err);
    }
  };

  const handleDownloadEInkStudyPack = () => {
    const packMarkdown = compileEInkStudyPackMarkdown({
      title: `Gói Đọc Nghiên Cứu E-Ink — ${vaultName || 'Knowledge-Vault'}`,
      author: 'Academic Scholar',
      topics,
      notes,
      resources,
      excerpts: researchExcerpts,
      flashcards,
      includeSelfTest: true,
      includeLiteratureMatrix: true,
    });

    setEinkContent(packMarkdown);
    setShowEInkPreview(true);

    try {
      const blob = new Blob([packMarkdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizeFileName(vaultName || 'Scholarly-Vault')}-EInk-Study-Pack.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download E-Ink study pack', e);
    }
  };

  const handleConfirmRoundtripImport = async () => {
    if (!parsedRoundtrip) return;

    try {
      const targetTopicId = currentTopic?.id || (topics[0]?.id ?? 'default-topic');
      const targetTopicTitle = currentTopic?.title || topics[0]?.title || 'Ghi Chú Chung';

      if (addNote) {
        await addNote({
          topicId: targetTopicId,
          topicTitle: targetTopicTitle,
          title: parsedRoundtrip.title || 'Untitled Obsidian Note',
          content: parsedRoundtrip.bodyContent,
          type: 'study',
          isPrivate: false,
          tags: parsedRoundtrip.tags,
        });
      }

      if (parsedRoundtrip.excerpts.length > 0 && addExcerpt) {
        for (const exc of parsedRoundtrip.excerpts) {
          await addExcerpt({
            id: `exc-import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            archivedDocumentId: resources[0]?.id || 'imported-resource',
            topicId: targetTopicId,
            selectedText: exc.selectedText,
            positionSelector: {
              pageNumber: exc.locator ? parseInt(exc.locator.replace(/\D/g, ''), 10) || 1 : 1,
            },
            highlightColor: '#fef08a',
            status: 'active',
            userNote: exc.userNote,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      if (parsedRoundtrip.wikiLinks.length > 0 && addKnowledgeLink && currentTopic) {
        for (const wl of parsedRoundtrip.wikiLinks) {
          const targetTopic = topics.find(
            (t) => t.title.toLowerCase() === wl.targetTitle.toLowerCase()
          );
          if (targetTopic) {
            addKnowledgeLink({
              sourceId: currentTopic.id,
              targetId: targetTopic.id,
              linkType: wl.linkType,
              strength: wl.strength,
              notes: wl.notes || `Nhập từ Obsidian [[${wl.targetTitle}]]`,
            });
          }
        }
      }

      setImportSuccess(true);
      setRoundtripMarkdown('');
    } catch (err) {
      console.error('Failed to import round-trip note', err);
    }
  };

  const openInObsidianLink = currentTopic
    ? getObsidianOpenUri(vaultName, `Research/${sanitizeFileName(currentTopic.title)}`)
    : '';

  const createInObsidianLink = currentTopic
    ? getObsidianNewNoteUri(
        vaultName,
        sanitizeFileName(currentTopic.title),
        formatTopicForObsidian(currentTopic, notes)
      )
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-purple-50 flex items-center justify-center font-bold shadow-xs">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                Obsidian Real-Time Vault Bridge
                <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-900 font-mono font-bold rounded-full">
                  obsidian:// protocol
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-900 font-mono font-bold rounded-full">
                  Phase 11 Dataview &amp; E-Ink
                </span>
              </h2>
              <p className="text-xs text-stone-600">
                Đồng bộ hai chiều, tạo ghi chú chuẩn [[Wiki Links]] &amp; YAML Frontmatter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng modal"
            className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-stone-700">
          {/* Vault Name Setting & Telemetry Summary */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
                Tên Obsidian Vault của bạn:
              </label>
              {/* Virtual Vault File Map Telemetry Summary */}
              <div
                data-testid="scholarly-vault-file-summary"
                className="flex items-center gap-2 text-[11px] font-medium text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200"
              >
                <span>Chủ đề: <strong>{topicFileCount}</strong></span>
                <span>•</span>
                <span>Literature: <strong>{litFileCount}</strong></span>
                <span>•</span>
                <span>E-Ink Packs: <strong>{einkFileCount}</strong></span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={vaultName}
                onChange={(e) => handleSaveVaultName(e.target.value)}
                placeholder="Ví dụ: Research-Vault hoặc Notes-Vault"
                className="flex-1 px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
              <span className="self-center text-[11px] text-stone-500 italic">
                (Tự động lưu)
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Nhập tên Vault (ví dụ: <span className="font-mono text-stone-700">Research-Vault</span>) hoặc dán đường dẫn thư mục Vault trên máy tính.
            </p>
          </div>

          {/* Current Topic Section */}
          {currentTopic && (
            <div className="bg-purple-50/70 border border-purple-200/80 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-950 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-700" />
                  Chủ đề hiện tại: {currentTopic.title}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-semibold">
                  {currentTopic.type}
                </span>
              </div>

              {/* Standard Obsidian Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <a
                  href={openInObsidianLink}
                  className="px-3.5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Tạo / Mở Ngay trong Obsidian App</span>
                </a>

                <button
                  onClick={handleCopyFormattedMarkdown}
                  className="px-3.5 py-2.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition"
                >
                  {copiedNote ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNote ? 'Đã sao chép Markdown!' : 'Sao chép Note (+ Frontmatter)'}</span>
                </button>
              </div>

              {/* Secondary Create Note URI */}
              <div className="text-center pt-1">
                <a
                  href={createInObsidianLink}
                  className="text-[11px] text-purple-800 hover:text-purple-950 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3 text-purple-700" />
                  <span>Hoặc tạo note mới kèm toàn bộ nội dung Markdown (obsidian://new)</span>
                </a>
              </div>

              {/* Enhanced Scholarly Dataview Export */}
              <div className="pt-2 border-t border-purple-200/60 mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                    Scholarly Dataview &amp; Highlight Callouts (Phase 11)
                  </span>
                  {copiedScholarlyNote && (
                    <span
                      data-testid="scholarly-copy-feedback"
                      className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Đã sao chép Scholarly Dataview Note!
                    </span>
                  )}
                </div>
                <button
                  data-testid="btn-copy-scholarly-dataview-note"
                  onClick={handleCopyScholarlyMarkdown}
                  className="w-full py-2 bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-900 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép Scholarly Dataview Note (+ Dataview YAML &amp; Highlights)</span>
                </button>
              </div>
            </div>
          )}

          {/* E-Ink Study Pack Studio */}
          <div className="bg-stone-100/90 p-4 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tablet className="w-4 h-4 text-stone-800" />
                <span className="font-bold text-xs text-stone-900">
                  Gói Đọc Nghiên Cứu E-Ink (Boox, Calibre, Supernote)
                </span>
              </div>
              <span className="text-[10px] bg-stone-200 text-stone-800 font-mono px-2 py-0.5 rounded font-semibold">
                E-Ink High-Contrast
              </span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Biên dịch toàn bộ chủ đề, ghi chú, ma trận tổng quan tài liệu và bộ câu hỏi trắc nghiệm tự kiểm tra (Active Recall Masked Appendix) thành một tài liệu Markdown đơn nhất tối ưu cho màn hình E-Ink.
            </p>
            <button
              data-testid="btn-download-eink-study-pack"
              onClick={handleDownloadEInkStudyPack}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-stone-50 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Gói Đọc E-Ink (Boox / Calibre .md)</span>
            </button>

            {/* E-Ink Preview Box */}
            {showEInkPreview && (
              <div
                data-testid="eink-pack-preview-box"
                className="mt-3 p-3 bg-white border border-stone-300 rounded-xl space-y-2 text-stone-800 font-mono text-[11px] max-h-44 overflow-y-auto"
              >
                <div className="flex items-center justify-between font-bold text-stone-900 pb-1 border-b border-stone-200">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-stone-700" />
                    Xem trước Gói Đọc E-Ink Study Pack
                  </span>
                  <button
                    onClick={() => setShowEInkPreview(false)}
                    className="text-stone-400 hover:text-stone-700 text-xs font-sans"
                  >
                    Đóng
                  </button>
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed text-[11px] text-stone-700">
                  {einkContent.slice(0, 800)}...
                </pre>
              </div>
            )}
          </div>

          {/* Round-Trip Obsidian Markdown Ingestion Section */}
          <div
            data-testid="roundtrip-import-section"
            className="bg-white p-4 rounded-2xl border border-stone-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-700" />
                <span className="font-bold text-xs text-stone-900">
                  Nhập Round-Trip Ghi Chú Obsidian Markdown
                </span>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono px-2 py-0.5 rounded font-semibold">
                Round-Trip Parser
              </span>
            </div>
            <p className="text-[11px] text-stone-600">
              Dán ghi chú từ Obsidian chứa YAML Frontmatter (<code className="font-mono text-purple-900">title, tags, citekey</code>), liên kết hai chiều <code className="font-mono text-indigo-900">[[Wiki Links]]</code> và Callouts <code className="font-mono text-stone-800">&gt; [!quote]</code> để đồng bộ ngược vào Knowledge OS.
            </p>

            <textarea
              data-testid="roundtrip-markdown-input"
              rows={4}
              value={roundtripMarkdown}
              onChange={(e) => {
                setRoundtripMarkdown(e.target.value);
                setImportSuccess(false);
              }}
              placeholder="Dán nội dung Markdown từ Obsidian tại đây..."
              className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
            />

            {/* Live Parsing Preview */}
            {parsedRoundtrip && (
              <div
                data-testid="roundtrip-parsed-preview"
                className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-indigo-950"
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Tiêu đề: {parsedRoundtrip.title || '(Chưa xác định)'}</span>
                  {parsedRoundtrip.citekey && (
                    <span className="font-mono text-[10px] bg-indigo-200 px-1.5 py-0.5 rounded">
                      {parsedRoundtrip.citekey}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="flex items-center gap-1 text-stone-700">
                    <Hash className="w-3 h-3 text-indigo-700" />
                    <span>Tags: <strong>{parsedRoundtrip.tags.length}</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-stone-700">
                    <LinkIcon className="w-3 h-3 text-indigo-700" />
                    <span>Wiki Links: <strong>{parsedRoundtrip.wikiLinks.length}</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-stone-700">
                    <Quote className="w-3 h-3 text-indigo-700" />
                    <span>Excerpts: <strong>{parsedRoundtrip.excerpts.length}</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Import Success Notification */}
            {importSuccess && (
              <div
                data-testid="roundtrip-import-success"
                className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã nhập thành công ghi chú vào Knowledge OS!</span>
              </div>
            )}

            <button
              data-testid="btn-confirm-roundtrip-import"
              onClick={handleConfirmRoundtripImport}
              disabled={!parsedRoundtrip || !parsedRoundtrip.title}
              className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Nhập vào Hệ thống</span>
            </button>
          </div>

          {/* Full Vault Export Package (.zip) */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <Download className="w-4 h-4 text-amber-700" />
              <span>Đóng gói Trọn Bộ Obsidian Vault (.zip)</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Tạo và tải về file nén chứa 100% cây thư mục hoàn chỉnh gồm {topics.length} chủ đề, {notes.length} ghi chú, file tổng quan <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-mono">00_Map_Of_Content.md</code> và toàn bộ liên kết hai chiều <code className="bg-stone-100 px-1 py-0.5 rounded text-purple-900 font-mono">[[Wiki Links]]</code> để bạn giải nén trực tiếp vào Obsidian.
            </p>

            {exportSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã đóng gói thành công! Bạn có thể giải nén vào thư mục Vault trên máy.</span>
              </div>
            )}

            <button
              onClick={handleDownloadVaultZip}
              disabled={isExporting}
              className="w-full py-3 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang tạo cây thư mục Vault...' : 'Tải Xuống Trọn Bộ Obsidian Vault (.zip)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
