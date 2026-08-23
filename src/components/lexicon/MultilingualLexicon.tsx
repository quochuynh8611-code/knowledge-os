import React, { useState } from 'react';
import { Search, BookA, Sparkles, Copy, CheckCircle2, Bookmark, Filter } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface LexiconEntry {
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

const LEXICON_ENTRIES: LexiconEntry[] = [
  {
    id: 'lex-1',
    pali: 'Citta',
    sanskrit: 'Citta (चित्त)',
    hanTu: '心',
    pinyin: 'Xīn',
    vietnamese: 'Tâm / Thức (Khả năng nhận biết cảnh)',
    category: 'phat-hoc',
    definition: 'Thực tại tối hậu có đặc tính nhận biết đối tượng (Arammaṇa). Trong Abhidhamma chia làm 89 hoặc 121 tâm.',
    canonicalRef: 'Dhammasaṅgaṇī § 1; Abhidhammattha-saṅgaha Ch. 1',
    tags: ['Abhidhamma', 'Paramattha', 'Tam Tạng'],
  },
  {
    id: 'lex-2',
    pali: 'Cetasika',
    sanskrit: 'Caitasika (चैतसिक)',
    hanTu: '心所',
    pinyin: 'Xīnsuǒ',
    vietnamese: 'Tâm Sở / Sở Hữu Tâm (52 Tâm sở)',
    category: 'phat-hoc',
    definition: 'Các trạng thái tâm lý đồng sanh, đồng diệt, đồng nương một căn và đồng bắt một cảnh với Tâm. Gồm 7 Biến hành, 6 Biệt cảnh, 14 Bất thiện và 25 Tịnh quang.',
    canonicalRef: 'Abhidhammattha-saṅgaha Ch. 2; Vibhaṅga',
    tags: ['Abhidhamma', 'Tâm Sở'],
  },
  {
    id: 'lex-3',
    pali: 'Paṭiccasamuppāda',
    sanskrit: 'Pratītyasamutpāda (प्रतीत्यसमुत्पाद)',
    hanTu: '十二因緣 / 緣起',
    pinyin: 'Yuánqǐ',
    vietnamese: 'Duyên Khởi / Thập Nhị Nhân Duyên',
    category: 'phat-hoc',
    definition: 'Quy luật vũ trụ về sự tương tức tương sinh: "Cái này có thì cái kia có, cái này sinh thì cái kia sinh; cái này không có thì cái kia không có, cái này diệt thì cái kia diệt".',
    canonicalRef: 'Saṁyutta Nikāya (SN 12 - Nidāna Saṁyutta)',
    tags: ['Kinh Tạng', 'Duyên Khởi'],
  },
  {
    id: 'lex-4',
    pali: 'Vipassanā-ñāṇa',
    sanskrit: 'Vipaśyanā-jñāna (विपश्यना ज्ञान)',
    hanTu: '觀智 / 內觀智',
    pinyin: 'Guānzhì',
    vietnamese: 'Tuệ Minh Sát (16 Tầng Tuệ Quán)',
    category: 'phat-hoc',
    definition: 'Tiến trình trí tuệ trực nhận Tam Tướng (Vô Thường - Khổ - Vô Ngã) từ Tuệ Phân Biệt Danh Sắc (Nāmarūpapariccheda-ñāṇa) đến Tuệ Đạo (Magga-ñāṇa).',
    canonicalRef: 'Visuddhimagga (Thanh Tịnh Đạo) Ch. XX-XXII',
    tags: ['Thiền Định', 'Vipassana'],
  },
  {
    id: 'lex-5',
    pali: '—',
    sanskrit: '—',
    hanTu: '奇門遁甲',
    pinyin: 'Qí Mén Dùn Jiǎ',
    vietnamese: 'Kỳ Môn Độn Giáp (Tam Thức)',
    category: 'huyen-hoc',
    definition: 'Đỉnh cao của thuật số phương Đông dự đoán không-thời gian dựa trên Cửu Cung, Tam Kỳ (Ất Bính Đinh), Lục Nghi (Mậu Kỷ Canh Tân Nhâm Quý), Cửu Tinh, Bát Môn và Bát Thần.',
    canonicalRef: 'Kỳ Môn Độn Giáp Bí Kíp Toàn Thư (Hoàng Đế Âm Phù Kinh)',
    tags: ['Tam Thức', 'Kỳ Môn'],
  },
  {
    id: 'lex-6',
    pali: '—',
    sanskrit: '—',
    hanTu: '易經 / 陰陽五行',
    pinyin: 'Yì Jīng / Yīn Yáng',
    vietnamese: 'Kinh Dịch & Âm Dương Biến Dịch',
    category: 'huyen-hoc',
    definition: 'Hệ thống triết học vũ trụ luận phương Đông biểu thị sự vận động không ngừng của vạn vật qua Thái Cực, Lưỡng Nghi, Tứ Tượng và 64 Quẻ.',
    canonicalRef: 'Chu Dịch (Thập Dực - Hệ Từ Thượng/Hạ)',
    tags: ['Dịch Học', 'Kinh Dịch'],
  },
];

export function MultilingualLexicon() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'phat-hoc' | 'huyen-hoc'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEntries = LEXICON_ENTRIES.filter((entry) => {
    const matchesSearch =
      entry.pali.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.sanskrit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.hanTu.includes(searchTerm) ||
      entry.vietnamese.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || entry.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleCopy = (entry: LexiconEntry) => {
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
