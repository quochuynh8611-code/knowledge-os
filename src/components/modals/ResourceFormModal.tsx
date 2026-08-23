import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Resource, ResourceType } from '../../types';
import { X, FileText, Book, Video, Headphones, Globe, Link } from 'lucide-react';

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialResource?: Resource | null;
  defaultTopicId?: string;
}

export function ResourceFormModal({ isOpen, onClose, initialResource, defaultTopicId }: ResourceFormModalProps) {
  const { topics, addResource, updateResource } = useData();

  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('pdf');
  const [author, setAuthor] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialResource) {
      setTopicId(initialResource.topicId);
      setTitle(initialResource.title);
      setType(initialResource.type);
      setAuthor(initialResource.author || '');
      setUrl(initialResource.url || '');
      setNotes(initialResource.notes || '');
    } else {
      setTopicId(defaultTopicId || topics[0]?.id || '');
      setTitle('');
      setType('pdf');
      setAuthor('');
      setUrl('https://');
      setNotes('');
    }
  }, [initialResource, defaultTopicId, topics, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const currentTopic = topics.find((t) => t.id === topicId);

    if (initialResource) {
      updateResource(initialResource.id, {
        topicId,
        topicTitle: currentTopic?.title || initialResource.topicTitle,
        title,
        type,
        author,
        url,
        notes,
      });
    } else {
      addResource({
        topicId,
        topicTitle: currentTopic?.title || 'Chủ đề',
        title,
        type,
        author,
        url,
        notes,
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
                Đường dẫn liên kết (URL)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm"
              />
            </div>
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
