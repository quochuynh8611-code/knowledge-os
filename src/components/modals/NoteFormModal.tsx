import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Note, NoteType } from '../../types';
import { X, FileText, Lightbulb, HelpCircle, Bookmark, Tag as TagIcon, Folder, AlertTriangle } from 'lucide-react';
import { normalizeFilePath, classifyPathRelativeToRoot } from '../../lib/fileLibraryAudit';
import { safeGetLocalStorageItem } from '../../lib/storage';

interface NoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNote?: Note | null;
  defaultTopicId?: string;
}

export function NoteFormModal({ isOpen, onClose, initialNote, defaultTopicId }: NoteFormModalProps) {
  const { categories, topics, addNote, updateNote } = useData();

  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [type, setType] = useState<NoteType>('study');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);

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
      setContent('');
      setSourcePath('');
      setType('study');
      setTags([]);
      setIsPrivate(false);
    }
  }, [initialNote, defaultTopicId, topics, isOpen]);

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
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {initialNote ? 'Chỉnh Sửa Ghi Chú' : 'Thêm Ghi Chú Chuyên Sâu'}
              </h2>
              <p className="text-xs text-stone-600">Hỗ trợ liên kết Wiki [[Tên chủ đề]]</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Chủ đề liên kết *
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:ring-2 focus:ring-emerald-600"
            >
              {topics.map((t) => {
                const domainLabel =
                  categories.find((c) => c.slug === t.type || c.id === t.categoryId)?.name ||
                  t.categoryName ||
                  t.type;
                return (
                  <option key={t.id} value={t.id}>
                    [{domainLabel}] {t.title}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Note Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Phân loại ghi chú
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setType('study')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  type === 'study'
                    ? 'bg-blue-100 border-blue-400 text-blue-900 font-semibold'
                    : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Học tập
              </button>
              <button
                type="button"
                onClick={() => setType('insight')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  type === 'insight'
                    ? 'bg-amber-100 border-amber-400 text-amber-900 font-semibold'
                    : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" /> Chiêm nghiệm
              </button>
              <button
                type="button"
                onClick={() => setType('question')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  type === 'question'
                    ? 'bg-rose-100 border-rose-400 text-rose-900 font-semibold'
                    : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-rose-600" /> Thắc mắc
              </button>
              <button
                type="button"
                onClick={() => setType('summary')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  type === 'summary'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold'
                    : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-emerald-600" /> Tóm lược
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Tiêu đề ghi chú *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Nhận định về sự sinh diệt của Danh Sắc trong tâm..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                Nội dung ghi chú *
              </label>
              <div className="flex items-center gap-1 text-[11px] text-stone-500">
                <span>Chèn liên kết nhanh:</span>
                {topics.slice(0, 2).map((top) => (
                  <button
                    key={top.id}
                    type="button"
                    onClick={() => handleInsertWikiLink(top.title)}
                    className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 rounded text-stone-800 font-mono text-[10px]"
                  >
                    +[[{top.title.slice(0, 10)}...]]
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={6}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung suy ngẫm, dẫn chứng hoặc liên kết đến [[Tên chủ đề khác]]..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm font-sans focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Optional Source Path (Markdown / Obsidian File Reference) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-stone-600" /> Đường dẫn tệp Markdown nguồn (sourcePath)
              </span>
              <span className="text-[10px] text-stone-500 font-normal">Tùy chọn</span>
            </label>
            <input
              type="text"
              value={sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
              placeholder="Đường dẫn tệp Markdown nguồn (/Users/.../Notes/study.md hoặc D:\...)..."
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs font-mono focus:ring-2 focus:ring-emerald-600"
            />

            {isPathOutsideRoot && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Cảnh báo sao lưu: </span>
                  <span>
                    Tệp ghi chú này nằm ngoài thư mục thư viện gốc (<code className="font-mono">{canonicalLibraryRoot}</code>). Khi sao lưu thư viện, tệp này có thể bị bỏ sót nếu không được gom vào thư mục chuẩn.
                  </span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-stone-500">
              * Dùng để liên kết ghi chú này với tệp .md trong thư mục Knowledge-Library/Notes/ hoặc Obsidian Vault cục bộ.
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
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
                className="flex-1 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-xl"
              >
                + Thêm
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-200 text-stone-800 text-xs rounded-lg font-medium"
                >
                  <TagIcon className="w-3 h-3 text-stone-500" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-stone-500 hover:text-stone-900 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:bg-stone-200 text-sm font-medium rounded-xl transition"
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
    </div>
  );
}
