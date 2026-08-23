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
  Filter,
  Sparkles,
  Edit2,
  Trash2,
  Tag as TagIcon,
  BookOpen,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { NoteFormModal } from '../modals/NoteFormModal';
import { formatTimeAgo } from '../../lib/spaced-repetition';

export function NotesManager() {
  const { notes, topics, deleteNote, openTopicDetail } = useData();

  const [typeFilter, setTypeFilter] = useState<'all' | NoteType>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

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

  const renderWikiLinks = (text: string) => {
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const titleQuery = part.slice(2, -2).trim();
        const matchedTopic = topics.find(
          (t) =>
            t.title.toLowerCase().includes(titleQuery.toLowerCase()) ||
            titleQuery.toLowerCase().includes(t.title.toLowerCase())
        );

        if (matchedTopic) {
          return (
            <button
              key={index}
              onClick={() => openTopicDetail(matchedTopic.id)}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded text-xs border border-amber-300 transition mx-0.5"
            >
              <Sparkles className="w-3 h-3 text-amber-700" />
              {titleQuery}
            </button>
          );
        }
        return (
          <span key={index} className="px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded text-xs font-mono">
            {titleQuery}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Kho Ghi Chú &amp; Chiêm Nghiệm</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-serif-title">
            Quản Lý Ghi Chú &amp; Wiki Link
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Ghi chép học tập, luận điểm sâu sắc và liên kết chéo qua cú pháp [[Tên chủ đề]]
          </p>
        </div>

        <button
          onClick={() => {
            setEditingNote(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Thêm Ghi Chú Mới
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
              placeholder="Tìm kiếm nội dung ghi chú, từ khóa..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-600"
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

          {/* Note count indicator */}
          <div className="flex items-center justify-end text-xs text-stone-500 font-mono">
            Hiển thị {filteredNotes.length} / {notes.length} ghi chú
          </div>
        </div>

        {/* Note Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 text-xs">
          <span className="text-stone-500 font-semibold mr-1">Phân loại:</span>
          {[
            { id: 'all', label: 'Tất cả', icon: FileText, color: 'stone' },
            { id: 'study', label: 'Học tập (Study)', icon: FileText, color: 'blue' },
            { id: 'insight', label: 'Chiêm nghiệm (Insight)', icon: Lightbulb, color: 'amber' },
            { id: 'question', label: 'Thắc mắc (Question)', icon: HelpCircle, color: 'rose' },
            { id: 'summary', label: 'Tóm lược (Summary)', icon: Bookmark, color: 'emerald' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTypeFilter(item.id as any)}
                className={`px-3 py-1 rounded-xl font-semibold flex items-center gap-1.5 transition ${
                  typeFilter === item.id
                    ? 'bg-stone-800 text-white shadow-2xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
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
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold flex items-center gap-1">
                    <Lightbulb className="w-3 h-3 text-amber-700" /> Chiêm nghiệm
                  </span>
                );
              case 'question':
                return (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded text-[10px] font-bold flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-rose-700" /> Thắc mắc
                  </span>
                );
              case 'summary':
                return (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[10px] font-bold flex items-center gap-1">
                    <Bookmark className="w-3 h-3 text-emerald-700" /> Tóm lược
                  </span>
                );
              default:
                return (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded text-[10px] font-bold flex items-center gap-1">
                    <FileText className="w-3 h-3 text-blue-700" /> Học tập
                  </span>
                );
            }
          };

          return (
            <div
              key={note.id}
              className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs hover:border-emerald-400 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-500 border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-2">
                    {getTypeBadge()}
                    <span
                      onClick={() => openTopicDetail(note.topicId)}
                      className="font-medium text-stone-700 hover:text-amber-800 cursor-pointer line-clamp-1"
                    >
                      {note.topicTitle}
                    </span>
                  </div>
                  <span>{formatTimeAgo(note.createdAt)}</span>
                </div>

                <h3 className="font-bold text-stone-900 text-sm">{note.title}</h3>

                <div className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {renderWikiLinks(note.content)}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px]">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingNote(note);
                      setShowAddModal(true);
                    }}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                    title="Sửa ghi chú"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Xóa ghi chú này?')) deleteNote(note.id);
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    title="Xóa ghi chú"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-white border border-stone-200 rounded-2xl p-6 text-stone-400 text-xs">
            Không tìm thấy ghi chú nào phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      <NoteFormModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingNote(null);
        }}
        initialNote={editingNote}
      />
    </div>
  );
}
