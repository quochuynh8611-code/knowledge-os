import React, { useState, useMemo } from 'react';
import {
  Search,
  BookA,
  Copy,
  CheckCircle2,
  Filter,
  RotateCcw,
  SearchX,
  LayoutGrid,
  List,
} from 'lucide-react';
import { getLexiconEntries } from '../../lib/scholarSuite/selectors';

export interface LexiconItemView {
  id: string;
  pali: string;
  sanskrit: string;
  hanTu: string;
  pinyin: string;
  vietnamese: string;
  category: 'phat-hoc' | 'huyen-hoc';
  definition: string;
  canonicalRef: string;
  tags: string[];
}

export function MultilingualLexicon() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'phat-hoc' | 'huyen-hoc'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');

  const rawEntries = useMemo(() => {
    return getLexiconEntries();
  }, []);

  const lexiconItems: LexiconItemView[] = useMemo(() => {
    return rawEntries.map((e) => {
      const sourceRef =
        e.sources && e.sources.length > 0
          ? e.sources.map((s) => `${s.sourceTitle} ${s.sectionRef}`).join('; ')
          : e.provenanceNote ?? 'Tham chiếu học thuật';

      return {
        id: e.id,
        pali: e.terms.pali ?? '—',
        sanskrit: e.terms.sanskrit ?? '—',
        hanTu: e.terms.hanTu ?? '—',
        pinyin: e.terms.pinyin ?? '—',
        vietnamese: e.terms.vietnamese,
        category: e.domain === 'phat-hoc' ? 'phat-hoc' : 'huyen-hoc',
        definition: e.canonicalDefinition,
        canonicalRef: sourceRef,
        tags: [e.subCategory, e.domain],
      };
    });
  }, [rawEntries]);

  const filteredEntries = useMemo(() => {
    return lexiconItems.filter((entry) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        entry.pali.toLowerCase().includes(q) ||
        entry.sanskrit.toLowerCase().includes(q) ||
        entry.hanTu.includes(searchTerm) ||
        entry.vietnamese.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'all' || entry.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [lexiconItems, searchTerm, categoryFilter]);

  const isFilterActive = searchTerm.trim() !== '' || categoryFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
  };

  const handleCopy = (entry: LexiconItemView) => {
    const text = `${entry.vietnamese}\n- Pali: ${entry.pali}\n- Sanskrit: ${entry.sanskrit}\n- Hán Tự: ${entry.hanTu} (${entry.pinyin})\n- Định nghĩa: ${entry.definition}\n- Xuất xứ: ${entry.canonicalRef}`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-900 to-amber-950 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookA className="w-5 h-5 text-amber-300" />
            <span className="text-xs uppercase font-mono tracking-widest text-amber-300 font-bold">
              Multilingual Lexicon &amp; Etymology
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Từ Điển Thuật Ngữ Đa Ngữ (Pali - Sanskrit - Hán Cổ - Việt)
          </h1>
          <p className="text-xs text-stone-300 max-w-2xl mt-1">
            Tra cứu gốc từ, chiết tự, chỉ số đối chiếu xuất xứ Tam Tạng (PTS/Taisho) và cổ tịch Dịch học Đông phương.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tra cứu: Citta, Duyên Khởi, 心所, Kỳ Môn..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-700 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex gap-1.5 bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  categoryFilter === 'all'
                    ? 'bg-stone-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                Tất Cả
              </button>
              <button
                onClick={() => setCategoryFilter('phat-hoc')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  categoryFilter === 'phat-hoc'
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-amber-900 hover:bg-amber-100/60'
                }`}
              >
                Phật Học
              </button>
              <button
                onClick={() => setCategoryFilter('huyen-hoc')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  categoryFilter === 'huyen-hoc'
                    ? 'bg-indigo-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-indigo-900 hover:bg-indigo-100/60'
                }`}
              >
                Huyền Học
              </button>
            </div>

            {/* View Mode Toggle Switcher */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/60 ml-auto sm:ml-0">
              <button
                onClick={() => setViewMode('detailed')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                  viewMode === 'detailed'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Chế độ xem chi tiết"
                aria-label="Chi tiết"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">Chi tiết</span>
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                  viewMode === 'compact'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Chế độ xem thu gọn"
                aria-label="Thu gọn"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">Thu gọn</span>
              </button>
            </div>
          </div>
        </div>

        {/* Result Summary Bar & Reset Action */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              Hiển thị {filteredEntries.length} / {lexiconItems.length} thuật ngữ
            </span>
            {categoryFilter !== 'all' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono">
                {categoryFilter === 'phat-hoc' ? 'Phật Học' : 'Huyền Học'}
              </span>
            )}
          </div>

          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 hover:underline transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Lexicon Grid / Empty State */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center shadow-2xs space-y-4 max-w-lg mx-auto my-8">
          <div className="w-12 h-12 bg-amber-50 text-amber-800 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/60">
            <SearchX className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900">
              Không tìm thấy thuật ngữ phù hợp
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Không có mục từ nào khớp với từ khóa{' '}
              {searchTerm ? <span className="font-semibold text-stone-800">"{searchTerm}"</span> : ''} hoặc bộ lọc hiện tại. Bạn có thể thử tìm theo Pāli, Sanskrit, Hán tự hoặc đặt lại bộ lọc.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      ) : viewMode === 'compact' ? (
        /* Compact View Mode (Dense horizontal cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEntries.map((entry) => {
            const isCopied = copiedId === entry.id;
            return (
              <div
                key={entry.id}
                className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-2xs hover:border-stone-300 transition flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          entry.category === 'phat-hoc'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        }`}
                      >
                        {entry.category === 'phat-hoc' ? 'Phật' : 'Dịch'}
                      </span>
                      <span className="text-xs font-serif font-bold text-stone-900">{entry.hanTu}</span>
                    </div>

                    <button
                      onClick={() => handleCopy(entry)}
                      className="p-1 text-stone-400 hover:text-stone-800 rounded hover:bg-stone-100 transition"
                      title="Sao chép thuật ngữ"
                    >
                      {isCopied ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-xs font-bold text-stone-900 truncate" title={entry.vietnamese}>
                    {entry.vietnamese}
                  </h3>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-stone-600 mt-1">
                    <span className="truncate text-amber-950 font-medium">{entry.pali}</span>
                    <span>•</span>
                    <span className="truncate text-stone-600">{entry.pinyin}</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-600 line-clamp-2 leading-snug pt-1.5 border-t border-stone-100">
                  {entry.definition}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed View Mode (Standard 2-tier cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const isCopied = copiedId === entry.id;
            return (
              <div
                key={entry.id}
                className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-3.5 hover:border-stone-300 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Tier 1: Fast scan header & multilingual parallel terms */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            entry.category === 'phat-hoc'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                          }`}
                        >
                          {entry.category === 'phat-hoc' ? 'Phật Học' : 'Huyền Học'}
                        </span>
                        <span className="text-sm font-serif font-bold text-stone-900">{entry.hanTu}</span>
                      </div>
                      <h3 className="text-base font-bold text-stone-900 leading-snug">{entry.vietnamese}</h3>
                    </div>

                    <button
                      onClick={() => handleCopy(entry)}
                      className={`p-1.5 rounded-lg transition flex items-center gap-1 text-xs ${
                        isCopied
                          ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                          : 'text-stone-400 hover:text-stone-800 hover:bg-stone-100'
                      }`}
                      title="Sao chép thuật ngữ"
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px]">Đã chép</span>
                        </>
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Multilingual Parallel Terms */}
                  <div className="grid grid-cols-3 gap-2 bg-stone-50 p-2.5 rounded-xl text-[11px] font-mono border border-stone-150">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-stone-500 block">Pāli (IAST)</span>
                      <span className="text-amber-950 font-semibold truncate block">{entry.pali}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-stone-500 block">Sanskrit</span>
                      <span className="text-purple-950 font-semibold truncate block">{entry.sanskrit}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-stone-500 block">Pinyin</span>
                      <span className="text-stone-700 font-semibold truncate block">{entry.pinyin}</span>
                    </div>
                  </div>

                  {/* Tier 2: Deep Reading - Canonical Definition */}
                  <p className="text-xs text-stone-700 leading-relaxed">{entry.definition}</p>
                </div>

                {/* Canonical Reference Footer */}
                <div className="text-[10px] text-stone-600 pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="italic">Nguồn: {entry.canonicalRef}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
