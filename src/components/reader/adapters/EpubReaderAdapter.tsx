import React, { useState, useEffect, useCallback, useRef, Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { ReactReader } from 'react-reader';
import type { Rendition } from 'epubjs';
import { sanitizeEpubArchive } from '../../../lib/epubXhtmlSanitizer';
import { TocItem } from '../ReaderTocDrawer';

export interface EpubReaderAdapterProps {
  fileUrl?: string | ArrayBuffer;
  documentId: string;
  initialLocation?: string | number;
  onLocationChanged?: (location: string) => void;
  onTocGenerated?: (items: TocItem[]) => void;
  fontSize?: number;
  pageMode?: 'single' | 'double';
  className?: string;
}

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
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
    console.error('[EpubReaderAdapter] Error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function EpubReaderAdapter({
  fileUrl,
  documentId,
  initialLocation = 0,
  onLocationChanged,
  onTocGenerated,
  fontSize = 100,
  pageMode = 'double',
  className = '',
}: EpubReaderAdapterProps) {
  const [location, setLocation] = useState<string | number>(initialLocation);
  const [processedUrl, setProcessedUrl] = useState<ArrayBuffer | null>(null);
  const [isSanitizing, setIsSanitizing] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const renditionRef = useRef<Rendition | null>(null);

  const loadAndSanitize = useCallback(async () => {
    if (!fileUrl) {
      setLoadError(true);
      setErrorMessage('Không tìm thấy đường dẫn file EPUB');
      setIsSanitizing(false);
      return;
    }

    setIsSanitizing(true);
    setLoadError(false);
    setErrorMessage('');

    try {
      let arrayBuffer: ArrayBuffer;
      if (typeof fileUrl === 'string') {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
      } else if (fileUrl instanceof ArrayBuffer) {
        arrayBuffer = fileUrl;
      } else if ((fileUrl as any) && (fileUrl as any).buffer instanceof ArrayBuffer) {
        arrayBuffer = (fileUrl as any).buffer;
      } else {
        throw new Error('Định dạng dữ liệu EPUB không hợp lệ');
      }

      const sanitizedBuffer = await sanitizeEpubArchive(arrayBuffer);
      setProcessedUrl(sanitizedBuffer);
    } catch (err: any) {
      console.error('[EpubReaderAdapter] Lỗi nạp hoặc giải mã EPUB:', err);
      setLoadError(true);
      setErrorMessage(err?.message || 'Không thể giải mã file EPUB');
    } finally {
      setIsSanitizing(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    loadAndSanitize();
  }, [loadAndSanitize]);

  const handleLocationChanged = (newLocation: string) => {
    setLocation(newLocation);
    if (onLocationChanged) {
      onLocationChanged(newLocation);
    }
  };

  const handleRendition = useCallback(
    (rendition: Rendition) => {
      renditionRef.current = rendition;

      if (rendition.display) {
        const originalDisplay = rendition.display.bind(rendition);
        rendition.display = async (target?: string | number) => {
          try {
            return await originalDisplay(target);
          } catch (err: any) {
            console.warn('[EpubReaderAdapter] rendition.display failed, falling back to 0:', err);
            setLocation(0);
            return await originalDisplay(0);
          }
        };
      }

      if (rendition.themes) {
        rendition.themes.fontSize(`${fontSize}%`);
      }

      if (rendition.spread) {
        rendition.spread(pageMode === 'single' ? 'none' : 'auto');
      }

      // Extract TOC navigation if available
      const book = (rendition as any).book;
      if (book && book.loaded && book.loaded.navigation) {
        book.loaded.navigation
          .then((nav: any) => {
            if (nav && nav.toc && Array.isArray(nav.toc) && onTocGenerated) {
              const tocItems: TocItem[] = nav.toc.map((item: any, idx: number) => ({
                id: item.href || `nav-${idx}`,
                label: (item.label || `Chương ${idx + 1}`).trim(),
                level: 1,
              }));
              onTocGenerated(tocItems);
            }
          })
          .catch((navErr: any) => {
            console.warn('[EpubReaderAdapter] TOC extraction warning:', navErr);
          });
      }
    },
    [fontSize, pageMode, onTocGenerated]
  );

  const errorFallback = (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800">
      <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center justify-center border border-rose-200 dark:border-rose-800">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          Không đọc được file EPUB này
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm">
          {errorMessage || 'Tệp tin có thể bị hỏng, thiếu định dạng OPF hợp lệ hoặc liên kết không còn khả dụng.'}
        </p>
      </div>
      <button
        type="button"
        onClick={loadAndSanitize}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Thử lại</span>
      </button>
    </div>
  );

  if (loadError) {
    return errorFallback;
  }

  if (isSanitizing || !processedUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs p-8">
        <Loader2 className="w-8 h-8 text-amber-800 dark:text-amber-400 animate-spin" />
        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
          Đang chuẩn bị nội dung tài liệu...
        </p>
      </div>
    );
  }

  return (
    <EpubErrorBoundary fallback={errorFallback}>
      <div className={`w-full h-full bg-white dark:bg-stone-900 rounded-2xl shadow-2xs border border-stone-200/80 dark:border-stone-800 overflow-hidden relative min-h-[400px] ${className}`}>
        <ReactReader
          url={processedUrl}
          location={location}
          locationChanged={handleLocationChanged}
          getRendition={handleRendition}
          epubOptions={{
            flow: 'paginated',
            spread: pageMode === 'single' ? 'none' : 'auto',
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    </EpubErrorBoundary>
  );
}
