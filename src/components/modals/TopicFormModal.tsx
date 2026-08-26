import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Topic, CategoryType, TopicStatus } from '../../types';
import { X, BookOpen, Sparkles, Tag as TagIcon, FolderTree } from 'lucide-react';
import { getRootCategories, getChildCategories, resolveRootCategory } from '../../lib/taxonomyMigration';

interface TopicFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: Topic | null;
}

export function TopicFormModal({ isOpen, onClose, initialTopic }: TopicFormModalProps) {
  const { categories, addTopic, updateTopic, tags: existingTags } = useData();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<CategoryType>('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<TopicStatus>('not_started');
  const [progress, setProgress] = useState(0);

  const rootCategories = useMemo(() => getRootCategories(categories), [categories]);

  useEffect(() => {
    if (initialTopic) {
      setTitle(initialTopic.title);
      setSlug(initialTopic.slug);
      setCategoryId(initialTopic.categoryId);
      setType(initialTopic.type);
      setDescription(initialTopic.description);
      setContent(initialTopic.content);
      setSelectedTags(initialTopic.tags || []);
      setStatus(initialTopic.studyProgress.status);
      setProgress(initialTopic.studyProgress.progress);
    } else {
      setTitle('');
      setSlug('');
      const defaultCat = categories[0]?.id || '';
      setCategoryId(defaultCat);
      const defaultCatObj = categories.find((c) => c.id === defaultCat);
      setType(defaultCatObj?.type || rootCategories[0]?.slug || rootCategories[0]?.type || 'general');
      setDescription('');
      setContent('## 1. Giới thiệu tổng quan\n\n## 2. Các nguyên lý cốt lõi\n\n## 3. Ứng dụng thực hành\n');
      setSelectedTags([]);
      setStatus('not_started');
      setProgress(0);
    }
  }, [initialTopic, categories, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialTopic) {
      const generatedSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      const root = resolveRootCategory(categories, cat.id);
      setType(cat.type || root?.slug || root?.type || 'general');
    }
  };

  const handleAddTag = (tagToAdd?: string) => {
    const t = tagToAdd || tagInput.trim();
    if (t && !selectedTags.includes(t)) {
      setSelectedTags([...selectedTags, t]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const rootCat = selectedCategory ? resolveRootCategory(categories, selectedCategory.id) : null;
    const resolvedType = selectedCategory?.type || rootCat?.slug || rootCat?.type || type || 'general';

    if (initialTopic) {
      updateTopic(initialTopic.id, {
        title,
        slug: slug || initialTopic.slug,
        categoryId,
        categoryName: selectedCategory?.name || initialTopic.categoryName,
        categorySlug: selectedCategory?.slug || initialTopic.categorySlug,
        type: resolvedType,
        description,
        content,
        tags: selectedTags,
        studyProgress: {
          ...initialTopic.studyProgress,
          status,
          progress,
        },
      });
    } else {
      addTopic({
        title,
        slug: slug || `topic-${Date.now()}`,
        categoryId,
        categoryName: selectedCategory?.name || 'Tổng quan',
        categorySlug: selectedCategory?.slug || 'tong-quan',
        type: resolvedType,
        description,
        content,
        tags: selectedTags,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentCategory = categories.find((c) => c.id === categoryId);
  const currentRoot = currentCategory ? resolveRootCategory(categories, currentCategory.id) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {initialTopic ? 'Chỉnh Sửa Chủ Đề Nghiên Cứu' : 'Tạo Chủ Đề Nghiên Cứu Mới'}
              </h2>
              <p className="text-xs text-stone-600">Phân loại theo lĩnh vực và danh mục khảo cứu động</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label htmlFor="topic-title-input" className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Tiêu đề chủ đề *
            </label>
            <input
              id="topic-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="VD: Bộ Pháp Tụ (Dhammasangani) hoặc Kỳ Môn Độn Giáp..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-700 focus:border-amber-700 transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category-select" className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Danh mục phân cấp *
              </label>
              <select
                id="category-select"
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-700"
              >
                {rootCategories.map((root) => {
                  const children = getChildCategories(categories, root.id);
                  return (
                    <optgroup key={root.id} label={`📂 ${root.name}`}>
                      <option value={root.id}>[Gốc] {root.name}</option>
                      {children.map((child) => (
                        <option key={child.id} value={child.id}>
                          &nbsp;&nbsp;↳ {child.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Lĩnh vực khảo cứu
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-xs font-medium text-stone-800">
                <FolderTree className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="truncate">
                  {currentRoot ? currentRoot.name : 'Chưa phân loại'}
                </span>
                {currentCategory && currentCategory.id !== currentRoot?.id && (
                  <span className="text-[11px] text-stone-500 truncate">
                    / {currentCategory.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Mô tả ngắn gọn
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tóm tắt trọng tâm nội dung và ý nghĩa nghiên cứu của chủ đề..."
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Nội dung chính (Hỗ trợ Markdown &amp; Wiki links [[Chủ đề]])
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="## 1. Giới thiệu..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-700"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Thẻ phân loại (Tags)
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
                className="flex-1 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-700"
              />
              <button
                type="button"
                onClick={() => handleAddTag()}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-xl transition"
              >
                + Thêm
              </button>
            </div>

            {/* Selected Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg font-medium"
                >
                  <TagIcon className="w-3 h-3 text-amber-600" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-amber-700 hover:text-amber-950 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Suggested Tags */}
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[11px] text-stone-600 mr-1">Gợi ý:</span>
              {existingTags.slice(0, 6).map((tg) => (
                <button
                  key={tg.id}
                  type="button"
                  onClick={() => handleAddTag(tg.name)}
                  className="text-[11px] px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md text-stone-700"
                >
                  +{tg.name}
                </button>
              ))}
            </div>
          </div>

          {/* Progress & Status (When editing) */}
          {initialTopic && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-stone-100 rounded-xl border border-stone-200">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Trạng thái học tập
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TopicStatus)}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                >
                  <option value="not_started">Chưa bắt đầu (Not started)</option>
                  <option value="in_progress">Đang nghiên cứu (In progress)</option>
                  <option value="reviewing">Đang ôn tập (Reviewing)</option>
                  <option value="completed">Đã hoàn thành (Completed)</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700">
                    Tiến độ hoàn thành
                  </label>
                  <span className="text-xs font-bold text-amber-800">{progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
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
              className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-xl shadow-xs transition"
            >
              {initialTopic ? 'Lưu Thay Đổi' : 'Tạo Chủ Đề Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
