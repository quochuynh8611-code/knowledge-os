import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  FileText,
  Layers,
  Sparkles,
  Archive,
  BookOpen,
  Tag,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Plus,
  Trash2,
  Quote,
  History,
  CheckCircle2,
} from 'lucide-react';
import { GroundedArtifactDTO } from '../../types/researchHub';

interface ArtifactReviewDrawerProps {
  artifact: GroundedArtifactDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onArtifactUpdated?: (updated: GroundedArtifactDTO) => void;
  onNoteCreated?: () => void;
  onFlashcardsCreated?: () => void;
}

export function ArtifactReviewDrawer({
  artifact,
  isOpen,
  onClose,
  onArtifactUpdated,
  onNoteCreated,
  onFlashcardsCreated,
}: ArtifactReviewDrawerProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'citations' | 'imports'>('content');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Note import modal/form state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState(artifact?.title || '');
  const [noteType, setNoteType] = useState<'study' | 'insight' | 'question' | 'summary'>('insight');
  const [noteTags, setNoteTags] = useState('notebooklm-artifact');

  // Flashcards extraction/generation form state
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardItems, setCardItems] = useState<Array<{ front: string; back: string }>>([
    { front: '', back: '' },
  ]);

  // Handle Esc key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset internal state when artifact changes
  useEffect(() => {
    if (artifact) {
      setNoteTitle(artifact.title);
      setActionMessage(null);
      setShowNoteForm(false);
      setShowCardForm(false);
    }
  }, [artifact?.id]);

  if (!isOpen || !artifact) return null;

  const handleValidate = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'validated' }),
      });
      if (!res.ok) {
        throw new Error('Không thể cập nhật trạng thái thẩm định');
      }
      const updated = await res.json();
      setActionMessage({ type: 'success', text: 'Đã thẩm định artifact thành công!' });
      onArtifactUpdated?.(updated);
    } catch (err) {
      setActionMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async () => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!res.ok) {
        throw new Error('Không thể lưu trữ artifact');
      }
      const updated = await res.json();
      setActionMessage({ type: 'success', text: 'Đã chuyển artifact sang trạng thái lưu trữ' });
      onArtifactUpdated?.(updated);
    } catch (err) {
      setActionMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const tagsArray = noteTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`/api/artifacts/${artifact.id}/import-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle || artifact.title,
          type: noteType,
          tags: tagsArray,
        }),
      });

      if (!res.ok) {
        throw new Error('Không thể nhập artifact thành Note');
      }

      setActionMessage({ type: 'success', text: 'Đã nhập thành Note thành công!' });
      setShowNoteForm(false);
      onNoteCreated?.();

      // Refresh artifact data
      const refreshRes = await fetch(`/api/artifacts/${artifact.id}`);
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        onArtifactUpdated?.(refreshed);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportFlashcards = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCards = cardItems.filter((c) => c.front.trim() && c.back.trim());
    if (validCards.length === 0) {
      setActionMessage({ type: 'error', text: 'Vui lòng nhập ít nhất 1 thẻ có đủ mặt trước và mặt sau.' });
      return;
    }

    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}/import-flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcards: validCards.map((c) => ({ front: c.front, back: c.back, type: 'basic' })),
        }),
      });

      if (!res.ok) {
        throw new Error('Không thể tạo flashcards từ artifact');
      }

      setActionMessage({
        type: 'success',
        text: `Đã sinh ${validCards.length} flashcards thành công!`,
      });
      setShowCardForm(false);
      onFlashcardsCreated?.();

      // Refresh artifact data
      const refreshRes = await fetch(`/api/artifacts/${artifact.id}`);
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        onArtifactUpdated?.(refreshed);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      case 'imported':
      case 'partially_imported':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
      case 'archived':
        return 'bg-stone-200 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700';
      case 'received':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'validated':
        return 'Đã thẩm định';
      case 'imported':
        return 'Đã nhập xong';
      case 'partially_imported':
        return 'Đã nhập 1 phần';
      case 'archived':
        return 'Đã lưu trữ';
      case 'received':
      default:
        return 'Mới tiếp nhận';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="artifact-review-title"
      className="fixed inset-0 z-50 flex justify-end bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 h-full shadow-2xl flex flex-col border-l border-stone-200 dark:border-stone-800">
        {/* Drawer Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/90 flex items-start justify-between">
          <div className="space-y-2 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="artifact-status-badge"
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(
                  artifact.status
                )}`}
              >
                {getStatusLabel(artifact.status)}
              </span>

              {/* Decision 1 Option A: Display explicit Source Package Version badge */}
              <span
                data-testid="artifact-source-version-badge"
                className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold"
              >
                Source package v{artifact.sourcePackageVersion || 1}
              </span>

              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                {artifact.artifactType}
              </span>
            </div>

            <h2 id="artifact-review-title" className="text-base font-bold text-stone-900 dark:text-white leading-snug">
              {artifact.title}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
              ID: {artifact.id.slice(0, 8)} &bull; Trích dẫn: {artifact.citationCount} nguồn &bull; Hash:{' '}
              {artifact.contentHash.slice(0, 8)}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Đóng bảng thẩm định"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {actionMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex flex-wrap items-center gap-2">
          {artifact.status !== 'validated' && artifact.status !== 'archived' && (
            <button
              data-testid="btn-validate-artifact"
              onClick={handleValidate}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Thẩm định</span>
            </button>
          )}

          <button
            data-testid="btn-open-import-note"
            onClick={() => {
              setNoteTitle(artifact.title);
              setShowNoteForm(true);
              setShowCardForm(false);
            }}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Nhập thành Note</span>
          </button>

          <button
            data-testid="btn-open-import-flashcards"
            onClick={() => {
              setShowCardForm(true);
              setShowNoteForm(false);
            }}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sinh Flashcards</span>
          </button>

          {artifact.status !== 'archived' && (
            <button
              data-testid="btn-archive-artifact"
              onClick={handleArchive}
              disabled={isProcessing}
              className="px-2.5 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer disabled:opacity-50 ml-auto"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Lưu trữ</span>
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 px-5 bg-white dark:bg-stone-900">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'content'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Nội dung Markdown</span>
          </button>
          <button
            onClick={() => setActiveTab('citations')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'citations'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>Trích dẫn nguồn</span>
            <span className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold">
              {artifact.citations?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('imports')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'imports'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử chuyển nạp</span>
            <span className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold">
              {artifact.imports?.length || 0}
            </span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-stone-800 dark:text-stone-200 bg-stone-50/40 dark:bg-stone-900/40">
          {/* Sub-form: Import to Note */}
          {showNoteForm && (
            <form
              onSubmit={handleImportNote}
              className="p-4 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between font-bold text-xs text-blue-950 dark:text-blue-200">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  Nhập Artifact thành Ghi chú (Note)
                </span>
                <button
                  type="button"
                  onClick={() => setShowNoteForm(false)}
                  className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Tiêu đề ghi chú:
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-stone-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Loại ghi chú:
                  </label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as any)}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-stone-900 dark:text-white"
                  >
                    <option value="insight">Insight (Chiêm nghiệm)</option>
                    <option value="study">Study (Học tập)</option>
                    <option value="summary">Summary (Tóm lược)</option>
                    <option value="question">Question (Vấn đáp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Thẻ phân loại (cách nhau dấu phẩy):
                  </label>
                  <input
                    type="text"
                    value={noteTags}
                    onChange={(e) => setNoteTags(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNoteForm(false)}
                  className="px-3 py-1.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Xác nhận Nhập Note
                </button>
              </div>
            </form>
          )}

          {/* Sub-form: Generate Flashcards */}
          {showCardForm && (
            <form
              onSubmit={handleImportFlashcards}
              className="p-4 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between font-bold text-xs text-amber-950 dark:text-amber-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  Sinh Flashcards SRS từ Artifact
                </span>
                <button
                  type="button"
                  onClick={() => setShowCardForm(false)}
                  className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {cardItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white dark:bg-stone-800 border border-amber-200 dark:border-amber-800/60 rounded-lg space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-amber-900 dark:text-amber-300">
                        Thẻ #{idx + 1}
                      </span>
                      {cardItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCardItems(cardItems.filter((_, i) => i !== idx))}
                          className="text-stone-400 hover:text-rose-600 dark:text-stone-500 dark:hover:text-rose-400 p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Mặt trước (Câu hỏi / Khái niệm)..."
                      value={item.front}
                      onChange={(e) => {
                        const next = [...cardItems];
                        next[idx].front = e.target.value;
                        setCardItems(next);
                      }}
                      className="w-full p-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-xs text-stone-900 dark:text-white"
                      required
                    />
                    <textarea
                      rows={2}
                      placeholder="Mặt sau (Câu trả lời / Luận giải)..."
                      value={item.back}
                      onChange={(e) => {
                        const next = [...cardItems];
                        next[idx].back = e.target.value;
                        setCardItems(next);
                      }}
                      className="w-full p-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-xs text-stone-900 dark:text-white"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setCardItems([...cardItems, { front: '', back: '' }])}
                  className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm thẻ
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCardForm(false)}
                    className="px-3 py-1.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    Lưu {cardItems.length} Flashcard(s)
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tab 1: Content View */}
          {activeTab === 'content' && (
            <div className="p-4 bg-white dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-stone-800 dark:text-stone-200 selection:bg-blue-100 dark:selection:bg-blue-900 shadow-inner">
              {artifact.rawContent}
            </div>
          )}

          {/* Tab 2: Citations List */}
          {activeTab === 'citations' && (
            <div className="space-y-3">
              {artifact.citations && artifact.citations.length > 0 ? (
                artifact.citations.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-blue-900 dark:text-blue-300">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center justify-center text-[10px] font-mono">
                        [{c.markerIndex}]
                      </span>
                      <span>{c.sourceTitle}</span>
                    </div>
                    {c.quote && (
                      <blockquote className="pl-3 border-l-2 border-blue-400 dark:border-blue-600 text-[11px] text-stone-600 dark:text-stone-400 italic">
                        "{c.quote}"
                      </blockquote>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-stone-400 dark:text-stone-500 space-y-2">
                  <Quote className="w-8 h-8 mx-auto opacity-40" />
                  <p>Không có trích dẫn nguồn riêng lẻ nào được phân tách trong artifact này.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Import History */}
          {activeTab === 'imports' && (
            <div className="space-y-3">
              {artifact.imports && artifact.imports.length > 0 ? (
                artifact.imports.map((imp) => (
                  <div
                    key={imp.id}
                    className="p-3 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {imp.targetType}
                      </span>
                      <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                        {imp.targetType === 'note'
                          ? `Ghi chú ID: ${imp.targetNoteId?.slice(0, 8)}`
                          : `Sinh ${imp.itemCount} Flashcard(s)`}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 font-mono">
                      {new Date(imp.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-stone-400 dark:text-stone-500 space-y-2">
                  <History className="w-8 h-8 mx-auto opacity-40" />
                  <p>Chưa có thao tác chuyển nạp nào được ghi nhận cho artifact này.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Grounded Artifact &bull; Decision 1: Version Traceability</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg font-semibold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
