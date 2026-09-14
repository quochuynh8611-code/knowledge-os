import React, { useState, useEffect, useCallback, useRef, Component, ReactNode, ErrorInfo } from "react";
import {
  BookOpen,
  X,
  AlertCircle,
  Plus,
  Minus,
  RotateCcw,
  Columns2,
  Square,
  Loader2,
} from "lucide-react";
import { ReactReader } from "react-reader";
import type { Rendition } from "epubjs";
import { sanitizeEpubArchive } from "../../lib/epubXhtmlSanitizer";

export interface FileViewerProps {
  fileUrl: string | ArrayBuffer;
  fileName: string;
  onClose: () => void;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export function getEpubStorageKey(fileName: string): string {
  const sanitized = (fileName || "untitled").trim().replace(/\s+/g, "-");
  return `epub-location:${encodeURIComponent(sanitized)}`;
}

export function getEpubFontSizeStorageKey(fileName: string): string {
  const sanitized = (fileName || "untitled").trim().replace(/\s+/g, "-");
  return `epub-font-size:${encodeURIComponent(sanitized)}`;
}

export function getEpubPageModeStorageKey(fileName: string): string {
  const sanitized = (fileName || "untitled").trim().replace(/\s+/g, "-");
  return `epub-page-mode:${encodeURIComponent(sanitized)}`;
}

class EpubErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Epub Reader rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function FileViewer({ fileUrl, fileName, onClose }: FileViewerProps) {
  const storageKey = getEpubStorageKey(fileName);
  const fontStorageKey = getEpubFontSizeStorageKey(fileName);
  const pageModeStorageKey = getEpubPageModeStorageKey(fileName);

  // Reading location state
  const [location, setLocation] = useState<string | number>(() => {
    try {
      return localStorage.getItem(storageKey) || 0;
    } catch {
      return 0;
    }
  });

