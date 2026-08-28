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
import { normalizeScholarText } from "../lib/scholarSearch";
import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
} from "../lib/storage";

export const COMMAND_PALETTE_RECENT_STORAGE_KEY = "phat_hoc_recent_commands_v1";
const MAX_RECENT_ITEMS = 5;

export type CommandPaletteCategory =
  | "Điều hướng"
  | "Hành động nhanh"
  | "Chủ đề"
  | "Ghi chú";

export type CommandPaletteDisplayCategory =
  | "Gần đây"
  | CommandPaletteCategory;

export interface CommandPaletteItem {
  id: string;
  title: string;
  description?: string;
  category: CommandPaletteDisplayCategory;
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
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    const raw = safeGetLocalStorageItem(COMMAND_PALETTE_RECENT_STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((it) => (typeof it === "string" ? it : it?.id))
        .filter((id): id is string => typeof id === "string" && id.length > 0);
    } catch {
      return [];
    }
  });

  // Default Command Palette Items
  const baseItems: CommandPaletteItem[] = useMemo(() => {
    const items: CommandPaletteItem[] = [
      // 1. Navigation Commands
      {
        id: "nav-dashboard",
        title: "Tổng quan",
        description: "Về trang tổng quan không gian nghiên cứu",
        category: "Điều hướng",
        icon: LayoutDashboard,
        keywords: ["tong quan", "dashboard", "home", "trang chu", "tong quan nghien cuu"],
        action: () => options.onNavigateTab?.("dashboard"),
      },
      {
        id: "nav-topics",
        title: "Chủ đề",
        description: "Xem và quản lý cây phân cấp chủ đề nghiên cứu",
        category: "Điều hướng",
        icon: FolderTree,
        keywords: ["chu de", "topics", "cay phan cap", "danh muc", "quan ly cay chu de"],
        action: () => options.onNavigateTab?.("topics"),
      },
      {
        id: "nav-abhidharma",
        title: "Ma trận phân tích",
        description: "Khảo cứu 89 Tâm, 52 Tâm Sở, 28 Sắc Pháp, 24 Duyên Hệ",
        category: "Điều hướng",
        icon: Brain,
        keywords: [
          "ma tran phan tich",
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
        title: "Mô hình hệ thống",
        description: "Tra cứu 64 Quẻ Chu Dịch, Bát Môn, Cửu Tinh, Huyền Không",
        category: "Điều hướng",
        icon: Compass,
        keywords: [
          "mo hinh he thong",
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
        title: "Bản đồ tri thức",
        description: "Mạng lưới tương quan đa chiều giữa các học thuyết",
        category: "Điều hướng",
        icon: Share2,
        keywords: ["ban do tri thuc", "graph", "do thi", "mang luoi", "lien ket", "knowledge graph"],
        action: () => options.onNavigateTab?.("graph"),
      },
      {
        id: "nav-progress",
        title: "Tiến độ & Ôn tập (SM-2)",
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
        title: "Ghi chú & Liên kết",
        description: "Kho ghi chép Zettelkasten liên kết hai chiều",
        category: "Điều hướng",
        icon: FileText,
        keywords: ["ghi chu", "notes", "wiki", "zettelkasten", "lien ket"],
        action: () => options.onNavigateTab?.("notes"),
      },
      {
        id: "nav-lexicon",
        title: "Từ điển thuật ngữ",
        description: "Tra cứu nguyên nghĩa chiết tự thuật ngữ học thuật",
        category: "Điều hướng",
        icon: BookA,
        keywords: ["tu dien", "lexicon", "pali", "sanskrit", "han co", "thuat ngu"],
        action: () => options.onNavigateTab?.("lexicon"),
      },

      // 2. Quick Actions
      {
        id: "act-add-topic",
        title: "Tạo Chủ Đề Nghiên Cứu Mới",
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
        description: "Đổi chế độ Tối hoặc Sáng",
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

  // Dynamically resolve recent items with live action closures and components from baseItems
  const recentItems: CommandPaletteItem[] = useMemo(() => {
    const itemMap = new Map(baseItems.map((it) => [it.id, it]));
    return recentIds
      .map((id) => itemMap.get(id))
      .filter((it): it is CommandPaletteItem => it !== undefined);
  }, [baseItems, recentIds]);

  // Filter Items based on Query using Scholar Search normalization
  const filteredItems = useMemo(() => {
    const normQ = normalizeScholarText(query);
    if (!normQ) {
      if (recentItems.length === 0) return baseItems;
      const mappedRecent: CommandPaletteItem[] = recentItems.map((it) => ({
        ...it,
        category: "Gần đây",
      }));
      return [...mappedRecent, ...baseItems];
    }

    return baseItems.filter((item) => {
      const matchTitle = normalizeScholarText(item.title).includes(normQ);
      const matchDesc = item.description
        ? normalizeScholarText(item.description).includes(normQ)
        : false;
      const matchCategory = normalizeScholarText(item.category).includes(normQ);
      const matchKeywords = item.keywords?.some((k) =>
        normalizeScholarText(k).includes(normQ),
      );
      return matchTitle || matchDesc || matchCategory || matchKeywords;
    });
  }, [baseItems, query, recentItems]);

  const executeItem = useCallback((item: CommandPaletteItem) => {
    setRecentIds((prev) => {
      const next = [item.id, ...prev.filter((id) => id !== item.id)].slice(
        0,
        MAX_RECENT_ITEMS,
      );
      safeSetLocalStorageItem(
        COMMAND_PALETTE_RECENT_STORAGE_KEY,
        JSON.stringify(next),
      );
      return next;
    });

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
    recentItems,
    filteredItems,
    executeItem,
  };
}
