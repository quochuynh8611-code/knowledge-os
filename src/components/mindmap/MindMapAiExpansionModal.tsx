/**
 * Mind Map AI Node Expansion Modal Component (Phase P3)
 *
 * Provides review, quick edit, duplicate warning, and selective insertion
 * of AI-suggested nodes into the mind map working tree.
 *
 * Local-first; không làm thay đổi DataContext theo observable contract;
 * blast radius thấp, bounded trong Mind Map context.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  AiExpansionContext,
  AiCandidateNode,
  AiExpansionPreset,
  MindMapAiClient,
} from '../../types/mindmapAi';
import { createMockMindMapAiClient } from '../../lib/mindmapAiService';
import {
  Sparkles,
  Layers,
  Compass,
  HelpCircle,
  Sliders,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface MindMapAiExpansionModalProps {
  isOpen: boolean;
  context: AiExpansionContext;
  aiClient?: MindMapAiClient;
  onClose: () => void;
  onInsertCandidates: (candidates: AiCandidateNode[]) => void;
}

const PRESET_OPTIONS: Array<{
  id: AiExpansionPreset;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'sub_components',
    label: 'Phân tích chi tiết',
    description: 'Chia nhỏ thành các nhánh con và thành phần cốt lõi',
    icon: Layers,
  },
  {
    id: 'dimensions',
    label: 'Góc nhìn đa chiều',
    description: 'Phân tích nguyên nhân, kết quả, ưu nhược điểm',
    icon: Compass,
  },
  {
    id: 'inquiry_questions',
    label: 'Câu hỏi đào sâu',
    description: 'Các câu hỏi tư duy then chốt cần làm rõ',
    icon: HelpCircle,
  },
  {
    id: 'custom',
    label: 'Tùy chỉnh',
    description: 'Nhập câu hỏi hoặc chỉ dẫn cụ thể cho AI',
    icon: Sliders,
  },
];

export function MindMapAiExpansionModal({
  isOpen,
  context,
  aiClient,
  onClose,
  onInsertCandidates,
}: MindMapAiExpansionModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<AiExpansionPreset>(
    context.preset || 'sub_components'
  );
  const [customInstruction, setCustomInstruction] = useState(
    context.customInstruction || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<AiCandidateNode[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStoppedState, setIsStoppedState] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const clientRef = useRef<MindMapAiClient>(aiClient || createMockMindMapAiClient());

  useEffect(() => {
    if (aiClient) {
      clientRef.current = aiClient;
    }
  }, [aiClient]);

  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(context.preset || 'sub_components');
      setCustomInstruction(context.customInstruction || '');
      setIsLoading(false);
      setCandidates([]);
      setErrorMessage(null);
      setIsStoppedState(false);
    }
  }, [isOpen, context]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsStoppedState(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await clientRef.current.generateNodeExpansion(
        {
          ...context,
          preset: selectedPreset,
          customInstruction: selectedPreset === 'custom' ? customInstruction : undefined,
        },
        controller.signal
      );

      if (result.ok) {
        setCandidates(result.candidates);
        setIsLoading(false);
      } else if (result.error?.code === 'CANCELLED') {
        setIsStoppedState(true);
        setIsLoading(false);
      } else {
        setErrorMessage(
          result.error?.message || 'Có lỗi xảy ra khi tạo gợi ý từ AI. Vui lòng thử lại.'
        );
        setIsLoading(false);
      }
    } catch {
      if (controller.signal.aborted) {
        setIsStoppedState(true);
      } else {
        setErrorMessage('Lỗi kết nối dịch vụ AI. Vui lòng kiểm tra lại.');
      }
      setIsLoading(false);
    }
  };

  const handleCancelOrStop = () => {
    if (isLoading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsStoppedState(true);
      setIsLoading(false);
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      handleCancelOrStop();
    }
  };

  const handleToggleCandidate = (candidateId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleUpdateTitle = (candidateId: string, newTitle: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, title: newTitle } : c))
    );
  };

  const handleConfirm = () => {
    const selected = candidates.filter((c) => c.selected && c.title.trim().length > 0);
    if (selected.length === 0) return;
    onInsertCandidates(selected);
    onClose();
  };

  const selectedCount = candidates.filter((c) => c.selected && c.title.trim().length > 0).length;

  return (
    <div
      data-testid="mindmap-ai-expansion-modal"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-xl w-full p-6 space-y-5 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/80 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-stone-900 dark:text-stone-100">
                Mở Rộng Nhánh Bằng AI
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Gợi ý các nhánh con có cấu trúc cho nút:{' '}
                <strong className="text-stone-900 dark:text-stone-100 font-semibold">
                  {context.targetNodeTitle}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-ai-modal"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Presets Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Chọn mẫu định hướng AI:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedPreset === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`preset-option-${opt.id}`}
                    onClick={() => setSelectedPreset(opt.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-950 dark:text-amber-200 ring-1 ring-amber-500/30'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <div className="text-xs font-bold leading-tight">{opt.label}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Instruction input */}
          {selectedPreset === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Chỉ dẫn cụ thể cho AI:
              </label>
              <input
                type="text"
                data-testid="input-custom-instruction"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Ví dụ: Tập trung vào 4 góc nhìn tâm lý học..."
                className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div
              data-testid="ai-generation-loading"
              className="flex flex-col items-center justify-center p-8 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-3"
            >
              <Loader2 className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400" />
              <div className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                AI đang phân tích ngữ cảnh và sinh các nhánh con...
              </div>
              <button
                type="button"
                data-testid="btn-cancel-ai-generation"
                onClick={handleCancelOrStop}
                className="px-3 py-1 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-200 rounded-lg text-xs font-medium cursor-pointer transition"
              >
                Dừng tạo
              </button>
            </div>
          )}

          {/* Stopped Safe State */}
          {isStoppedState && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <span>Đã dừng quá trình tạo gợi ý.</span>
              <button
                type="button"
                data-testid="btn-retry-ai-generation"
                onClick={handleGenerate}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Thử lại
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={handleGenerate}
                className="flex items-center gap-1 font-bold underline ml-2 cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Candidate Review List */}
          {candidates.length > 0 && !isLoading && (
            <div data-testid="ai-candidate-list" className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 font-semibold pb-1">
                <span>Chọn các nhánh cần chèn vào sơ đồ:</span>
                <span className="text-[11px] font-mono">
                  {selectedCount}/{candidates.length} đã chọn
                </span>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {candidates.map((cand, idx) => (
                  <div
                    key={cand.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition ${
                      cand.selected
                        ? 'bg-white dark:bg-stone-800 border-amber-300 dark:border-amber-700/80 shadow-2xs'
                        : 'bg-stone-50/60 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      data-testid={`checkbox-candidate-${idx}`}
                      checked={cand.selected}
                      onChange={() => handleToggleCandidate(cand.id)}
                      className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={cand.title}
                        onChange={(e) => handleUpdateTitle(cand.id, e.target.value)}
                        className="w-full text-xs font-semibold text-stone-900 dark:text-stone-100 bg-transparent border-b border-transparent hover:border-stone-300 dark:hover:border-stone-600 focus:border-amber-500 focus:outline-hidden py-0.5"
                      />
                      {cand.description && (
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1">
                          {cand.description}
                        </div>
                      )}
                      {cand.isSuspectedDuplicate && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.2 rounded">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Đã có nhánh tương tự
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            Đóng
          </button>
          <div className="flex items-center gap-2">
            {candidates.length === 0 ? (
              <button
                type="button"
                data-testid="btn-submit-ai-generate"
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tạo gợi ý bằng AI
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Tạo lại
                </button>
                <button
                  type="button"
                  data-testid="btn-confirm-insert-candidates"
                  onClick={handleConfirm}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Chèn {selectedCount} nhánh đã chọn
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
