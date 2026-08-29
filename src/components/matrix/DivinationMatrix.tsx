import React, { useState, useMemo } from 'react';
import { Compass, Sparkles, RefreshCw, Layers, BookOpen, Clock, Moon, Sun, ArrowRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { getSystemNodes } from '../../lib/scholarSuite/selectors';

export interface Hexagram {
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

export interface QiMenPalace {
  id: number;
  name: string;
  element: string;
  door: string;
  star: string;
  deity: string;
  meaning: string;
}

export function DivinationMatrix() {
  const { openTopicDetail } = useData();
  const [activeTab, setActiveTab] = useState<'iching' | 'qimen'>('iching');

  const hexagramList: Hexagram[] = useMemo(() => {
    const nodes = getSystemNodes('iching_64');
    return nodes.map((node) => ({
      number: node.attributes.hexagramNumber,
      nameVi: node.title,
      nameHán: node.code,
      pinyin: `Hexagram #${node.attributes.hexagramNumber}`,
      upperTrigram: node.attributes.upperTrigram,
      lowerTrigram: node.attributes.lowerTrigram,
      nature: node.attributes.nature,
      meaning: node.canonicalMeaning,
      philosophicalInsight: node.crossDomainAnalogy ?? node.canonicalMeaning,
    }));
  }, []);

  const palaceList: QiMenPalace[] = useMemo(() => {
    const nodes = getSystemNodes('qimen_9');
    return nodes.map((node) => ({
      id: node.attributes.palaceNumber,
      name: node.title,
      element: node.attributes.element,
      door: node.attributes.door,
      star: node.attributes.star,
      deity: node.attributes.deity,
      meaning: node.canonicalMeaning,
    }));
  }, []);

  const [selectedHexNumber, setSelectedHexNumber] = useState<number>(hexagramList[0]?.number ?? 1);
  const [selectedPalaceId, setSelectedPalaceId] = useState<number>(palaceList[0]?.id ?? 1);

  const selectedHexagram = useMemo(() => {
    return hexagramList.find((h) => h.number === selectedHexNumber) ?? hexagramList[0];
  }, [hexagramList, selectedHexNumber]);

  const selectedPalace = useMemo(() => {
    return palaceList.find((p) => p.id === selectedPalaceId) ?? palaceList[0];
  }, [palaceList, selectedPalaceId]);

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
              {hexagramList.map((hex) => {
                const isSelected = selectedHexagram.number === hex.number;
                return (
                  <div
                    key={hex.number}
                    onClick={() => setSelectedHexNumber(hex.number)}
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
              {palaceList.map((palace) => {
                const isSelected = selectedPalace.id === palace.id;
                return (
                  <div
                    key={palace.id}
                    onClick={() => setSelectedPalaceId(palace.id)}
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
