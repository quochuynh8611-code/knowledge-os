import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  Download,
  Copy,
  CheckCircle2,
  BookOpen,
  Eye,
  ArrowRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { NotebookLMSourceStepProps } from './types';
import { getTopicSourceSummary } from './utils';
import {
  getCompactTopicOptions,
  getTopicDomainLabel,
  DEFAULT_PRIORITY_TOPIC_IDS,
} from '../../../lib/topicSelector';

export function NotebookLMSourceStep({
  currentTopic,
  topics,
  selectedTopicId,
  onSelectTopicId,
  showAllTopics,
  onToggleShowAllTopics,
  notes,
  resources,
  sourceDocument,
  copiedSource,
  onCopySource,
  onDownloadSourceFile,
  onOpenNotebookLM,
  onProceedToPrompt,
}: NotebookLMSourceStepProps) {
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);

  const visibleTopics = React.useMemo(
    () => getCompactTopicOptions(topics, selectedTopicId, showAllTopics),
    [topics, selectedTopicId, showAllTopics]
  );

  const summary = getTopicSourceSummary(currentTopic, notes, resources, sourceDocument);

  return (
    <div className="space-y-4">
      {/* 1. Topic Selector Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div className="w-full sm:w-auto flex-1 flex flex-col gap-1">
          <label
            htmlFor="notebooklm-topic-select"
            className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-0.5"
          >
            Chủ đề đang đóng gói nguồn:
          </label>
          <div className="flex items-center gap-2">
            <select
              id="notebooklm-topic-select"
              value={selectedTopicId}
              onChange={(e) => onSelectTopicId(e.target.value)}
              className="w-full sm:w-80 text-xs font-medium bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {visibleTopics.map((t) => {
                const tag = getTopicDomainLabel(t);
                const isExtraActive =
                  !showAllTopics &&
                  t.id === selectedTopicId &&
                  !DEFAULT_PRIORITY_TOPIC_IDS.includes(t.id);
                return (
                  <option key={t.id} value={t.id}>
                    [{tag}] {t.title}
                    {isExtraActive ? ' (Đang chọn)' : ''}
                  </option>
                );
              })}
            </select>
            {topics.length > 8 && (
              <button
                type="button"
                onClick={onToggleShowAllTopics}
                className="shrink-0 text-[11px] font-semibold px-2.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                title={
                  showAllTopics
                    ? 'Chuyển về 8 chủ đề trọng tâm'
                    : `Hiển thị toàn bộ ${topics.length} chủ đề`
                }
              >
                {showAllTopics ? 'Thu gọn (8)' : `Tất cả (${topics.length})`}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNotebookLM}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Mở Google NotebookLM</span>
        </button>
      </div>

      {/* 2. Source Summary & Compact Preview Card */}
      <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 p-4 sm:p-5 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-xs text-blue-950 dark:text-blue-200">
            <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>Tài liệu nguồn đã chuẩn hóa (Source Document)</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsFullViewOpen(!isFullViewOpen)}
              className="px-2.5 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              {isFullViewOpen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Thu gọn</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Xem đầy đủ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCopySource}
              className="px-2.5 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg text-xs font-medium border border-stone-300 dark:border-stone-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedSource ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-stone-500" />
              )}
              <span>{copiedSource ? 'Đã sao chép!' : 'Sao chép nguồn'}</span>
            </button>

            <button
              type="button"
              onClick={onDownloadSourceFile}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải File Nguồn (.md)</span>
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-900/80 dark:text-blue-300/80">
          <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-stone-900/80 border border-blue-200 dark:border-blue-900 font-mono">
            {summary.notesCount} Ghi chú
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-stone-900/80 border border-blue-200 dark:border-blue-900 font-mono">
            {summary.resourcesCount} Thư tịch
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-stone-900/80 border border-blue-200 dark:border-blue-900 font-mono">
            {summary.linksCount} Đồ thị 1-hop
          </span>
          <span className="text-[11px] text-stone-500 dark:text-stone-400 ml-auto hidden sm:inline">
            Tự động tổng hợp 5 phần chuẩn hóa cho NotebookLM
          </span>
        </div>

        {/* Source Preview Box (Inline Expandable) */}
        <div
          className={`overflow-y-auto p-3 bg-white dark:bg-stone-950 border border-blue-200 dark:border-blue-900/60 rounded-xl font-mono text-[11px] text-stone-800 dark:text-stone-200 whitespace-pre-wrap shadow-inner transition-all duration-200 ${
            isFullViewOpen ? 'max-h-96' : 'max-h-36'
          }`}
        >
          {isFullViewOpen ? sourceDocument : `${sourceDocument.slice(0, 800)}...`}
        </div>
      </div>

      {/* 3. Step Footer Action */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={onProceedToPrompt}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition cursor-pointer"
        >
          <span>Tiếp tục: Tạo Task Prompt</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
