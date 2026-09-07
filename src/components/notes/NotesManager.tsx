import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Note, NoteType } from '../../types';
import {
  FileText,
  Lightbulb,
  HelpCircle,
  Bookmark,
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  Eye,
  FolderOpen,
} from 'lucide-react';
import { NoteFormModal } from '../modals/NoteFormModal';
import { NoteReaderModal } from '../modals/NoteReaderModal';
import { formatTimeAgo } from '../../lib/spaced-repetition';
import { toReadablePlainTextPreview } from '../../lib/markdownReadability';

export function NotesManager() {
  const { notes, topics, deleteNote, openTopicDetail } = useData();

  const [typeFilter, setTypeFilter] = useState<'all' | NoteType>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [readingNote, setReadingNote] = useState<Note | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (topicFilter !== 'all' && n.topicId !== topicFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchContent = n.content.toLowerCase().includes(q);
        const matchTag = n.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchContent && !matchTag) return false;
      }
      return true;
    });
  }, [notes, typeFilter, topicFilter, search]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Ghi Chú Nghiên Cứu</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight font-serif-title">
            Quản Lý Ghi Chú &amp; Liên Kết Kiến Thức
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            Ghi chép học tập, luận điểm và liên kết hai chiều qua cú pháp [[Tên chủ đề]]
          </p>
        </div>

        <button
          onClick={() => {
            setEditingNote(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Ghi Chú Mới
        </button>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nội dung ghi chú, từ khóa..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-900 focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Topic selector */}
          <div>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200"
            >
              <option value="all">Tất cả chủ đề liên kết</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Note count indicator */}
          <div className="flex items-center justify-end text-xs text-stone-500 dark:text-stone-400 font-mono">
            Hiển thị {filteredNotes.length} / {notes.length} ghi chú
          </div>
        </div>

        {/* Note Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
          <span className="text-stone-500 dark:text-stone-400 font-semibold mr-1">Phân loại:</span>
          {[
            { id: 'all', label: 'Tất cả', icon: FileText },
            { id: 'study', label: 'Học tập', icon: FileText },
            { id: 'insight', label: 'Ý tưởng / Phát hiện', icon: Lightbulb },
            { id: 'question', label: 'Thắc mắc', icon: HelpCircle },
            { id: 'summary', label: 'Tóm lược', icon: Bookmark },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTypeFilter(item.id as any)}
                className={`px-3 py-1 rounded-xl font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  typeFilter === item.id
                    ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotes.map((note) => {
          const getTypeBadge = () => {
            switch (note.type) {
              case 'insight':
                return (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded text-[10px] font-bold flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-amber-700 dark:text-amber-400" /> Phát hiện
                  </span>
                );
              case 'question':
                return (
                  <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-700 rounded text-[10px] font-bold flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-rose-700 dark:text-rose-400" /> Thắc mắc
                  </span>
                );
              case 'summary':
                return (
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded text-[10px] font-bold flex items-center gap-1">
                    <Bookmark className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> Tóm lược
                  </span>
                );
              default:
                return (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded text-[10px] font-bold flex items-center gap-1">
                    <FileText className="w-3 h-3 text-blue-700 dark:text-blue-400" /> Học tập
                  </span>
                );
            }
          };

          return (
            <div
              key={note.id}
              onClick={() => setReadingNote(note)}
              className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl p-5 shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition flex flex-col justify-between space-y-3.5 cursor-pointer group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800 pb-2">
                  <div className="flex items-center gap-2">
                    {getTypeBadge()}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        openTopicDetail(note.topicId);
                      }}
                      className="font-medium text-stone-700 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-400 cursor-pointer line-clamp-1"
                    >
                      {note.topicTitle}
                    </span>
                  </div>
                  <span>{formatTimeAgo(note.createdAt)}</span>
                </div>

                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition font-serif-title">
                  {note.title}
                </h3>

                {/* Plain-text readable preview with comfortable line-clamp */}
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed line-clamp-3 font-normal">
                  {toReadablePlainTextPreview(note.content)}
                </p>

                {/* Source Path Display */}
                {note.sourcePath && (
                  <div className="p-2.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl flex items-center justify-between text-[11px] font-mono text-stone-700 dark:text-stone-300 mt-2">
                    <span className="truncate flex-1 mr-2 flex items-center gap-1.5" title={note.sourcePath}>
                      <FolderOpen className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{note.sourcePath}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                            navigator.clipboard.writeText(note.sourcePath!).catch(() => {});
                          }
                          setCopiedNoteId(note.id);
                          setTimeout(() => setCopiedNoteId(null), 2000);
                        }}
                        className="px-2 py-0.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 rounded text-[10px] font-sans font-medium transition cursor-pointer"
                        title="Sao chép đường dẫn tệp"
                      >
                        {copiedNoteId === note.id ? 'Đã chép!' : 'Chép path'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Tags & Prominent Reading CTA */}
              <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap gap-1 max-w-[60%]">
                  {note.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-md text-[10px] font-medium">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Prominent Read CTA */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReadingNote(note);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/80 rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition cursor-pointer"
                    title="Đọc nội dung trong khung lớn"
                    aria-label={`Đọc tiếp ghi chú ${note.title}`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Đọc tiếp</span>
                  </button>

                  {/* Secondary Edit Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNote(note);
                      setShowAddModal(true);
                    }}
                    className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
                    title="Sửa ghi chú"
                    aria-label="Sửa ghi chú"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Secondary Delete Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Xóa ghi chú này?')) deleteNote(note.id);
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                    title="Xóa ghi chú"
                    aria-label="Xóa ghi chú"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 text-stone-400 text-xs">
            Không tìm thấy ghi chú nào phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      {/* Note Form Modal for Add/Edit */}
      <NoteFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingNote(null);
        }}
        initialNote={editingNote}
      />

      {/* Focus Note Reader Modal */}
      <NoteReaderModal
        isOpen={!!readingNote}
        note={readingNote}
        onClose={() => setReadingNote(null)}
        onEdit={(note) => {
          setReadingNote(null);
          setEditingNote(note);
          setShowAddModal(true);
        }}
      />
    </div>
  );
}
