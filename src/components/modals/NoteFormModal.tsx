import React, { useState, useEffect, useId } from 'react';
import { useData } from '../../context/DataContext';
import { Note, NoteType, NoteCitationProvenance } from '../../types';
import {
  X,
  FileText,
  Lightbulb,
  HelpCircle,
  Bookmark,
  Tag as TagIcon,
  Folder,
  AlertTriangle,
  BookOpen,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { normalizeFilePath, classifyPathRelativeToRoot } from '../../lib/fileLibraryAudit';
import { safeGetLocalStorageItem } from '../../lib/storage';

interface NoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNote?: Note | null;
  defaultTopicId?: string;
  initialProvenance?: NoteCitationProvenance;
  initialContent?: string;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}

export function NoteFormModal({
  isOpen,
  onClose,
  initialNote,
  defaultTopicId,
  initialProvenance,
  initialContent,
  restoreFocusRef,
}: NoteFormModalProps) {
  const { categories, topics, addNote, updateNote } = useData();

  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [type, setType] = useState<NoteType>('study');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);

  // Layout expansion state: Focus mode & Collapsible extra info
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);

  // Unique IDs so multiple instances never collide (accordion ARIA wiring)
  const instanceId = useId();
  const extraInfoPanelId = `note-extra-panel-${instanceId}`;
  const extraInfoButtonId = `note-extra-btn-${instanceId}`;

  const canonicalLibraryRoot = safeGetLocalStorageItem('knowledge_os_library_root_path') || '';

  useEffect(() => {
    if (initialNote) {
      setTopicId(initialNote.topicId);
      setTitle(initialNote.title);
      setContent(initialNote.content);
      setSourcePath(initialNote.sourcePath || '');
      setType(initialNote.type);
      setTags(initialNote.tags || []);
      setIsPrivate(initialNote.isPrivate || false);
    } else {
      setTopicId(defaultTopicId || topics[0]?.id || '');
      setTitle('');
      setContent(initialContent || (initialProvenance?.excerptText ? `> ${initialProvenance.excerptText}\n\n` : ''));
      setSourcePath('');
      setType('study');
      setTags([]);
      setIsPrivate(false);
    }
  }, [initialNote, defaultTopicId, topics, isOpen, initialContent, initialProvenance]);

  // Reset view modes when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setIsFocusMode(false);
      setIsExtraInfoOpen(false);
    }
  }, [isOpen]);

  const handleCloseModal = () => {
    onClose();
    if (restoreFocusRef?.current) {
      setTimeout(() => {
        restoreFocusRef.current?.focus();
      }, 50);
    }
  };

  const isPathOutsideRoot = Boolean(
    sourcePath.trim() &&
    canonicalLibraryRoot.trim() &&
    classifyPathRelativeToRoot(normalizeFilePath(sourcePath), canonicalLibraryRoot) === 'outside'
  );

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleInsertWikiLink = (topicTitle: string) => {
    setContent((prev) => `${prev} [[${topicTitle}]] `);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const currentTopic = topics.find((t) => t.id === topicId);
    const finalSourcePath = sourcePath.trim() ? normalizeFilePath(sourcePath) : undefined;

    if (initialNote) {
      updateNote(initialNote.id, {
        topicId,
        topicTitle: currentTopic?.title || initialNote.topicTitle,
        title: title.trim(),
        content: content.trim(),
        sourcePath: finalSourcePath,
        type,
        tags,
        isPrivate,
      });
    } else {
      addNote({
        topicId,
        topicTitle: currentTopic?.title || 'Chủ đề',
        title: title.trim(),
        content: content.trim(),
        sourcePath: finalSourcePath,
        type,
        tags,
        isPrivate,
        citationProvenances: initialProvenance ? [initialProvenance] : undefined,
      });
    }
    handleCloseModal();
  };

  if (!isOpen) return null;

  const currentTopic = topics.find((t) => t.id === topicId);
  const currentCategory = currentTopic
    ? categories.find((c) => c.slug === currentTopic.type || c.id === currentTopic.categoryId)
    : undefined;
  const domainLabel = currentCategory?.name || currentTopic?.categoryName || currentTopic?.type || '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initialNote ? 'Chỉnh sửa ghi chú' : 'Thêm ghi chú chuyên sâu'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <form
        onSubmit={handleSubmit}
        className={`bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-5xl flex flex-col shadow-2xl overflow-hidden ${
          isFocusMode ? 'h-[92vh]' : 'max-h-[92vh]'
        }`}
      >
        {/* Header - Fixed Outside Scroll Body */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif-title truncate">
                  {initialNote ? 'Chỉnh Sửa Ghi Chú' : 'Thêm Ghi Chú Chuyên Sâu'}
                </h2>
                {isFocusMode && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Chế độ tập trung
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">Hỗ trợ liên kết Wiki [[Tên chủ đề]]</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Đóng"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provenance Badge Preview - Fixed Outside Scroll Body */}
        {initialProvenance && (
          <div className="px-6 py-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2.5 text-xs shrink-0">
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                {initialProvenance.documentTitle}
              </span>
              <span className="px-1.5 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold tracking-wider bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                {initialProvenance.format.toUpperCase()}
              </span>
              {initialProvenance.locator && (
                <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                  • {initialProvenance.locator}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Body Container */}
        <div data-testid="note-form-body" className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {/* Topic and Note Type Section */}
          {!isFocusMode ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Topic Selector (7 cols on desktop) */}
              <div className="md:col-span-6 lg:col-span-7">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Chủ đề liên kết *
                </label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {topics.map((t) => {
                    const dLabel =
                      categories.find((c) => c.slug === t.type || c.id === t.categoryId)?.name ||
                      t.categoryName ||
                      t.type;
                    return (
                      <option key={t.id} value={t.id}>
                        [{dLabel}] {t.title}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Note Type Selector (5 cols on desktop) */}
              <div className="md:col-span-6 lg:col-span-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                  Phân loại ghi chú
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setType('study')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition ${
                      type === 'study'
                        ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-semibold'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" /> Học tập
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('insight')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition ${
                      type === 'insight'
                        ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-semibold'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" /> Chiêm nghiệm
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('question')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition ${
                      type === 'question'
                        ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" /> Thắc mắc
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('summary')}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition ${
                      type === 'summary'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> Tóm lược
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Focus Mode Topic Summary Line */
            <div className="flex items-center justify-between px-3.5 py-2 bg-stone-100/80 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-700 dark:text-stone-300">
              <span className="truncate">
                <span className="font-semibold text-stone-500 dark:text-stone-400">Chủ đề liên kết: </span>
                {currentTopic ? (
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    [{domainLabel}] {currentTopic.title}
                  </span>
                ) : (
                  <span className="italic text-stone-400">Chưa chọn chủ đề</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsFocusMode(false)}
                className="text-emerald-700 dark:text-emerald-400 hover:underline text-[11px] font-medium shrink-0 ml-2"
              >
                Chỉnh sửa thông tin
              </button>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Tiêu đề ghi chú *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Nhận định, tóm tắt hoặc ý tưởng nghiên cứu..."
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Note Content Area — in focus mode it grows (flex-1) to fill the remaining body height */}
          <div className={isFocusMode ? 'flex flex-col flex-1 min-h-0' : 'flex flex-col'}>
            <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2 shrink-0">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                Nội dung ghi chú *
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                  <span className="hidden sm:inline">Chèn liên kết:</span>
                  {topics.slice(0, 2).map((top) => (
                    <button
                      key={top.id}
                      type="button"
                      onClick={() => handleInsertWikiLink(top.title)}
                      className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-700 dark:text-stone-300 font-mono text-[10px] border border-stone-200 dark:border-stone-700"
                    >
                      +[[{top.title.slice(0, 10)}...]]
                    </button>
                  ))}
                </div>
                {/* Focus Writing Mode Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  aria-pressed={isFocusMode}
                  aria-label={isFocusMode ? 'Thu gọn vùng viết' : 'Mở rộng vùng viết'}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 transition"
                  title={isFocusMode ? 'Thu gọn vùng viết' : 'Mở rộng vùng viết'}
                >
                  {isFocusMode ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                      <span>Thu gọn vùng viết</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                      <span>Mở rộng vùng viết</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Note Textarea - Single instance preserved across modes */}
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung suy ngẫm, dẫn chứng hoặc liên kết đến [[Tên chủ đề khác]]..."
              className={`w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                isFocusMode
                  ? 'flex-1 min-h-[160px] resize-none'
                  : 'min-h-[200px] sm:min-h-[260px] lg:min-h-[320px]'
              }`}
            />
          </div>

          {/* Collapsible Supplementary Info (SourcePath and Tags) */}
          <div hidden={isFocusMode} className="space-y-3">
            <div className="border border-stone-200 dark:border-stone-750 rounded-2xl overflow-hidden bg-stone-50/50 dark:bg-stone-800/30">
              <button
                type="button"
                id={extraInfoButtonId}
                aria-expanded={isExtraInfoOpen}
                aria-controls={extraInfoPanelId}
                onClick={() => setIsExtraInfoOpen(!isExtraInfoOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-100/60 dark:hover:bg-stone-800/60 transition"
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                  <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    Thông tin bổ sung (Thẻ &amp; Tệp nguồn)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                    <span className="px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-700/60 text-[11px] font-medium">
                      {tags.length > 0 ? `${tags.length} thẻ` : '0 thẻ'}
                    </span>
                    {sourcePath.trim() ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">
                        Có tệp nguồn
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-400 hidden sm:inline">Chưa gắn tệp</span>
                    )}
                  </div>
                  {isExtraInfoOpen ? (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  )}
                </div>
              </button>

              {/* Extra Info Body — kept mounted so values persist; `hidden` removes it from tab order & a11y tree */}
              <div
                id={extraInfoPanelId}
                role="region"
                aria-labelledby={extraInfoButtonId}
                hidden={!isExtraInfoOpen}
                className="p-4 border-t border-stone-200 dark:border-stone-750 space-y-4 bg-white dark:bg-stone-900/40"
              >
                {/* Optional Source Path (Markdown / Obsidian File Reference) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" /> Đường dẫn tệp Markdown nguồn (sourcePath)
                    </span>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 font-normal">Tùy chọn</span>
                  </label>
                  <input
                    type="text"
                    value={sourcePath}
                    onChange={(e) => setSourcePath(e.target.value)}
                    placeholder="Đường dẫn tệp Markdown nguồn (/Users/.../Notes/study.md hoặc D:\...)..."
                    className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  {isPathOutsideRoot && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Cảnh báo sao lưu: </span>
                        <span>
                          Tệp ghi chú này nằm ngoài thư mục thư viện gốc (<code className="font-mono">{canonicalLibraryRoot}</code>). Khi sao lưu thư viện, tệp này có thể bị bỏ sót nếu không được gom vào thư mục chuẩn.
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-400 dark:text-stone-500">
                    * Dùng để liên kết ghi chú này với tệp .md trong thư mục Knowledge-Library/Notes/ hoặc Obsidian Vault cục bộ.
                  </p>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
                    Thẻ ghi chú (Tags)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Nhập thẻ rồi nhấn Enter..."
                      className="flex-1 px-3.5 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 transition"
                    >
                      + Thêm
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs rounded-lg font-medium"
                      >
                        <TagIcon className="w-3 h-3 text-stone-400 dark:text-stone-500" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          aria-label={`Xóa thẻ ${tag}`}
                          className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed Outside Scroll Body */}
        <div className="flex justify-end gap-2.5 px-6 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 shrink-0">
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 text-sm font-medium rounded-xl transition"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-xl shadow-xs transition"
          >
            {initialNote ? 'Lưu Ghi Chú' : 'Tạo Ghi Chú'}
          </button>
        </div>
      </form>
    </div>
  );
}
