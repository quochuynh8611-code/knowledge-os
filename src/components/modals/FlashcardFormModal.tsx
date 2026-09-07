import React, { useState, useEffect, useRef } from "react";
import { useData } from "../../context/DataContext";
import type { Flashcard, FlashcardType } from "../../types/flashcard";
import { parseClozeDeletions, detectClozeFromSelection } from "../../lib/clozeParser";
import {
  X,
  Plus,
  Brain,
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  Scissors,
  Check,
} from "lucide-react";

import {
  ApiDataRepository,
  LocalStorageDataRepository,
} from "../../services/dataRepository";

export interface FlashcardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (card: Flashcard) => void;
  defaultTopicId?: string;
  dataRepository?: {
    createFlashcard?: (input: unknown) => Promise<Flashcard>;
    updateFlashcard?: (id: string, input: unknown) => Promise<Flashcard>;
  };
  initialFront?: string;
  initialBack?: string;
  initialType?: FlashcardType;
  defaultNoteId?: string;
  editingCard?: Flashcard | null;
}

const defaultRepository =
  typeof window !== "undefined"
    ? new ApiDataRepository("/api", new LocalStorageDataRepository())
    : new LocalStorageDataRepository();

function useSafeData() {
  try {
    return useData();
  } catch {
    return {
      topics: [] as Array<{ id: string; title: string }>,
      notes: [] as Array<{ id: string; topicId: string; title: string }>,
      resources: [] as Array<{ id: string; topicId: string; title: string }>,
    };
  }
}

