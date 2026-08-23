import React, { useState } from 'react';
import { Compass, Sparkles, RefreshCw, Layers, BookOpen, Clock, Moon, Sun, ArrowRight } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface Hexagram {
  number: number;
  nameVi: string;
  nameHán: string;
  pinyin: string;
  upperTrigram: string;
  lowerTrigram: string;
  nature: string;
  meaning: string;
  philosophicalInsight: string;
}

const HEXAGRAMS: Hexagram[] = [
  {
    number: 1,
    nameVi: 'Thuần Càn',
    nameHán: '乾為天',
    pinyin: 'Qián wéi Tiān',
    upperTrigram: 'Càn (Trời / Kim)',
    lowerTrigram: 'Càn (Trời / Kim)',
    nature: 'Đại Cát - Nguyên Hanh Lợi Trinh',
    meaning: 'Sức mạnh cương kiện, chủ động sáng tạo của Vũ trụ, tượng trưng cho Đạo của bậc Quân tử không ngừng tự cường.',
    philosophicalInsight: 'Đối chiếu Phật học: Tương ứng với Tinh Tấn Căn (Viriya) và Đại Nguyện Bồ Đề Tâm kiên cố không thối chuyển.',
  },
  {
    number: 2,
    nameVi: 'Thuần Khôn',
    nameHán: '坤為地',
    pinyin: 'Kūn wéi Dì',
    upperTrigram: 'Khôn (Đất / Thổ)',
    lowerTrigram: 'Khôn (Đất / Thổ)',
    nature: 'Đại Cát - Hậu Đức Tải Vật',
    meaning: 'Đức nhu thuận, bao dung, tiếp nhận vạn vật, chở che nuôi dưỡng muôn loài vô điều kiện.',
    philosophicalInsight: 'Đối chiếu Phật học: Tương ứng với Tâm Từ Vô Lượng (Mettā) và Hạnh Nhẫn Nhục Ba La Mật (Khanti).',
  },
  {
    number: 11,
    nameVi: 'Địa Thiên Thái',
    nameHán: '地天泰',
    pinyin: 'Dì Tiān Tài',
    upperTrigram: 'Khôn (Đất)',
    lowerTrigram: 'Càn (Trời)',
    nature: 'Tiểu Vãng Đại Lai - Cát Hanh',
    meaning: 'Khí trời giáng xuống, khí đất bốc lên, âm dương giao hòa, vạn vật thông suốt, xã hội thái bình thịnh trị.',
    philosophicalInsight: 'Đối chiếu Phật học: Trạng thái Tâm Thiện tương ưng Trí Tuệ (Ñāṇa-sampayutta), Danh Sắc hòa hợp thanh tịnh.',
  },
  {
    number: 12,
    nameVi: 'Thiên Địa Bĩ',
    nameHán: '天地否',
    pinyin: 'Tiān Dì Pǐ',
    upperTrigram: 'Càn (Trời)',
    lowerTrigram: 'Khôn (Đất)',
    nature: 'Đại Vãng Tiểu Lai - Bế Tắc',
    meaning: 'Trời ở trên cao không đoái hoài, đất ở dưới thấp không thấu cảm, âm dương cách trở, thời vận bế tắc.',
    philosophicalInsight: 'Đối chiếu Phật học: Biểu hiện của Vô Minh (Avijjā) và Ái Dục ngăn che thực tướng, dẫn đến luân hồi khổ não.',
  },
  {
    number: 63,
    nameVi: 'Thủy Hỏa Ký Tế',
    nameHán: '水火既濟',
    pinyin: 'Shuǐ Huǒ Jì Jì',
    upperTrigram: 'Khảm (Nước)',
    lowerTrigram: 'Ly (Lửa)',
    nature: 'Tiểu Hanh - Đã Hoàn Thành',
    meaning: 'Nước ở trên lửa nấu chín thức ăn, mọi việc đã an bài đúng vị trí, hoàn tất một chu kỳ chuyển dịch.',
    philosophicalInsight: 'Đối chiếu Phật học: Đắc định tịch tĩnh, các kiết sử tạm thời được lắng dịu (Tương tợ Đạo Quả).',
  },
  {
    number: 64,
    nameVi: 'Hỏa Thủy Vị Tế',
    nameHán: '火水未濟',
    pinyin: 'Huǒ Shuǐ Wèi Jì',
    upperTrigram: 'Ly (Lửa)',
    lowerTrigram: 'Khảm (Nước)',
    nature: 'Chưa Hoàn Thành - Khởi Đầu Mới',
    meaning: 'Lửa bốc lên cao, nước chảy xuống dưới không gặp nhau; việc chưa xong nhưng mở ra tiềm năng tiến hóa vô tận.',
    philosophicalInsight: 'Đối chiếu Phật học: Chân lý Vô Thường (Anicca) và Duyên Sanh (Paṭiccasamuppāda) không ngừng vận động biến dịch.',
  },
];

