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
  Quote,
} from 'lucide-react';
import {
  getTerminologyLexiconItems,
  getTerminologyEntryById,
  getTerminologyFacetCounts,
  LexiconItemView,
} from '../../lib/scholarSuite/selectors';
import type { TerminologyEntry } from '../../types/terminology';
import { ScholarCitationModal } from '../modals/ScholarCitationModal';

export type { LexiconItemView };

function getCategoryBadge(category: string, compact = false) {
  switch (category) {
    case 'phat-hoc':
      return {
        label: compact ? 'Phật' : 'Phật Học',
        className: 'bg-amber-100 text-amber-900 border border-amber-200',
      };
    case 'huyen-hoc':
      return {
        label: compact ? 'Dịch' : 'Huyền Học',
        className: 'bg-indigo-100 text-indigo-900 border border-indigo-200',
      };
    case 'y-hoc-co-truyen':
      return {
        label: compact ? 'Đông Y' : 'Đông Y Học',
        className: 'bg-teal-100 text-teal-900 border border-teal-200',
      };
    case 'triet-hoc':
      return {
        label: compact ? 'Triết' : 'Triết Học',
        className: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
      };
    case 'khoa-hoc-tam-thuc':
      return {
        label: compact ? 'Tâm Thức' : 'Khoa Học Tâm Thức',
        className: 'bg-sky-100 text-sky-900 border border-sky-200',
      };
    default:
      return {
        label: compact ? category.slice(0, 4) : category,
        className: 'bg-stone-100 text-stone-800 border border-stone-200',
      };
  }
}

function getSourceTypeBadge(sourceType?: string) {
  switch (sourceType) {
    case 'lexicon':
      return {
        label: 'Từ Điển',
        className: 'bg-stone-100 text-stone-700 border border-stone-300/70',
      };
    case 'system_node':
      return {
        label: 'Ma Trận',
        className: 'bg-sky-50 text-sky-800 border border-sky-200',
      };
    case 'tcm_registry':
      return {
        label: 'Đông Y',
        className: 'bg-teal-50 text-teal-800 border border-teal-200',
      };
    default:
      return null;
  }
}

