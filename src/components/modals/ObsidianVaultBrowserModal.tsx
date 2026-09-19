import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Folder,
  FolderOpen,
  FileText,
  BookOpen,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";
import { ObsidianSearchResult } from "../../lib/obsidianIndexBuilder";
import { VaultSelector } from "./VaultSelector";

export interface VaultTreeItem {
  name: string;
  type: "file" | "directory";
  path: string;
  size: number;
  mtime: string;
  extension?: string;
}

interface VaultTreeResponse {
  path: string;
  items: VaultTreeItem[];
}

export interface ObsidianVaultBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (filePath: string) => void;
}

export function ObsidianVaultBrowserModal({
  isOpen,
  onClose,
  onSelectFile,
}: ObsidianVaultBrowserModalProps) {
  const [rootItems, setRootItems] = useState<VaultTreeItem[]>([]);
  const [folderCache, setFolderCache] = useState<Record<string, VaultTreeItem[]>>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());
  const [isLoadingRoot, setIsLoadingRoot] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ObsidianSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute search API when debouncedQuery is non-empty
  useEffect(() => {
    if (!isOpen) return;

    if (!debouncedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);
    setErrorMessage(null);

    fetch(`/api/obsidian/vault/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled) {
          if (data.error) {
            setErrorMessage(data.message || "Lỗi khi tìm kiếm.");
            setSearchResults([]);
          } else {
            setSearchResults(data.results || []);
          }
          setIsSearching(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setErrorMessage(err?.message || "Không thể kết nối máy chủ tìm kiếm.");
          setIsSearching(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, isOpen]);

  const fetchFolder = useCallback(
    async (folderPath: string, isRoot = false) => {
      if (isRoot) {
        setIsLoadingRoot(true);
      } else {
        setLoadingFolders((prev) => new Set(prev).add(folderPath));
      }
      setErrorMessage(null);

      try {
        const queryParam = folderPath ? `?path=${encodeURIComponent(folderPath)}` : "";
        const res = await fetch(`/api/obsidian/vault/tree${queryParam}`);
        const data: VaultTreeResponse = await res.json();

        if (!res.ok) {
          const errData = data as any;
          throw new Error(errData.message || "Không thể tải cấu trúc thư mục Obsidian.");
        }

        if (isRoot) {
          setRootItems(data.items || []);
        } else {
          setFolderCache((prev) => ({
            ...prev,
            [folderPath]: data.items || [],
          }));
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Đã xảy ra lỗi khi duyệt thư mục.");
      } finally {
        if (isRoot) {
          setIsLoadingRoot(false);
        } else {
          setLoadingFolders((prev) => {
            const next = new Set(prev);
            next.delete(folderPath);
            return next;
          });
        }
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      setExpandedFolders(new Set());
      setFolderCache({});
      setSearchQuery("");
      setDebouncedQuery("");
      setSearchResults([]);
      setErrorMessage(null);
      fetchFolder("", true);
    }
  }, [isOpen, fetchFolder]);

  const handleVaultSwitched = useCallback(() => {
    setExpandedFolders(new Set());
    setFolderCache({});
    setSearchQuery("");
    setDebouncedQuery("");
    setSearchResults([]);
    setErrorMessage(null);
    fetchFolder("", true);
  }, [fetchFolder]);

  if (!isOpen) return null;

  const toggleFolder = async (folderPath: string) => {
    if (expandedFolders.has(folderPath)) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.delete(folderPath);
        return next;
      });
    } else {
      setExpandedFolders((prev) => new Set(prev).add(folderPath));
      if (!folderCache[folderPath]) {
        await fetchFolder(folderPath, false);
      }
    }
  };

  const handleRefresh = () => {
    setFolderCache({});
    setExpandedFolders(new Set());
    if (debouncedQuery) {
      setIsSearching(true);
      fetch(`/api/obsidian/vault/search?q=${encodeURIComponent(debouncedQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          setIsSearching(false);
          if (data.results) {
            setSearchResults(data.results);
          }
        })
        .catch(() => setIsSearching(false));
    } else {
      fetchFolder("", true);
    }
  };

  const renderTreeItems = (items: VaultTreeItem[], depth = 0) => {
    if (items.length === 0) {
      return (
        <div
          className="text-xs text-stone-400 py-2 italic select-none"
          style={{ paddingLeft: `${depth * 20 + 24}px` }}
        >
          (Thư mục trống)
        </div>
      );
    }

    return items.map((item) => {
      const isDir = item.type === "directory";
      const isExpanded = expandedFolders.has(item.path);
      const isLoadingChild = loadingFolders.has(item.path);
      const isMd = item.extension === ".md" || item.extension === ".markdown";
      const isEpub = item.extension === ".epub" || item.name.toLowerCase().endsWith(".epub");
      const isPdf = item.extension === ".pdf" || item.name.toLowerCase().endsWith(".pdf");
      const isSelectable = isMd || isEpub || isPdf;

      return (
        <div key={item.path} className="select-none">
          <div
            className={`flex items-center gap-2 py-1.5 px-2 rounded-xl text-xs transition cursor-pointer ${
              isDir
                ? "hover:bg-stone-100 dark:hover:bg-stone-800/80 text-stone-700 dark:text-stone-200 font-medium"
                : isEpub
                ? "hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-900 dark:hover:text-amber-300 text-amber-900 dark:text-amber-300 font-medium"
                : isPdf
                ? "hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-900 dark:hover:text-rose-300 text-rose-900 dark:text-rose-300 font-medium"
                : isMd
                ? "hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-900 dark:hover:text-purple-300 text-stone-600 dark:text-stone-300"
                : "text-stone-400 dark:text-stone-500 opacity-60 cursor-default"
            }`}
            style={{ paddingLeft: `${depth * 18 + 8}px` }}
            onClick={() => {
              if (isDir) {
                toggleFolder(item.path);
              } else if (isSelectable) {
                onSelectFile(item.path);
              }
            }}
          >
            {isDir ? (
              <span className="text-stone-400 dark:text-stone-500 w-4 h-4 flex items-center justify-center">
                {isLoadingChild ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
                ) : isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            ) : (
              <span className="w-4 h-4" />
            )}

            {isDir ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )
            ) : isEpub ? (
              <BookOpen className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
            ) : isPdf ? (
              <FileText className="w-4 h-4 shrink-0 text-rose-700 dark:text-rose-400" />
            ) : (
              <FileText
                className={`w-4 h-4 shrink-0 ${
                  isMd ? "text-purple-700 dark:text-purple-400" : "text-stone-400 dark:text-stone-500"
                }`}
              />
            )}

            <span className="truncate flex-1 font-sans">{item.name}</span>

            {!isDir && (
              <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0">
                {item.size > 0
                  ? item.size > 1024
                    ? `${(item.size / 1024).toFixed(1)} KB`
                    : `${item.size} B`
                  : ""}
              </span>
            )}
          </div>

          {isDir && isExpanded && (
            <div className="border-l border-stone-200 dark:border-stone-800 ml-4">
              {folderCache[item.path] ? (
                renderTreeItems(folderCache[item.path], depth + 1)
              ) : (
                <div
                  className="py-1 text-[11px] text-stone-400 dark:text-stone-500 flex items-center gap-1.5"
                  style={{ paddingLeft: `${(depth + 1) * 18 + 8}px` }}
                >
                  <Loader2 className="w-3 h-3 animate-spin" /> Đang tải thư mục...
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="py-16 text-center text-stone-400 dark:text-stone-500 text-xs flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
          <span>Đang tìm kiếm trong Obsidian Vault...</span>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="py-12 text-center text-stone-400 dark:text-stone-500 text-xs flex flex-col items-center justify-center gap-1.5">
          <Search className="w-6 h-6 text-stone-300 dark:text-stone-600" />
          <span>Không tìm thấy ghi chú nào khớp với "{debouncedQuery}"</span>
        </div>
      );
    }

    return (
      <div className="space-y-2 p-1">
        <div className="text-[11px] text-stone-500 dark:text-stone-400 px-1 font-medium">
          Tìm thấy {searchResults.length} kết quả phù hợp:
        </div>
        {searchResults.map((res) => (
          <div
            key={res.path}
            onClick={() => onSelectFile(res.path)}
            className="p-3 bg-stone-50/70 dark:bg-stone-850 hover:bg-purple-50/80 dark:hover:bg-purple-950/40 border border-stone-200 dark:border-stone-800 hover:border-purple-300 dark:hover:border-purple-700/60 rounded-2xl transition cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-purple-700 dark:text-purple-400 shrink-0 group-hover:scale-105 transition-transform" />
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 group-hover:text-purple-950 dark:group-hover:text-purple-300 truncate">
                  {res.title}
                </span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono px-1.5 py-0.5 bg-stone-200/60 dark:bg-stone-800 rounded-md shrink-0">
                {res.path}
              </span>
            </div>
            {res.snippet && (
              <p className="text-[11px] text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-300 line-clamp-2 mt-1.5 leading-relaxed pl-6">
                {res.snippet}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Duyệt Obsidian Vault"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-800">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-serif-title">
                Duyệt Obsidian Vault
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Khám phá cấu trúc tệp và tìm kiếm ghi chú toàn văn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <VaultSelector onVaultSwitched={handleVaultSwitched} />
            <button
              onClick={handleRefresh}
              disabled={isLoadingRoot || isSearching}
              title="Làm mới"
              aria-label="Làm mới danh sách"
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingRoot || isSearching ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={onClose}
              aria-label="Đóng modal"
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              placeholder="Tìm kiếm hoặc lọc ghi chú trong Vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-stone-100/80 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 focus:bg-white dark:focus:bg-stone-800 border border-transparent focus:border-purple-300 dark:focus:border-purple-600 rounded-xl text-stone-900 dark:text-stone-100 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-[300px] max-h-[500px]">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {debouncedQuery ? (
            renderSearchResults()
          ) : isLoadingRoot ? (
            <div className="py-16 text-center text-stone-400 dark:text-stone-500 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
              <span>Đang đọc cấu trúc Obsidian Vault...</span>
            </div>
          ) : (
            renderTreeItems(rootItems)
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <span>
            {debouncedQuery
              ? "Bấm vào kết quả để xem ghi chú"
              : "Bấm vào file Markdown (.md) hoặc Sách (.epub) để xem chi tiết"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