// 9 Cung Kỳ Môn Độn Giáp
const QI_MEN_PALACES = [
  { id: 4, name: 'Tốn 4 (Đông Nam)', element: 'Mộc', door: 'Đỗ Môn', star: 'Thiên Phụ', deity: 'Lục Hợp', meaning: 'Học vấn, khảo cứu, thiền tọa thanh tịnh' },
  { id: 9, name: 'Ly 9 (Chính Nam)', element: 'Hỏa', door: 'Cảnh Môn', star: 'Thiên Anh', deity: 'Cửu Thiên', meaning: 'Trí tuệ quang minh, văn thư, hiển lộ' },
  { id: 2, name: 'Khôn 2 (Tây Nam)', element: 'Thổ', door: 'Tử Môn', star: 'Thiên Nhuế', deity: 'Cửu Địa', meaning: 'Tĩnh dưỡng, chứa chấp, khảo cứu cổ thư' },
  { id: 3, name: 'Chấn 3 (Chính Đông)', element: 'Mộc', door: 'Thương Môn', star: 'Thiên Xung', deity: 'Bạch Hổ', meaning: 'Hành động, khai phá đề tài mới' },
  { id: 5, name: 'Trung Cung 5', element: 'Thổ', door: 'Trung Cung', star: 'Thiên Cầm', deity: 'Thái Cực', meaning: 'Tâm trung đạo, nhất tâm bất loạn' },
  { id: 7, name: 'Đoài 7 (Chính Tây)', element: 'Kim', door: 'Kinh Môn', star: 'Thiên Trụ', deity: 'Huyền Vũ', meaning: 'Hùng biện, luận giải, vấn đáp học thuật' },
  { id: 8, name: 'Cấn 8 (Đông Bắc)', element: 'Thổ', door: 'Sinh Môn', star: 'Thiên Nhậm', deity: 'Đằng Xà', meaning: 'Tài lộc, sinh khí, khởi đầu chu kỳ mới' },
  { id: 1, name: 'Khảm 1 (Chính Bắc)', element: 'Thủy', door: 'Hưu Môn', star: 'Thiên Bồng', deity: 'Trực Phù', meaning: 'Nghỉ ngơi, thiền định thâm sâu, quý nhân' },
  { id: 6, name: 'Càn 6 (Tây Bắc)', element: 'Kim', door: 'Khai Môn', star: 'Thiên Tâm', deity: 'Thái Thường', meaning: 'Khai mở trí tuệ lãnh đạo, đại cát hanh thông' },
];