export function MultilingualLexicon() {
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState<'all' | string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'lexicon' | 'system_node' | 'tcm_registry'>('all');
  const [tcmCategoryFilter, setTcmCategoryFilter] = useState<'all' | 'kinh-huyet' | 'tang-tuong' | 'duoc-tinh' | 'bat-cuong'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed');
  const [selectedCitationEntry, setSelectedCitationEntry] = useState<TerminologyEntry | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(60);

  const totalCount = useMemo(() => {
    return getTerminologyLexiconItems().length;
  }, []);

  const facetCounts = useMemo(() => {
    return getTerminologyFacetCounts(searchTerm);
  }, [searchTerm]);

  const filteredEntries = useMemo(() => {
    return getTerminologyLexiconItems({
      domain: domainFilter === 'all' ? undefined : domainFilter,
      sourceType: sourceFilter === 'all' ? undefined : sourceFilter,
      tcmCategory: tcmCategoryFilter === 'all' ? undefined : tcmCategoryFilter,
      query: searchTerm,
    });
  }, [domainFilter, sourceFilter, tcmCategoryFilter, searchTerm]);

  const displayedEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleLimit);
  }, [filteredEntries, visibleLimit]);

  const isTcmContext = domainFilter === 'y-hoc-co-truyen' || sourceFilter === 'tcm_registry';

  const isFilterActive =
    searchTerm.trim() !== '' ||
    domainFilter !== 'all' ||
    sourceFilter !== 'all' ||
    tcmCategoryFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setDomainFilter('all');
    setSourceFilter('all');
    setTcmCategoryFilter('all');
    setVisibleLimit(60);
  };

  const handleCopy = (entry: LexiconItemView) => {
    const text = `${entry.vietnamese}\n- Pali: ${entry.pali}\n- Sanskrit: ${entry.sanskrit}\n- Hán Tự: ${entry.hanTu} (${entry.pinyin})\n- Định nghĩa: ${entry.definition}\n- Xuất xứ: ${entry.canonicalRef}`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCitation = (entryId: string) => {
    const entry = getTerminologyEntryById(entryId);
    if (entry) {
      setSelectedCitationEntry(entry);
    }
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
            Từ Điển Thuật Ngữ Đa Ngữ (Pali - Sanskrit - Hán Cổ - Việt - Đông Y)
          </h1>
          <p className="text-xs text-stone-300 max-w-2xl mt-1">
            Tra cứu gốc từ, chiết tự, chỉ số đối chiếu xuất xứ Tam Tạng (PTS/Taisho), Dịch học và Y Học Cổ Truyền Đông phương.
          </p>
        </div>
      </div>

      {/* Multi-Facet Filtering and Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3.5">
        {/* Search Bar & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tra cứu: Citta, Hợp Cốc, Nhân Sâm, 心, LI4..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-700 focus:outline-hidden"
            />
          </div>

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

        {/* Facet Layer 1: Domain Facets */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-stone-100">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider min-w-28">
            Miền Tri Thức:
          </span>
          <div
            role="group"
            aria-label="Bộ lọc miền tri thức"
            className="flex flex-wrap gap-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200/50"
          >
            <button
              onClick={() => setDomainFilter('all')}
              aria-pressed={domainFilter === 'all'}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                domainFilter === 'all'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              Tất Cả <span className="text-[10px] font-normal opacity-80">({facetCounts.total})</span>
            </button>
            <button
              onClick={() => setDomainFilter('phat-hoc')}
              aria-pressed={domainFilter === 'phat-hoc'}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                domainFilter === 'phat-hoc'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-amber-900 hover:bg-amber-100/60'
              }`}
            >
              Phật Học <span className="text-[10px] font-normal opacity-80">({facetCounts.byDomain['phat-hoc'] ?? 0})</span>
            </button>
            <button
              onClick={() => setDomainFilter('huyen-hoc')}
              aria-pressed={domainFilter === 'huyen-hoc'}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                domainFilter === 'huyen-hoc'
                  ? 'bg-indigo-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-indigo-900 hover:bg-indigo-100/60'
              }`}
            >
              Huyền Học <span className="text-[10px] font-normal opacity-80">({facetCounts.byDomain['huyen-hoc'] ?? 0})</span>
            </button>
            <button
              onClick={() => setDomainFilter('y-hoc-co-truyen')}
              aria-pressed={domainFilter === 'y-hoc-co-truyen'}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                domainFilter === 'y-hoc-co-truyen'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-teal-900 hover:bg-teal-100/60'
              }`}
            >
              Đông Y Học <span className="text-[10px] font-normal opacity-80">({facetCounts.byDomain['y-hoc-co-truyen'] ?? 0})</span>
            </button>
          </div>
        </div>

        {/* Facet Layer 2: Source Type Facets */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider min-w-28">
            Nguồn Cấu Trúc:
          </span>
          <div
            role="group"
            aria-label="Bộ lọc nguồn cấu trúc"
            className="flex flex-wrap gap-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200/50"
          >
            <button
              onClick={() => setSourceFilter('all')}
              aria-pressed={sourceFilter === 'all'}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                sourceFilter === 'all'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              Tất Cả Nguồn <span className="text-[10px] font-normal opacity-80">({facetCounts.total})</span>
            </button>
            <button
              onClick={() => setSourceFilter('lexicon')}
              aria-pressed={sourceFilter === 'lexicon'}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                sourceFilter === 'lexicon'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              Từ Điển <span className="text-[10px] font-normal opacity-80">({facetCounts.bySourceType['lexicon'] ?? 0})</span>
            </button>
            <button
              onClick={() => setSourceFilter('system_node')}
              aria-pressed={sourceFilter === 'system_node'}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                sourceFilter === 'system_node'
                  ? 'bg-sky-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-sky-900 hover:bg-sky-100/60'
              }`}
            >
              Ma Trận <span className="text-[10px] font-normal opacity-80">({facetCounts.bySourceType['system_node'] ?? 0})</span>
            </button>
            <button
              onClick={() => setSourceFilter('tcm_registry')}
              aria-pressed={sourceFilter === 'tcm_registry'}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                sourceFilter === 'tcm_registry'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-teal-900 hover:bg-teal-100/60'
              }`}
            >
              Kho Đông Y <span className="text-[10px] font-normal opacity-80">({facetCounts.bySourceType['tcm_registry'] ?? 0})</span>
            </button>
          </div>
        </div>

        {/* Facet Layer 3: Conditional TCM Subcategories */}
        {isTcmContext && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-teal-100 bg-teal-50/40 p-2 rounded-xl">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider min-w-28">
              Phân Nhóm Đông Y:
            </span>
            <div
              role="group"
              aria-label="Phân nhóm Đông Y"
              className="flex flex-wrap gap-1.5"
            >
              <button
                onClick={() => setTcmCategoryFilter('all')}
                aria-pressed={tcmCategoryFilter === 'all'}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  tcmCategoryFilter === 'all'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-teal-800 hover:bg-teal-100/70 bg-white/70'
                }`}
              >
                Tất Cả Đông Y <span className="text-[10px] font-normal opacity-80">({facetCounts.byDomain['y-hoc-co-truyen'] ?? 0})</span>
              </button>
              <button
                onClick={() => setTcmCategoryFilter('kinh-huyet')}
                aria-pressed={tcmCategoryFilter === 'kinh-huyet'}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  tcmCategoryFilter === 'kinh-huyet'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-teal-800 hover:bg-teal-100/70 bg-white/70'
                }`}
              >
                Kinh Huyệt <span className="text-[10px] font-normal opacity-80">({facetCounts.byTcmCategory['kinh-huyet'] ?? 0})</span>
              </button>
              <button
                onClick={() => setTcmCategoryFilter('tang-tuong')}
                aria-pressed={tcmCategoryFilter === 'tang-tuong'}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  tcmCategoryFilter === 'tang-tuong'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-teal-800 hover:bg-teal-100/70 bg-white/70'
                }`}
              >
                Tạng Tượng <span className="text-[10px] font-normal opacity-80">({facetCounts.byTcmCategory['tang-tuong'] ?? 0})</span>
              </button>
              <button
                onClick={() => setTcmCategoryFilter('duoc-tinh')}
                aria-pressed={tcmCategoryFilter === 'duoc-tinh'}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  tcmCategoryFilter === 'duoc-tinh'
                    ? 'bg-teal-800 text-white shadow-xs'
                    : 'text-teal-800 hover:bg-teal-100/70 bg-white/70'
                }`}
              >
                Dược Tính <span className="text-[10px] font-normal opacity-80">({facetCounts.byTcmCategory['duoc-tinh'] ?? 0})</span>
              </button>
            </div>
          </div>
        )}

        {/* Result Summary Bar & Reset Action */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              Hiển thị {filteredEntries.length} / {totalCount} thuật ngữ
            </span>
            {domainFilter !== 'all' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-mono">
                Miền: {domainFilter === 'phat-hoc' ? 'Phật Học' : domainFilter === 'huyen-hoc' ? 'Huyền Học' : domainFilter === 'y-hoc-co-truyen' ? 'Đông Y' : domainFilter}
              </span>
            )}
            {sourceFilter !== 'all' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-900 border border-sky-200 font-mono">
                Nguồn: {sourceFilter === 'lexicon' ? 'Từ Điển' : sourceFilter === 'system_node' ? 'Ma Trận' : 'Kho Đông Y'}
              </span>
            )}
            {tcmCategoryFilter !== 'all' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200 font-mono">
                Phân loại: {tcmCategoryFilter === 'kinh-huyet' ? 'Kinh Huyệt' : tcmCategoryFilter === 'tang-tuong' ? 'Tạng Tượng' : 'Dược Tính'}
              </span>
            )}
          </div>

          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              aria-label="Đặt lại bộ lọc"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition shadow-2xs"
            >
              <RotateCcw className="w-3 h-3 text-amber-700" />
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedEntries.map((entry) => {
              const isCopied = copiedId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-2xs hover:border-stone-300 transition flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          const badge = getCategoryBadge(entry.category, true);
                          return (
                            <span
                              className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          );
                        })()}
                        {(() => {
                          const srcBadge = getSourceTypeBadge(entry.sourceType);
                          if (!srcBadge) return null;
                          return (
                            <span
                              className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${srcBadge.className}`}
                            >
                              {srcBadge.label}
                            </span>
                          );
                        })()}
                        <span className="text-xs font-serif font-bold text-stone-900">{entry.hanTu}</span>
                        {entry.hanViet && (
                          <span className="text-[10px] font-semibold text-amber-900 bg-amber-50 px-1 rounded border border-amber-200/50 font-mono">
                            [{entry.hanViet}]
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenCitation(entry.id)}
                          className="p-1 text-stone-400 hover:text-amber-800 rounded hover:bg-amber-50 transition cursor-pointer"
                          title="Trích dẫn học thuật"
                          aria-label="Trích dẫn"
                        >
                          <Quote className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopy(entry)}
                          className="p-1 text-stone-400 hover:text-stone-800 rounded hover:bg-stone-100 transition cursor-pointer"
                          title="Sao chép thuật ngữ"
                        >
                          {isCopied ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
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

          {filteredEntries.length > displayedEntries.length && (
            <div className="text-center pt-2">
              <button
                onClick={() => setVisibleLimit((prev) => prev + 60)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hiển thị thêm {Math.min(60, filteredEntries.length - displayedEntries.length)} thuật ngữ (còn {filteredEntries.length - displayedEntries.length})
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Detailed View Mode (Standard 2-tier cards) */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedEntries.map((entry) => {
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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {(() => {
                            const badge = getCategoryBadge(entry.category, false);
                            return (
                              <span
                                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            );
                          })()}
                          {(() => {
                            const srcBadge = getSourceTypeBadge(entry.sourceType);
                            if (!srcBadge) return null;
                            return (
                              <span
                                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${srcBadge.className}`}
                              >
                                {srcBadge.label}
                              </span>
                            );
                          })()}
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-serif font-bold text-stone-900">{entry.hanTu}</span>
                            {entry.hanViet && (
                              <span className="text-xs font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-mono">
                                [{entry.hanViet}]
                              </span>
                            )}
                          </div>
                        </div>
                        <h3 className="text-base font-bold text-stone-900 leading-snug">{entry.vietnamese}</h3>
                      </div>


                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenCitation(entry.id)}
                          className="px-2.5 py-1 rounded-lg transition flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 cursor-pointer"
                          title="Trích dẫn học thuật"
                        >
                          <Quote className="w-3.5 h-3.5" />
                          <span>Trích dẫn</span>
                        </button>
                        <button
                          onClick={() => handleCopy(entry)}
                          className={`p-1.5 rounded-lg transition flex items-center gap-1 text-xs cursor-pointer ${
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
                    </div>

                    {/* Multilingual Parallel Terms */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-50 p-2.5 rounded-xl text-[11px] font-mono border border-stone-150">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-stone-500 block">Pāli (IAST)</span>
                        <span className="text-amber-950 font-semibold truncate block">{entry.pali}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-stone-500 block">Sanskrit</span>
                        <span className="text-purple-950 font-semibold truncate block">
                          {entry.devanagari && !entry.sanskrit.includes(entry.devanagari)
                            ? `${entry.sanskrit} (${entry.devanagari})`
                            : entry.sanskrit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-stone-500 block">Pinyin</span>
                        <span className="text-stone-700 font-semibold truncate block">{entry.pinyin}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-stone-500 block">English Gloss</span>
                        <span className="text-teal-950 font-semibold truncate block" title={entry.englishGloss}>
                          {entry.englishGloss || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Tier 2: Deep Reading - Canonical Definition */}
                    <p className="text-xs text-stone-700 leading-relaxed">{entry.definition}</p>
                  </div>

                  {/* Canonical Reference Footer */}
                  <div className="text-[10px] text-stone-600 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="italic">Nguồn: {entry.canonicalRef}</span>
                    <button
                      onClick={() => handleOpenCitation(entry.id)}
                      className="text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 hover:underline transition cursor-pointer"
                    >
                      <Quote className="w-3 h-3" />
                      <span>Xuất trích dẫn</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEntries.length > displayedEntries.length && (
            <div className="text-center pt-2">
              <button
                onClick={() => setVisibleLimit((prev) => prev + 60)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hiển thị thêm {Math.min(60, filteredEntries.length - displayedEntries.length)} thuật ngữ (còn {filteredEntries.length - displayedEntries.length})
              </button>
            </div>
          )}
        </div>
      )}


      {/* Scholar Citation Modal */}
      <ScholarCitationModal
        isOpen={Boolean(selectedCitationEntry)}
        onClose={() => setSelectedCitationEntry(null)}
        entry={selectedCitationEntry}
      />
    </div>
  );
}

