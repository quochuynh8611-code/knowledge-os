import React from "react";
import { Command, Navigation, Brain, Network, BookOpen } from "lucide-react";

export type ShortcutCategory =
  | "general"     // Thao tác hệ thống & Tìm kiếm
  | "navigation"  // Điều hướng danh mục (1-7)
  | "flashcards"  // Ôn tập thẻ nhớ (SM-2)
  | "mindmap"     // Sơ đồ tư duy & Canvas
  | "reader";     // Khảo cứu & Ghi chú

export type ShortcutScope =
  | "global"
  | "flashcard_review"
  | "mindmap"
  | "reader"
  | "modal";

export interface ShortcutDefinition {
  id: string;
  category: ShortcutCategory;
  scope: ShortcutScope;
  description: string;
  scopeNote?: string;
  macKeys: string[];
  winKeys: string[];
  hiddenFromHelpModal?: boolean;
}

export const TAB_SHORTCUT_MAP: Record<string, string> = {
  "1": "dashboard",
  "2": "topics",
  "3": "flashcards",
  "4": "notes",
  "5": "resources",
  "6": "graph",
  "7": "library",
};

export const SHORTCUT_REGISTRY: readonly ShortcutDefinition[] = [
  // 1. Thao Tác Toàn Cục & Tìm Kiếm (General & Global Actions)
  {
    id: "cmd-palette",
    category: "general",
    scope: "global",
    description: "Mở Thanh Lệnh Toàn Năng (Command Palette)",
    macKeys: ["⌘", "K"],
    winKeys: ["Ctrl", "K"],
  },
  {
    id: "quick-capture",
    category: "general",
    scope: "global",
    description: "Ghi chú nhanh vào Inbox (Quick Capture)",
    macKeys: ["⌘", "N"],
    winKeys: ["Ctrl", "N"],
  },
  {
    id: "shortcuts-help",
    category: "general",
    scope: "global",
    description: "Mở Bảng tra cứu phím tắt này",
    macKeys: ["?"],
    winKeys: ["?"],
  },
  {
    id: "modal-close",
    category: "general",
    scope: "global",
    description: "Đóng hộp thoại / Bỏ chọn",
    macKeys: ["Esc"],
    winKeys: ["Esc"],
  },
  {
    id: "qc-submit",
    category: "general",
    scope: "modal",
    description: "Lưu nhanh ghi chú trong Quick Capture",
    scopeNote: "Trong Quick Capture Modal",
    macKeys: ["⌘", "Enter"],
    winKeys: ["Ctrl", "Enter"],
  },
  {
    id: "vault-select",
    category: "general",
    scope: "global",
    description: "Focus vào bộ chọn Obsidian Vault",
    macKeys: ["⌥", "V"],
    winKeys: ["Alt", "V"],
  },

  // 2. Chuyển Đổi Danh Mục Nhanh (Navigation 1-7)
  {
    id: "nav-1-dashboard",
    category: "navigation",
    scope: "global",
    description: "Về Trang Tổng Quan (Dashboard)",
    scopeNote: "Bàn phím 1-4 nhường quyền khi ôn thẻ",
    macKeys: ["1"],
    winKeys: ["1"],
  },
  {
    id: "nav-2-topics",
    category: "navigation",
    scope: "global",
    description: "Về Cây Phân Cấp Chủ Đề (Topics)",
    scopeNote: "Bàn phím 1-4 nhường quyền khi ôn thẻ",
    macKeys: ["2"],
    winKeys: ["2"],
  },
  {
    id: "nav-3-cards",
    category: "navigation",
    scope: "global",
    description: "Về Thẻ Nhớ (Flashcards)",
    scopeNote: "Bàn phím 1-4 nhường quyền khi ôn thẻ",
    macKeys: ["3"],
    winKeys: ["3"],
  },
  {
    id: "nav-4-notes",
    category: "navigation",
    scope: "global",
    description: "Về Ghi Chú & Liên Kết (Notes)",
    scopeNote: "Bàn phím 1-4 nhường quyền khi ôn thẻ",
    macKeys: ["4"],
    winKeys: ["4"],
  },
  {
    id: "nav-5-resources",
    category: "navigation",
    scope: "global",
    description: "Về Tài Liệu (Resources)",
    macKeys: ["5"],
    winKeys: ["5"],
  },
  {
    id: "nav-6-graph",
    category: "navigation",
    scope: "global",
    description: "Về Bản Đồ Tri Thức (Knowledge Graph)",
    macKeys: ["6"],
    winKeys: ["6"],
  },
  {
    id: "nav-7-library",
    category: "navigation",
    scope: "global",
    description: "Về Thư Viện Sách (Library)",
    macKeys: ["7"],
    winKeys: ["7"],
  },

  // 3. Không Gian Ôn Tập Thẻ Nhớ (Flashcards - Scoped)
  {
    id: "fc-flip",
    category: "flashcards",
    scope: "flashcard_review",
    description: "Lật mặt trước / sau thẻ nhớ",
    scopeNote: "Trong phiên ôn tập",
    macKeys: ["Space"],
    winKeys: ["Space"],
  },
  {
    id: "fc-rate-1-4",
    category: "flashcards",
    scope: "flashcard_review",
    description: "Chấm điểm thẻ SM-2 (1: Quên, 2: Khó, 3: Tốt, 4: Dễ)",
    scopeNote: "Khi thẻ đã lật mặt sau",
    macKeys: ["1", "–", "4"],
    winKeys: ["1", "–", "4"],
  },
  {
    id: "fc-quick-edit",
    category: "flashcards",
    scope: "flashcard_review",
    description: "Chỉnh sửa nhanh nội dung thẻ hiện tại",
    scopeNote: "Trong phiên ôn tập",
    macKeys: ["⌘", "E"],
    winKeys: ["Ctrl", "E"],
  },
  {
    id: "fc-history",
    category: "flashcards",
    scope: "flashcard_review",
    description: "Xem nhật ký ôn tập của thẻ hiện tại",
    scopeNote: "Trong phiên ôn tập",
    macKeys: ["⌘", "H"],
    winKeys: ["Ctrl", "H"],
  },

  // 4. Sơ Đồ Tư Duy (Mind Map - Scoped)
  {
    id: "mm-add-child",
    category: "mindmap",
    scope: "mindmap",
    description: "Thêm nhánh con mới",
    scopeNote: "Chế độ chỉnh sửa Mind Map",
    macKeys: ["Tab"],
    winKeys: ["Tab"],
  },
  {
    id: "mm-add-sibling",
    category: "mindmap",
    scope: "mindmap",
    description: "Thêm nhánh cùng cấp mới",
    scopeNote: "Chế độ chỉnh sửa Mind Map",
    macKeys: ["Enter"],
    winKeys: ["Enter"],
  },
  {
    id: "mm-rename",
    category: "mindmap",
    scope: "mindmap",
    description: "Đổi tên nhánh đang chọn",
    scopeNote: "Chế độ chỉnh sửa Mind Map",
    macKeys: ["F2"],
    winKeys: ["F2"],
  },
  {
    id: "mm-delete",
    category: "mindmap",
    scope: "mindmap",
    description: "Xóa nhánh đang chọn (hoặc xóa hàng loạt)",
    scopeNote: "Chế độ chỉnh sửa Mind Map",
    macKeys: ["Delete"],
    winKeys: ["Delete"],
  },
  {
    id: "mm-select-all",
    category: "mindmap",
    scope: "mindmap",
    description: "Chọn tất cả các nhánh đang hiển thị",
    scopeNote: "Trên canvas Mind Map",
    macKeys: ["⌘", "A"],
    winKeys: ["Ctrl", "A"],
  },
  {
    id: "mm-toggle-fold",
    category: "mindmap",
    scope: "mindmap",
    description: "Thu gọn / Mở rộng nhánh con",
    scopeNote: "Trên canvas Mind Map",
    macKeys: ["Space"],
    winKeys: ["Space"],
  },
  {
    id: "mm-ai-expand",
    category: "mindmap",
    scope: "mindmap",
    description: "Mở rộng ý tưởng nhánh bằng AI",
    scopeNote: "Chế độ chỉnh sửa Mind Map",
    macKeys: ["⇧", "A"],
    winKeys: ["Shift", "A"],
  },
  {
    id: "mm-reorder",
    category: "mindmap",
    scope: "mindmap",
    description: "Thay đổi thứ tự nhánh lên / xuống",
    scopeNote: "Chế độ chỉnh sửa Mind Map",
    macKeys: ["⌥", "↑ / ↓"],
    winKeys: ["Alt", "↑ / ↓"],
  },
  {
    id: "mm-undo",
    category: "mindmap",
    scope: "mindmap",
    description: "Hoàn tác chỉnh sửa Mind Map",
    scopeNote: "Tài liệu Mind Map đã lưu",
    macKeys: ["⌘", "Z"],
    winKeys: ["Ctrl", "Z"],
  },
  {
    id: "mm-redo",
    category: "mindmap",
    scope: "mindmap",
    description: "Làm lại chỉnh sửa Mind Map",
    scopeNote: "Tài liệu Mind Map đã lưu",
    macKeys: ["⌘", "⇧", "Z"],
    winKeys: ["Ctrl", "Shift", "Z"],
  },
];