export function FlashcardFormModal({
  isOpen,
  onClose,
  onSuccess,
  defaultTopicId,
  dataRepository: customRepo,
  initialFront,
  initialBack,
  initialType,
  defaultNoteId,
  editingCard,
}: FlashcardFormModalProps) {
  const isEdit = Boolean(editingCard);
  const dataContext = useSafeData();
  const topics = dataContext.topics || [];
  const notes = dataContext.notes || [];
  const resources = dataContext.resources || [];
  const repository =
    customRepo ||
    (dataContext as any).dataRepository ||
    defaultRepository;



  const [topicId, setTopicId] = useState<string>(
    () => editingCard?.topicId || defaultTopicId || ""
  );
  const [noteId, setNoteId] = useState<string>(
    () => editingCard?.noteId || defaultNoteId || ""
  );
  const [resourceId, setResourceId] = useState<string>(
    () => editingCard?.resourceId || ""
  );
  const [type, setType] = useState<FlashcardType>(
    () => editingCard?.type || initialType || "basic"
  );
  const [front, setFront] = useState<string>(
    () => editingCard?.front || initialFront || ""
  );
  const [back, setBack] = useState<string>(
    () => editingCard?.back || initialBack || ""
  );

  const [errorTopic, setErrorTopic] = useState<string>("");
  const [errorFront, setErrorFront] = useState<string>("");
  const [errorBack, setErrorBack] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const frontInputRef = useRef<HTMLTextAreaElement>(null);

  const prevIsOpenRef = useRef(false);

  // Initialize or reset form only on modal open transition or card change
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    if (isOpen && (isOpening || editingCard?.id)) {
      if (editingCard) {
        setTopicId(editingCard.topicId || defaultTopicId || "");
        setNoteId(editingCard.noteId || defaultNoteId || "");
        setResourceId(editingCard.resourceId || "");
        setType(editingCard.type || "basic");
        setFront(editingCard.front || "");
        setBack(editingCard.back || "");
      } else {
        setTopicId(defaultTopicId || "");
        setNoteId(defaultNoteId || "");
        setResourceId("");

        let resolvedType: FlashcardType = initialType || "basic";
        let resolvedFront = initialFront || "";
        let resolvedBack = initialBack || "";

        if (initialFront) {
          const clozeDetection = detectClozeFromSelection(initialFront);
          if (clozeDetection.hasCloze) {
            resolvedType = "cloze";
            if (!resolvedBack && clozeDetection.items.length > 0) {
              resolvedBack = clozeDetection.items.map((i) => i.answer).join(", ");
            }
          }
        }

        setType(resolvedType);
        setFront(resolvedFront);
        setBack(resolvedBack);
      }

      setErrorTopic("");
      setErrorFront("");
      setErrorBack("");
      setSubmitting(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [
    isOpen,
    editingCard?.id,
    defaultTopicId,
    defaultNoteId,
    initialFront,
    initialBack,
    initialType,
  ]);

  if (!isOpen) return null;

  // Filter notes & resources by selected topic
  const availableNotes = (notes || []).filter((n) => !topicId || n.topicId === topicId);
  const availableResources = (resources || []).filter((r) => !topicId || r.topicId === topicId);


  // Quick cloze insertion helper
  const handleInsertCloze = () => {
    const textarea = frontInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = front.substring(start, end) || "từ khóa";

    // Detect existing cloze indices
    const existing = parseClozeDeletions(front);
    const nextIndex = existing.length + 1;
    const clozeSnippet = `{{c${nextIndex}::${selectedText}}}`;

    const newFront =
      front.substring(0, start) + clozeSnippet + front.substring(end);
    setFront(newFront);

    // Auto-fill back if empty
    if (!back.trim()) {
      setBack(selectedText);
    }

    // Restore focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + clozeSnippet.length,
        start + clozeSnippet.length
      );
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    setErrorTopic("");
    setErrorFront("");
    setErrorBack("");

    // Validate topic
    if (!topicId.trim()) {
      setErrorTopic("Vui lòng chọn chủ đề (topicId bắt buộc)");
      hasError = true;
    }

    // Validate front
    const trimmedFront = front.trim();
    if (!trimmedFront) {
      setErrorFront("Mặt trước không được để trống");
      hasError = true;
    } else if (type === "cloze") {
      const clozeDeletions = parseClozeDeletions(trimmedFront);
      if (clozeDeletions.length === 0) {
        setErrorFront(
          "Thẻ cloze yêu cầu mặt trước phải chứa ít nhất một mẫu đục lỗ {{c1::từ khóa}}"
        );
        hasError = true;
      }
    }

    // Validate back
    const trimmedBack = back.trim();
    if (!trimmedBack) {
      setErrorBack("Mặt sau không được để trống");
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      if (isEdit && editingCard) {
        let updated: Flashcard;
        if (repository.updateFlashcard) {
          updated = await repository.updateFlashcard(editingCard.id, {
            topicId,
            noteId: noteId || null,
            resourceId: resourceId || null,
            type,
            front: trimmedFront,
            back: trimmedBack,
          });
        } else {
          const res = await fetch(`/api/flashcards/${editingCard.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topicId,
              noteId: noteId || null,
              resourceId: resourceId || null,
              type,
              front: trimmedFront,
              back: trimmedBack,
            }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Cập nhật thẻ thất bại");
          }
          updated = await res.json();
        }

        onSuccess?.(updated);
        onClose();
      } else {
        const created = await repository.createFlashcard({
          topicId,
          noteId: noteId || null,
          resourceId: resourceId || null,
          type,
          front: trimmedFront,
          back: trimmedBack,
          lifecycleStatus: "active",
        });

        onSuccess?.(created);
        onClose();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
          ? "Cập nhật thẻ thất bại"
          : "Tạo thẻ thất bại";
      setErrorFront(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="flashcard-form-modal"
      role="dialog"
      aria-label={isEdit ? "Chỉnh Sửa Flashcard" : "Tạo Flashcard Mới"}
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                {isEdit ? "Chỉnh Sửa Flashcard" : "Tạo Flashcard Mới"}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isEdit
                  ? "Cập nhật nội dung câu hỏi và đáp án thẻ nhớ"
                  : "Tạo thẻ câu hỏi ôn tập lặp lại ngắt quãng (SM-2)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Topic Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Chủ đề liên kết <span className="text-rose-500">*</span>
            </label>
            <select
              data-testid="select-topic"
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value);
                if (errorTopic) setErrorTopic("");
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Chọn chủ đề --</option>
              {topicId && !topics.some((t) => t.id === topicId) && (
                <option value={topicId}>Chủ đề: {topicId}</option>
              )}
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            {errorTopic && (
              <p data-testid="error-topic" className="text-xs text-rose-500 mt-1 font-medium">
                {errorTopic}
              </p>
            )}
          </div>

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Loại thẻ
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl">
              <button
                type="button"
                data-testid="type-toggle-basic"
                onClick={() => setType("basic")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                  type === "basic"
                    ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <span>Hỏi - Đáp (Basic)</span>
              </button>
              <button
                type="button"
                data-testid="type-toggle-cloze"
                onClick={() => setType("cloze")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                  type === "cloze"
                    ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                <span>Điền khuyết (Cloze)</span>
              </button>
            </div>
          </div>

          {/* Front (Question / Prompt) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {type === "cloze" ? "Nội dung câu có đục lỗ" : "Mặt trước (Câu hỏi)"}{" "}
                <span className="text-rose-500">*</span>
              </label>
              {type === "cloze" && (
                <button
                  type="button"
                  onClick={handleInsertCloze}
                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 flex items-center gap-1 font-medium transition"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Chèn [..Cloze]</span>
                </button>
              )}
            </div>
            <textarea
              ref={frontInputRef}
              data-testid="input-front"
              rows={3}
              value={front}
              onChange={(e) => {
                setFront(e.target.value);
                if (errorFront) setErrorFront("");
              }}
              placeholder={
                type === "cloze"
                  ? "Ví dụ: Thủ đô của Việt Nam là {{c1::Hà Nội}}."
                  : "Nhập câu hỏi, khái niệm hoặc định lý cần ghi nhớ..."
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {errorFront && (
              <p data-testid="error-front" className="text-xs text-rose-500 mt-1 font-medium">
                {errorFront}
              </p>
            )}
          </div>

          {/* Back (Answer / Explanation) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              {type === "cloze" ? "Từ khóa đáp án / Lời giải thích" : "Mặt sau (Câu trả lời)"}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              data-testid="input-back"
              rows={3}
              value={back}
              onChange={(e) => {
                setBack(e.target.value);
                if (errorBack) setErrorBack("");
              }}
              placeholder="Nhập câu trả lời đầy đủ hoặc giải thích chi tiết..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {errorBack && (
              <p data-testid="error-back" className="text-xs text-rose-500 mt-1 font-medium">
                {errorBack}
              </p>
            )}
          </div>

          {/* Optional Links: Note & Resource */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-stone-100 dark:border-stone-800/60">
            <div>
              <label className="block text-xs text-stone-400 mb-1">
                Liên kết Ghi chú (tùy chọn)
              </label>
              <select
                data-testid="select-note"
                value={noteId}
                onChange={(e) => setNoteId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 focus:outline-none"
              >
                <option value="">-- Không liên kết --</option>
                {availableNotes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">
                Liên kết Tài liệu (tùy chọn)
              </label>
              <select
                data-testid="select-resource"
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 focus:outline-none"
              >
                <option value="">-- Không liên kết --</option>
                {availableResources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-sm font-semibold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              data-testid="btn-submit-flashcard"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEdit ? "Lưu thay đổi" : "Lưu Flashcard"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
