import React, { useEffect } from "react";
import { Keyboard, X } from "lucide-react";

interface MindMapShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  groupName: string;
  items: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    groupName: "Điều hướng",
    items: [
      {
        keys: ["←", "↑", "↓", "→"],
        description: "Di chuyển tiêu điểm giữa các nút trên sơ đồ",
      },
      {
        keys: ["Home"],
        description: "Di chuyển tiêu điểm về nút gốc",
      },
      {
        keys: ["Space"],
        description: "Thu gọn hoặc mở rộng nhánh con của nút",
      },
      {
        keys: ["Shift + Space"],
        description: "Xem nhanh chi tiết nút (Quick Peek)",
      },
      {
        keys: ["Enter"],
        description: "Chọn chủ đề và chuyển tiêu điểm (chế độ Topic)",
      },
    ],
  },
  {
    groupName: "Chỉnh sửa nút",
    items: [
      {
        keys: ["Tab / Insert"],
        description: "Thêm nút con mới dưới nút đang chọn",
      },
      {
        keys: ["Enter"],
        description: "Thêm nút cùng cấp (áp dụng khi chỉnh sửa sơ đồ)",
      },
      {
        keys: ["F2"],
        description: "Bắt đầu đổi tên nút (Inline rename)",
      },
      {
        keys: ["Delete / Backspace"],
        description: "Xóa nút đang chọn hoặc xóa hàng loạt nút đã chọn",
      },
      {
        keys: ["Alt + ↑ / ↓"],
        description: "Di chuyển thứ tự nút lên / xuống trong cùng cấp",
      },
      {
        keys: ["Shift + A"],
        description: "Mở gợi ý mở rộng nhánh tư duy bằng AI",
      },
      {
        keys: ["Escape"],
        description: "Hủy sửa tên, hủy tạo liên kết chéo",
      },
    ],
  },
  {
    groupName: "Chọn & Thao tác hàng loạt",
    items: [
      {
        keys: ["Cmd / Ctrl + A"],
        description: "Chọn tất cả các nút đang hiển thị trên canvas",
      },
      {
        keys: ["Shift + Click"],
        description: "Chọn thêm hoặc bớt từng nút",
      },
      {
        keys: ["Escape"],
        description: "Bỏ chọn tất cả các nút đang chọn",
      },
    ],
  },
  {
    groupName: "Hoàn tác & Làm lại",
    items: [
      {
        keys: ["Cmd / Ctrl + Z"],
        description: "Hoàn tác thao tác chỉnh sửa gần nhất",
      },
      {
        keys: ["Cmd / Ctrl + Shift + Z", "Cmd / Ctrl + Y"],
        description: "Làm lại thao tác vừa hoàn tác",
      },
    ],
  },
  {
    groupName: "Trợ giúp & Phím tắt",
    items: [
      {
        keys: ["?", "Shift + /"],
        description: "Mở bảng tra cứu phím tắt này",
      },
      {
        keys: ["Escape"],
        description: "Đóng bảng tra cứu phím tắt",
      },
    ],
  },
];

export const MindMapShortcutModal: React.FC<MindMapShortcutModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="mindmap-shortcut-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mindmap-shortcut-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 rounded-xl">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="mindmap-shortcut-title"
                className="text-base font-bold text-stone-900 dark:text-stone-100"
              >
                Phím tắt MindMap
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Danh sách các phím tắt điều hướng và thao tác nhanh trên sơ đồ tư duy
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-shortcuts"
            aria-label="Đóng bảng phím tắt"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Shortcut Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm divide-y divide-stone-100 dark:divide-stone-800/80">
          {SHORTCUT_GROUPS.map((group, groupIdx) => (
            <div
              key={group.groupName}
              className={groupIdx === 0 ? "space-y-3" : "pt-5 space-y-3"}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                {group.groupName}
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {group.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50/80 dark:bg-stone-800/40 border border-stone-200/50 dark:border-stone-700/50"
                  >
                    <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                      {item.description}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap sm:shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 text-[11px] font-mono font-semibold text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-2xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-xs text-stone-500 dark:text-stone-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>Mẹo: Nhấn</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded text-stone-700 dark:text-stone-300">
              ?
            </kbd>
            <span>bất kỳ lúc nào trên MindMap để mở lại bảng này</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
