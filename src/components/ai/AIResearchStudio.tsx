import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import {
  Sparkles,
  Send,
  BookOpen,
  Copy,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  AlertCircle,
  Download,
  Clock,
  HelpCircle,
  FileCheck2,
  ListOrdered,
  Layers,
  HardDrive,
  FileText,
} from 'lucide-react';
import { Topic } from '../../types';
import {
  AIResearchSession,
  AIResearchMode,
  AIResearchCitation,
  AIResearchUncertainty,
  AIResearchPlanOutline,
  saveResearchSession,
  getSessionsForTopic,
  getLatestSessionForTopic,
  sanitizeExportFilename,
  formatResearchMarkdown,
  loadObsidianTopicSelection,
  saveObsidianTopicSelection,
} from '../../lib/aiResearchStorage';
import { ObsidianSourcePickerModal } from './ObsidianSourcePickerModal';

const AntigravityHandoffModal = React.lazy(() =>
  import('../integrations/AntigravityHandoffModal').then((m) => ({
    default: m.AntigravityHandoffModal,
  }))
);

interface AIResearchStudioProps {
  currentTopic?: Topic;
  onClose?: () => void;
}

export type ResearchDepth = 'quick' | 'standard' | 'deep';
export type ResearchOutputFormat = 'answer' | 'research_brief' | 'flashcards';

export interface SourceScopeState {
  canonicalText: boolean;
  notes: boolean;
  resources: boolean;
  flashcards: boolean;
  obsidianVault: boolean;
  externalResearch: false;
}

export type ProgressLifecycle =
  | 'idle'
  | 'preparing'
  | 'indexing'
  | 'synthesizing'
  | 'validating'
  | 'completed';

const LIFECYCLE_MESSAGES: Record<ProgressLifecycle, string> = {
  idle: '',
  preparing: 'Đang chuẩn bị yêu cầu nghiên cứu',
  indexing: 'Đang lập chỉ mục nguồn nội bộ đã chọn',
  synthesizing: 'Đang yêu cầu mô hình tổng hợp',
  validating: 'Đang kiểm tra cấu trúc phản hồi',
  completed: 'Hoàn tất',
};

