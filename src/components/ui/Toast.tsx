import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  className?: string;
}

export function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
  className = "",
}: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
      bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
      role: "status",
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
      bg: "bg-rose-50 border-rose-200 text-rose-900",
      role: "alert",
    },
    info: {
      icon: <Info className="w-4 h-4 text-blue-600 shrink-0" />,
      bg: "bg-blue-50 border-blue-200 text-blue-900",
      role: "status",
    },
  }[type];

  return (
    <div
      role={typeConfig.role}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 border rounded-lg shadow-md text-xs font-medium transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${typeConfig.bg} ${className}`}
    >
      {typeConfig.icon}
      <span className="truncate max-w-[280px]">{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng thông báo"
        className="ml-1 p-0.5 rounded hover:bg-black/5 text-stone-500 hover:text-stone-800 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