  // Font size state (default 100%, range 70% - 200%)
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(fontStorageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 70 && parsed <= 200) {
          return parsed;
        }
      }
      return 100;
    } catch {
      return 100;
    }
  });

  // Page mode state ("double" | "single", default "double")
  const [pageMode, setPageMode] = useState<"double" | "single">(() => {
    try {
      const saved = localStorage.getItem(pageModeStorageKey);
      return saved === "single" ? "single" : "double";
    } catch {
      return "double";
    }
  });

  // Asynchronously sanitized EPUB data
  const [processedUrl, setProcessedUrl] = useState<ArrayBuffer | null>(null);
  const [isSanitizing, setIsSanitizing] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const renditionRef = useRef<Rendition | null>(null);

  // Fetch and sanitize EPUB XHTML entries to prevent XML parser errors
  useEffect(() => {
    let isCancelled = false;

    async function loadAndSanitize() {
      setIsSanitizing(true);
      setLoadError(false);

      try {
        let arrayBuffer: ArrayBuffer;
        if (typeof fileUrl === "string") {
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch EPUB file: HTTP ${response.status}`);
          }
          arrayBuffer = await response.arrayBuffer();
        } else if (fileUrl instanceof ArrayBuffer) {
          arrayBuffer = fileUrl;
        } else if ((fileUrl as any) && (fileUrl as any).buffer instanceof ArrayBuffer) {
          arrayBuffer = (fileUrl as any).buffer;
        } else {
          throw new Error("Invalid EPUB data format");
        }

        if (isCancelled) return;

        const sanitizedBuffer = await sanitizeEpubArchive(arrayBuffer);
        if (isCancelled) return;

        setProcessedUrl(sanitizedBuffer);
      } catch (err) {
        console.error("[FileViewer] Failed to load or sanitize EPUB archive:", err);
        if (!isCancelled) {
          setLoadError(true);
        }
      } finally {
        if (!isCancelled) {
          setIsSanitizing(false);
        }
      }
    }

    loadAndSanitize();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  // Self-Healing Fallback: Reset location to 0 and remove corrupted key
  const handleSelfHealingFallback = useCallback(() => {
    console.warn(`[FileViewer] Corrupted or invalid CFI detected for "${fileName}". Resetting reading position to start.`);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn("Could not remove corrupted EPUB key from localStorage", e);
    }
    setLocation(0);
  }, [storageKey, fileName]);

  // Keyboard navigation & ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Cleanup Blob URL if applicable
  useEffect(() => {
    return () => {
      if (typeof fileUrl === "string" && fileUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(fileUrl);
        } catch {}
      }
    };
  }, [fileUrl]);

  const handleLocationChanged = (newLocation: string) => {
    setLocation(newLocation);
    try {
      localStorage.setItem(storageKey, newLocation);
    } catch (e) {
      console.warn("Could not save EPUB reading position to localStorage", e);
    }
  };

  // Font size handlers
  const handleIncreaseFontSize = () => {
    setFontSize((prev) => {
      const next = Math.min(prev + 10, 200);
      try {
        localStorage.setItem(fontStorageKey, String(next));
      } catch {}
      if (renditionRef.current?.themes) {
        renditionRef.current.themes.fontSize(`${next}%`);
      }
      return next;
    });
  };

  const handleDecreaseFontSize = () => {
    setFontSize((prev) => {
      const next = Math.max(prev - 10, 70);
      try {
        localStorage.setItem(fontStorageKey, String(next));
      } catch {}
      if (renditionRef.current?.themes) {
        renditionRef.current.themes.fontSize(`${next}%`);
      }
      return next;
    });
  };

  const handleResetFontSize = () => {
    const next = 100;
    setFontSize(next);
    try {
      localStorage.setItem(fontStorageKey, String(next));
    } catch {}
    if (renditionRef.current?.themes) {
      renditionRef.current.themes.fontSize(`${next}%`);
    }
  };

  // Page mode handler
  const handlePageModeChange = (mode: "double" | "single") => {
    setPageMode(mode);
    try {
      localStorage.setItem(pageModeStorageKey, mode);
    } catch {}
    if (renditionRef.current) {
      renditionRef.current.spread(mode === "single" ? "none" : "auto");
    }
  };

  const handleRendition = useCallback((rendition: Rendition) => {
    renditionRef.current = rendition;

    // 1. Hook display errors & self-healing fallback
    if (rendition.display) {
      const originalDisplay = rendition.display.bind(rendition);
      rendition.display = async (target?: string | number) => {
        try {
          return await originalDisplay(target);
        } catch (err: any) {
          console.warn("[FileViewer] rendition.display failed, initiating self-healing fallback:", err);
          handleSelfHealingFallback();
          try {
            return await originalDisplay(0);
          } catch (fallbackErr) {
            console.error("[FileViewer] Fallback to beginning also failed:", fallbackErr);
            setLoadError(true);
            throw fallbackErr;
          }
        }
      };
    }

    // 2. Apply theme & font size
    if (rendition.themes) {
      rendition.themes.fontSize(`${fontSize}%`);
    }

    // 3. Apply spread
    if (rendition.spread) {
      rendition.spread(pageMode === "single" ? "none" : "auto");
    }

    // 4. Register styling hooks
    if (rendition.hooks?.content) {
      rendition.hooks.content.register((contents: any) => {
        contents.addStylesheetRules({
          "body": {
            "padding": "0 10px !important",
            "font-family": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important",
            "line-height": "1.7 !important",
            "color": "#1c1917 !important"
          }
        });
      });
    }

    // 5. Listen to displayError event if supported
    if (typeof (rendition as any).on === "function") {
      (rendition as any).on("displayError", (err: any) => {
        console.warn("[FileViewer] rendition displayError event caught:", err);
        handleSelfHealingFallback();
      });
    }

    // 6. Navigation Timeout (2s race condition for book.loaded.navigation)
    const book = (rendition as any).book;
    if (book && book.loaded && book.loaded.navigation) {
      const navTimeout = new Promise((resolve) => setTimeout(resolve, 2000));
      Promise.race([book.loaded.navigation, navTimeout]).catch((navErr) => {
        console.warn("[FileViewer] Navigation resolution timed out or encountered an error:", navErr);
      });
    }
  }, [handleSelfHealingFallback, fontSize, pageMode]);

  const errorFallback = (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-stone-50 rounded-2xl border border-stone-200">
      <div className="w-12 h-12 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center border border-rose-200">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-stone-900">
          Không đọc được file EPUB này
        </h3>
        <p className="text-xs text-stone-500 max-w-sm">
          Tệp tin có thể bị hỏng, thiếu định dạng OPF hợp lệ hoặc liên kết không còn khả dụng.
        </p>
      </div>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={fileName}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header Bar with Reader Controls */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-stone-200 bg-stone-50 gap-3">
          {/* File Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-200/60">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-stone-900 truncate">
                {fileName}
              </h2>
              <p className="text-[11px] text-stone-500 font-mono truncate">
                EPUB Reader • Vị trí được tự động lưu
              </p>
            </div>
          </div>

          {/* Reader Controls Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Page Mode Toggle */}
            <div className="flex items-center bg-stone-200/70 p-0.5 rounded-xl border border-stone-300/60 text-xs">
              <button
                type="button"
                onClick={() => handlePageModeChange("double")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  pageMode === "double"
                    ? "bg-amber-100 text-amber-900 shadow-xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
                title="Hiển thị trang đôi (mặc định)"
                aria-pressed={pageMode === "double"}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Trang đôi</span>
              </button>
              <button
                type="button"
                onClick={() => handlePageModeChange("single")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  pageMode === "single"
                    ? "bg-amber-100 text-amber-900 shadow-xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
                title="Hiển thị trang đơn"
                aria-pressed={pageMode === "single"}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Trang đơn</span>
              </button>
            </div>

            {/* Font Size Controls */}
            <div className="flex items-center bg-stone-200/70 px-1 py-0.5 rounded-xl border border-stone-300/60 text-xs">
              <button
                type="button"
                onClick={handleDecreaseFontSize}
                disabled={fontSize <= 70}
                aria-label="Giảm cỡ chữ"
                className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-300/50 rounded-lg transition disabled:opacity-40 cursor-pointer"
                title="Giảm cỡ chữ (A-)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span
                aria-label="Cỡ chữ hiện tại"
                className="px-2 py-0.5 font-semibold text-stone-800 text-[11px] select-none min-w-[42px] text-center"
              >
                {fontSize}%
              </span>

              <button
                type="button"
                onClick={handleIncreaseFontSize}
                disabled={fontSize >= 200}
                aria-label="Tăng cỡ chữ"
                className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-300/50 rounded-lg transition disabled:opacity-40 cursor-pointer"
                title="Tăng cỡ chữ (A+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetFontSize}
                aria-label="Đặt lại cỡ chữ"
                className="p-1 text-stone-500 hover:text-amber-800 hover:bg-stone-300/50 rounded-lg transition ml-0.5 cursor-pointer"
                title="Đặt lại cỡ chữ 100%"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Close Button */}
            <div className="pl-1 border-l border-stone-300">
              <button
                onClick={onClose}
                aria-label="Đóng"
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Reader Container */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-stone-100 p-2 sm:p-4">
          {loadError ? (
            errorFallback
          ) : isSanitizing || !processedUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-stone-200 shadow-xs">
              <Loader2 className="w-8 h-8 text-amber-800 animate-spin" />
              <p className="text-xs text-stone-500 font-medium">
                Đang chuẩn bị nội dung tài liệu...
              </p>
            </div>
          ) : (
            <EpubErrorBoundary fallback={errorFallback}>
              <div className="w-full h-full bg-white rounded-2xl shadow-xs border border-stone-200/80 overflow-hidden relative min-h-[400px]">
                <ReactReader
                  url={processedUrl}
                  location={location}
                  locationChanged={handleLocationChanged}
                  getRendition={handleRendition}
                  epubOptions={{
                    flow: "paginated",
                    spread: pageMode === "single" ? "none" : "auto",
                    width: "100%",
                    height: "100%",
                  }}
                />
              </div>
            </EpubErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