export function AIResearchStudio({ currentTopic, onClose }: AIResearchStudioProps) {
  const { topics, notes, resources, addNote } = useData();
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    currentTopic?.id || topics[0]?.id || ''
  );
  const [researchMode, setResearchMode] = useState<AIResearchMode>('concept_analysis');
  const [depth, setDepth] = useState<ResearchDepth>('standard');
  const [outputFormat, setOutputFormat] = useState<ResearchOutputFormat>('answer');
  const [sourceScope, setSourceScope] = useState<SourceScopeState>({
    canonicalText: true,
    notes: true,
    resources: false,
    flashcards: false,
    obsidianVault: false,
    externalResearch: false,
  });

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lifecycleStep, setLifecycleStep] = useState<ProgressLifecycle>('idle');
  const [researchResult, setResearchResult] = useState<string>('');
  const [citations, setCitations] = useState<AIResearchCitation[]>([]);
  const [uncertainties, setUncertainties] = useState<AIResearchUncertainty[]>([]);
  const [proposedOutline, setProposedOutline] = useState<AIResearchPlanOutline[]>([]);
  const [isStructured, setIsStructured] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);

  // Obsidian Vault Integration States (Phase 2B)
  const [showObsidianPicker, setShowObsidianPicker] = useState(false);
  const [selectedObsidianPaths, setSelectedObsidianPaths] = useState<string[]>([]);
  const [selectedObsidianVaultId, setSelectedObsidianVaultId] = useState<string>('');
  const [availableVaults, setAvailableVaults] = useState<Array<{ vaultId: string; label: string; isCurrent?: boolean }>>([]);
  const [obsidianSourceSummary, setObsidianSourceSummary] = useState<any>(null);

  const [copied, setCopied] = useState(false);
  const [savedAsNote, setSavedAsNote] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const activeTopic = topics.find((t) => t.id === selectedTopicId) || currentTopic || topics[0];
  const topicNotes = notes.filter((n) => n.topicId === activeTopic?.id);
  const topicResources = (resources || []).filter((r) => r.topicId === activeTopic?.id);

  // Fetch available vaults on mount
  useEffect(() => {
    fetch('/api/obsidian/vaults')
      .then((res) => (res.ok ? res.json() : { vaults: [] }))
      .then((data: any) => {
        const vaultsList = Array.isArray(data?.vaults) ? data.vaults : [];
        if (vaultsList.length > 0) {
          setAvailableVaults(vaultsList);
          const activeId =
            data.activeVaultId ||
            vaultsList.find((v: any) => v.isCurrent)?.vaultId ||
            vaultsList[0].vaultId;
          if (activeId && !selectedObsidianVaultId) {
            setSelectedObsidianVaultId(activeId);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Restore latest session or reset when active topic changes
  useEffect(() => {
    if (!activeTopic?.id) return;

    const latestSession = getLatestSessionForTopic(activeTopic.id);
    if (latestSession) {
      setPrompt(latestSession.prompt);
      setResearchMode(latestSession.mode);
      setResearchResult(latestSession.result);
      setCurrentSessionId(latestSession.id);
      setDepth(latestSession.depth || 'standard');
      setOutputFormat(latestSession.outputFormat || 'answer');
      setCitations(latestSession.citations || []);
      setUncertainties(latestSession.uncertainties || []);
      setProposedOutline(latestSession.proposedOutline || []);
      setIsStructured(true);
    } else {
      setPrompt('');
      setResearchResult('');
      setResearchMode('concept_analysis');
      setDepth('standard');
      setOutputFormat('answer');
      setCitations([]);
      setUncertainties([]);
      setProposedOutline([]);
      setIsStructured(true);
      setCurrentSessionId(null);
    }

    // Hydrate Obsidian selection from localStorage
    const storedObsidian = loadObsidianTopicSelection(activeTopic.id);
    if (storedObsidian && storedObsidian.selectedRelativePaths?.length > 0) {
      setSelectedObsidianVaultId(storedObsidian.vaultProfileId);
      setSelectedObsidianPaths(storedObsidian.selectedRelativePaths);
      setSourceScope((prev) => ({ ...prev, obsidianVault: true }));
    } else {
      setSelectedObsidianPaths([]);
      setSourceScope((prev) => ({ ...prev, obsidianVault: false }));
    }

    setCopied(false);
    setSavedAsNote(false);
    setErrorMsg(null);
    setFallbackWarning(null);
    setObsidianSourceSummary(null);
    setLifecycleStep('idle');
  }, [activeTopic?.id]);

  const topicSessions = activeTopic?.id ? getSessionsForTopic(activeTopic.id) : [];

  const categoryOrType = `${activeTopic?.type || ''} ${activeTopic?.categoryName || ''} ${activeTopic?.categoryId || ''}`.toLowerCase();
  const isBuddhist = categoryOrType.includes('phat') || categoryOrType.includes('phật') || categoryOrType.includes('buddhis') || categoryOrType.includes('abhidhamma');
  const isMystic = categoryOrType.includes('huyen') || categoryOrType.includes('huyền') || categoryOrType.includes('dich') || categoryOrType.includes('dịch');

  const quickPrompts = isBuddhist
    ? [
        {
          label: 'Phân tích Vi Diệu Pháp & Tâm Sở',
          prompt: 'Hãy phân tích chi tiết các Tâm sở (Cetasika) đồng sanh hoặc tương ưng với chủ đề này, đối chiếu theo Luận tạng Abhidhamma.',
          mode: 'concept_analysis' as const,
        },
        {
          label: 'Tra Cứu Gốc Từ Pali / Sanskrit / Hán Cổ',
          prompt: 'Chiết tự và tra cứu nguyên ngữ gốc Pali (IAST), Sanskrit và đối chiếu chữ Hán cổ cho các thuật ngữ trọng tâm trong chủ đề này.',
          mode: 'terminology_exegesis' as const,
        },
        {
          label: 'Đối Chiếu Phật Học & Dịch Học / Kỳ Môn',
          prompt: 'Phân tích mối tương quan học thuật và triết lý giữa chủ đề này với quy luật Âm Dương Ngũ Hành, 64 Quẻ Dịch hoặc Kỳ Môn Độn Giáp.',
          mode: 'cross_domain_synthesis' as const,
        },
      ]
    : isMystic
    ? [
        {
          label: 'Khảo Luận Quẻ Dịch & Hào Từ',
          prompt: 'Phân tích tượng quẻ, thoán từ, hào từ và biến dịch liên quan đến chủ đề nghiên cứu này.',
          mode: 'concept_analysis' as const,
        },
        {
          label: 'Ngữ Nguyên & Chiết Tự Hán Cổ',
          prompt: 'Chiết tự chữ Hán cổ, giải nghĩa gốc từ và bối cảnh triết học cổ điển của các thuật ngữ trọng tâm.',
          mode: 'terminology_exegesis' as const,
        },
        {
          label: 'Đối Chiếu Ngũ Hành & Lý Khí',
          prompt: 'Đối chiếu quy luật Âm Dương Ngũ Hành, Thiên Can Địa Chi và quy luật tương sinh tương khắc.',
          mode: 'cross_domain_synthesis' as const,
        },
      ]
    : [
        {
          label: 'Phân Tích Cấu Trúc Khái Niệm & Tiên Đề',
          prompt: `Hãy phân tích chi tiết các định nghĩa cốt lõi, thành tố cấu thành và khung lý thuyết nền tảng của chủ đề "${activeTopic?.title || ''}".`,
          mode: 'concept_analysis' as const,
        },
        {
          label: 'Khảo Cứu Ngữ Nguyên & Thuật Ngữ',
          prompt: `Truy xuất nguồn gốc ngữ nguyên, thuật ngữ chuyên ngành và đối chiếu các dị bản định nghĩa học thuật cho "${activeTopic?.title || ''}".`,
          mode: 'terminology_exegesis' as const,
        },
        {
          label: 'Tổng Hợp & Đối Chiếu Liên Ngành',
          prompt: `Khảo cứu mối tương quan học thuật và phương pháp luận giữa "${activeTopic?.title || ''}" với các nhánh tri thức liên quan.`,
          mode: 'cross_domain_synthesis' as const,
        },
      ];

  const handleExecuteResearch = async (customPrompt?: string) => {
    if (isLoading) return;
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || !activeTopic) return;

    setIsLoading(true);
    setLifecycleStep('preparing');
    setErrorMsg(null);
    setFallbackWarning(null);
    setSavedAsNote(false);

    try {
      // 1. Preparing & Gathering bounded client sources
      setLifecycleStep('indexing');
      const selectedSources: Array<{
        sourceId: string;
        sourceType: 'canonical_text' | 'note' | 'resource' | 'flashcard';
        title: string;
        content: string;
      }> = [];

      if (sourceScope.canonicalText && (activeTopic.content || activeTopic.description)) {
        selectedSources.push({
          sourceId: `canon-${activeTopic.id}`,
          sourceType: 'canonical_text',
          title: activeTopic.title,
          content: `${activeTopic.description || ''}\n\n${activeTopic.content || ''}`.trim(),
        });
      }

      if (sourceScope.notes) {
        for (const n of topicNotes) {
          if (n.content?.trim()) {
            selectedSources.push({
              sourceId: n.id,
              sourceType: 'note',
              title: n.title,
              content: n.content.trim(),
            });
          }
        }
      }

      if (sourceScope.resources) {
        for (const r of topicResources) {
          const resContent = (r.notes || r.title || '').trim();
          if (resContent) {
            selectedSources.push({
              sourceId: r.id,
              sourceType: 'resource',
              title: r.title,
              content: resContent,
            });
          }
        }
      }

      // 2. Synthesizing request to server
      setLifecycleStep('synthesizing');
      const obsidianSourcesToSend =
        sourceScope.obsidianVault && selectedObsidianPaths.length > 0 && selectedObsidianVaultId
          ? selectedObsidianPaths.map((p) => ({
              vaultProfileId: selectedObsidianVaultId,
              relativePath: p,
            }))
          : undefined;

      const response = await fetch('/api/gemini/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          topicTitle: activeTopic.title,
          category: activeTopic.categoryName || activeTopic.type,
          mode: researchMode,
          sourceScope: {
            canonicalText: sourceScope.canonicalText,
            notes: sourceScope.notes,
            resources: sourceScope.resources,
            flashcards: sourceScope.flashcards,
            obsidianVault: sourceScope.obsidianVault,
            externalResearch: false,
          },
          depth,
          outputFormat,
          selectedSources,
          obsidianSources: obsidianSourcesToSend,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.error === 'SOURCE_RESOLUTION_EMPTY') {
          if (data.obsidianSourceSummary) {
            setObsidianSourceSummary(data.obsidianSourceSummary);
          }
          throw new Error(
            data.message ||
              'Không tìm thấy nội dung hợp lệ từ các tài liệu Obsidian đã chọn (file đã bị đổi tên hoặc xóa khỏi ổ đĩa). Vui lòng chọn lại tài liệu hoặc bỏ chọn nguồn Obsidian.'
          );
        }
        throw new Error(data.error || 'Lỗi kết nối máy chủ AI.');
      }

      // 3. Validating response
      setLifecycleStep('validating');
      setResearchResult(data.result);
      setCitations(data.citations || []);
      setUncertainties(data.uncertainties || []);
      setProposedOutline(data.proposedOutline || []);
      setIsStructured(data.isStructured !== false);
      if (data.obsidianSourceSummary) {
        setObsidianSourceSummary(data.obsidianSourceSummary);
      }

      if (data.isStructured === false) {
        setFallbackWarning(
          'Mô hình trả về kết quả Markdown tự do thay vì cấu trúc JSON có trích dẫn. Các danh mục trích dẫn và độ bất định tạm thời để trống.'
        );
      }

      // Persist session
      const saved = saveResearchSession({
        topicId: activeTopic.id,
        topicTitle: activeTopic.title,
        mode: researchMode,
        prompt: textToSend,
        result: data.result,
        depth,
        outputFormat,
        citations: data.citations || [],
        uncertainties: data.uncertainties || [],
        proposedOutline: data.proposedOutline || [],
        sourceStats: data.sourceStats,
      });

      if (saved) {
        setCurrentSessionId(saved.id);
      }

      // Persist Obsidian selection
      if (sourceScope.obsidianVault && selectedObsidianPaths.length > 0 && selectedObsidianVaultId) {
        saveObsidianTopicSelection({
          topicId: activeTopic.id,
          vaultProfileId: selectedObsidianVaultId,
          selectedRelativePaths: selectedObsidianPaths,
        });
      }

      setLifecycleStep('completed');
    } catch (err: any) {
      console.error('Research error:', err);
      setErrorMsg(err.message || 'Không thể thực hiện khảo cứu AI lúc này.');
      setLifecycleStep('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToNotes = () => {
    if (!researchResult || !activeTopic) return;

    if (outputFormat === 'flashcards') {
      addNote({
        topicId: activeTopic.id,
        topicTitle: activeTopic.title,
        title: `Thẻ Q&A Draft: ${prompt.slice(0, 40) || 'Khảo cứu học thuật'}`,
        content: `> **Câu hỏi khảo cứu:** ${prompt || 'Khảo cứu Q&A'}\n\n${researchResult}`,
        type: 'question',
        isPrivate: false,
        tags: ['Q&A-Draft', 'AI-Research', 'Flashcard', activeTopic.type],
      });
    } else {
      addNote({
        topicId: activeTopic.id,
        topicTitle: activeTopic.title,
        title: `Khảo cứu Antigravity AI: ${prompt.slice(0, 40) || 'Phân tích học thuật'}`,
        content: `> **Câu hỏi khảo cứu:** ${prompt || 'Khảo cứu chuyên sâu'}\n\n${researchResult}`,
        type: 'insight',
        isPrivate: false,
        tags: ['AI-Research', 'Antigravity', activeTopic.type],
      });
    }

    setSavedAsNote(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(researchResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    if (!researchResult || !activeTopic) return;

    const currentSession: AIResearchSession = {
      id: currentSessionId || `airs-exp-${Date.now()}`,
      topicId: activeTopic.id,
      topicTitle: activeTopic.title,
      mode: researchMode,
      prompt: prompt || 'Khảo cứu chuyên sâu',
      result: researchResult,
      timestamp: Date.now(),
      depth,
      outputFormat,
      citations,
      uncertainties,
      proposedOutline,
    };

    const mdContent = formatResearchMarkdown(currentSession, {
      domainOrCategory: activeTopic.categoryName || activeTopic.type,
    });

    const filename = sanitizeExportFilename(
      activeTopic.slug || activeTopic.title,
      currentSession.timestamp
    );

    try {
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export markdown failed:', err);
    }
  };

  const handleSelectHistorySession = (session: AIResearchSession) => {
    if (isLoading) return;
    setResearchResult(session.result);
    setPrompt(session.prompt);
    setResearchMode(session.mode);
    setDepth(session.depth || 'standard');
    setOutputFormat(session.outputFormat || 'answer');
    setCitations(session.citations || []);
    setUncertainties(session.uncertainties || []);
    setProposedOutline(session.proposedOutline || []);
    setCurrentSessionId(session.id);
    setIsStructured(true);
    setCopied(false);
    setSavedAsNote(false);
    setErrorMsg(null);
    setFallbackWarning(null);
    setLifecycleStep('idle');
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 rounded-2xl shadow-xl flex flex-col h-full max-h-[85vh] overflow-hidden">
      {/* Header */}
      <div className="p-4 md:px-6 md:py-4 bg-stone-900 dark:bg-stone-950 text-stone-100 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold tracking-tight text-stone-100 font-serif-title">
                Antigravity AI Scholar &amp; Research Engine
              </h2>
              <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                Research Copilot
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              AI Research Copilot — Khảo cứu có bối cảnh, bằng chứng và kiểm soát độ sâu
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHandoffModal(true)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Đóng gói Handoff Bundle 6 phần cho Reasoning AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Gói Bàn Giao Handoff</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-stone-300 hover:text-white px-2.5 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-xs font-semibold cursor-pointer transition border border-stone-700/60"
            >
              Đóng
            </button>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Select topic */}
          <div>
            <label
              htmlFor="copilot-topic-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1"
            >
              Chủ đề khảo cứu đang chọn:
            </label>
            <select
              id="copilot-topic-select"
              value={selectedTopicId}
              disabled={isLoading}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="w-full text-xs font-medium bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-700/50 focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {topics.map((t) => {
                const domainLabel =
                  t.type === 'phat-hoc'
                    ? 'Phật Học'
                    : t.type === 'huyen-hoc'
                    ? 'Huyền Học'
                    : t.categoryName || t.type || 'Nghiên Cứu';
                return (
                  <option key={t.id} value={t.id}>
                    [{domainLabel}] {t.title}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Select research mode */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
              Chế độ khảo cứu chuyên biệt:
            </label>
            <div className="grid grid-cols-3 gap-1 bg-stone-200/80 dark:bg-stone-800 p-1 rounded-xl text-[11px] font-semibold border border-stone-300/50 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setResearchMode('concept_analysis')}
                className={`py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer ${
                  researchMode === 'concept_analysis' || researchMode === 'scholar_analysis'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold border border-stone-200 dark:border-stone-700'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Phân Tích Khái Niệm
              </button>
              <button
                type="button"
                onClick={() => setResearchMode('terminology_exegesis')}
                className={`py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer ${
                  researchMode === 'terminology_exegesis' ||
                  researchMode === 'pali_sanskrit_exegesis'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold border border-stone-200 dark:border-stone-700'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Ngữ Nguyên &amp; Thuật Ngữ
              </button>
              <button
                type="button"
                onClick={() => setResearchMode('cross_domain_synthesis')}
                className={`py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer ${
                  researchMode === 'cross_domain_synthesis' ||
                  researchMode === 'cross_domain_link'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xs font-bold border border-stone-200 dark:border-stone-700'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Tổng Hợp Liên Ngành
              </button>
            </div>
          </div>
        </div>

        {/* Phase 2A Controls: Source Scope, Depth & Output Format */}
        <div className="pt-2 border-t border-stone-200/70 dark:border-stone-800 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          {/* Source Scope Checkboxes */}
          <div className="md:col-span-6 space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Phạm vi nguồn nội bộ (Source Scope):
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-stone-800 dark:text-stone-200">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sourceScope.canonicalText}
                  disabled={isLoading}
                  onChange={(e) =>
                    setSourceScope({ ...sourceScope, canonicalText: e.target.checked })
                  }
                  className="rounded text-amber-800 focus:ring-amber-700"
                />
                <span>Tài liệu Chuyên đề (Canonical)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sourceScope.notes}
                  disabled={isLoading}
                  onChange={(e) =>
                    setSourceScope({ ...sourceScope, notes: e.target.checked })
                  }
                  className="rounded text-amber-800 focus:ring-amber-700"
                />
                <span>Ghi chú học tập (Notes)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sourceScope.resources}
                  disabled={isLoading}
                  onChange={(e) =>
                    setSourceScope({ ...sourceScope, resources: e.target.checked })
                  }
                  className="rounded text-amber-800 focus:ring-amber-700"
                />
                <span>Tài liệu tham khảo (Resources)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sourceScope.flashcards}
                  disabled={isLoading}
                  onChange={(e) =>
                    setSourceScope({ ...sourceScope, flashcards: e.target.checked })
                  }
                  className="rounded text-amber-800 focus:ring-amber-700"
                />
                <span>Thẻ ghi nhớ có sẵn (Flashcards)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sourceScope.obsidianVault}
                  disabled={isLoading}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSourceScope({ ...sourceScope, obsidianVault: checked });
                    if (checked && selectedObsidianPaths.length === 0) {
                      setShowObsidianPicker(true);
                    }
                  }}
                  className="rounded text-purple-700 focus:ring-purple-600"
                />
                <span className="font-medium text-purple-900 dark:text-purple-300">
                  Obsidian Vault ({selectedObsidianPaths.length}/3)
                </span>
              </label>

              {sourceScope.obsidianVault && (
                <button
                  type="button"
                  onClick={() => setShowObsidianPicker(true)}
                  className="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <HardDrive className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>Chọn tài liệu...</span>
                </button>
              )}

              <label
                className="flex items-center gap-1.5 text-stone-400 dark:text-stone-500 cursor-not-allowed select-none"
                title="Nghiên cứu bên ngoài chưa được hỗ trợ trong Phase 2A"
              >
                <input
                  type="checkbox"
                  checked={false}
                  disabled={true}
                  className="rounded text-stone-300 dark:text-stone-600 cursor-not-allowed"
                />
                <span>Nghiên cứu Internet bên ngoài</span>
              </label>
            </div>

            {/* Selection Preview for Obsidian Vault */}
            {sourceScope.obsidianVault && selectedObsidianPaths.length > 0 && (
              <div className="mt-2 p-2.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 rounded-xl text-xs text-purple-950 dark:text-purple-200 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                    Tài liệu Obsidian đã chọn ({selectedObsidianPaths.length}/3):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowObsidianPicker(true)}
                    className="text-[11px] text-purple-700 dark:text-purple-400 underline hover:text-purple-900 dark:hover:text-purple-300 cursor-pointer"
                  >
                    Đổi tài liệu
                  </button>
                </div>
                <ul className="list-disc list-inside text-[11px] text-purple-900 dark:text-purple-300 space-y-0.5 font-mono">
                  {selectedObsidianPaths.map((p) => (
                    <li key={p} className="truncate">
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 italic">
                  Ước tính sơ bộ trước submit. Thống kê dung lượng thực tế sẽ được server chuẩn hóa.
                </p>
              </div>
            )}
          </div>

          {/* Depth Pills */}
          <div className="md:col-span-3 space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Độ sâu khảo cứu (Depth):
            </span>
            <div className="flex items-center gap-1 bg-stone-200/80 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-300/50 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setDepth('quick')}
                className={`flex-1 py-1 px-1.5 rounded text-[11px] font-medium transition text-center cursor-pointer ${
                  depth === 'quick'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold shadow-2xs border border-stone-200 dark:border-stone-700'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Nhanh
              </button>
              <button
                type="button"
                onClick={() => setDepth('standard')}
                className={`flex-1 py-1 px-1.5 rounded text-[11px] font-medium transition text-center cursor-pointer ${
                  depth === 'standard'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold shadow-2xs border border-stone-200 dark:border-stone-700'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Chuẩn mực
              </button>
              <button
                type="button"
                onClick={() => setDepth('deep')}
                className={`flex-1 py-1 px-1.5 rounded text-[11px] font-medium transition text-center cursor-pointer ${
                  depth === 'deep'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-bold shadow-2xs border border-stone-200 dark:border-stone-700'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Chuyên sâu
              </button>
            </div>
          </div>

          {/* Output Format Selector */}
          <div className="md:col-span-3 space-y-1.5">
            <label
              htmlFor="copilot-output-format"
              className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400"
            >
              Định dạng đầu ra:
            </label>
            <select
              id="copilot-output-format"
              value={outputFormat}
              disabled={isLoading}
              onChange={(e) => setOutputFormat(e.target.value as ResearchOutputFormat)}
              className="w-full text-xs font-medium bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-700/50 focus:outline-hidden disabled:opacity-50"
            >
              <option value="answer">Câu trả lời (Answer)</option>
              <option value="research_brief">Bản tóm lược (Research Brief)</option>
              <option value="flashcards">Tạo Q&A Draft (Flashcards)</option>
              <option value="study_guide" disabled>
                Study Guide (Chưa hỗ trợ)
              </option>
              <option value="source_pack" disabled>
                Source Pack (Chưa hỗ trợ)
              </option>
            </select>
          </div>
        </div>

        {/* Lightweight Topic History Bar */}
        {topicSessions.length > 0 && (
          <div className="pt-1 border-t border-stone-200/60 dark:border-stone-800">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] no-scrollbar">
              <span className="text-[10px] font-bold text-amber-900/80 dark:text-amber-400 uppercase tracking-wider shrink-0 flex items-center gap-1 px-1">
                <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                Lịch sử ({topicSessions.length}):
              </span>
              <div className="flex items-center gap-1.5 flex-nowrap">
                {topicSessions.map((s) => {
                  const isSelected = s.id === currentSessionId;
                  const formattedTime = new Date(s.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSelectHistorySession(s)}
                      className={`px-2.5 py-1 rounded-lg text-left truncate max-w-[220px] text-xs transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-amber-900 dark:bg-amber-800 text-amber-50 border-amber-900 dark:border-amber-700 font-semibold shadow-xs'
                          : 'bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={`${s.prompt} — (${new Date(s.timestamp).toLocaleString('vi-VN')})`}
                    >
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'text-amber-200' : 'text-stone-400 dark:text-stone-500 font-mono'
                        }`}
                      >
                        {formattedTime}
                      </span>
                      <span className="truncate">{s.prompt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick prompt badges */}
        <div>
          <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5">
            Gợi ý truy vấn học thuật nhanh:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(qp.prompt);
                  setResearchMode(qp.mode);
                  handleExecuteResearch(qp.prompt);
                }}
                className="text-[11px] px-2.5 py-1 bg-amber-50 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-stone-700 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-stone-700 rounded-lg transition text-left cursor-pointer"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-stone-50/50 dark:bg-stone-900/40 space-y-4">
        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Thông báo lỗi:</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {fallbackWarning && (
          <div
            role="status"
            className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 rounded-xl text-xs flex items-start gap-2"
          >
            <HelpCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <p>{fallbackWarning}</p>
          </div>
        )}

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="py-16 text-center space-y-3"
          >
            <RefreshCw className="w-8 h-8 text-amber-700 dark:text-amber-400 animate-spin mx-auto" />
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {LIFECYCLE_MESSAGES[lifecycleStep] || 'Đang thực hiện khảo cứu...'}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              Hệ thống đang đối chiếu các nguồn nội bộ đã chọn và tổng hợp phản hồi theo chuẩn học thuật.
            </p>
          </div>
        ) : researchResult ? (
          <div className="space-y-4">
            {/* AI Proposed Outline (1 round-trip outline) */}
            {proposedOutline && proposedOutline.length > 0 && (
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl p-3.5 text-xs text-amber-950 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-amber-900 dark:text-amber-300">
                  <ListOrdered className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                  <span>Đề cương khảo cứu do AI đề xuất (1 Round-trip):</span>
                </div>
                <ul className="list-decimal list-inside space-y-1 pl-1 text-stone-800 dark:text-stone-200">
                  {proposedOutline.map((item, idx) => (
                    <li key={idx}>
                      <span className="font-semibold">{item.title}</span>
                      {item.description && (
                        <span className="text-stone-600 dark:text-stone-400 text-[11px]"> — {item.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Main Result Box */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                    Kết Quả Khảo Cứu Chuyên Sâu
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="px-2.5 py-1 text-xs bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-lg flex items-center gap-1.5 transition font-medium cursor-pointer"
                    title="Tải file Markdown đầy đủ cấu trúc học thuật"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                    <span>Xuất Markdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 text-xs bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-lg flex items-center gap-1.5 transition font-medium cursor-pointer"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveToNotes}
                    disabled={savedAsNote}
                    className={`px-2.5 py-1 text-xs rounded-lg flex items-center gap-1.5 transition font-medium cursor-pointer border ${
                      savedAsNote
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {savedAsNote ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <PlusCircle className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {savedAsNote
                        ? outputFormat === 'flashcards'
                          ? 'Đã lưu Q&A Draft'
                          : 'Đã lưu vào Ghi chú'
                        : outputFormat === 'flashcards'
                        ? 'Lưu Q&A Draft'
                        : 'Lưu thành Note'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Markdown Content Body */}
              <div className="prose prose-stone dark:prose-invert max-w-none text-stone-800 dark:text-stone-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {researchResult}
              </div>
            </div>

            {/* Citations & Evidence Panel */}
            {citations && citations.length > 0 && (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-stone-800 dark:text-stone-200">
                  <Layers className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Bằng chứng &amp; Nguồn trích dẫn ({citations.length}):</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {citations.map((cit) => {
                    const statusLabel =
                      cit.evidenceStatus === 'grounded'
                        ? 'Đã kiểm chứng (Grounded)'
                        : cit.evidenceStatus === 'inferred'
                        ? 'Suy luận (Inferred)'
                        : 'Cần thêm bằng chứng';
                    const statusBadgeClass =
                      cit.evidenceStatus === 'grounded'
                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800'
                        : cit.evidenceStatus === 'inferred'
                        ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300/60 dark:border-blue-800'
                        : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800';
                    return (
                      <div
                        key={cit.id}
                        className="p-2.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                            {cit.sourceRegistryId}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p className="font-semibold text-stone-900 dark:text-stone-100">{cit.sourceTitle}</p>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 uppercase">
                          Loại nguồn: {cit.sourceType}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Uncertainties & Gaps Panel */}
            {uncertainties && uncertainties.length > 0 && (
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-950 dark:text-amber-300">
                  <HelpCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Độ bất định &amp; Khoảng trống khảo cứu ({uncertainties.length}):</span>
                </div>
                <div className="space-y-1.5 text-xs text-stone-800 dark:text-stone-200">
                  {uncertainties.map((unc, idx) => (
                    <div key={idx} className="p-2 bg-white/80 dark:bg-stone-800/80 rounded-lg border border-amber-200/60 dark:border-stone-700">
                      <span className="font-bold text-amber-950 dark:text-amber-300">{unc.point}:</span>{' '}
                      <span className="text-stone-700 dark:text-stone-300">{unc.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-stone-500 dark:text-stone-400 space-y-2">
            <BookOpen className="w-8 h-8 text-stone-400 dark:text-stone-500 mx-auto" />
            <p className="text-xs font-medium">
              Chọn cấu hình phạm vi nguồn, độ sâu, định dạng đầu ra và đặt câu hỏi khảo cứu bên dưới để bắt đầu.
            </p>
          </div>
        )}
      </div>

      {/* Footer Query Bar */}
      <div className="p-3 md:p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteResearch();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Đặt câu hỏi khảo cứu cho chủ đề "${activeTopic?.title || 'Phật học & Dịch học'}"...`}
            className="flex-1 px-4 py-2.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-700/50"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Khảo Cứu</span>
          </button>
        </form>
      </div>

      {showHandoffModal && (
        <React.Suspense fallback={null}>
          <AntigravityHandoffModal
            isOpen={showHandoffModal}
            onClose={() => setShowHandoffModal(false)}
            topic={activeTopic}
          />
        </React.Suspense>
      )}

      {showObsidianPicker && (
        <ObsidianSourcePickerModal
          isOpen={showObsidianPicker}
          onClose={() => setShowObsidianPicker(false)}
          vaults={availableVaults}
          initialVaultId={selectedObsidianVaultId}
          initialSelectedPaths={selectedObsidianPaths}
          onConfirm={(result) => {
            setSelectedObsidianVaultId(result.vaultProfileId);
            setSelectedObsidianPaths(result.selectedRelativePaths);
            if (result.selectedRelativePaths.length > 0) {
              setSourceScope((prev) => ({ ...prev, obsidianVault: true }));
              if (activeTopic?.id) {
                saveObsidianTopicSelection({
                  topicId: activeTopic.id,
                  vaultProfileId: result.vaultProfileId,
                  selectedRelativePaths: result.selectedRelativePaths,
                });
              }
            } else {
              setSourceScope((prev) => ({ ...prev, obsidianVault: false }));
            }
          }}
        />
      )}
    </div>
  );
}
