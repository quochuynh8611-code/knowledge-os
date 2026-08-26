import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Resource, ResourceType } from '../../types';
import { X, FileText, Book, Video, Headphones, Globe, Link, FolderOpen, AlertTriangle, AlertCircle } from 'lucide-react';
import { normalizeFilePath, classifyPathRelativeToRoot } from '../../lib/fileLibraryAudit';
import { safeGetLocalStorageItem } from '../../lib/storage';

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialResource?: Resource | null;
  defaultTopicId?: string;
}

export function ResourceFormModal({ isOpen, onClose, initialResource, defaultTopicId }: ResourceFormModalProps) {
  const { topics, addResource, updateResource } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('pdf');
  const [author, setAuthor] = useState('');
  const [sourceMode, setSourceMode] = useState<'web' | 'local'>('web');
  const [url, setUrl] = useState('');
  const [filePath, setFilePath] = useState('');
  const [openTarget, setOpenTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const canonicalLibraryRoot = safeGetLocalStorageItem('knowledge_os_library_root_path') || '';

  useEffect(() => {
    setFormError(null);
    if (initialResource) {
      setTopicId(initialResource.topicId);
      setTitle(initialResource.title);
      setType(initialResource.type);
      setAuthor(initialResource.author || '');
      if (initialResource.filePath && !initialResource.url) {
        setSourceMode('local');
      } else {
        setSourceMode('web');
      }
      setUrl(initialResource.url || '');
      setFilePath(initialResource.filePath || '');
      setOpenTarget(initialResource.openTarget || '');
      setNotes(initialResource.notes || '');
    } else {
      setTopicId(defaultTopicId || topics[0]?.id || '');
      setTitle('');
      setType('pdf');
      setAuthor('');
      setSourceMode('web');
      setUrl('https://');
      setFilePath('');
      setOpenTarget('');
      setNotes('');
    }
  }, [initialResource, defaultTopicId, topics, isOpen]);

  const isPathOutsideRoot = Boolean(
    sourceMode === 'local' &&
    filePath.trim() &&
    canonicalLibraryRoot.trim() &&
    classifyPathRelativeToRoot(normalizeFilePath(filePath), canonicalLibraryRoot) === 'outside'
  );

  const detectTypeAndTitle = (fileName: string): { detectedType?: ResourceType; suggestedTitle: string } => {
    const cleanName = fileName.replace(/\.[^/.]+$/, '');
    const suggestedTitle = cleanName.replace(/[-_.]+/g, ' ').trim();
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

    let detectedType: ResourceType | undefined;
    if (['.pdf'].includes(ext)) {
      detectedType = 'pdf';
    } else if (['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'].includes(ext)) {
      detectedType = 'audio';
    } else if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) {
      detectedType = 'video';
    } else if (['.epub', '.mobi', '.azw3', '.djvu', '.doc', '.docx'].includes(ext)) {
      detectedType = 'book';
    }

    return { detectedType, suggestedTitle };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilePath(file.name);
    setFormError(null);
    const { detectedType, suggestedTitle } = detectTypeAndTitle(file.name);

    if (detectedType) {
      setType(detectedType);
    }

    if (!title.trim() && suggestedTitle) {
      setTitle(suggestedTitle);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }

    let finalUrl: string | undefined;
    let finalPath: string | undefined;

    if (sourceMode === 'web') {
      if (!url.trim() || url.trim() === 'https://') {
        setFormError('Vui lòng nhập đường dẫn liên kết (URL) hợp lệ.');
        return;
      }
      finalUrl = url.trim();
    } else {
      if (!filePath.trim()) {
        setFormError('Vui lòng nhập đường dẫn tệp cục bộ hợp lệ.');
        return;
      }
      finalPath = normalizeFilePath(filePath);
    }

    const currentTopic = topics.find((t) => t.id === topicId);

    if (initialResource) {
      updateResource(initialResource.id, {
        topicId,
        topicTitle: currentTopic?.title || initialResource.topicTitle,
        title: title.trim(),
        type,
        author: author.trim() || undefined,
        url: finalUrl,
        filePath: finalPath,
        openTarget: openTarget.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addResource({
        topicId,
        topicTitle: currentTopic?.title || 'Chủ đề',
        title: title.trim(),
        type,
        author: author.trim() || undefined,
        url: finalUrl,
        filePath: finalPath,
        openTarget: openTarget.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
              <Link className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                {initialResource ? 'Chỉnh Sửa Tài Liệu' : 'Thêm Tài Liệu Nghiên Cứu'}
              </h2>
              <p className="text-xs text-stone-600">Sách, Bài báo, PDF, Video, Audio</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Chủ đề liên kết *
            </label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:ring-2 focus:ring-indigo-600"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.type === 'phat-hoc' ? 'Phật Học' : 'Huyền Học'}] {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Định dạng tài liệu
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { type: 'pdf', label: 'PDF', icon: FileText },
                { type: 'book', label: 'Sách', icon: Book },
                { type: 'article', label: 'Bài viết', icon: Globe },
                { type: 'video', label: 'Video', icon: Video },
                { type: 'audio', label: 'Audio', icon: Headphones },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setType(item.type as ResourceType)}
                    className={`py-2 px-1 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                      type === item.type
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-950 font-bold'
                        : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-600" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source Mode Switcher */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Nguồn tài liệu *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSourceMode('web');
                  if (!url) setUrl('https://');
                  setFilePath('');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sourceMode === 'web'
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-950 shadow-2xs font-bold'
                    : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Đường dẫn Web</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceMode('local');
                  setUrl('');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  sourceMode === 'local'
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-950 shadow-2xs font-bold'
                    : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tệp trên máy</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Tiêu đề tài liệu *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Thắng Pháp Tập Yếu Luận hoặc Bát Môn Trận Đồ PDF..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Tác giả / Dịch giả
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="VD: HT. Thích Minh Châu..."
                className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                {sourceMode === 'web' ? 'Liên kết tham chiếu (URL Web) *' : 'Đường dẫn tệp cục bộ (filePath) *'}
              </label>
              {sourceMode === 'web' ? (
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:ring-2 focus:ring-indigo-600"
                />
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.epub,.mobi,.azw3,.doc,.docx,.mp4,.mkv,.avi,.mov,.webm,.mp3,.wav,.m4a,.aac,.ogg,.flac,.txt,.md"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl border border-stone-300 flex items-center gap-1.5 transition shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Duyệt tệp trên máy</span>
                    </button>
                    <input
                      type="text"
                      value={filePath}
                      onChange={(e) => {
                        setFilePath(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Đường dẫn tệp (/Users/.../KinhDien.pdf hoặc D:\...)..."
                      className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:ring-2 focus:ring-indigo-600 font-mono text-xs"
                    />
                  </div>

                  {isPathOutsideRoot && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Cảnh báo sao lưu: </span>
                        <span>
                          Tệp này nằm ngoài thư mục thư viện gốc (<code className="font-mono">{canonicalLibraryRoot}</code>). Khi sao lưu thư viện, tệp này có thể bị bỏ sót nếu không được gom vào thư mục chuẩn.
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-500 leading-tight">
                    * Trình duyệt bảo mật không đọc được đường dẫn tuyệt đối (C:\ hoặc /Users/...). Đã tự động điền tên tệp; bạn có thể chỉnh sửa hoặc thêm tiền tố thư mục nếu cần.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Open Target Custom Override Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center justify-between">
              <span>Đích mở nội dung (openTarget - tùy chọn)</span>
              <span className="text-[10px] lowercase text-stone-500 font-normal">ưu tiên khi bấm "Mở tài liệu"</span>
            </label>
            <input
              type="text"
              value={openTarget}
              onChange={(e) => setOpenTarget(e.target.value)}
              placeholder="VD: drive.google.com/... hoặc obsidian://... (để trống sẽ tự động dùng liên kết trên)"
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:ring-2 focus:ring-indigo-600"
            />
            <p className="text-[11px] text-stone-500 mt-1 leading-tight">
              * Đích mở trực tiếp khi bấm nút "Mở Tài Liệu". Nếu để trống, hệ thống sẽ tự động fallback sang Liên kết tham chiếu hoặc Tệp cục bộ.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Ghi chú thêm về tài liệu
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tóm lược trọng điểm hoặc chương tham khảo quan trọng..."
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:bg-stone-200 text-sm font-medium rounded-xl"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-xl shadow-xs transition"
            >
              {initialResource ? 'Lưu Tài Liệu' : 'Thêm Tài Liệu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
