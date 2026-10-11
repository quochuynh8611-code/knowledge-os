import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, Inbox, AlertCircle, Loader2 } from "lucide-react";

export interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  onSave,
}: QuickCaptureModalProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus and reset error when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Timeout ensures DOM paint has settled
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setText("");
      setError(null);
    }
  }, [isOpen]);

  // Global Escape handler for modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? "⌘" : "Ctrl";

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(trimmed);
      setText("");
      onClose();
    } catch (err: any) {
      setError(
        err?.message || "Không thể lưu vào Research Inbox. Vui lòng thử lại."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDownTextarea = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-capture-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-stone-900 dark:text-stone-100 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="quick-capture-modal-title"
                  className="text-base font-bold tracking-tight font-serif-title"
                >
                  Ghi Chú Chớp Nhoáng
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  <Inbox className="w-3 h-3" />
                  Research Inbox
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Thu thập nhanh ý tưởng vào Inbox mà không làm gián đoạn ngữ cảnh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <textarea
              ref={textareaRef}
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDownTextarea}
              placeholder="Ghi nhanh ý tưởng, trích đoạn cần suy ngẫm, hoặc câu hỏi mở..."
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 rounded-2xl text-sm placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition resize-none text-stone-800 dark:text-stone-100"
            />
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-stone-400 flex items-center gap-2">
              <span>
                <kbd className="px-1.5 py-0.5 font-mono font-bold bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-[10px]">
                  {modKey}+Enter
                </kbd>{" "}
                để lưu
              </span>
              <span>•</span>
              <span>
                <kbd className="px-1.5 py-0.5 font-mono font-bold bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-[10px]">
                  Esc
                </kbd>{" "}
                để đóng
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lưu vào Inbox</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
