import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  X,
  Sparkles,
  Copy,
  Download,
  CheckCircle2,
  Brain,
  Share2,
  FileText,
  Compass,
  Layers,
  BookOpen,
} from 'lucide-react';
import {
  packageHandoffBundleForAntigravity,
  generateAntigravityPrompt,
} from '../../lib/antigravity';
import { sanitizeFileName } from '../../lib/obsidian';
import { Topic } from '../../types';

interface AntigravityHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: Topic;
}

export function AntigravityHandoffModal({
  isOpen,
  onClose,
  topic,
}: AntigravityHandoffModalProps) {
  const { topics, notes, resources } = useData();
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    topic?.id || topics[0]?.id || ''
  );
  const [researchMode, setResearchMode] = useState<
    'concept_analysis' | 'terminology_exegesis' | 'cross_domain_synthesis' | 'scholar_analysis' | 'pali_sanskrit_exegesis' | 'cross_domain_link'
  >('concept_analysis');
  const [customQuery, setCustomQuery] = useState('');
  const [copiedBundle, setCopiedBundle] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'bundle' | 'prompt'>('bundle');

  if (!isOpen) return null;

  const currentTopic =
    topics.find((t) => t.id === selectedTopicId) || topic || topics[0];

  const handoffBundle = currentTopic
    ? packageHandoffBundleForAntigravity(currentTopic, notes, resources, topics)
    : '';

  const specializedPrompt = currentTopic
    ? generateAntigravityPrompt(currentTopic, researchMode, customQuery)
    : '';

  const handleCopyBundle = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(handoffBundle);
      }
      setCopiedBundle(true);
      setTimeout(() => setCopiedBundle(false), 2000);
    } catch (err) {
      console.error('Failed to copy handoff bundle', err);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(specializedPrompt);
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt', err);
    }
  };

  const handleDownloadBundle = () => {
    if (!currentTopic) return;
    const blob = new Blob([handoffBundle], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Antigravity-Handoff-${sanitizeFileName(currentTopic.title)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:px-6 md:py-4 bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 text-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Antigravity AI Scholar Handoff Bundle
                </h2>
                <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-semibold">
                  Phase 3 Ready
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Đóng gói bối cảnh tri thức 6 phần &amp; Đồ thị 1-hop trực tiếp phục vụ Reasoning AI Agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control Toolbar */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Topic Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Chủ đề đóng gói bàn giao:
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full text-xs font-medium bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-700"
              >
                {topics.map((t) => {
                  const domainTag = t.type === 'phat-hoc' ? 'Phật Học' : t.type === 'huyen-hoc' ? 'Huyền Học' : (t.categoryName || t.type || 'Nghiên Cứu');
                  return (
                    <option key={t.id} value={t.id}>
                      [{domainTag}] {t.title}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Research Mode */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                Chế độ nghiên cứu học thuật:
              </label>
              <div className="grid grid-cols-3 gap-1 bg-stone-200/80 dark:bg-stone-800 p-1 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setResearchMode('concept_analysis')}
                  className={`py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer ${
                    researchMode === 'concept_analysis' || researchMode === 'scholar_analysis'
                      ? 'bg-white dark:bg-stone-700 text-amber-950 dark:text-amber-200 shadow-xs'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  Phân Tích Khái Niệm
                </button>
                <button
                  type="button"
                  onClick={() => setResearchMode('terminology_exegesis')}
                  className={`py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer ${
                    researchMode === 'terminology_exegesis' || researchMode === 'pali_sanskrit_exegesis'
                      ? 'bg-white dark:bg-stone-700 text-amber-950 dark:text-amber-200 shadow-xs'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  Ngữ Nguyên &amp; Thuật Ngữ
                </button>
                <button
                  type="button"
                  onClick={() => setResearchMode('cross_domain_synthesis')}
                  className={`py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer ${
                    researchMode === 'cross_domain_synthesis' || researchMode === 'cross_domain_link'
                      ? 'bg-white dark:bg-stone-700 text-amber-950 dark:text-amber-200 shadow-xs'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  Tổng Hợp Liên Ngành
                </button>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-stone-200/70 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('bundle')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'bundle'
                    ? 'bg-white dark:bg-stone-700 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                Gói Bàn Giao (6 Sections)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('prompt')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'prompt'
                    ? 'bg-white dark:bg-stone-700 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400'
                }`}
              >
                System Prompt Chuyên Sâu
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'bundle' ? (
                <>
                  <button
                    type="button"
                    onClick={handleCopyBundle}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    {copiedBundle ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Đã sao chép Handoff Bundle!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép Handoff Bundle</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadBundle}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                    <span>Tải Tệp Handoff (.md)</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Đã sao chép Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép Prompt Chuyên Sâu</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-stone-50/50 dark:bg-stone-900/50">
          {activeTab === 'bundle' ? (
            <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl p-4 font-mono text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed shadow-inner">
              {handoffBundle}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                  Câu hỏi học thuật tùy chỉnh (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Ví dụ: Phân tích 7 tâm sở biến hành trong lộ trình thiền tuệ..."
                  className="w-full text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-700"
                />
              </div>
              <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl p-4 font-mono text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                {specializedPrompt}
              </div>
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="px-4 py-3 bg-stone-100 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-stone-500 dark:text-stone-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Zero Binary Ingestion &bull; 1-Hop Graph Scope &bull; 100% Client-side privacy</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
