import React, { useState, useMemo } from 'react';
import {
  X,
  Brain,
  Sparkles,
  Check,
  Filter,
  Layers,
  ChevronDown,
  BookOpen,
  Info,
  CheckSquare,
  Square,
  Save,
} from 'lucide-react';
import {
  SynthesisStrategy,
  SynthesizedFlashcardCandidate,
  ExcerptInput,
  synthesizeFlashcardBatchFromExcerpts,
} from '../../lib/highlightToFlashcardEngine';
import { HIGHLIGHT_COLOR_PALETTE } from './UnifiedSelectionToolbar';
import { AcademicMarkdown } from '../ui/AcademicMarkdown';
import { useData } from '../../context/DataContext';

export interface ExcerptFlashcardSynthesisModalProps {
  isOpen: boolean;
  onClose: () => void;
  excerpts: ExcerptInput[];
  existingCards?: Array<{ front: string; back: string; sourceExcerptId?: string }>;
  topics?: Array<{ id: string; title: string }>;
  defaultTopicId?: string;
  documentId?: string;
  documentTitle?: string;
  onSaveCards?: (cards: SynthesizedFlashcardCandidate[], targetTopicId: string) => Promise<void> | void;
}

export function ExcerptFlashcardSynthesisModal({
  isOpen,
  onClose,
  excerpts,
  existingCards = [],
  topics = [],
  defaultTopicId,
  documentId,
  documentTitle,
  onSaveCards,
}: ExcerptFlashcardSynthesisModalProps) {
  const [strategy, setStrategy] = useState<SynthesisStrategy>('auto');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string | null>(null);
  const [targetTopicId, setTargetTopicId] = useState<string>(
    () => defaultTopicId || topics[0]?.id || ''
  );
  const [editedCandidates, setEditedCandidates] = useState<
    Record<string, { front?: string; back?: string }>
  >({});
  const [deselectedCardIds, setDeselectedCardIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState<Record<string, boolean>>({});

  // Compute base candidates using engine
  const synthesisResult = useMemo(() => {
    const colorFilter = selectedColorFilter ? [selectedColorFilter] : undefined;
    return synthesizeFlashcardBatchFromExcerpts(excerpts, existingCards, {
      strategy,
      colorFilter,
      topicId: targetTopicId,
    });
  }, [excerpts, existingCards, strategy, selectedColorFilter, targetTopicId]);

  const { candidates, skippedDuplicates, totalProcessed } = synthesisResult;

  if (!isOpen) return null;

  const handleToggleSelectCard = (id: string) => {
    setDeselectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setDeselectedCardIds(new Set());
  };

  const handleDeselectAll = () => {
    setDeselectedCardIds(new Set(candidates.map((c) => c.sourceExcerptId)));
  };

  const handleFrontChange = (sourceExcerptId: string, value: string) => {
    setEditedCandidates((prev) => ({
      ...prev,
      [sourceExcerptId]: {
        ...prev[sourceExcerptId],
        front: value,
      },
    }));
  };

  const handleBackChange = (sourceExcerptId: string, value: string) => {
    setEditedCandidates((prev) => ({
      ...prev,
      [sourceExcerptId]: {
        ...prev[sourceExcerptId],
        back: value,
      },
    }));
  };

  const handleTogglePreview = (id: string) => {
    setPreviewMode((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Compile selected final candidates
  const finalCandidates: SynthesizedFlashcardCandidate[] = candidates
    .filter((c) => !deselectedCardIds.has(c.sourceExcerptId))
    .map((c) => {
      const edits = editedCandidates[c.sourceExcerptId];
      return {
        ...c,
        front: edits?.front !== undefined ? edits.front : c.front,
        back: edits?.back !== undefined ? edits.back : c.back,
        topicId: targetTopicId || c.topicId,
      };
    });

  const handleConfirmSave = async () => {
    if (finalCandidates.length === 0) return;
    setIsSubmitting(true);
    try {
      if (onSaveCards) {
        await onSaveCards(finalCandidates, targetTopicId);
      }
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu flashcards tổng hợp:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="excerpt-synthesis-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Tổng hợp Flashcard từ Điểm Trích"
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Tổng hợp Flashcard từ Highlights
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 rounded-full border border-amber-300/50 dark:border-amber-700/50">
                  FSRS v5
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {documentTitle ? `Tài liệu: ${documentTitle} • ` : ''}
                Tự động bóc tách cloze deletion, công thức KaTeX & mhchem và xuất xứ học thuật
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng modal"
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Controls Bar */}
        <div className="px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left Controls: Strategy & Topic */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Strategy Select */}
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-stone-600 dark:text-stone-400">Chiến lược:</span>
              <select
                data-testid="synthesis-strategy-select"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as SynthesisStrategy)}
                className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="auto">✨ Tự động nhận diện (Khuyên dùng)</option>
                <option value="cloze-auto">{"🧩 Đục lỗ Cloze ({{c1::...}})"}</option>
                <option value="definition-split">📖 Tách Khái niệm & Định nghĩa</option>
                <option value="qa-note">💡 Hỏi & Đáp từ Ghi chú (Q&A)</option>
              </select>
            </div>

            {/* Target Topic Select */}
            {topics.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-stone-600 dark:text-stone-400">Chủ đề FSRS:</span>
                <select
                  data-testid="synthesis-topic-select"
                  value={targetTopicId}
                  onChange={(e) => setTargetTopicId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer max-w-[200px] truncate"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Controls: Color Filter Chips */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Lọc màu sắc">
            <span className="font-medium text-stone-500 dark:text-stone-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc màu:
            </span>
            <button
              type="button"
              data-testid="synthesis-color-filter-all"
              onClick={() => setSelectedColorFilter(null)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                selectedColorFilter === null
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                  : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
              }`}
            >
              Tất cả
            </button>
            {HIGHLIGHT_COLOR_PALETTE.map((p) => {
              const isSelected = selectedColorFilter?.toLowerCase() === p.color.toLowerCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`synthesis-color-filter-${p.id}`}
                  onClick={() => setSelectedColorFilter(isSelected ? null : p.color)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-stone-900 dark:text-stone-100 ring-1 ring-amber-400'
                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-stone-300 dark:border-stone-600"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats & Batch Selection Bar */}
        <div className="px-6 py-2.5 border-b border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
            <span>
              Ứng viên hợp lệ: <strong className="text-stone-900 dark:text-stone-100">{candidates.length}</strong>
            </span>
            <span>•</span>
            <span>
              Đã chọn: <strong className="text-amber-600 dark:text-amber-400">{finalCandidates.length}</strong>
            </span>
            {skippedDuplicates > 0 && (
              <span
                data-testid="synthesis-skipped-duplicates-badge"
                className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-medium border border-amber-200 dark:border-amber-800"
              >
                Bỏ qua {skippedDuplicates} thẻ trùng lặp
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Chọn tất cả
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-stone-500 dark:text-stone-400 hover:underline cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
          </div>
        </div>

        {/* Candidates List View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {candidates.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400 dark:text-stone-500 space-y-2 bg-stone-50/50 dark:bg-stone-800/20 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700">
              <Brain className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600" />
              <p className="font-semibold text-stone-700 dark:text-stone-300 text-sm">
                Không có thẻ nhớ nào phù hợp
              </p>
              <p className="max-w-md mx-auto">
                Tất cả các điểm trích đã tồn tại trong kho thẻ nhớ hoặc bị ẩn bởi bộ lọc màu sắc.
              </p>
            </div>
          ) : (
            candidates.map((cand) => {
              const isSelected = !deselectedCardIds.has(cand.sourceExcerptId);
              const currentFront =
                editedCandidates[cand.sourceExcerptId]?.front !== undefined
                  ? editedCandidates[cand.sourceExcerptId].front!
                  : cand.front;
              const currentBack =
                editedCandidates[cand.sourceExcerptId]?.back !== undefined
                  ? editedCandidates[cand.sourceExcerptId].back!
                  : cand.back;
              const isPreview = Boolean(previewMode[cand.sourceExcerptId]);

              return (
                <div
                  key={cand.sourceExcerptId}
                  data-testid={`candidate-card-${cand.sourceExcerptId}`}
                  style={{ borderLeftColor: cand.highlightColor || '#fef08a' }}
                  className={`p-4 rounded-xl border-l-4 border border-stone-200 dark:border-stone-800 transition ${
                    isSelected
                      ? 'bg-white dark:bg-stone-900 shadow-xs'
                      : 'bg-stone-50/60 dark:bg-stone-950/40 opacity-60'
                  }`}
                >
                  {/* Card Toolbar */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800/80 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid={`candidate-select-checkbox-${cand.sourceExcerptId}`}
                        checked={isSelected}
                        onChange={() => handleToggleSelectCard(cand.sourceExcerptId)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-stone-300 dark:border-stone-600"
                      />
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        {isSelected ? 'Sẵn sàng lưu thẻ này' : 'Bỏ qua thẻ này'}
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80">
                        {cand.strategyUsed}
                      </span>
                      {cand.isCloze && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                          Cloze
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTogglePreview(cand.sourceExcerptId)}
                        className="px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded transition cursor-pointer"
                      >
                        {isPreview ? '✏️ Soạn thảo' : '👁️ Xem trước KaTeX'}
                      </button>
                    </div>
                  </div>

                  {/* Front & Back Inputs or Academic Preview */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Front */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                        Mặt trước (Front / Prompt):
                      </span>
                      {isPreview ? (
                        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg min-h-[90px] text-xs leading-relaxed text-stone-800 dark:text-stone-200 overflow-x-auto">
                          <AcademicMarkdown content={currentFront} />
                        </div>
                      ) : (
                        <textarea
                          data-testid={`candidate-front-input-${cand.sourceExcerptId}`}
                          value={currentFront}
                          onChange={(e) => handleFrontChange(cand.sourceExcerptId, e.target.value)}
                          className="w-full text-xs p-2.5 bg-stone-50/50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none h-[90px]"
                        />
                      )}
                    </div>

                    {/* Back */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                        Mặt sau (Back / Context & Provenance):
                      </span>
                      {isPreview ? (
                        <div className="p-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg min-h-[90px] text-xs leading-relaxed text-stone-800 dark:text-stone-200 overflow-x-auto">
                          <AcademicMarkdown content={currentBack} />
                        </div>
                      ) : (
                        <textarea
                          data-testid={`candidate-back-input-${cand.sourceExcerptId}`}
                          value={currentBack}
                          onChange={(e) => handleBackChange(cand.sourceExcerptId, e.target.value)}
                          className="w-full text-xs p-2.5 bg-stone-50/50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none h-[90px]"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 flex items-center justify-between">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            Sẽ lưu <strong>{finalCandidates.length}</strong> thẻ nhớ vào bộ lặp ngắt quãng FSRS v5.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              data-testid="confirm-batch-synthesis-btn"
              onClick={handleConfirmSave}
              disabled={isSubmitting || finalCandidates.length === 0}
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu các thẻ đã chọn'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
