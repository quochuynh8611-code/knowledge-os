import React, { useState, useMemo } from 'react';
import { Search, BookA, Sparkles, Copy, CheckCircle2, Bookmark, Filter } from 'lucide-react';
import { useData } from '../../context/DataContext';
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
      const matchesSearch =
        entry.pali.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.sanskrit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.hanTu.includes(searchTerm) ||
        entry.vietnamese.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.definition.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === 'all' || entry.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [lexiconItems, searchTerm, categoryFilter]);

  const handleCopy = (entry: LexiconItemView) => {
    const text = `${entry.vietnamese}\n- Pali: ${entry.pali}\n- Sanskrit: ${entry.sanskrit}\n- Hán Tự: ${entry.hanTu} (${entry.pinyin})\n- Định nghĩa: ${entry.definition}\n- Xuất xứ: ${entry.canonicalRef}`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
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
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
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

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              categoryFilter === 'all' ? 'bg-stone-800 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Tất Cả
          </button>
          <button
            onClick={() => setCategoryFilter('phat-hoc')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              categoryFilter === 'phat-hoc' ? 'bg-amber-800 text-white shadow-xs' : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
            }`}
          >
            Phật Học (Pali/Sanskrit)
          </button>
          <button
            onClick={() => setCategoryFilter('huyen-hoc')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
              categoryFilter === 'huyen-hoc' ? 'bg-indigo-800 text-white shadow-xs' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
            }`}
          >
            Huyền Học &amp; Dịch Học
          </button>
        </div>
      </div>

      {/* Lexicon Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEntries.map((entry) => {
          const isCopied = copiedId === entry.id;
          return (
            <div
              key={entry.id}
              className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-3 hover:border-stone-300 transition"
            >
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
                  className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg hover:bg-stone-100 transition"
                  title="Sao chép thuật ngữ"
                >
                  {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Multilingual Parallel Terms */}
              <div className="grid grid-cols-3 gap-2 bg-stone-50 p-2.5 rounded-xl text-[11px] font-mono border border-stone-150">
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-600 block">Pāli (IAST)</span>
                  <span className="text-amber-950 font-semibold truncate block">{entry.pali}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-600 block">Sanskrit</span>
                  <span className="text-purple-950 font-semibold truncate block">{entry.sanskrit}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-600 block">Pinyin</span>
                  <span className="text-stone-700 font-semibold truncate block">{entry.pinyin}</span>
                </div>
              </div>

              {/* Definition */}
              <p className="text-xs text-stone-700 leading-relaxed">{entry.definition}</p>

              {/* Reference */}
              <div className="text-[10px] text-stone-600 pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="italic">Nguồn: {entry.canonicalRef}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
