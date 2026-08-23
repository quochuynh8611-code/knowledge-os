import React, { useState } from 'react';
import { Sparkles, Brain, Search, Filter, BookOpen, Layers, CheckCircle2, ChevronRight } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface CittaItem {
  id: string;
  nameVi: string;
  namePali: string;
  category: 'Kāmāvacara-Akusala' | 'Kāmāvacara-Ahetuka' | 'Kāmāvacara-Sobhana' | 'Rūpāvacara' | 'Arūpāvacara' | 'Lokuttara';
  subCategory: string;
  vedana: string;
  hetu: string;
  cetasikaCount: number;
  description: string;
}

const CITTA_DATABASE: CittaItem[] = [
  // 12 Bất thiện tâm (Akusala Citta)
  {
    id: 'citta-1',
    nameVi: 'Tâm Tham tương ưng tà kiến, vô trợ',
    namePali: 'Somanassa-sahagataṁ diṭṭhigata-sampayuttaṁ asaṅkhārikaṁ',
    category: 'Kāmāvacara-Akusala',
    subCategory: '8 Tâm Tham (Lobha-mūla)',
    vedana: 'Somanassa (Hỷ)',
    hetu: 'Tham, Si',
    cetasikaCount: 19,
    description: 'Tâm khởi lên hoan hỷ, gắn liền với quan điểm sai lạc (tà kiến) mà không cần sự thúc đẩy hay xúi giục từ bên ngoài.',
  },
  {
    id: 'citta-2',
    nameVi: 'Tâm Tham tương ưng tà kiến, hữu trợ',
    namePali: 'Somanassa-sahagataṁ diṭṭhigata-sampayuttaṁ sasaṅkhārikaṁ',
    category: 'Kāmāvacara-Akusala',
    subCategory: '8 Tâm Tham (Lobha-mūla)',
    vedana: 'Somanassa (Hỷ)',
    hetu: 'Tham, Si',
    cetasikaCount: 21,
    description: 'Tâm khởi lên hoan hỷ, đi kèm tà kiến, nhưng cần có sự tác động, xúi giục hoặc suy nghĩ đắn đo trước khi sanh khởi.',
  },
  {
    id: 'citta-3',
    nameVi: 'Tâm Tham bất tương ưng tà kiến, vô trợ',
    namePali: 'Somanassa-sahagataṁ diṭṭhigata-vippayuttaṁ asaṅkhārikaṁ',
    category: 'Kāmāvacara-Akusala',
    subCategory: '8 Tâm Tham (Lobha-mūla)',
    vedana: 'Somanassa (Hỷ)',
    hetu: 'Tham, Si',
    cetasikaCount: 19,
    description: 'Tâm yêu thích, đam mê đối tượng nhưng hiểu rõ nhân quả (không chấp tà kiến), sanh khởi tự nhiên không cần thúc giục.',
  },
  {
    id: 'citta-4',
    nameVi: 'Tâm Tham bất tương ưng tà kiến, hữu trợ',
    namePali: 'Somanassa-sahagataṁ diṭṭhigata-vippayuttaṁ sasaṅkhārikaṁ',
    category: 'Kāmāvacara-Akusala',
    subCategory: '8 Tâm Tham (Lobha-mūla)',
    vedana: 'Somanassa (Hỷ)',
    hetu: 'Tham, Si',
    cetasikaCount: 21,
    description: 'Tâm hoan hỷ đam mê không tà kiến, nhưng cần tác động xúi giục, có thể phối hợp tâm sở Ngã Mạn (Māna).',
  },
  {
    id: 'citta-9',
    nameVi: 'Tâm Sân tương ưng phẫn uất, vô trợ',
    namePali: 'Domanassa-sahagataṁ paṭigha-sampayuttaṁ asaṅkhārikaṁ',
    category: 'Kāmāvacara-Akusala',
    subCategory: '2 Tâm Sân (Dosa-mūla)',
    vedana: 'Domanassa (Ưu)',
    hetu: 'Sân, Si',
    cetasikaCount: 18,
    description: 'Tâm bực tức, bất bình, căm phẫn khởi lên ngay tức khắc khi gặp đối tượng bất toại nguyện, đi kèm thọ Ưu.',
  },
  {
    id: 'citta-11',
    nameVi: 'Tâm Si tương ưng hoài nghi',
    namePali: 'Upekkhā-sahagataṁ vicikicchā-sampayuttaṁ',
    category: 'Kāmāvacara-Akusala',
    subCategory: '2 Tâm Si (Moha-mūla)',
    vedana: 'Upekkhā (Xả)',
    hetu: 'Si',
    cetasikaCount: 15,
    description: 'Tâm phân vân, không quyết đoán, nghi ngờ về Phật, Pháp, Tăng, Tam Thế Nhân Quả và Tứ Thánh Đế.',
  },
  // Đại Thiện Tâm (Mahā-kusala)
  {
    id: 'citta-31',
    nameVi: 'Đại Thiện Tâm tương ưng trí, vô trợ',
    namePali: 'Somanassa-sahagataṁ ñāṇa-sampayuttaṁ asaṅkhārikaṁ',
    category: 'Kāmāvacara-Sobhana',
    subCategory: '8 Đại Thiện Tâm (Mahā-kusala)',
    vedana: 'Somanassa (Hỷ)',
    hetu: 'Vô Tham, Vô Sân, Vô Si (Trí Tuệ)',
    cetasikaCount: 38,
    description: 'Tâm làm việc phước thiện (bố thí, trì giới, thiền định) với niềm hoan hỷ và thấu hiểu rõ lý nhân quả, sanh khởi tự nhiên không do dự.',
  },
  {
    id: 'citta-35',
    nameVi: 'Đại Thiện Tâm thọ Xả, tương ưng trí, vô trợ',
    namePali: 'Upekkhā-sahagataṁ ñāṇa-sampayuttaṁ asaṅkhārikaṁ',
    category: 'Kāmāvacara-Sobhana',
    subCategory: '8 Đại Thiện Tâm (Mahā-kusala)',
    vedana: 'Upekkhā (Xả)',
    hetu: 'Vô Tham, Vô Sân, Vô Si',
    cetasikaCount: 37,
    description: 'Tâm làm thiện pháp với tâm thái xả ly thanh tịnh, đi kèm trí tuệ sâu sắc, đặc trưng của bậc hành thiền có chánh niệm vững vàng.',
  },
  // Sắc Giới (Rūpāvacara)
  {
    id: 'citta-51',
    nameVi: 'Tâm Sơ Thiền Thiện (Sắc Giới)',
    namePali: 'Vitakka-vicāra-pīti-sukh’ekaggatā-sahitaṁ Paṭhamajjhāna-kusala-cittaṁ',
    category: 'Rūpāvacara',
    subCategory: 'Sơ Thiền (5 Thiền Chi)',
    vedana: 'Somanassa (Hỷ)',
    hetu: '3 Căn Thiện (Alobha, Adosa, Amoha)',
    cetasikaCount: 35,
    description: 'Định tâm lắng đọng hoàn toàn 5 triền cái, đầy đủ 5 chi thiền: Tầm (Vitakka), Tứ (Vicāra), Hỷ (Pīti), Lạc (Sukha), và Nhất Tâm (Ekaggatā).',
  },
  // Siêu Thế (Lokuttara)
  {
    id: 'citta-81',
    nameVi: 'Tâm Sơ Đạo (Sotāpatti-magga)',
    namePali: 'Sotāpatti-magga-cittaṁ',
    category: 'Lokuttara',
    subCategory: '4 Tâm Đạo Siêu Thế',
    vedana: 'Somanassa (Hỷ) / Upekkhā (Xả)',
    hetu: '3 Căn Thiện Siêu Thế',
    cetasikaCount: 36,
    description: 'Tâm đắc quả vị Dự Lưu (Thất Lai), đoạn trừ tận gốc 3 kiết sử đầu tiên: Thân Kiến (Sakkāya-diṭṭhi), Hoài Nghi (Vicikicchā), và Giới Cấm Thủ (Sīlabbata-parāmāsa).',
  },
];

export function AbhidharmaMatrix() {
  const { openTopicDetail } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCitta, setSelectedCitta] = useState<CittaItem>(CITTA_DATABASE[0]);

  const filteredCittas = CITTA_DATABASE.filter((c) => {
    const matchesSearch =
      c.nameVi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.namePali.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

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
                onClick={() => setSelectedCitta(citta)}
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
