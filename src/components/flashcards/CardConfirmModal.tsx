import React from "react";
import { AlertTriangle, X } from "lucide-react";

export interface CardConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  affectedCount: number;
  actionLabel: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CardConfirmModal({
  isOpen,
  title,
  description,
  affectedCount,
  actionLabel,
  isDestructive = false,
  onConfirm,
  onCancel,
}: CardConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-card-confirm"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                isDestructive
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {title}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Số lượng thẻ bị ảnh hưởng: <strong className="font-mono text-stone-800 dark:text-stone-200">{affectedCount}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-200/80 dark:border-stone-700/60">
          {description}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            data-testid="btn-cancel-action"
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            data-testid="btn-confirm-action"
            onClick={onConfirm}
            className={`px-4 py-1.5 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer ${
              isDestructive
                ? "bg-rose-700 hover:bg-rose-800"
                : "bg-amber-800 hover:bg-amber-900"
            }`}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