export function DivinationMatrix() {
  const { openTopicDetail } = useData();
  const [activeTab, setActiveTab] = useState<'iching' | 'qimen'>('iching');
  const [selectedHexagram, setSelectedHexagram] = useState<Hexagram>(HEXAGRAMS[0]);
  const [selectedPalace, setSelectedPalace] = useState(QI_MEN_PALACES[8]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-stone-950 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-indigo-300" />
            <span className="text-xs uppercase font-mono tracking-widest text-indigo-300 font-bold">
              Eastern Esoteric Cosmogram
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Bàn Đồ Dịch Học &amp; Kỳ Môn Độn Giáp (Cửu Cung Bát Quái)
          </h1>
          <p className="text-xs text-indigo-200/80 max-w-2xl mt-1">
            Mô phỏng 64 Quẻ Chu Dịch và Ma trận Kỳ Môn Độn Giáp Cửu Cung, Bát Môn, Cửu Tinh, Bát Thần với đối chiếu triết học tâm thức.
          </p>
        </div>

        <div className="flex bg-indigo-900/60 p-1 rounded-2xl border border-indigo-700/50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('iching')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'iching' ? 'bg-indigo-700 text-white shadow-xs' : 'text-indigo-200 hover:text-white'
            }`}
          >
            Kinh Dịch 64 Quẻ
          </button>
          <button
            onClick={() => setActiveTab('qimen')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'qimen' ? 'bg-indigo-700 text-white shadow-xs' : 'text-indigo-200 hover:text-white'
            }`}
          >
            Kỳ Môn Cửu Cung
          </button>
        </div>
      </div>

      {activeTab === 'iching' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Hexagram Grid */}
          <div className="lg:col-span-7 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HEXAGRAMS.map((hex) => {
                const isSelected = selectedHexagram.number === hex.number;
                return (
                  <div
                    key={hex.number}
                    onClick={() => setSelectedHexagram(hex)}
                    className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-400 shadow-xs'
                        : 'bg-white border-stone-200/80 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md">
                        Quẻ #{hex.number}
                      </span>
                      <span className="text-sm font-serif font-bold text-stone-700">{hex.nameHán}</span>
                    </div>
                    <h3 className="text-base font-bold text-stone-900">{hex.nameVi}</h3>
                    <p className="text-[11px] text-stone-500 line-clamp-2">{hex.meaning}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Hexagram Exegesis */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs sticky top-20 space-y-5">
              <div className="border-b border-stone-200 pb-4">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-indigo-800 uppercase mb-1">
                  <span>Quẻ Thứ {selectedHexagram.number} Chu Dịch</span>
                  <span className="text-sm font-serif text-stone-900">{selectedHexagram.nameHán}</span>
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  {selectedHexagram.nameVi}
                </h2>
                <p className="text-xs text-indigo-900 italic font-mono mt-0.5">
                  {selectedHexagram.pinyin}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-600 uppercase font-bold block">Thượng Quái (Ngoại)</span>
                  <span className="font-semibold text-stone-800">{selectedHexagram.upperTrigram}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-600 uppercase font-bold block">Hạ Quái (Nội)</span>
                  <span className="font-semibold text-stone-800">{selectedHexagram.lowerTrigram}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                  Tượng Quẻ &amp; Đại Ý Dịch Lý:
                </span>
                <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  {selectedHexagram.meaning}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                  Đối Chiếu Tâm Học Phật Giáo:
                </span>
                <p className="text-xs text-indigo-950 leading-relaxed bg-indigo-50/80 p-3.5 rounded-xl border border-indigo-200/80">
                  {selectedHexagram.philosophicalInsight}
                </p>
              </div>

              <button
                onClick={() => openTopicDetail('topic-2')}
                className="w-full py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Xem Chủ Đề Kinh Dịch &amp; Dịch Lý Trong Cây Chủ Đề</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Kỳ Môn 9 Cung Board */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <div className="grid grid-cols-3 gap-3 p-4 bg-stone-900 rounded-3xl border border-stone-800 shadow-2xl">
              {QI_MEN_PALACES.map((palace) => {
                const isSelected = selectedPalace.id === palace.id;
                return (
                  <div
                    key={palace.id}
                    onClick={() => setSelectedPalace(palace)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between min-h-[140px] ${
                      isSelected
                        ? 'bg-indigo-900/90 border-indigo-400 text-white ring-2 ring-indigo-400'
                        : 'bg-stone-800/90 border-stone-700 text-stone-200 hover:bg-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-amber-400">{palace.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-700 text-stone-300 font-mono">
                        {palace.element}
                      </span>
                    </div>

                    <div className="my-2 space-y-1 text-xs">
                      <div className="font-semibold text-indigo-300">🚪 {palace.door}</div>
                      <div className="text-amber-200">⭐ {palace.star}</div>
                      <div className="text-emerald-300">🛡️ {palace.deity}</div>
                    </div>

                    <div className="text-[10px] text-stone-400 truncate">
                      {palace.meaning}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs sticky top-20 space-y-4">
              <div className="border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-800 uppercase mb-1">
                  <Compass className="w-4 h-4" />
                  <span>Kỳ Môn Độn Giáp Bí Cấp</span>
                </div>
                <h2 className="text-xl font-bold text-stone-900">{selectedPalace.name}</h2>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  Hành {selectedPalace.element} • Cửu Tinh: {selectedPalace.star} • Bát Môn: {selectedPalace.door}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-indigo-800 font-bold uppercase block">Bát Môn</span>
                  <span className="font-bold text-indigo-950">{selectedPalace.door}</span>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-amber-800 font-bold uppercase block">Cửu Tinh</span>
                  <span className="font-bold text-amber-950">{selectedPalace.star}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">Bát Thần</span>
                  <span className="font-bold text-emerald-950">{selectedPalace.deity}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                  Ứng Dụng Khảo Cứu &amp; Dự Đoán:
                </span>
                <p className="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  {selectedPalace.meaning}. Cung này mang thuộc tính hành {selectedPalace.element}, đại diện cho các phương thức tư duy và vận thế tương thích.
                </p>
              </div>

              <button
                onClick={() => openTopicDetail('topic-2')}
                className="w-full py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Xem Tài Liệu Kỳ Môn Toàn Thư</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
