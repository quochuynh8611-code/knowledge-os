import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Search,
  Edit2,
  Save,
  RotateCcw,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import type { Resource, Note, ResearchExcerpt } from '../../types';
import {
  ScholarlyStance,
  LiteratureMatrixRow,
  buildLiteratureMatrix,
  analyzeLiteratureSynthesis,
  saveMatrixRowOverride,
  clearMatrixRowOverride,
  exportLiteratureMatrixToMarkdown,
  exportLiteratureMatrixToCsv,
} from '../../lib/literatureMatrixEngine';

export interface LiteratureMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: Resource[];
  topics?: Array<{ id: string; title: string }>;
  notes?: Note[];
  excerpts?: ResearchExcerpt[];
  defaultTopicId?: string;
}

export function LiteratureMatrixModal({
  isOpen,
  onClose,
  resources,
  topics = [],
  notes = [],
  excerpts = [],
  defaultTopicId,
}: LiteratureMatrixModalProps) {
  const [topicFilter, setTopicFilter] = useState<string>(defaultTopicId || 'all');
  const [stanceFilter, setStanceFilter] = useState<ScholarlyStance | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedMd, setCopiedMd] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Inline editing state for a row
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    researchQuestion: string;
    methodology: string;
    keyFindings: string;
    limitations: string;
    stance: ScholarlyStance;
  }>({
    researchQuestion: '',
    methodology: '',
    keyFindings: '',
    limitations: '',
    stance: 'neutral',
  });

  // Calculate matrix rows
  const matrixRows = useMemo(() => {
    // refreshKey is accessed to trigger re-computation upon override save/reset
    void refreshKey;
    return buildLiteratureMatrix(resources, {
      topicId: topicFilter !== 'all' ? topicFilter : undefined,
      stanceFilter,
      searchQuery,
      notes,
      excerpts,
    });
  }, [resources, topicFilter, stanceFilter, searchQuery, notes, excerpts, refreshKey]);

  // Overall synthesis metrics over currently filtered rows
  const synthesis = useMemo(() => {
    return analyzeLiteratureSynthesis(matrixRows);
  }, [matrixRows]);

  if (!isOpen) return null;

  const handleStartEdit = (row: LiteratureMatrixRow) => {
    setEditingRowId(row.resourceId);
    setEditFormData({
      researchQuestion: row.researchQuestion,
      methodology: row.methodology,
      keyFindings: row.keyFindings,
      limitations: row.limitations,
      stance: row.stance,
    });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
  };

  const handleSaveEdit = (resourceId: string) => {
    saveMatrixRowOverride(resourceId, {
      researchQuestion: editFormData.researchQuestion,
      methodology: editFormData.methodology,
      keyFindings: editFormData.keyFindings,
      limitations: editFormData.limitations,
      stance: editFormData.stance,
    });
    setEditingRowId(null);
    setRefreshKey((k) => k + 1);
  };

  const handleResetOverride = (resourceId: string) => {
    clearMatrixRowOverride(resourceId);
    setEditingRowId(null);
    setRefreshKey((k) => k + 1);
  };

  const handleCopyMarkdown = async () => {
    try {
      const md = exportLiteratureMatrixToMarkdown(matrixRows, synthesis);
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleExportCsv = () => {
    const csvContent = exportLiteratureMatrixToCsv(matrixRows);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `literature-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStanceBadge = (stance: ScholarlyStance) => {
    switch (stance) {
      case 'supports':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Ủng hộ
          </span>
        );
      case 'extends':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            Mở rộng
          </span>
        );
      case 'contradicts':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Đối lập
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
            Trung lập
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-stone-900/60 backdrop-blur-xs"
      data-testid="literature-matrix-modal"
    >
      <div className="flex flex-col w-full max-w-7xl max-h-[92vh] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Ma Trận Tổng Quan Y Văn & Tổng Hợp Luận Điểm
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                So sánh đa chiều 5 trục: Câu hỏi, Phương pháp, Kết quả, Hạn chế & Lập trường học thuật
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              data-testid="btn-copy-matrix-markdown"
              className="px-3 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Sao chép toàn bộ bảng dưới dạng Markdown"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
              <span>{copiedMd ? 'Đã sao chép' : 'Sao chép Markdown'}</span>
            </button>
            <button
              onClick={handleExportCsv}
              data-testid="btn-export-matrix-csv"
              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Tải tệp CSV tương thích Excel/SPSS/R"
            >
              <Download className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Xuất CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Synthesis Summary Bar */}
        <div className="px-6 py-3 bg-stone-50/80 dark:bg-stone-800/40 border-b border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              Tổng hợp ({synthesis.totalResources} tài liệu):
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 font-medium">
                Ủng hộ: {synthesis.stanceCounts.supports}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60 font-medium">
                Mở rộng: {synthesis.stanceCounts.extends}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60 font-medium">
                Đối lập: {synthesis.stanceCounts.contradicts}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 font-medium">
                Trung lập: {synthesis.stanceCounts.neutral}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-stone-500 dark:text-stone-400">
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            <span>Độ bao phủ ma trận:</span>
            <span className="font-bold text-stone-800 dark:text-stone-200">
              {synthesis.coverageScore}%
            </span>
          </div>
        </div>

        {/* Contradiction Alert Banner (if any) */}
        {synthesis.contradictionAlerts.length > 0 && (
          <div
            data-testid="matrix-contradiction-alert"
            className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Cảnh báo mâu thuẫn học thuật (Scholarly Contradiction Detected):</p>
              {synthesis.contradictionAlerts.map((alert) => {
                const topicName = topics.find((t) => t.id === alert.topicId)?.title || alert.topicId;
                return (
                  <p key={alert.topicId} className="text-rose-800 dark:text-rose-300 leading-relaxed">
                    Trong chủ đề <strong>{topicName}</strong>, phát hiện {alert.contradictingResourceIds.length} tài liệu có quan điểm đối lập so với các tài liệu còn lại. Vui lòng xem xét đối chiếu phương pháp luận và cỡ mẫu thực nghiệm.
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="p-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="matrix-search-input"
              placeholder="Tìm kiếm tài liệu, tác giả, citekey, nội dung..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-700/40"
            />
          </div>

          <div>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              data-testid="matrix-topic-filter"
              className="w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700/40"
            >
              <option value="all">Tất cả chủ đề</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={stanceFilter}
              onChange={(e) => setStanceFilter(e.target.value as any)}
              data-testid="matrix-stance-filter"
              className="w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-700/40"
            >
              <option value="all">Tất cả lập trường (All Stances)</option>
              <option value="supports">Ủng hộ (Supports)</option>
              <option value="extends">Mở rộng (Extends)</option>
              <option value="contradicts">Đối lập (Contradicts)</option>
              <option value="neutral">Trung lập (Neutral)</option>
            </select>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {matrixRows.length === 0 ? (
            <div className="text-center py-16 text-stone-400 dark:text-stone-500 text-xs">
              Không có tài liệu nào phù hợp với tiêu chí lọc hiện tại.
            </div>
          ) : (
            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 font-semibold border-b border-stone-200 dark:border-stone-700">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[180px] w-1/5">Tài liệu & Trích dẫn</th>
                    <th className="py-2.5 px-3 min-w-[160px] w-1/6">Câu hỏi nghiên cứu</th>
                    <th className="py-2.5 px-3 min-w-[160px] w-1/6">Phương pháp luận</th>
                    <th className="py-2.5 px-3 min-w-[180px] w-1/5">Kết quả cốt lõi</th>
                    <th className="py-2.5 px-3 min-w-[150px] w-1/6">Hạn chế & Giới hạn</th>
                    <th className="py-2.5 px-3 min-w-[100px] w-[100px] text-center">Lập trường</th>
                    <th className="py-2.5 px-3 min-w-[90px] w-[90px] text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 bg-white dark:bg-stone-900">
                  {matrixRows.map((row) => {
                    const isEditing = editingRowId === row.resourceId;

                    return (
                      <tr
                        key={row.resourceId}
                        data-testid={`matrix-row-${row.resourceId}`}
                        className={`hover:bg-stone-50/60 dark:hover:bg-stone-800/30 transition-colors ${
                          row.hasManualOverride ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        {/* Resource Citekey & Meta */}
                        <td className="py-3 px-3 align-top space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-800/60">
                              @{row.citationKey}
                            </span>
                            {row.hasManualOverride && (
                              <span className="text-[10px] text-stone-400 font-mono" title="Có tùy chỉnh thủ công">
                                ✎
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                            {row.title}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">
                            {row.author} ({row.year})
                          </div>
                        </td>

                        {/* Research Question */}
                        <td className="py-3 px-3 align-top leading-relaxed text-stone-700 dark:text-stone-300">
                          {isEditing ? (
                            <textarea
                              value={editFormData.researchQuestion}
                              onChange={(e) =>
                                setEditFormData((prev) => ({ ...prev, researchQuestion: e.target.value }))
                              }
                              data-testid={`matrix-input-question-${row.resourceId}`}
                              className="w-full p-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                              rows={3}
                            />
                          ) : (
                            <span className="line-clamp-4">{row.researchQuestion || '—'}</span>
                          )}
                        </td>

                        {/* Methodology */}
                        <td className="py-3 px-3 align-top leading-relaxed text-stone-700 dark:text-stone-300">
                          {isEditing ? (
                            <textarea
                              value={editFormData.methodology}
                              onChange={(e) =>
                                setEditFormData((prev) => ({ ...prev, methodology: e.target.value }))
                              }
                              data-testid={`matrix-input-methodology-${row.resourceId}`}
                              className="w-full p-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                              rows={3}
                            />
                          ) : (
                            <span className="line-clamp-4">{row.methodology || '—'}</span>
                          )}
                        </td>

                        {/* Key Findings */}
                        <td className="py-3 px-3 align-top leading-relaxed text-stone-700 dark:text-stone-300">
                          {isEditing ? (
                            <textarea
                              value={editFormData.keyFindings}
                              onChange={(e) =>
                                setEditFormData((prev) => ({ ...prev, keyFindings: e.target.value }))
                              }
                              data-testid={`matrix-input-findings-${row.resourceId}`}
                              className="w-full p-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                              rows={3}
                            />
                          ) : (
                            <span className="line-clamp-4">{row.keyFindings || '—'}</span>
                          )}
                        </td>

                        {/* Limitations */}
                        <td className="py-3 px-3 align-top leading-relaxed text-stone-700 dark:text-stone-300">
                          {isEditing ? (
                            <textarea
                              value={editFormData.limitations}
                              onChange={(e) =>
                                setEditFormData((prev) => ({ ...prev, limitations: e.target.value }))
                              }
                              data-testid={`matrix-input-limitations-${row.resourceId}`}
                              className="w-full p-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                              rows={3}
                            />
                          ) : (
                            <span className="line-clamp-4">{row.limitations || '—'}</span>
                          )}
                        </td>

                        {/* Stance */}
                        <td className="py-3 px-3 align-top text-center">
                          {isEditing ? (
                            <select
                              value={editFormData.stance}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  stance: e.target.value as ScholarlyStance,
                                }))
                              }
                              data-testid={`matrix-select-stance-${row.resourceId}`}
                              className="w-full p-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs"
                            >
                              <option value="supports">Ủng hộ</option>
                              <option value="extends">Mở rộng</option>
                              <option value="contradicts">Đối lập</option>
                              <option value="neutral">Trung lập</option>
                            </select>
                          ) : (
                            getStanceBadge(row.stance)
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 align-top text-center">
                          {isEditing ? (
                            <div className="flex flex-col gap-1 items-center">
                              <button
                                onClick={() => handleSaveEdit(row.resourceId)}
                                data-testid={`save-matrix-row-btn-${row.resourceId}`}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer w-full justify-center"
                                title="Lưu ghi đè ô ma trận"
                              >
                                <Save className="w-3 h-3" />
                                <span>Lưu</span>
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-2 py-1 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-700 dark:text-stone-300 rounded-lg text-[11px] transition cursor-pointer w-full justify-center"
                              >
                                Hủy
                              </button>
                              {row.hasManualOverride && (
                                <button
                                  onClick={() => handleResetOverride(row.resourceId)}
                                  data-testid={`reset-matrix-row-btn-${row.resourceId}`}
                                  className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
                                  title="Khôi phục trích xuất gốc từ ghi chú"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Gốc</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(row)}
                              data-testid={`edit-matrix-row-btn-${row.resourceId}`}
                              className="px-2 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                              title="Chỉnh sửa nội dung ma trận"
                            >
                              <Edit2 className="w-3 h-3 text-stone-500" />
                              <span>Sửa</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
