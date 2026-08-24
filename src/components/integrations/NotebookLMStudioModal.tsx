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
  Layers,
} from 'lucide-react';
import {
  packageSourceForNotebookLM,
  getStoredArtifacts,
  saveArtifact,
  deleteArtifact,
  NotebookLMArtifact,
} from '../../lib/notebooklm';
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
  const [artifacts, setArtifacts] = useState<NotebookLMArtifact[]>([]);
  const [showAddArtifact, setShowAddArtifact] = useState(false);
  const [artifactType, setArtifactType] = useState<'study_guide' | 'audio_overview_summary' | 'briefing_doc'>('audio_overview_summary');
  const [artifactTitle, setArtifactTitle] = useState('');
  const [artifactContent, setArtifactContent] = useState('');
  const [notebookUrl, setNotebookUrl] = useState('');

  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topic || topics[0];

  useEffect(() => {
    if (isOpen) {
      setArtifacts(getStoredArtifacts());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sourceDocument = currentTopic
    ? packageSourceForNotebookLM(currentTopic, notes, resources)
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

  const handleSaveNewArtifact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artifactTitle.trim() || !artifactContent.trim() || !currentTopic) return;

    const saved = saveArtifact({
      topicId: currentTopic.id,
      type: artifactType,
      title: artifactTitle.trim(),
      content: artifactContent.trim(),
      notebookUrl: notebookUrl.trim() || undefined,
    });

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
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
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
                  Official Bridge
                </span>
              </div>
              <p className="text-xs text-stone-600">
                Đóng gói Source Data 1 chạm, đồng bộ Audio Overview &amp; Study Guide
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

          {/* Source Document Packager Section */}
          <div className="bg-blue-50/70 border border-blue-200/80 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-950">
                <FileText className="w-4 h-4 text-blue-700" />
                <span>Tài liệu nguồn đã chuẩn hóa (Source Document)</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopySource}
                  className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 rounded-lg font-medium border border-stone-300 flex items-center gap-1.5 transition"
                >
                  {copiedSource ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSource ? 'Đã sao chép!' : 'Sao chép nguồn'}</span>
                </button>
                <button
                  onClick={handleDownloadSourceFile}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium flex items-center gap-1.5 transition shadow-2xs"
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

          {/* NotebookLM Artifacts Locker */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                <Headphones className="w-4 h-4 text-amber-700" />
                <span>Kho Kết Quả Từ NotebookLM (Audio Overview &amp; Study Guides)</span>
              </div>
              <button
                onClick={() => setShowAddArtifact(!showAddArtifact)}
                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Kết Quả</span>
              </button>
            </div>

            {/* Add Artifact Form */}
            {showAddArtifact && (
              <form onSubmit={handleSaveNewArtifact} className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Loại kết quả NotebookLM:
                    </label>
                    <select
                      value={artifactType}
                      onChange={(e) => setArtifactType(e.target.value as any)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                    >
                      <option value="audio_overview_summary">Tóm tắt Audio Overview (Podcast AI)</option>
                      <option value="study_guide">Study Guide / Giáo trình khảo cứu</option>
                      <option value="briefing_doc">Briefing Doc / Báo cáo tổng kết</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Tiêu đề kết quả:
                    </label>
                    <input
                      type="text"
                      required
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
                    required
                    value={artifactContent}
                    onChange={(e) => setArtifactContent(e.target.value)}
                    placeholder="Dán nội dung tóm lược từ NotebookLM vào đây..."
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddArtifact(false)}
                    className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold"
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                        {art.type === 'audio_overview_summary' ? (
                          <Headphones className="w-3.5 h-3.5 text-amber-700" />
                        ) : (
                          <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                        )}
                        <span>{art.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
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
                          className="text-stone-400 hover:text-rose-600 p-1"
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
      </div>
    </div>
  );
}
