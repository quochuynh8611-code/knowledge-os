import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  FileSignature,
  FileText,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Search,
  Layers,
  FileCode,
  BookOpen,
  Hash,
} from 'lucide-react';
import type { Resource, Note } from '../../types';
import {
  ManuscriptCitationStyle,
  buildCitekeyRegistry,
  searchCitekeySuggestions,
  compileAcademicManuscript,
} from '../../lib/manuscriptCompiler';
import {
  buildLiteratureMatrix,
  analyzeLiteratureSynthesis,
  exportLiteratureMatrixToMarkdown,
} from '../../lib/literatureMatrixEngine';
import { AcademicMarkdown } from '../ui/AcademicMarkdown';

export interface ManuscriptStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: Resource[];
  notes?: Note[];
  topics?: Array<{ id: string; title: string }>;
  defaultTopicId?: string;
}

type OutputTab = 'preview' | 'markdown' | 'latex' | 'bibtex';

export function ManuscriptStudioModal({
  isOpen,
  onClose,
  resources,
  notes = [],
  topics = [],
  defaultTopicId,
}: ManuscriptStudioModalProps) {
  const [title, setTitle] = useState<string>('Bản Thảo Nghiên Cứu Khoa Học');
  const [author, setAuthor] = useState<string>('');
  const [abstract, setAbstract] = useState<string>('');
  const [bodyMarkdown, setBodyMarkdown] = useState<string>('');
  const [style, setStyle] = useState<ManuscriptCitationStyle>('apa');
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [includeMatrixAppendix, setIncludeMatrixAppendix] = useState<boolean>(false);
  const [citekeySearch, setCitekeySearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<OutputTab>('preview');
  const [copied, setCopied] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Citekey registry
  const registry = useMemo(() => buildCitekeyRegistry(resources), [resources]);

  // Filtered citekey suggestions
  const suggestions = useMemo(
    () => searchCitekeySuggestions(registry, citekeySearch),
    [registry, citekeySearch]
  );

  // Optional Literature Matrix Appendix
  const matrixAppendix = useMemo(() => {
    if (!includeMatrixAppendix) return undefined;
    const rows = buildLiteratureMatrix(resources, {});
    const summary = analyzeLiteratureSynthesis(rows);
    return exportLiteratureMatrixToMarkdown(rows, summary);
  }, [includeMatrixAppendix, resources]);

  // Selected note sections
  const sections = useMemo(() => {
    return notes
      .filter((n) => selectedNoteIds.has(n.id))
      .map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
      }));
  }, [notes, selectedNoteIds]);

  // Compiled manuscript result
  const compiled = useMemo(() => {
    return compileAcademicManuscript({
      title,
      author,
      abstract,
      bodyMarkdown,
      sections,
      resources,
      style,
      appendixMarkdown: matrixAppendix,
    });
  }, [title, author, abstract, bodyMarkdown, sections, resources, style, matrixAppendix]);

  if (!isOpen) return null;

  const handleToggleNote = (noteId: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const handleInsertCitekey = (citekey: string) => {
    const token = `[@${citekey}]`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const prevVal = bodyMarkdown;
      const newVal = prevVal.slice(0, start) + token + prevVal.slice(end);
      setBodyMarkdown(newVal);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else {
      setBodyMarkdown((prev) => (prev ? `${prev} ${token}` : token));
    }
  };

  const handleCopy = async () => {
    let textToCopy = '';
    switch (activeTab) {
      case 'markdown':
      case 'preview':
        textToCopy = compiled.compiledMarkdown;
        break;
      case 'latex':
        textToCopy = compiled.latexSource;
        break;
      case 'bibtex':
        textToCopy = compiled.bibtexSource;
        break;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = (type: 'md' | 'tex' | 'bib') => {
    let content = '';
    let ext = '';
    let mime = '';

    switch (type) {
      case 'md':
        content = compiled.compiledMarkdown;
        ext = 'md';
        mime = 'text/markdown;charset=utf-8;';
        break;
      case 'tex':
        content = compiled.latexSource;
        ext = 'tex';
        mime = 'application/x-tex;charset=utf-8;';
        break;
      case 'bib':
        content = compiled.bibtexSource;
        ext = 'bib';
        mime = 'application/x-bibtex;charset=utf-8;';
        break;
    }

    const blob = new Blob(['\uFEFF' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manuscript-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-900/60 backdrop-blur-xs"
      data-testid="manuscript-studio-modal"
    >
      <div className="flex flex-col w-full max-w-7xl h-[94vh] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400 rounded-xl">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Academic Manuscript Studio & Trình Biên Dịch Citekey
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Soạn thảo bản thảo chuẩn Pandoc/LaTeX ([@key]), phân giải đa phong cách (APA, IEEE, MLA) & xuất đa định dạng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              data-testid="btn-copy-manuscript"
              className="px-3 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Sao chép nội dung đang xem"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
              <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>

            <button
              onClick={() => handleDownload('md')}
              data-testid="btn-download-manuscript-md"
              className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1 transition cursor-pointer"
              title="Tải tệp Markdown (.md)"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>.md</span>
            </button>

            <button
              onClick={() => handleDownload('tex')}
              data-testid="btn-download-manuscript-tex"
              className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1 transition cursor-pointer"
              title="Tải mã nguồn LaTeX (.tex)"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
              <span>.tex</span>
            </button>

            <button
              onClick={() => handleDownload('bib')}
              data-testid="btn-download-manuscript-bib"
              className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1 transition cursor-pointer"
              title="Tải tệp trích dẫn BibTeX (.bib)"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>.bib</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Telemetry Bar & Format Selector */}
        <div className="px-6 py-2.5 bg-stone-50/80 dark:bg-stone-800/40 border-b border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-300">
              <span>Chuẩn trích dẫn:</span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as ManuscriptCitationStyle)}
                data-testid="manuscript-style-select"
                className="px-2.5 py-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-700/40 cursor-pointer"
              >
                <option value="apa">APA 7th (Tác giả, Năm)</option>
                <option value="ieee">IEEE (Đánh số [1], [2])</option>
                <option value="mla">MLA 9th</option>
                <option value="chicago">Chicago (Author-Date)</option>
                <option value="harvard">Harvard</option>
              </select>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-stone-500 dark:text-stone-400">
              <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                {compiled.wordCount} từ
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                {compiled.citationCount} trích dẫn
              </span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {compiled.citedResources.length} nguồn tham khảo
              </span>
            </div>
          </div>

          {/* Output View Tabs */}
          <div className="flex items-center gap-1 bg-stone-200/80 dark:bg-stone-800 p-0.5 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('preview')}
              data-testid="manuscript-tab-preview"
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Xem trước
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              data-testid="manuscript-tab-markdown"
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === 'markdown'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Markdown
            </button>
            <button
              onClick={() => setActiveTab('latex')}
              data-testid="manuscript-tab-latex"
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === 'latex'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              LaTeX (.tex)
            </button>
            <button
              onClick={() => setActiveTab('bibtex')}
              data-testid="manuscript-tab-bibtex"
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === 'bibtex'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              BibTeX (.bib)
            </button>
          </div>
        </div>

        {/* Unresolved Citekey Lint Warning */}
        {compiled.unresolvedCitekeys.length > 0 && (
          <div
            data-testid="manuscript-unresolved-warning"
            className="mx-6 mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Cảnh báo trích dẫn:</strong> Phát hiện {compiled.unresolvedCitekeys.length} citekey chưa có trong thư viện tài nguyên:
                <span className="font-mono ml-1 font-bold">
                  {compiled.unresolvedCitekeys.map((k) => `@${k}`).join(', ')}
                </span>
                . Vui lòng thêm tài liệu vào thư viện hoặc sửa lại mã citekey.
              </span>
            </div>
          </div>
        )}

        {/* Main 2-Column Studio Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stone-200 dark:divide-stone-800 overflow-hidden">
          {/* Left Column: Authoring & Controls */}
          <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Meta Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Tiêu đề bản thảo:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="manuscript-title-input"
                  className="w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-700/40"
                  placeholder="Nhập tiêu đề bài báo / luận văn..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Tác giả:
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  data-testid="manuscript-author-input"
                  className="w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-700/40"
                  placeholder="Tên tác giả, cơ quan nghiên cứu..."
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                Tóm tắt (Abstract):
              </label>
              <textarea
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                data-testid="manuscript-abstract-input"
                rows={2}
                className="w-full p-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-700/40 leading-relaxed"
                placeholder="Nhập tóm tắt nghiên cứu (Abstract)..."
              />
            </div>

            {/* Citekey Quick-Insert Bar */}
            <div className="space-y-2 p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-700/80 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  Chèn nhanh Citekey vào văn bản:
                </span>
                <span className="text-[11px] text-stone-400 font-mono">
                  {suggestions.length} tài liệu
                </span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={citekeySearch}
                  onChange={(e) => setCitekeySearch(e.target.value)}
                  data-testid="citekey-search-input"
                  placeholder="Tìm theo citekey, tên tác giả, tiêu đề bài báo..."
                  className="w-full pl-8 pr-2.5 py-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {suggestions.map((entry) => (
                  <button
                    key={entry.citekey}
                    onClick={() => handleInsertCitekey(entry.citekey)}
                    data-testid={`insert-citekey-btn-${entry.citekey}`}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-stone-200 dark:border-stone-700 hover:border-indigo-300 dark:hover:border-indigo-800 text-[11px] text-stone-800 dark:text-stone-200 font-mono transition cursor-pointer flex items-center gap-1"
                    title={`${entry.resource.title} (${entry.authorLastName})`}
                  >
                    <span className="text-indigo-700 dark:text-indigo-400 font-bold">
                      @{entry.citekey}
                    </span>
                    <span className="text-stone-400 text-[10px] truncate max-w-[120px]">
                      {entry.authorLastName}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Note Sections Checklist & Matrix Appendix Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                <span>Ghép các ghi chú thành phần (Sections):</span>
                <label className="flex items-center gap-1.5 font-normal text-stone-600 dark:text-stone-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMatrixAppendix}
                    onChange={(e) => setIncludeMatrixAppendix(e.target.checked)}
                    data-testid="manuscript-include-matrix-checkbox"
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Đính kèm Ma trận Y văn (Phụ lục)</span>
                </label>
              </div>

              {notes.length === 0 ? (
                <p className="text-[11px] text-stone-400 italic">
                  Chưa có ghi chú nào trong chủ đề này để ghép section.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-2 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200/80 dark:border-stone-700/80">
                  {notes.map((n) => {
                    const isChecked = selectedNoteIds.has(n.id);
                    return (
                      <label
                        key={n.id}
                        className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs cursor-pointer transition ${
                          isChecked
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                            : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleNote(n.id)}
                          data-testid={`manuscript-section-checkbox-${n.id}`}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="truncate" title={n.title}>
                          {n.title}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Main Body Textarea */}
            <div className="flex-1 flex flex-col min-h-[160px]">
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                Nội dung soạn thảo bản thảo (hỗ trợ Pandoc citekey [@key, p. 4]):
              </label>
              <textarea
                ref={textareaRef}
                value={bodyMarkdown}
                onChange={(e) => setBodyMarkdown(e.target.value)}
                data-testid="manuscript-body-textarea"
                rows={8}
                className="w-full flex-1 p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-700/40 leading-relaxed"
                placeholder="Nhập nội dung bản thảo khoa học... Sử dụng [@citekey] hoặc [@citekey, p. 12] để trích dẫn."
              />
            </div>
          </div>

          {/* Right Column: Live Compilation & Export Preview */}
          <div className="flex flex-col h-full overflow-hidden bg-stone-50/40 dark:bg-stone-900/40">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {activeTab === 'preview' && (
                <div
                  data-testid="manuscript-compiled-preview"
                  className="prose prose-stone dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed"
                >
                  <AcademicMarkdown content={compiled.compiledMarkdown} />
                </div>
              )}

              {activeTab === 'markdown' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500 font-mono pb-2 border-b border-stone-200 dark:border-stone-800">
                    <span>Mã nguồn Markdown đã phân giải</span>
                    <span>{compiled.compiledMarkdown.length} ký tự</span>
                  </div>
                  <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {compiled.compiledMarkdown}
                  </pre>
                </div>
              )}

              {activeTab === 'latex' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500 font-mono pb-2 border-b border-stone-200 dark:border-stone-800">
                    <span>Mã nguồn LaTeX chuẩn Article (\documentclass)</span>
                    <span>{compiled.latexSource.length} ký tự</span>
                  </div>
                  <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {compiled.latexSource}
                  </pre>
                </div>
              )}

              {activeTab === 'bibtex' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-500 font-mono pb-2 border-b border-stone-200 dark:border-stone-800">
                    <span>Tệp trích dẫn BibTeX (.bib) đồng bộ citekey</span>
                    <span>{compiled.citedResources.length} mục</span>
                  </div>
                  <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {compiled.bibtexSource || '% Chưa có tài liệu nào được trích dẫn trong văn bản.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
