import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import {
  X,
  Sparkles,
  Copy,
  Download,
  CheckCircle2,
  FileText,
  Network,
  Terminal,
  ArrowUpRight,
  ShieldCheck,
  Link2,
} from 'lucide-react';
import {
  packageHandoffBundleForAntigravity,
  generateAntigravityPrompt,
  AntigravityResearchMode,
} from '../../lib/antigravity';
import { sanitizeFileName } from '../../lib/obsidian';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { Topic } from '../../types';

interface AntigravityHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: Topic;
}

type TabType = 'bundle' | 'topology' | 'prompt';
const TABS: TabType[] = ['bundle', 'topology', 'prompt'];

export function AntigravityHandoffModal({
  isOpen,
  onClose,
  topic,
}: AntigravityHandoffModalProps) {
  const { topics, notes, resources } = useData();
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    topic?.id || topics[0]?.id || ''
  );
  const [researchMode, setResearchMode] = useState<AntigravityResearchMode>('concept_analysis');
  const [customQuery, setCustomQuery] = useState('');
  const [copiedBundle, setCopiedBundle] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('bundle');
  const [announcement, setAnnouncement] = useState('');

  // Refs for focus management
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

  // Auto-sync topic context when modal opens with a provided topic prop
  useEffect(() => {
    if (isOpen && topic?.id) {
      setSelectedTopicId(topic.id);
    }
  }, [isOpen, topic?.id]);

  // WAI-ARIA Dialog Focus Trap & Escape key listener & Focus restoration
  useFocusTrap(modalContainerRef, isOpen, {
    initialFocusRef,
    onEscape: onClose,
    returnFocus: true,
  });

  // WAI-ARIA Tabs keyboard navigation
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentTab: TabType) => {
      const currentIndex = TABS.indexOf(currentTab);
      let targetIndex = -1;

      switch (e.key) {
        case 'ArrowRight':
          targetIndex = (currentIndex + 1) % TABS.length;
          break;
        case 'ArrowLeft':
          targetIndex = (currentIndex - 1 + TABS.length) % TABS.length;
          break;
        case 'Home':
          targetIndex = 0;
          break;
        case 'End':
          targetIndex = TABS.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      const targetTab = TABS[targetIndex];
      setActiveTab(targetTab);

      // Programmatically focus the newly active tab
      const targetElement = document.getElementById(`scholar-tab-${targetTab}`);
      if (targetElement) {
        targetElement.focus();
      }
    },
    []
  );

  if (!isOpen) return null;

  const currentTopic =
    topics.find((t) => t.id === selectedTopicId) || topic || topics[0];

  const handoffBundle = currentTopic
    ? packageHandoffBundleForAntigravity(currentTopic, notes, resources, topics)
    : '';

  const specializedPrompt = currentTopic
    ? generateAntigravityPrompt(currentTopic, researchMode, customQuery)
    : '';

  const topicNotesCount = (notes || []).filter((n) => n.topicId === currentTopic?.id).length;
  const topicResourcesCount = (resources || []).filter((r) => r.topicId === currentTopic?.id).length;
  const topicLinksCount = currentTopic?.links?.length || 0;

  let domainLabel = currentTopic?.categoryName || currentTopic?.type || 'Nghiên Cứu';
  if (currentTopic?.type === 'phat-hoc') domainLabel = 'Phật Học';
  else if (currentTopic?.type === 'huyen-hoc') domainLabel = 'Huyền Học';

  const handleCopyBundle = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(handoffBundle);
      }
      setCopiedBundle(true);
      setAnnouncement('Đã sao chép Handoff Bundle vào bộ nhớ tạm');
      setTimeout(() => setCopiedBundle(false), 2000);
    } catch (err) {
      console.error('Failed to copy handoff bundle', err);
      setAnnouncement('Không thể sao chép vào bộ nhớ tạm');
    }
  };

  const handleCopyPrompt = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(specializedPrompt);
      }
      setCopiedPrompt(true);
      setAnnouncement('Đã sao chép Prompt chuyên sâu vào bộ nhớ tạm');
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt', err);
      setAnnouncement('Không thể sao chép vào bộ nhớ tạm');
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
    setAnnouncement(`Đã tải xuống tệp ${a.download}`);
  };

  return (
    <div
      ref={modalContainerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="antigravity-handoff-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Visually Hidden Live Announcements Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-stone-900 dark:text-stone-100">
        {/* Header */}
        <div className="p-4 md:px-6 md:py-4 bg-gradient-to-r from-amber-950 via-stone-900 to-amber-900 text-stone-100 flex items-center justify-between border-b border-amber-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="antigravity-handoff-title" className="text-base font-bold tracking-tight text-white">
                  Antigravity AI Scholar Inspector
                </h2>
                <span className="text-[10px] font-mono uppercase bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-semibold">
                  Reasoning Boundary
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Khảo sát &amp; Đóng gói bối cảnh tri thức 6 phần cùng Đồ thị 1-hop cho Reasoning AI Agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Topic Context Indicator & Selector Bar */}
        <div className="px-4 py-3 md:px-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div
            data-testid="scholar-topic-context-badge"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Chủ đề:</span>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 bg-amber-100/70 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 flex items-center gap-1.5">
              <span>[{domainLabel}]</span>
              <span>{currentTopic?.title}</span>
              <span className="text-[10px] font-mono opacity-70">({topicLinksCount} links)</span>
            </span>
          </div>

          <div className="w-full sm:w-72 flex items-center gap-2">
            <label
              htmlFor="scholar-topic-selector"
              className="text-xs font-semibold text-stone-600 dark:text-stone-400 whitespace-nowrap shrink-0"
            >
              Chủ đề đóng gói bàn giao:
            </label>
            <select
              id="scholar-topic-selector"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full text-xs font-medium bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-1.5 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {topics.map((t) => {
                const tag = t.type === 'phat-hoc' ? 'Phật Học' : t.type === 'huyen-hoc' ? 'Huyền Học' : (t.categoryName || t.type || 'Nghiên Cứu');
                return (
                  <option key={t.id} value={t.id}>
                    [{tag}] {t.title}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 3 Tabs Navigation Toolbar */}
        <div className="px-4 md:px-6 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/90 flex flex-wrap items-center justify-between gap-2">
          <div
            role="tablist"
            aria-label="Các phần khảo cứu học thuật"
            className="flex items-center gap-1 bg-stone-200/70 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold"
          >
            <button
              id="scholar-tab-bundle"
              ref={activeTab === 'bundle' ? initialFocusRef : null}
              type="button"
              role="tab"
              aria-selected={activeTab === 'bundle'}
              aria-controls="scholar-tabpanel-bundle"
              tabIndex={activeTab === 'bundle' ? 0 : -1}
              onClick={() => setActiveTab('bundle')}
              onKeyDown={(e) => handleTabKeyDown(e, 'bundle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === 'bundle'
                  ? 'bg-white dark:bg-stone-700 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Gói Bàn Giao (6 Sections)</span>
            </button>

            <button
              id="scholar-tab-topology"
              type="button"
              role="tab"
              aria-selected={activeTab === 'topology'}
              aria-controls="scholar-tabpanel-topology"
              tabIndex={activeTab === 'topology' ? 0 : -1}
              onClick={() => setActiveTab('topology')}
              onKeyDown={(e) => handleTabKeyDown(e, 'topology')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === 'topology'
                  ? 'bg-white dark:bg-stone-700 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Đồ Thị 1-Hop ({topicLinksCount})</span>
            </button>

            <button
              id="scholar-tab-prompt"
              type="button"
              role="tab"
              aria-selected={activeTab === 'prompt'}
              aria-controls="scholar-tabpanel-prompt"
              tabIndex={activeTab === 'prompt' ? 0 : -1}
              onClick={() => setActiveTab('prompt')}
              onKeyDown={(e) => handleTabKeyDown(e, 'prompt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                activeTab === 'prompt'
                  ? 'bg-white dark:bg-stone-700 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>System Prompt Chuyên Sâu</span>
            </button>
          </div>

          {/* Quick Actions depending on activeTab */}
          <div className="flex items-center gap-2">
            {activeTab === 'bundle' && (
              <>
                <button
                  type="button"
                  onClick={handleCopyBundle}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Download className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                  <span>Tải Tệp Handoff (.md)</span>
                </button>
              </>
            )}

            {activeTab === 'prompt' && (
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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

        {/* Content Viewer (Role TabPanel) */}
        <div
          id={`scholar-tabpanel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`scholar-tab-${activeTab}`}
          tabIndex={0}
          className="flex-1 overflow-y-auto p-4 md:p-6 bg-stone-50/40 dark:bg-stone-900/40 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/40"
        >
          {/* TAB 1: Bundle Preview */}
          {activeTab === 'bundle' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-600 dark:text-stone-300">
                <span className="font-semibold text-stone-900 dark:text-white">Cấu trúc Bundle:</span>
                <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded text-[11px] font-mono">
                  {topicNotesCount} Ghi chú
                </span>
                <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded text-[11px] font-mono">
                  {topicResourcesCount} Tài liệu
                </span>
                <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded text-[11px] font-mono">
                  {topicLinksCount} Đồ thị 1-hop
                </span>
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 rounded text-[11px] font-mono">
                  Zero Binary
                </span>
              </div>
              <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl p-4 font-mono text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                {handoffBundle}
              </div>
            </div>
          )}

          {/* TAB 2: 1-Hop Knowledge Graph Topology */}
          {activeTab === 'topology' && (
            <div className="space-y-4">
              {currentTopic?.links && currentTopic.links.length > 0 ? (
                <div data-testid="scholar-topology-view" className="space-y-3">
                  <div className="p-3 bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-stone-900 dark:text-white">
                        Ma Trận Liên Kết Đồ Thị 1-Hop
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Chỉ các liên kết trực tiếp được định tuyến sang AI Agent để đảm bảo tính chặt chẽ của suy luận.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 rounded-full font-bold text-xs border border-amber-300 dark:border-amber-800">
                      {currentTopic.links.length} Quan hệ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {currentTopic.links.map((link) => {
                      const targetTitle =
                        link.targetTitle ||
                        topics.find((t) => t.id === link.targetId)?.title ||
                        link.targetId;
                      const linkTypeUpper = (link.linkType || 'related').toUpperCase();
                      const strength = link.strength || 3;

                      return (
                        <div
                          key={link.id || link.targetId}
                          className="p-3.5 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl hover:border-amber-400 dark:hover:border-amber-700 transition flex items-start justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <ArrowUpRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="font-bold text-stone-900 dark:text-stone-100 text-xs">
                                {targetTitle}
                              </span>
                              <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded text-[10px] font-mono font-bold">
                                {linkTypeUpper}
                              </span>
                            </div>
                            {link.notes && (
                              <p className="text-[11px] text-stone-600 dark:text-stone-400 pl-6">
                                Ghi chú: {link.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 bg-stone-50 dark:bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-800">
                            <span className="text-[10px] text-stone-500">Độ mạnh:</span>
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                              {strength}/5
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  data-testid="scholar-topology-empty-state"
                  className="py-12 px-4 text-center space-y-3 bg-white dark:bg-stone-950 rounded-xl border border-dashed border-stone-300 dark:border-stone-800"
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Chưa có liên kết 1-hop nào được ghi nhận cho chủ đề này.
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                      Bạn có thể thiết lập các mối liên hệ khái niệm trong bảng chi tiết chủ đề hoặc đồ thị tri thức để AI có thêm góc nhìn liên đới.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: System Prompt */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              {/* Research Mode Selector */}
              <div>
                <label
                  htmlFor="scholar-mode-selector-group"
                  id="scholar-mode-selector-label"
                  className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5"
                >
                  Chế độ nghiên cứu học thuật:
                </label>
                <div
                  id="scholar-mode-selector-group"
                  role="group"
                  aria-labelledby="scholar-mode-selector-label"
                  className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-stone-200/80 dark:bg-stone-800 p-1.5 rounded-xl text-[11px] font-semibold"
                >
                  <button
                    type="button"
                    onClick={() => setResearchMode('concept_analysis')}
                    className={`py-2 px-2.5 rounded-lg transition text-center truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      researchMode === 'concept_analysis' || researchMode === 'scholar_analysis'
                        ? 'bg-white dark:bg-stone-700 text-amber-950 dark:text-amber-200 shadow-xs'
                        : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    Phân Tích Khái Niệm
                  </button>
                  <button
                    type="button"
                    onClick={() => setResearchMode('terminology_exegesis')}
                    className={`py-2 px-2.5 rounded-lg transition text-center truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      researchMode === 'terminology_exegesis' || researchMode === 'pali_sanskrit_exegesis'
                        ? 'bg-white dark:bg-stone-700 text-amber-950 dark:text-amber-200 shadow-xs'
                        : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    Ngữ Nguyên &amp; Thuật Ngữ
                  </button>
                  <button
                    type="button"
                    onClick={() => setResearchMode('cross_domain_synthesis')}
                    className={`py-2 px-2.5 rounded-lg transition text-center truncate cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      researchMode === 'cross_domain_synthesis' || researchMode === 'cross_domain_link'
                        ? 'bg-white dark:bg-stone-700 text-amber-950 dark:text-amber-200 shadow-xs'
                        : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    Tổng Hợp Liên Ngành
                  </button>
                </div>
              </div>

              {/* Custom Query Input with explicit htmlFor & ID */}
              <div>
                <label
                  htmlFor="scholar-custom-query-input"
                  className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1"
                >
                  Câu hỏi học thuật tùy chỉnh (Tùy chọn):
                </label>
                <input
                  id="scholar-custom-query-input"
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Ví dụ: Phân tích 7 tâm sở biến hành trong lộ trình thiền tuệ..."
                  className="w-full text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus-visible:ring-2 focus-visible:ring-amber-500"
                />
              </div>

              {/* Prompt Output Viewer */}
              <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl p-4 font-mono text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                {specializedPrompt}
              </div>
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="px-4 md:px-6 py-3 bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-stone-500 dark:text-stone-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Zero Binary Ingestion &bull; 1-Hop Graph Scope &bull; 100% Client-side privacy</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
