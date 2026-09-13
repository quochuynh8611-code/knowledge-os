import React from 'react';
import {
  Terminal,
  Sparkles,
  Copy,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { NotebookLMPromptStepProps } from './types';
import { NotebookLMArtifactType } from '../../../lib/notebooklm';

const ARTIFACT_TYPE_CONFIG: Array<{
  id: NotebookLMArtifactType;
  label: string;
  description: string;
}> = [
  {
    id: 'study_guide',
    label: 'Study Guide',
    description: 'Giáo trình khảo cứu có cấu trúc & câu hỏi ôn tập',
  },
  {
    id: 'audio_overview_summary',
    label: 'Audio Overview',
    description: 'Tóm tắt chuyên sâu từ Podcast đối thoại 2 Hosts',
  },
  {
    id: 'briefing_doc',
    label: 'Briefing Doc',
    description: 'Báo cáo tổng kết học thuật cô đọng',
  },
  {
    id: 'faq',
    label: 'FAQ',
    description: 'Bộ câu hỏi thường gặp & giải đáp luận lý',
  },
  {
    id: 'source_pack',
    label: 'Source Pack',
    description: 'Gói tài liệu nguồn chuẩn hóa sạch nhiễu',
  },
];

export function NotebookLMPromptStep({
  currentTopic,
  promptArtifactType,
  onSelectArtifactType,
  customInstructions,
  onChangeCustomInstructions,
  taskPrompt,
  copiedPrompt,
  onCopyPrompt,
  isHandoffSubmitting,
  onPrepareHandoff,
  onProceedToResults,
  onBackToSource,
}: NotebookLMPromptStepProps) {
  const selectedTypeConfig =
    ARTIFACT_TYPE_CONFIG.find((t) => t.id === promptArtifactType) ||
    ARTIFACT_TYPE_CONFIG[0];

  return (
    <div className="space-y-4">
      {/* 1. Prompt Configuration Card */}
      <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 p-4 sm:p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-xs text-amber-950 dark:text-amber-200">
            <Terminal className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span>Task Prompt Cho Antigravity 2.0 (Target: NotebookLM Skill)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="btn-prepare-antigravity-handoff"
              onClick={onPrepareHandoff}
              disabled={isHandoffSubmitting || !currentTopic}
              className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isHandoffSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-200 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Chuẩn bị Handoff Antigravity</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCopyPrompt}
              disabled={!currentTopic}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer text-xs disabled:opacity-50"
            >
              {copiedPrompt ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedPrompt ? 'Đã sao chép!' : 'Sao chép Task Prompt'}</span>
            </button>
          </div>
        </div>

        {/* Artifact Type Selector */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300">
            Loại Artifact Mục Tiêu Cho Antigravity 2.0:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ARTIFACT_TYPE_CONFIG.map((item) => {
              const isSelected = promptArtifactType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectArtifactType(item.id)}
                  className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-amber-800 text-white border-amber-900 shadow-2xs'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100/60 dark:hover:bg-amber-900/30'
                  }`}
                >
                  <span className="font-bold text-xs">{item.label}</span>
                  <span
                    className={`text-[10px] line-clamp-2 mt-1 leading-tight ${
                      isSelected ? 'text-amber-100' : 'text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Instructions Input */}
        <div>
          <label
            htmlFor="notebooklm-custom-instructions"
            className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1"
          >
            Chỉ Dẫn Bổ Sung (Tùy chọn):
          </label>
          <input
            id="notebooklm-custom-instructions"
            type="text"
            value={customInstructions}
            onChange={(e) => onChangeCustomInstructions(e.target.value)}
            placeholder="Ví dụ: Chú trọng đối chiếu Abhidhamma và Thiền Quán..."
            className="w-full p-2 bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Task Prompt Output Preview */}
        <div className="max-h-36 overflow-y-auto p-3 bg-white dark:bg-stone-950 border border-amber-200 dark:border-amber-900/60 rounded-xl font-mono text-[11px] text-stone-800 dark:text-stone-200 whitespace-pre-wrap shadow-inner">
          {taskPrompt}
        </div>
      </div>

      {/* 2. Step Navigation Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToSource}
          className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại: Nguồn</span>
        </button>

        <button
          type="button"
          onClick={onProceedToResults}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
        >
          <span>Tiếp tục: Nhập Kết Quả</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
