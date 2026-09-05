import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Folder,
  FolderOpen,
  FileText,
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

      return (
        <div key={item.path} className="select-none">
          <div
            className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs transition cursor-pointer ${
              isDir
                ? "hover:bg-stone-100 text-stone-700 font-medium"
                : isMd
                ? "hover:bg-purple-50 hover:text-purple-900 text-stone-600"
                : "text-stone-400 opacity-60 cursor-default"
            }`}
            style={{ paddingLeft: `${depth * 18 + 8}px` }}
            onClick={() => {
              if (isDir) {
                toggleFolder(item.path);
              } else if (isMd) {
                onSelectFile(item.path);
              }
            }}
          >
            {isDir ? (
              <span className="text-stone-400 w-4 h-4 flex items-center justify-center">
                {isLoadingChild ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                ) : isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-stone-600" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            ) : (
              <span className="w-4 h-4" />
            )}

            {isDir ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-purple-600 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-600 shrink-0" />
              )
            ) : (
              <FileText
                className={`w-4 h-4 shrink-0 ${
                  isMd ? "text-purple-700" : "text-stone-400"
                }`}
              />
            )}

            <span className="truncate flex-1 font-sans">{item.name}</span>

            {!isDir && (
              <span className="text-[10px] text-stone-400 shrink-0">
                {item.size > 0
                  ? item.size > 1024
                    ? `${(item.size / 1024).toFixed(1)} KB`
                    : `${item.size} B`
                  : ""}
              </span>
            )}
          </div>

          {isDir && isExpanded && (
            <div className="border-l border-stone-200 ml-4">
              {folderCache[item.path] ? (
                renderTreeItems(folderCache[item.path], depth + 1)
              ) : (
                <div
                  className="py-1 text-[11px] text-stone-400 flex items-center gap-1.5"
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
        <div className="py-16 text-center text-stone-400 text-xs flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <span>Đang tìm kiếm trong Obsidian Vault...</span>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="py-12 text-center text-stone-400 text-xs flex flex-col items-center justify-center gap-1.5">
          <Search className="w-6 h-6 text-stone-300" />
          <span>Không tìm thấy ghi chú nào khớp với "{debouncedQuery}"</span>
        </div>
      );
    }

    return (
      <div className="space-y-2 p-1">
        <div className="text-[11px] text-stone-500 px-1 font-medium">
          Tìm thấy {searchResults.length} kết quả phù hợp:
        </div>
        {searchResults.map((res) => (
          <div
            key={res.path}
            onClick={() => onSelectFile(res.path)}
            className="p-3 bg-stone-50/70 hover:bg-purple-50/80 border border-stone-200 hover:border-purple-300 rounded-xl transition cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-purple-700 shrink-0 group-hover:scale-105 transition-transform" />
                <span className="text-xs font-semibold text-stone-800 group-hover:text-purple-950 truncate">
                  {res.title}
                </span>
              </div>
              <span className="text-[10px] text-stone-500 font-mono px-1.5 py-0.5 bg-stone-200/60 rounded shrink-0">
                {res.path}
              </span>
            </div>
            {res.snippet && (
              <p className="text-[11px] text-stone-500 group-hover:text-stone-700 line-clamp-2 mt-1.5 leading-relaxed pl-6">
                {res.snippet}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                Duyệt Obsidian Vault
              </h2>
              <p className="text-[11px] text-stone-500">
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
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingRoot || isSearching ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={onClose}
              aria-label="Đóng modal"
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2.5 border-b border-stone-100 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm kiếm hoặc lọc ghi chú trong Vault..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-stone-100/80 hover:bg-stone-100 focus:bg-white border border-transparent focus:border-purple-300 rounded-lg outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-[300px] max-h-[500px]">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {debouncedQuery ? (
            renderSearchResults()
          ) : isLoadingRoot ? (
            <div className="py-16 text-center text-stone-400 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span>Đang đọc cấu trúc Obsidian Vault...</span>
            </div>
          ) : (
            renderTreeItems(rootItems)
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
          <span>
            {debouncedQuery
              ? "Bấm vào kết quả để xem ghi chú"
              : "Bấm vào file Markdown (.md) để xem chi tiết"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-200/60 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
