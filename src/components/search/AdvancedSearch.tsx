import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Search,
  BookOpen,
  FileText,
  Library,
  Sparkles,
  Compass,
  ArrowRight,
  Filter,
  Tag as TagIcon,
} from 'lucide-react';
import { formatMinutesToHours, formatTimeAgo } from '../../lib/spaced-repetition';

export function AdvancedSearch() {
  const { searchQuery, setSearchQuery, topics, notes, resources, openTopicDetail } = useData();

  const [activeFilter, setActiveFilter] = useState<'all' | 'topics' | 'notes' | 'resources'>('all');
  const [domainFilter, setDomainFilter] = useState<'all' | 'phat-hoc' | 'huyen-hoc'>('all');

  const q = searchQuery.toLowerCase().trim();

  const matchedTopics = useMemo(() => {
    if (!q) return topics;
    return topics.filter((t) => {
      if (domainFilter !== 'all' && t.type !== domainFilter) return false;
      const mTitle = t.title.toLowerCase().includes(q);
      const mDesc = t.description?.toLowerCase().includes(q);
      const mContent = t.content?.toLowerCase().includes(q);
      const mTags = t.tags?.some((tg) => tg.toLowerCase().includes(q));
      return mTitle || mDesc || mContent || mTags;
    });
  }, [topics, q, domainFilter]);

  const matchedNotes = useMemo(() => {
    if (!q) return notes;
    return notes.filter((n) => {
      const mTitle = n.title.toLowerCase().includes(q);
      const mContent = n.content.toLowerCase().includes(q);
      const mTags = n.tags?.some((tg) => tg.toLowerCase().includes(q));
      return mTitle || mContent || mTags;
    });
  }, [notes, q]);

  const matchedResources = useMemo(() => {
    if (!q) return resources;
    return resources.filter((r) => {
      const mTitle = r.title.toLowerCase().includes(q);
      const mAuthor = r.author?.toLowerCase().includes(q);
      const mNotes = r.notes?.toLowerCase().includes(q);
      return mTitle || mAuthor || mNotes;
    });
  }, [resources, q]);

  const highlightMatch = (text: string) => {
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q ? (
        <mark key={i} className="bg-amber-200 text-amber-950 font-semibold px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
          <Search className="w-3.5 h-3.5" />
          <span>Công Cụ Tra Cứu Toàn Diện</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-serif-title">
          Tra Cứu &amp; Khám Phá Tri Thức
        </h1>
        <p className="text-xs text-stone-600 mt-0.5">
          Tìm kiếm xuyên suốt tất cả chủ đề luận tạng, ghi chép cá nhân, thuật ngữ và tài liệu nghiên cứu
        </p>
      </div>

      {/* Main Search Input */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nhập thuật ngữ: Vi Diệu Pháp, Tâm Vương, Cửu Cung, Quẻ Càn, Bát Nhã, Tứ Niệm Xứ..."
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-amber-700 font-medium"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium mr-1">Hiển thị:</span>
            {[
              { id: 'all', label: `Tất cả (${matchedTopics.length + matchedNotes.length + matchedResources.length})` },
              { id: 'topics', label: `Chủ đề (${matchedTopics.length})` },
              { id: 'notes', label: `Ghi chú (${matchedNotes.length})` },
              { id: 'resources', label: `Tài liệu (${matchedResources.length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  activeFilter === f.id
                    ? 'bg-amber-800 text-white shadow-2xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDomainFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                domainFilter === 'all' ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Mọi lĩnh vực
            </button>
            <button
              onClick={() => setDomainFilter('phat-hoc')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                domainFilter === 'phat-hoc' ? 'bg-amber-700 text-white' : 'text-amber-900 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              Phật Học
            </button>
            <button
              onClick={() => setDomainFilter('huyen-hoc')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                domainFilter === 'huyen-hoc' ? 'bg-indigo-700 text-white' : 'text-indigo-900 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              Huyền Học
            </button>
          </div>
        </div>
      </div>

      {/* Search Results Sections */}
      <div className="space-y-6">
        {/* Section 1: Topics */}
        {(activeFilter === 'all' || activeFilter === 'topics') && matchedTopics.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
              <BookOpen className="w-4 h-4 text-amber-700" />
              <span>Chủ đề khớp tìm kiếm ({matchedTopics.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedTopics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => openTopicDetail(topic.id)}
                  className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs hover:border-amber-400 hover:bg-stone-50/50 transition cursor-pointer space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          topic.type === 'phat-hoc'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-indigo-100 text-indigo-900'
                        }`}
                      >
                        {topic.categoryName}
                      </span>
                      <span>{topic.studyProgress.progress}% done</span>
                    </div>
                    <h3 className="font-bold text-stone-900 text-sm">{highlightMatch(topic.title)}</h3>
                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                      {highlightMatch(topic.description)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-mono">
                      ⏱️ {formatMinutesToHours(topic.studyProgress.timeSpent)}
                    </span>
                    <span className="text-amber-800 font-semibold flex items-center gap-1">
                      Mở chi tiết <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Notes */}
        {(activeFilter === 'all' || activeFilter === 'notes') && matchedNotes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Ghi chú cá nhân ({matchedNotes.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => openTopicDetail(note.topicId)}
                  className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs hover:border-emerald-400 hover:bg-stone-50/50 transition cursor-pointer space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                      <span className="font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded">
                        {note.type}
                      </span>
                      <span>{formatTimeAgo(note.createdAt)}</span>
                    </div>
                    <h3 className="font-bold text-stone-900 text-sm">{highlightMatch(note.title)}</h3>
                    <p className="text-xs text-stone-600 mt-1 line-clamp-3">
                      {highlightMatch(note.content)}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-stone-100 text-[11px] text-amber-800 font-medium">
                    Chủ đề: {note.topicTitle} →
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Resources */}
        {(activeFilter === 'all' || activeFilter === 'resources') && matchedResources.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
              <Library className="w-4 h-4 text-indigo-700" />
              <span>Tài liệu tham khảo ({matchedResources.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedResources.map((res) => (
                <div
                  key={res.id}
                  onClick={() => openTopicDetail(res.topicId)}
                  className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs hover:border-indigo-400 transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-500">
                    <span className="font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded">
                      {res.type.toUpperCase()}
                    </span>
                    <span>{formatTimeAgo(res.createdAt)}</span>
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm">{highlightMatch(res.title)}</h3>
                  {res.author && (
                    <p className="text-xs text-stone-600">Tác giả: {highlightMatch(res.author)}</p>
                  )}
                  {res.notes && (
                    <p className="text-xs text-stone-500 line-clamp-2">{highlightMatch(res.notes)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {matchedTopics.length === 0 && matchedNotes.length === 0 && matchedResources.length === 0 && (
          <div className="text-center py-16 bg-white border border-stone-200 rounded-2xl p-6 text-stone-400 text-xs">
            Không tìm thấy kết quả nào phù hợp với từ khóa "{searchQuery}". Hãy thử tìm các từ khóa như "Abhidharma", "Kỳ Môn", "Kinh Dịch", "Tâm Sở"...
          </div>
        )}
      </div>
    </div>
  );
}
