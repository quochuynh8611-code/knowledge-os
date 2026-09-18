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
  Trash2,
  Eye,
  Quote,
  FileDown,
} from 'lucide-react';
import { ResourceFormModal } from '../modals/ResourceFormModal';
import { ResourceViewerModal } from '../modals/ResourceViewerModal';
import { CitationModal } from '../modals/CitationModal';
import { BatchCitationModal } from '../modals/BatchCitationModal';
import { UnifiedResearchReader } from '../reader/UnifiedResearchReader';
import { formatTimeAgo } from '../../lib/spaced-repetition';
import { resolveResourceOpenTarget } from '../../lib/resourceOpenResolver';
import { PageHeader, SurfaceCard, StatusPill, ToolbarButton } from '../workbench';

export function ResourcesManager() {
  const { resources, topics, deleteResource, openTopicDetail } = useData();

  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [activeReaderDoc, setActiveReaderDoc] = useState<{
    documentId: string;
    title: string;
    format: string;
    fileUrl?: string;
    content?: string;
  } | null>(null);
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
      case 'pdf': return FileText;
      case 'video': return Video;
      case 'book': return BookOpen;
      default: return ExternalLink;
    }
  };

  const getTypeStatusVariant = (type: ResourceType): 'danger' | 'purple' | 'accent' | 'success' => {
    switch (type) {
      case 'pdf': return 'danger';
      case 'video': return 'purple';
      case 'book': return 'accent';
      default: return 'success';
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        title="Quản Lý Tài Liệu & Giáo Trình"
        subtitle="Lưu trữ giáo trình Abhidharmakośa, Tam Tạng Pali/Hán Tạng, kỳ môn thư tịch, video bài giảng & PDF"
        categoryLabel="Thư Viện & Nguồn Tư Liệu"
        categoryIcon={Library}
        actions={
          <ToolbarButton
            variant="primary"
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            Thêm Tài Liệu Mới
          </ToolbarButton>
        }
      />

      {/* Toolbar & Filters */}
      <SurfaceCard variant="subtle" className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên sách, tác giả, tài liệu..."
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700 dark:focus:border-amber-500 transition shadow-2xs"
            />
          </div>

          {/* Topic selector */}
          <div>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700/40"
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
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-stone-500 dark:text-stone-400 font-mono">
            <span>Hiển thị {filteredResources.length} / {resources.length} tài liệu</span>
            <button
              disabled={filteredResources.length === 0}
              onClick={() => setShowBatchModal(true)}
              className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 disabled:opacity-40 disabled:cursor-not-allowed text-amber-950 dark:text-amber-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition border border-amber-200 dark:border-amber-800 cursor-pointer shadow-2xs"
              title="Xuất danh mục trích dẫn danh sách đang lọc"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Xuất danh mục ({filteredResources.length})</span>
            </button>
          </div>
        </div>

        {/* Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-200/60 dark:border-stone-800 text-xs">
          <span className="text-stone-500 dark:text-stone-400 font-semibold mr-1">Định dạng:</span>
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
              className={`px-3 py-1 rounded-xl font-semibold transition cursor-pointer text-xs ${
                typeFilter === item.id
                  ? 'bg-amber-800 text-amber-50 shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </SurfaceCard>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((res) => {
          const Icon = getTypeIcon(res.type);
          const statusVariant = getTypeStatusVariant(res.type);

          return (
            <SurfaceCard
              key={res.id}
              variant="interactive"
              className="flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800/80 pb-2">
                  <StatusPill variant={statusVariant} icon={Icon}>
                    {res.type.toUpperCase()}
                  </StatusPill>
                  <span className="font-mono">{formatTimeAgo(res.createdAt)}</span>
                </div>

                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm line-clamp-2 leading-snug group-hover:text-amber-800 dark:group-hover:text-amber-400 transition">
                  {res.title}
                </h3>

                {res.author && (
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Tác giả / Dịch giả: <strong className="text-stone-800 dark:text-stone-200">{res.author}</strong>
                  </p>
                )}

                <p
                  onClick={() => openTopicDetail(res.topicId)}
                  className="text-[11px] text-amber-800 dark:text-amber-400 hover:underline cursor-pointer font-medium"
                >
                  Chủ đề: {res.topicTitle}
                </p>

                {res.notes && (
                  <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-700/80 line-clamp-3 leading-relaxed">
                    {res.notes}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const fileTarget = resolveResourceOpenTarget(res);
                      if (res.type === 'pdf' || res.type === 'book' || res.type === 'md' || (res.filePath && (res.filePath.endsWith('.pdf') || res.filePath.endsWith('.epub') || res.filePath.endsWith('.md')))) {
                        setActiveReaderDoc({
                          documentId: res.id,
                          title: res.title,
                          format: res.type === 'pdf' ? 'pdf' : res.type === 'book' || res.filePath?.endsWith('.epub') ? 'epub' : 'md',
                          fileUrl: fileTarget.targetUrl || res.url || res.filePath,
                        });
                      } else {
                        setViewingResource(res);
                      }
                    }}
                    className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer border border-stone-200 dark:border-stone-700 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" /> Xem trước
                  </button>
                  <button
                    onClick={() => setCitingResource(res)}
                    className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer border border-amber-200 dark:border-amber-800 shadow-2xs"
                    title="Trích dẫn tài liệu"
                  >
                    <Quote className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> Trích dẫn
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {(() => {
                    const resolution = resolveResourceOpenTarget(res);
                    if (!resolution.canOpenDirectly || !resolution.targetUrl) return null;
                    return (
                      <a
                        href={resolution.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition"
                        title={resolution.label}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    );
                  })()}
                  <button
                    onClick={() => {
                      if (window.confirm('Xóa tài liệu này khỏi hệ thống?')) deleteResource(res.id);
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </SurfaceCard>
          );
        })}

        {filteredResources.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-stone-400 text-xs">
            Chưa có tài liệu nào phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      {/* Modals */}
      <ResourceFormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <ResourceViewerModal resource={viewingResource} onClose={() => setViewingResource(null)} />
      <CitationModal isOpen={!!citingResource} onClose={() => setCitingResource(null)} resource={citingResource} />
      <BatchCitationModal isOpen={showBatchModal} onClose={() => setShowBatchModal(false)} resources={filteredResources} />

      {/* Phase 18A Unified Research Reader */}
      {activeReaderDoc && (
        <UnifiedResearchReader
          documentId={activeReaderDoc.documentId}
          title={activeReaderDoc.title}
          format={activeReaderDoc.format}
          fileUrl={activeReaderDoc.fileUrl}
          content={activeReaderDoc.content}
          onClose={() => setActiveReaderDoc(null)}
        />
      )}
    </div>
  );
}
