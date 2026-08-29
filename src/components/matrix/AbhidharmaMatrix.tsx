import React, { useState, useMemo } from 'react';
import { Sparkles, Brain, Search, Filter, BookOpen, Layers, CheckCircle2, ChevronRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { getSystemNodes } from '../../lib/scholarSuite/selectors';

export interface CittaItem {
  id: string;
  nameVi: string;
  namePali: string;
  category: string;
  subCategory: string;
  vedana: string;
  hetu: string;
  cetasikaCount: number;
  description: string;
}

function mapFeelingToLabel(feeling: string): string {
  switch (feeling) {
    case 'somanassa':
      return 'Somanassa (Hỷ)';
    case 'domanassa':
      return 'Domanassa (Ưu)';
    case 'upekkhā':
      return 'Upekkhā (Xả)';
    case 'sukha':
      return 'Sukha (Lạc)';
    case 'dukkha':
      return 'Dukkha (Khổ)';
    default:
      return feeling;
  }
}

function mapPlaneToCategory(plane: string, cittaType: string): string {
  if (plane === 'kāmāvacara' && cittaType === 'akusala') return 'Kāmāvacara-Akusala';
  if (plane === 'kāmāvacara' && (cittaType === 'kusala' || cittaType === 'sobhana')) return 'Kāmāvacara-Sobhana';
  if (plane === 'rūpāvacara') return 'Rūpāvacara';
  if (plane === 'arūpāvacara') return 'Arūpāvacara';
  if (plane === 'lokuttara') return 'Lokuttara';
  return 'Kāmāvacara-Sobhana';
}

export function AbhidharmaMatrix() {
  const { openTopicDetail } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const cittaList: CittaItem[] = useMemo(() => {
    const nodes = getSystemNodes('citta_89_121');
    return nodes.map((node) => ({
      id: node.id,
      nameVi: node.title,
      namePali: node.code,
      category: mapPlaneToCategory(node.attributes.plane, node.attributes.cittaType),
      subCategory: node.attributes.cittaType === 'akusala' ? 'Bất Thiện Tâm' : 'Đại Thiện Tâm',
      vedana: mapFeelingToLabel(node.attributes.feeling),
      hetu: node.attributes.roots.join(', '),
      cetasikaCount: node.attributes.associatedCetasikaCount,
      description: node.canonicalMeaning,
    }));
  }, []);

  const [selectedCittaId, setSelectedCittaId] = useState<string>(cittaList[0]?.id ?? '');

  const selectedCitta = useMemo(() => {
    return cittaList.find((c) => c.id === selectedCittaId) ?? cittaList[0];
  }, [cittaList, selectedCittaId]);

  const filteredCittas = useMemo(() => {
    return cittaList.filter((c) => {
      const matchesSearch =
        c.nameVi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.namePali.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.hetu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [cittaList, searchTerm, selectedCategory]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-950 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="text-xs uppercase font-mono tracking-widest text-amber-300 font-bold">
              Abhidhamma Paramattha Matrix
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Ma Trận Vi Diệu Pháp (89/121 Tâm &amp; 52 Tâm Sở)
          </h1>
          <p className="text-xs text-amber-200/80 max-w-2xl mt-1">
            Bảng tương tác phân loại các trạng thái tâm thức thực tại tối hậu (Paramattha Dhamma), cảm thọ tương ưng và sự phối hợp của các sở hữu tâm.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-800/60 p-2 rounded-2xl border border-amber-700/50">
          <div className="text-center px-3 border-r border-amber-700/60">
            <div className="text-lg font-mono font-bold text-amber-300">89/121</div>
            <div className="text-[10px] text-amber-200 uppercase">Tâm (Citta)</div>
          </div>
          <div className="text-center px-3 border-r border-amber-700/60">
            <div className="text-lg font-mono font-bold text-amber-300">52</div>
            <div className="text-[10px] text-amber-200 uppercase">Tâm Sở (Cetasika)</div>
          </div>
          <div className="text-center px-3">
            <div className="text-lg font-mono font-bold text-amber-300">28</div>
            <div className="text-[10px] text-amber-200 uppercase">Sắc Pháp (Rūpa)</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên Việt, Pali (Somanassa, Magga...)"
            className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-700 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Tất Cả' },
            { id: 'Kāmāvacara-Akusala', label: '12 Bất Thiện' },
            { id: 'Kāmāvacara-Sobhana', label: '24 Tịnh Quang (Thiện)' },
            { id: 'Rūpāvacara', label: '15 Sắc Giới' },
            { id: 'Lokuttara', label: 'Siêu Thế (Magga/Phala)' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Master Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Citta List */}
        <div className="lg:col-span-7 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {filteredCittas.map((citta) => {
            const isSelected = selectedCitta.id === citta.id;
            return (
              <div
                key={citta.id}
                onClick={() => setSelectedCittaId(citta.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-50/90 border-amber-400 shadow-xs'
                    : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        citta.category.includes('Akusala')
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : citta.category.includes('Lokuttara')
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {citta.subCategory}
                    </span>
                    <span className="text-[10px] text-stone-600 font-medium">
                      Thọ: {citta.vedana}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-stone-900 leading-snug">
                    {citta.nameVi}
                  </h3>
                  <p className="text-[11px] font-serif italic text-stone-600">
                    {citta.namePali}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[11px] font-mono bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-bold">
                    {citta.cetasikaCount} Tâm sở
                  </span>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-amber-800' : 'text-stone-300'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Dense Detail Card */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs sticky top-20 space-y-5">
            <div className="border-b border-stone-200 pb-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-800 uppercase mb-1">
                <Brain className="w-4 h-4" />
                <span>Khảo Cứu Tâm Học Vi Diệu Pháp</span>
              </div>
              <h2 className="text-lg font-bold text-stone-900 leading-tight">
                {selectedCitta.nameVi}
              </h2>
              <p className="text-xs font-serif italic text-amber-900 mt-1">
                {selectedCitta.namePali}
              </p>
            </div>

            {/* Attributes Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-600 uppercase font-bold block">
                  Phân Loại Cõi
                </span>
                <span className="font-semibold text-stone-800">{selectedCitta.category}</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-600 uppercase font-bold block">
                  Cảm Thọ (Vedanā)
                </span>
                <span className="font-semibold text-amber-900">{selectedCitta.vedana}</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-600 uppercase font-bold block">
                  Căn Tương Ưng (Hetu)
                </span>
                <span className="font-semibold text-stone-800">{selectedCitta.hetu}</span>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-600 uppercase font-bold block">
                  Số Sở Hữu Đồng Sanh
                </span>
                <span className="font-semibold text-emerald-800">{selectedCitta.cetasikaCount} Tâm sở phối hợp</span>
              </div>
            </div>

            {/* Exegesis & Description */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                Luận Giải Chi Tiết:
              </span>
              <p className="text-xs text-stone-700 leading-relaxed bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/60">
                {selectedCitta.description}
              </p>
            </div>

            {/* Quick Action */}
            <button
              onClick={() => openTopicDetail('topic-1')}
              className="w-full py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Xem Bài Khảo Cứu Liên Kết Trong Cây Chủ Đề</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