export function getShortcutsByCategory(category: ShortcutCategory): ShortcutDefinition[] {
  return SHORTCUT_REGISTRY.filter((item) => item.category === category);
}

export interface HelpModalSectionItem {
  id: string;
  keys: string[];
  description: string;
  scopeNote?: string;
}

export interface HelpModalSection {
  id: ShortcutCategory;
  title: string;
  icon: React.ElementType;
  items: HelpModalSectionItem[];
}

export function getHelpModalSections(isMac: boolean): HelpModalSection[] {
  const visibleItems = SHORTCUT_REGISTRY.filter((item) => !item.hiddenFromHelpModal);

  const categoryConfigs: {
    id: ShortcutCategory;
    title: string;
    icon: React.ElementType;
  }[] = [
    {
      id: "general",
      title: "Thao Tác Nhanh & Tìm Kiếm",
      icon: Command,
    },
    {
      id: "navigation",
      title: "Chuyển Đổi Danh Mục Nhanh (Số 1-7)",
      icon: Navigation,
    },
    {
      id: "flashcards",
      title: "Không Gian Ôn Tập Thẻ Nhớ (SM-2)",
      icon: Brain,
    },
    {
      id: "mindmap",
      title: "Sơ Đồ Tư Duy (Mind Map Canvas)",
      icon: Network,
    },
  ];

  return categoryConfigs.map((cfg) => {
    const items = visibleItems
      .filter((it) => it.category === cfg.id)
      .map((it) => ({
        id: it.id,
        keys: isMac ? it.macKeys : it.winKeys,
        description: it.description,
        scopeNote: it.scopeNote,
      }));

    return {
      id: cfg.id,
      title: cfg.title,
      icon: cfg.icon,
      items,
    };
  });
}
