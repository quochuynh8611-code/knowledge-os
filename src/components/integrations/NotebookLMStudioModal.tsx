import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import {
  X,
  FileText,
  ExternalLink,
  Download,
  Copy,
  CheckCircle2,
  Headphones,
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  UploadCloud,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import {
  packageSourceForNotebookLM,
  generateNotebookLMTaskPrompt,
  validateArtifactImportInput,
  parseArtifactMarkdownFile,
  getStoredArtifacts,
  saveArtifact,
  deleteArtifact,
  NotebookLMArtifact,
  NotebookLMArtifactType,
} from '../../lib/notebooklm';
import {
  createAntigravityHandoffJob,
  buildAntigravityCLICommand,
  getStoredHandoffJobs,
  saveHandoffJob,
  deleteHandoffJob,
  completeMatchingHandoffJob,
  AntigravityHandoffJob,
  AntigravityJobStatus,
} from '../../lib/antigravityPipeline';
import { sanitizeFileName } from '../../lib/obsidian';
import { Topic } from '../../types';

interface NotebookLMStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic?: Topic;
}

export function NotebookLMStudioModal({ isOpen, onClose, topic }: NotebookLMStudioModalProps) {
  const { topics, notes, resources } = useData();
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topic?.id || topics[0]?.id || '');
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Task Prompt states
  const [promptArtifactType, setPromptArtifactType] = useState<NotebookLMArtifactType>('study_guide');
  const [customInstructions, setCustomInstructions] = useState('');

  // Antigravity Pipeline states
  const [handoffJobs, setHandoffJobs] = useState<AntigravityHandoffJob[]>([]);
  const [activeJob, setActiveJob] = useState<AntigravityHandoffJob | null>(null);
  const [copiedCliCommand, setCopiedCliCommand] = useState(false);

  // Artifact Locker states
  const [artifacts, setArtifacts] = useState<NotebookLMArtifact[]>([]);
  const [showAddArtifact, setShowAddArtifact] = useState(false);
  const [artifactType, setArtifactType] = useState<NotebookLMArtifactType>('audio_overview_summary');
  const [artifactTitle, setArtifactTitle] = useState('');
  const [artifactContent, setArtifactContent] = useState('');
  const [notebookUrl, setNotebookUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topic || topics[0];

  useEffect(() => {
    if (isOpen) {
      setArtifacts(getStoredArtifacts());
      setHandoffJobs(getStoredHandoffJobs());
      setValidationError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sourceDocument = currentTopic
    ? packageSourceForNotebookLM(currentTopic, notes, resources)
    : '';

  const taskPrompt = currentTopic
    ? generateNotebookLMTaskPrompt(currentTopic, promptArtifactType, customInstructions)
    : '';

  const handleCopySource = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sourceDocument);
      }
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
    } catch (err) {
      console.error('Failed to copy source to clipboard', err);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(taskPrompt);
      }
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt to clipboard', err);
    }
  };

  const handleDownloadSourceFile = () => {
    if (!currentTopic) return;
    const blob = new Blob([sourceDocument], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NotebookLM-Source-${sanitizeFileName(currentTopic.title)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrepareHandoff = () => {
    if (!currentTopic) return;
    const { job } = createAntigravityHandoffJob(
      currentTopic,
      promptArtifactType,
      customInstructions,
      notes,
      resources
    );
    saveHandoffJob(job);
    setActiveJob(job);
    setHandoffJobs(getStoredHandoffJobs());
  };

  const handleCopyCLICommand = async (jobToCopy?: AntigravityHandoffJob) => {
    const target = jobToCopy || activeJob || handoffJobs[0];
    if (!target) return;
    const cmd = buildAntigravityCLICommand(target);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cmd);
      }
      setCopiedCliCommand(true);
      setTimeout(() => setCopiedCliCommand(false), 2000);
    } catch (err) {
      console.error('Failed to copy CLI command', err);
    }
  };

  const handleDeleteJob = (jobId: string) => {
    deleteHandoffJob(jobId);
    setHandoffJobs(getStoredHandoffJobs());
    if (activeJob?.jobId === jobId) {
      setActiveJob(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTopic) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseArtifactMarkdownFile(text, currentTopic.id);
        setArtifactTitle(parsed.title);
        setArtifactContent(parsed.content);
        setArtifactType(parsed.type);
        setShowAddArtifact(true);
        setValidationError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveNewArtifact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTopic) return;

    const validation = validateArtifactImportInput({
      topicId: currentTopic.id,
      title: artifactTitle,
      content: artifactContent,
      notebookUrl: notebookUrl || undefined,
    });

    if (!validation.valid) {
      setValidationError(validation.error || 'Dữ liệu không hợp lệ.');
      return;
    }

    setValidationError(null);

    const saved = saveArtifact({
      topicId: currentTopic.id,
      type: artifactType,
      title: validation.sanitized!.title,
      content: validation.sanitized!.content,
      notebookUrl: validation.sanitized!.notebookUrl,
      source: 'antigravity-2.0',
      target: 'notebooklm',
      status: 'imported',
    });

    const completedJob = completeMatchingHandoffJob({
      topicId: currentTopic.id,
      artifactType,
    });
    if (completedJob) {
      setHandoffJobs(getStoredHandoffJobs());
      if (activeJob?.jobId === completedJob.jobId) {
        setActiveJob(completedJob);
      }
    }

    setArtifacts((prev) => [saved, ...prev]);
    setShowAddArtifact(false);
    setArtifactTitle('');
    setArtifactContent('');
    setNotebookUrl('');
  };

  const handleDeleteArtifact = (id: string) => {
    deleteArtifact(id);
    setArtifacts((prev) => prev.filter((a) => a.id !== id));
  };

  const topicArtifacts = artifacts.filter((a) => a.topicId === currentTopic?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-700 text-blue-50 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">
                  Google NotebookLM Research Hub
                </h2>
                <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                  Mediated via Antigravity 2.0
                </span>
              </div>
              <p className="text-xs text-stone-600">
                Đóng gói Source Data &bull; Sinh Task Prompt &bull; Nhập kết quả Grounded Artifacts
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-500 hover:text-stone-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-stone-700">
          {/* Topic Selector & Official Link Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
            <div className="w-full sm:w-1/2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                Chủ đề đang đóng gói nguồn:
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full text-xs font-medium bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.type === 'phat-hoc' ? 'Phật Học' : 'Huyền Học'}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            <a
              href="https://notebooklm.google.com/"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Google NotebookLM</span>
            </a>
          </div>

          {/* Section 1: Source Document Packager */}
          <div className="bg-blue-50/70 border border-blue-200/80 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-950">
                <FileText className="w-4 h-4 text-blue-700" />
                <span>Tài liệu nguồn đã chuẩn hóa (Source Document)</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopySource}
                  className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 rounded-lg font-medium border border-stone-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedSource ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSource ? 'Đã sao chép!' : 'Sao chép nguồn'}</span>
                </button>
                <button
                  onClick={handleDownloadSourceFile}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải File Nguồn (.md)</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-blue-900/80 leading-relaxed">
              Tài liệu này đã được tự động tổng hợp toàn diện luận giải, kinh văn, 52 tâm sở/dịch quẻ liên quan, trích dẫn học thuật và ghi chú khảo cứu của chủ đề. Bạn chỉ cần tải file hoặc sao chép và thêm vào Source của NotebookLM.
            </p>

            <div className="max-h-36 overflow-y-auto p-3 bg-white border border-blue-200 rounded-xl font-mono text-[11px] text-stone-800 whitespace-pre-wrap">
              {sourceDocument.slice(0, 800)}...
            </div>
          </div>

          {/* Section 2: Task Prompt Generator for Antigravity 2.0 */}
          <div className="bg-amber-50/70 border border-amber-200/80 p-5 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
                <Terminal className="w-4 h-4 text-amber-700" />
                <span>Task Prompt Cho Antigravity 2.0 (Target: NotebookLM Skill)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="btn-prepare-antigravity-handoff"
                  onClick={handlePrepareHandoff}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Chuẩn bị Handoff Antigravity</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer text-xs"
                >
                  {copiedPrompt ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Đã sao chép Prompt!' : 'Sao chép Task Prompt'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Loại Artifact Mục Tiêu Cho Antigravity 2.0:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'study_guide', label: 'Study Guide' },
                      { id: 'audio_overview_summary', label: 'Audio Overview' },
                      { id: 'briefing_doc', label: 'Briefing Doc' },
                      { id: 'faq', label: 'FAQ' },
                      { id: 'source_pack', label: 'Source Pack' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPromptArtifactType(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        promptArtifactType === item.id
                          ? 'bg-amber-800 text-white shadow-2xs'
                          : 'bg-white text-stone-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Chỉ Dẫn Bổ Sung (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Ví dụ: Chú trọng đối chiếu Abhidhamma và Thiền Quán..."
                  className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto p-3 bg-white border border-amber-200 rounded-xl font-mono text-[11px] text-stone-800 whitespace-pre-wrap">
              {taskPrompt}
            </div>

            {/* Antigravity CLI Command & Tracker Panel */}
            {(activeJob || handoffJobs.length > 0) && (
              <div className="p-4 bg-stone-900 text-stone-100 rounded-xl space-y-3 border border-stone-800 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Terminal className="w-4 h-4" />
                    <span>Lệnh Antigravity CLI Headless (agy -p):</span>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-copy-handoff-cli"
                    onClick={() => handleCopyCLICommand(activeJob || handoffJobs[0])}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedCliCommand ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Đã sao chép lệnh CLI</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép lệnh CLI</span>
                      </>
                    )}
                  </button>
                </div>

                <div
                  data-testid="handoff-cli-command-preview"
                  className="p-3 bg-stone-950 rounded-lg font-mono text-[11px] text-amber-200 break-all border border-stone-800 selection:bg-amber-900 selection:text-white"
                >
                  {buildAntigravityCLICommand(activeJob || handoffJobs[0])}
                </div>

                {/* Tracker list */}
                <div data-testid="handoff-jobs-tracker-list" className="pt-2 border-t border-stone-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-stone-400">
                    Lịch sử Pipeline Handoff ({handoffJobs.length}):
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {handoffJobs.map((job) => {
                      const getJobStatusBadgeClass = (status: AntigravityJobStatus) => {
                        switch (status) {
                          case 'success':
                            return 'bg-emerald-950 text-emerald-300 border-emerald-800';
                          case 'processing':
                            return 'bg-blue-950 text-blue-300 border-blue-800';
                          case 'failed':
                            return 'bg-rose-950 text-rose-300 border-rose-800';
                          case 'queued':
                          default:
                            return 'bg-amber-950 text-amber-300 border-amber-800';
                        }
                      };

                      return (
                        <div
                          key={job.jobId}
                          data-testid="handoff-job-item"
                          className="flex items-center justify-between p-2 bg-stone-800/80 rounded-lg text-[11px] text-stone-300"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-stone-400">{job.jobId}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getJobStatusBadgeClass(
                                job.status
                              )}`}
                              title={job.status === 'success' ? 'Đã nạp kết quả vào app' : job.status}
                            >
                              {job.status}
                            </span>
                            <span className="text-stone-400">({job.artifactType})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              data-testid="btn-delete-handoff-job"
                              onClick={() => handleDeleteJob(job.jobId)}
                              className="text-stone-500 hover:text-rose-400 p-1 transition cursor-pointer"
                              title="Xóa job"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: NotebookLM Artifacts Locker */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                <Headphones className="w-4 h-4 text-amber-700" />
                <span>Kho Kết Quả Từ NotebookLM (Audio Overview &amp; Study Guides)</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer">
                  <UploadCloud className="w-3.5 h-3.5 text-blue-700" />
                  <span>Nạp Tệp Markdown</span>
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowAddArtifact(!showAddArtifact)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Kết Quả</span>
                </button>
              </div>
            </div>

            {/* Validation Error Alert */}
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Add Artifact Form */}
            {showAddArtifact && (
              <form onSubmit={handleSaveNewArtifact} noValidate className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Loại kết quả NotebookLM:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: 'audio_overview_summary', label: 'Audio Summary' },
                          { id: 'study_guide', label: 'Study Guide' },
                          { id: 'briefing_doc', label: 'Briefing Doc' },
                          { id: 'faq', label: 'FAQ' },
                          { id: 'source_pack', label: 'Source Pack' },
                        ] as const
                      ).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setArtifactType(item.id)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                            artifactType === item.id
                              ? 'bg-blue-700 text-white shadow-2xs'
                              : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Tiêu đề kết quả:
                    </label>
                    <input
                      type="text"
                      value={artifactTitle}
                      onChange={(e) => setArtifactTitle(e.target.value)}
                      placeholder="Ví dụ: Tóm tắt Podcast 2 Hosts về 89 Tâm Abhidharma"
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Link NotebookLM liên kết (tùy chọn):
                  </label>
                  <input
                    type="url"
                    value={notebookUrl}
                    onChange={(e) => setNotebookUrl(e.target.value)}
                    placeholder="https://notebooklm.google.com/notebook/..."
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Nội dung tóm tắt / trích đoạn:
                  </label>
                  <textarea
                    rows={4}
                    value={artifactContent}
                    onChange={(e) => setArtifactContent(e.target.value)}
                    placeholder="Dán nội dung tóm lược từ NotebookLM vào đây..."
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddArtifact(false);
                      setValidationError(null);
                    }}
                    className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-xs cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Lưu Kết Quả
                  </button>
                </div>
              </form>
            )}

            {/* List of topic artifacts */}
            {topicArtifacts.length > 0 ? (
              <div className="space-y-3">
                {topicArtifacts.map((art) => (
                  <div
                    key={art.id}
                    className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2 relative"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                        {art.type === 'audio_overview_summary' ? (
                          <Headphones className="w-3.5 h-3.5 text-amber-700" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                        )}
                        <span>{art.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Metadata badges */}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 border border-stone-300">
                          {art.source || 'antigravity-2.0'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          {art.target || 'notebooklm'}
                        </span>
                        {art.notebookUrl && (
                          <a
                            href={art.notebookUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-700 hover:underline flex items-center gap-1 font-mono"
                          >
                            <ExternalLink className="w-3 h-3" /> Mở Notebook
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteArtifact(art.id)}
                          className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                      {art.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-stone-400">
                <p className="text-xs">Chưa có kết quả Audio Overview hay Study Guide nào được lưu cho chủ đề này.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Disclaimer & Guidance */}
        <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-stone-500 text-[11px]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>Mediated Workflow via Antigravity 2.0</strong> &bull; 100% Client-side Privacy &bull; No direct cloud sync required
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
