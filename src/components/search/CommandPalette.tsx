import React, { useEffect, useRef } from "react";
import { Search, X, ArrowRight, CornerDownLeft, Sparkles } from "lucide-react";
import { CommandPaletteItem } from "../../hooks/useCommandPalette";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  items: CommandPaletteItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onExecuteItem: (item: CommandPaletteItem) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  query,
  onQueryChange,
  items,
  selectedIndex,
  onSelectIndex,
  onExecuteItem,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard events inside Command Palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onSelectIndex(
          items.length > 0 ? (selectedIndex + 1) % items.length : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onSelectIndex(
          items.length > 0
            ? (selectedIndex - 1 + items.length) % items.length
            : 0,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items[selectedIndex]) {
          onExecuteItem(items[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose, onSelectIndex, onExecuteItem]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.querySelector(
        '[aria-selected="true"]',
      );
      if (activeElement && typeof activeElement.scrollIntoView === "function") {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group items by category
  const categories = Array.from(new Set(items.map((it) => it.category)));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-xl w-full text-stone-900 dark:text-stone-100 overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 gap-3">
          <Search className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            id="command-palette-title"
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              onSelectIndex(0);
            }}
            placeholder="Tìm lệnh, chủ đề nghiên cứu, ghi chú, ma trận..."
            className="flex-1 bg-transparent text-sm font-medium outline-hidden placeholder:text-stone-400 dark:placeholder:text-stone-500 text-stone-900 dark:text-stone-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-md"
              title="Xóa tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline px-2 py-0.5 font-mono text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-md border border-stone-200 dark:border-stone-700">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-4 max-h-[420px]"
        >
          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400 dark:text-stone-500 space-y-1">
              <p>Không tìm thấy lệnh hoặc chủ đề nào khớp với "{query}"</p>
              <p className="text-[11px] text-stone-400">
                Thử tìm "Tổng quan", "Chủ đề", "Ghi chú", "Giao diện", "Tiến độ"...
              </p>
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = items.filter((it) => it.category === cat);
              return (
                <div key={cat} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-3 py-1">
                    {cat}
                  </div>
                  <div className="space-y-0.5">
                    {catItems.map((item) => {
                      const itemGlobalIndex = items.indexOf(item);
                      const isSelected = itemGlobalIndex === selectedIndex;
                      const Icon = item.icon || Sparkles;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => onExecuteItem(item)}
                          onMouseEnter={() => onSelectIndex(itemGlobalIndex)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium cursor-pointer transition ${
                            isSelected
                              ? "bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 shadow-2xs font-semibold"
                              : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/60"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200"
                                  : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-stone-900 dark:text-stone-100 font-semibold">
                                {item.title}
                              </div>
                              {item.description && (
                                <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isSelected && (
                              <CornerDownLeft className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-950/80 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono font-bold bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                ↑↓
              </kbd>{" "}
              Di chuyển
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono font-bold bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                ↵
              </kbd>{" "}
              Chọn
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono font-bold bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                esc
              </kbd>{" "}
              Đóng
            </span>
          </div>
          <span className="font-semibold text-amber-800 dark:text-amber-400">
            Command Palette
          </span>
        </div>
      </div>
    </div>
  );
}
