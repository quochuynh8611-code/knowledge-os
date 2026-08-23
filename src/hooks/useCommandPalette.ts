import type React from "react";
import { useState, useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  FolderTree,
  Brain,
  Compass,
  Share2,
  TrendingUp,
  FileText,
  Library,
  Sparkles,
  BookA,
  Plus,
  Moon,
  Download,
} from "lucide-react";

export interface CommandPaletteItem {
  id: string;
  title: string;
  description?: string;
  category: "Điều hướng" | "Hành động nhanh" | "Chủ đề" | "Ghi chú";
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
}

export interface UseCommandPaletteOptions {
  customItems?: CommandPaletteItem[];
  onNavigateTab?: (tab: string) => void;
  onOpenTopic?: (id: string) => void;
  onToggleTheme?: () => void;
  onOpenTopicModal?: () => void;
  onOpenNoteModal?: () => void;
  onOpenReviewModal?: () => void;
}

export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Default Command Palette Items
  const baseItems: CommandPaletteItem[] = useMemo(() => {
    const items: CommandPaletteItem[] = [
      // 1. Navigation Commands
      {
        id: "nav-dashboard",
        title: "Tổng Quan Nghiên Cứu",
        description: "Về trang dashboard tổng quát",
        category: "Điều hướng",
        icon: LayoutDashboard,
        keywords: ["tong quan", "dashboard", "home", "trang chu"],
        action: () => options.onNavigateTab?.("dashboard"),
      },
      {
        id: "nav-topics",
        title: "Quản Lý & Cây Chủ Đề",
        description: "Xem toàn bộ cây phân cấp Phật học & Huyền học",
        category: "Điều hướng",
        icon: FolderTree,
        keywords: ["chu de", "topics", "cay phan cap", "danh muc"],
        action: () => options.onNavigateTab?.("topics"),
      },
      {
        id: "nav-abhidharma",
        title: "Ma Trận Vi Diệu Pháp",
        description: "Khảo cứu 89 Tâm, 52 Tâm Sở, 28 Sắc Pháp, 24 Duyên Hệ",
        category: "Điều hướng",
        icon: Brain,
        keywords: [
          "abhidharma",
          "vi dieu phap",
          "89 tam",
          "tam so",
          "thang phap",
        ],
        action: () => options.onNavigateTab?.("abhidharma_matrix"),
      },
      {
        id: "nav-divination",
        title: "Dịch Học & Kỳ Môn Độn Giáp",
        description: "Tra cứu 64 Quẻ Chu Dịch, Bát Môn, Cửu Tinh, Huyền Không",
        category: "Điều hướng",
        icon: Compass,
        keywords: [
          "dich hoc",
          "kinh dich",
          "64 que",
          "ky mon",
          "phong thuy",
          "tu vi",
        ],
        action: () => options.onNavigateTab?.("divination_matrix"),
      },
      {
        id: "nav-graph",
        title: "Biểu Đồ Tri Thức (Knowledge Graph)",
        description: "Mạng lưới tương quan đa chiều giữa các học thuyết",
        category: "Điều hướng",
        icon: Share2,
        keywords: ["graph", "do thi", "mang luoi", "lien ket"],
        action: () => options.onNavigateTab?.("graph"),
      },
      {
        id: "nav-progress",
        title: "Tiến Độ & Ôn Tập (SM-2)",
        description: "Thuật toán SuperMemo-2 và hàng đợi ôn tập hôm nay",
        category: "Điều hướng",
        icon: TrendingUp,
        keywords: [
          "tien do",
          "on tap",
          "sm2",
          "flashcard",
          "spaced repetition",
        ],
        action: () => options.onNavigateTab?.("progress"),
      },
      {
        id: "nav-notes",
        title: "Ghi Chú & Wiki Links",
        description: "Kho ghi chép Zettelkasten liên kết hai chiều",
        category: "Điều hướng",
        icon: FileText,
        keywords: ["ghi chu", "notes", "wiki", "zettelkasten"],
        action: () => options.onNavigateTab?.("notes"),
      },
      {
        id: "nav-lexicon",
        title: "Từ Điển Đa Ngữ Pali / Hán Cổ",
        description: "Tra cứu nguyên nghĩa chiết tự thuật ngữ học thuật",
        category: "Điều hướng",
        icon: BookA,
        keywords: ["tu dien", "lexicon", "pali", "sanskrit", "han co"],
        action: () => options.onNavigateTab?.("lexicon"),
      },

      // 2. Quick Actions
      {
        id: "act-add-topic",
        title: "Tạo Chủ Đề Khảo Cứu Mới",
        description: "Thêm chủ đề nghiên cứu vào cây tri thức",
        category: "Hành động nhanh",
        icon: Plus,
        keywords: ["them chu de", "tao chu de", "new topic", "add topic"],
        action: () => options.onOpenTopicModal?.(),
      },
      {
        id: "act-add-note",
        title: "Thêm Ghi Chú Mới",
        description: "Viết ghi chú cá nhân với định dạng Markdown",
        category: "Hành động nhanh",
        icon: FileText,
        keywords: ["them ghi chu", "viet ghi chu", "new note"],
        action: () => options.onOpenNoteModal?.(),
      },
      {
        id: "act-review-sm2",
        title: "Bắt Đầu Ôn Tập SM-2",
        description: "Kích hoạt phiên ôn tập trí nhớ gián đoạn",
        category: "Hành động nhanh",
        icon: Sparkles,
        keywords: ["on tap", "review", "sm2", "hoc tap"],
        action: () => options.onOpenReviewModal?.(),
      },
      {
        id: "act-toggle-theme",
        title: "Chuyển Đổi Giao Diện Sáng / Tối",
        description: "Đổi chế độ Mực Nho (Tối) hoặc Giấy Cổ (Sáng)",
        category: "Hành động nhanh",
        icon: Moon,
        keywords: [
          "theme",
          "dark mode",
          "light mode",
          "doi giao dien",
          "che do toi",
        ],
        action: () => options.onToggleTheme?.(),
      },
    ];

    if (options.customItems) {
      return [...items, ...options.customItems];
    }
    return items;
  }, [options]);

  // Filter Items based on Query
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return baseItems;

    return baseItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords?.some((k) =>
        k.toLowerCase().includes(q),
      );
      return matchTitle || matchDesc || matchCategory || matchKeywords;
    });
  }, [baseItems, query]);

  const executeItem = useCallback((item: CommandPaletteItem) => {
    item.action();
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const openPalette = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  return {
    isOpen,
    setIsOpen,
    openPalette,
    closePalette,
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredItems,
    executeItem,
  };
}
