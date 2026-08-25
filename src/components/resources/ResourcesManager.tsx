import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Resource, ResourceType } from '../../types';
import {
  Library,
  BookOpen,
  FileText,
  Video,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  Calendar,
  Sparkles,
  Quote,
  FileDown,
} from 'lucide-react';
import { ResourceFormModal } from '../modals/ResourceFormModal';
import { ResourceViewerModal } from '../modals/ResourceViewerModal';
import { CitationModal } from '../modals/CitationModal';
import { BatchCitationModal } from '../modals/BatchCitationModal';
import { formatTimeAgo } from '../../lib/spaced-repetition';

export function ResourcesManager() {
  const { resources, topics, deleteResource, openTopicDetail } = useData();

  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [citingResource, setCitingResource] = useState<Resource | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (topicFilter !== 'all' && r.topicId !== topicFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchAuthor = r.author?.toLowerCase().includes(q);
        const matchNotes = r.notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor && !matchNotes) return false;
      }
      return true;
    });
  }, [resources, typeFilter, topicFilter, search]);

  const getTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-rose-700" />;
      case 'video': return <Video className="w-4 h-4 text-indigo-700" />;
      case 'book': return <BookOpen className="w-4 h-4 text-amber-700" />;
      default: return <ExternalLink className="w-4 h-4 text-emerald-700" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-800 mb-1">
            <Library className="w-3.5 h-3.5" />
            <span>Thư Viện &amp; Nguồn Tư Liệu</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-serif-title">
            Quản Lý Tài Liệu &amp; Giáo Trình
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Lưu trữ giáo trình Abhidharmakośa, Tam Tạng Pali/Hán Tạng, kỳ môn thư tịch, video bài giảng &amp; PDF
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Thêm Tài Liệu Mới
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên sách, tác giả, tài liệu..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Topic selector */}
          <div>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800"
            >
              <option value="all">Tất cả chủ đề liên kết</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Count indicator & Batch Export Button */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 text-xs text-stone-500 font-mono">
            <span>Hiển thị {filteredResources.length} / {resources.length} tài liệu</span>
            <button
              disabled={filteredResources.length === 0}
              onClick={() => setShowBatchModal(true)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed text-amber-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition border border-amber-200"
              title="Xuất danh mục trích dẫn danh sách đang lọc"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-700" /> Xuất danh mục ({filteredResources.length})
            </button>
          </div>
        </div>

        {/* Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 text-xs">
          <span className="text-stone-500 font-semibold mr-1">Định dạng:</span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pdf', label: 'Tài liệu PDF' },
            { id: 'book', label: 'Sách / Luận tạng' },
            { id: 'video', label: 'Video bài giảng' },
            { id: 'article', label: 'Bài viết / Web' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTypeFilter(item.id as any)}
              className={`px-3 py-1 rounded-xl font-semibold transition ${
                typeFilter === item.id
                  ? 'bg-stone-800 text-white shadow-2xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((res) => (
          <div
            key={res.id}
            className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs hover:border-indigo-400 transition flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-stone-500 border-b border-stone-100 pb-2">
                <span className="font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-900 rounded flex items-center gap-1">
                  {getTypeIcon(res.type)}
                  {res.type.toUpperCase()}
                </span>
                <span>{formatTimeAgo(res.createdAt)}</span>
              </div>

              <h3 className="font-bold text-stone-900 text-sm line-clamp-2 leading-snug">
                {res.title}
              </h3>

              {res.author && (
                <p className="text-xs text-stone-600">
                  Tác giả / Dịch giả: <strong className="text-stone-800">{res.author}</strong>
                </p>
              )}

              <p
                onClick={() => openTopicDetail(res.topicId)}
                className="text-[11px] text-amber-800 hover:underline cursor-pointer font-medium"
              >
                Chủ đề: {res.topicTitle}
              </p>

              {res.notes && (
                <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100 line-clamp-3">
                  {res.notes}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewingResource(res)}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-indigo-50 text-indigo-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-700" /> Xem trước
                </button>
                <button
                  onClick={() => setCitingResource(res)}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-amber-50 text-amber-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
                  title="Trích dẫn tài liệu"
                >
                  <Quote className="w-3.5 h-3.5 text-amber-700" /> Trích dẫn
                </button>
              </div>

              <div className="flex items-center gap-1">
                {res.url && (
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
                    title="Mở đường dẫn ngoài"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Xóa tài liệu này khỏi hệ thống?')) deleteResource(res.id);
                  }}
                  className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  title="Xóa tài liệu"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredResources.length === 0 && (
          <div className="col-span-3 text-center py-12 bg-white border border-stone-200 rounded-2xl p-6 text-stone-400 text-xs">
            Chưa có tài liệu nào phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      {/* Modals */}
      <ResourceFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <ResourceViewerModal resource={viewingResource} onClose={() => setViewingResource(null)} />
      <CitationModal isOpen={!!citingResource} onClose={() => setCitingResource(null)} resource={citingResource} />
      <BatchCitationModal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} resources={filteredResources} />
    </div>
  );
}
