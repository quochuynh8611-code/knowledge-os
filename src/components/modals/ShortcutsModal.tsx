import React, { useEffect } from "react";
import { X, Keyboard, Sparkles, Navigation, Command } from "lucide-react";

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? "⌘" : "Ctrl";

  const shortcutSections = [
    {
      title: "Thao Tác Nhanh & Tìm Kiếm",
      icon: Command,
      items: [
        {
          keys: [`${modKey}`, "K"],
          description: "Mở Thanh Lệnh Toàn Năng (Command Palette)",
        },
        { keys: ["?"], description: "Mở Bảng tra cứu phím tắt này" },
        { keys: ["Esc"], description: "Đóng hộp thoại / Bỏ chọn" },
      ],
    },
    {
      title: "Chuyển Đổi Danh Mục Nhanh (Số 1-7)",
      icon: Navigation,
      items: [
        { keys: ["1"], description: "Về Trang Tổng Quan (Dashboard)" },
        { keys: ["2"], description: "Về Cây Phân Cấp Chủ Đề (Topics)" },
        { keys: ["3"], description: "Về Ma Trận Vi Diệu Pháp (Abhidharma)" },
        { keys: ["4"], description: "Về Dịch Học & Kỳ Môn (Divination)" },
        { keys: ["5"], description: "Về Biểu Đồ Tri Thức (Knowledge Graph)" },
        { keys: ["6"], description: "Về Tiến Độ & Ôn Tập (SM-2)" },
        { keys: ["7"], description: "Về Ghi Chú & Wiki Links (Notes)" },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
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
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="shortcuts-modal-title"
                className="text-base font-bold tracking-tight font-serif-title"
              >
                Phím Tắt Hệ Thống (Shortcuts)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tối ưu tốc độ khảo cứu và điều hướng bằng bàn phím
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng phím tắt"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Lists */}
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {shortcutSections.map((sec, idx) => {
            const SecIcon = sec.icon;
            return (
              <div key={idx} className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  <SecIcon className="w-3.5 h-3.5" />
                  <span>{sec.title}</span>
                </div>
                <div className="bg-stone-50 dark:bg-stone-950/50 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 divide-y divide-stone-200/60 dark:divide-stone-800/60">
                  {sec.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                    >
                      <span className="text-stone-700 dark:text-stone-300">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2 py-0.5 min-w-[22px] text-center font-mono font-bold text-[11px] bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-md shadow-2xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center text-[11px] text-stone-400">
          <span>
            Nhấn <kbd className="font-mono font-bold">Esc</kbd> để đóng
          </span>
          <span>Knowledge OS • SuperMemo-2 Ready</span>
        </div>
      </div>
    </div>
  );
}
