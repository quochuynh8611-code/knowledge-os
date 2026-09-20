import React, { useState, useEffect, useCallback, useRef, Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { ReactReader } from 'react-reader';
import type { Rendition } from 'epubjs';
import { sanitizeEpubArchive } from '../../../lib/epubXhtmlSanitizer';
import { resolveReaderFileUrl } from '../../../lib/readerDocumentResolver';
import { TocItem } from '../ReaderTocDrawer';

export interface EpubReaderSelectionDetails {
  text: string;
  position: { top: number; left: number };
  cfi?: string;
}

export interface EpubReaderAdapterProps {
  fileUrl?: string | ArrayBuffer;
  documentId: string;
  initialLocation?: string | number;
  onLocationChanged?: (location: string) => void;
  onTocGenerated?: (items: TocItem[]) => void;
  onTextSelection?: (selection: EpubReaderSelectionDetails | null) => void;
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
  onTextSelection,
  fontSize = 100,
  pageMode = 'double',
  className = '',
}: EpubReaderAdapterProps) {
  console.log('[EPUB Debug] 0. EpubReaderAdapter mounted/rendered with:', { fileUrl, documentId });
  const [location, setLocation] = useState<string | number>(initialLocation);
  const [processedUrl, setProcessedUrl] = useState<ArrayBuffer | null>(null);
  const [isSanitizing, setIsSanitizing] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const renditionRef = useRef<Rendition | null>(null);
  const onTextSelectionRef = useRef(onTextSelection);
  const listenersRef = useRef<{ selected?: Function; click?: Function; rendition?: Rendition } | null>(null);

  useEffect(() => {
    onTextSelectionRef.current = onTextSelection;
  }, [onTextSelection]);

  useEffect(() => {
    return () => {
      if (listenersRef.current?.rendition) {
        const { rendition, selected, click } = listenersRef.current;
        if (selected) rendition.off('selected', selected as any);
        if (click) rendition.off('click', click as any);
      }
    };
  }, []);

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
        const fetchUrl = resolveReaderFileUrl(fileUrl);

        const response = await fetch(fetchUrl);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Không tìm thấy tệp sách (HTTP 404: Not Found) tại đường dẫn: ${fetchUrl}`);
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers?.get ? (response.headers.get('content-type') || '') : '';
        if (contentType.toLowerCase().includes('text/html')) {
          throw new Error('Đường dẫn tệp không hợp lệ (nhận phản hồi HTML thay vì tệp sách EPUB nhị phân)');
        }

        arrayBuffer = await response.arrayBuffer();

        // Inspect leading bytes: detect HTML payload signature even if Content-Type was missing/generic
        const headerSlice = new Uint8Array(arrayBuffer.slice(0, 100));
        const headerText = new TextDecoder('utf-8').decode(headerSlice).trim().toLowerCase();
        if (headerText.startsWith('<!doctype html') || headerText.startsWith('<html')) {
          throw new Error('Đường dẫn tệp không hợp lệ (nhận phản hồi HTML thay vì tệp sách EPUB nhị phân)');
        }
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
      console.log('[EPUB Debug] 1. handleRendition called with rendition:', Boolean(rendition));
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

      // Cleanup previous listeners if rendition instance changed
      if (listenersRef.current?.rendition) {
        const { rendition: prevRendition, selected, click } = listenersRef.current;
        if (selected) prevRendition.off('selected', selected as any);
        if (click) prevRendition.off('click', click as any);
      }

      // Direct In-Document Text Selection handler
      const handleSelected = (cfiRange: string, contents: any) => {
        console.log('[EPUB Debug] 3. [EVENT FIRED] rendition.on("selected") fired! cfiRange:', cfiRange, 'hasContents:', Boolean(contents));
        if (!onTextSelectionRef.current) return;
        try {
          let text = '';
          let rangeRect = { top: 0, left: 0, width: 0, height: 0 };

          if (rendition.getRange) {
            const range = rendition.getRange(cfiRange);
            if (range) {
              text = range.toString()?.trim() || '';
              const rRect = range.getBoundingClientRect();
              rangeRect = {
                top: rRect.top,
                left: rRect.left,
                width: rRect.width,
                height: rRect.height,
              };
            }
          }

          if (!text && contents?.window?.getSelection) {
            const sel = contents.window.getSelection();
            text = sel?.toString()?.trim() || '';
            if (sel && sel.rangeCount > 0) {
              const rRect = sel.getRangeAt(0).getBoundingClientRect();
              rangeRect = {
                top: rRect.top,
                left: rRect.left,
                width: rRect.width,
                height: rRect.height,
              };
            }
          }

          console.log('[EPUB Debug] 3a. Extracted text:', text, 'rangeRect:', rangeRect);

          if (!text) return;

          // Calculate iframe offset in viewport
          const iframeEl = contents?.document?.defaultView?.frameElement as HTMLElement | null;
          const iframeRect = iframeEl ? iframeEl.getBoundingClientRect() : { top: 0, left: 0 };

          const top = iframeRect.top + rangeRect.top;
          const left = iframeRect.left + rangeRect.left + rangeRect.width / 2;

          console.log('[EPUB Debug] 3b. Computed position:', { top, left, iframeRect });

          onTextSelectionRef.current({
            text,
            position: {
              top: isNaN(top) || top <= 0 ? 140 : top,
              left: isNaN(left) || left <= 0 ? 400 : left,
            },
            cfi: cfiRange,
          });
        } catch (err) {
          console.warn('[EPUB Debug] Selection capture error:', err);
        }
      };

      const handleClick = () => {
        console.log('[EPUB Debug] 7. rendition.on("click") fired');
        if (onTextSelectionRef.current) {
          onTextSelectionRef.current(null);
        }
      };

      rendition.on('selected', handleSelected);
      rendition.on('click', handleClick);
      console.log('[EPUB Debug] 2. rendition.on("selected") & ("click") listeners registered');

      // Hook into iframe content loading for DOM-level diagnostics
      if ((rendition as any).hooks?.content) {
        (rendition as any).hooks.content.register((contents: any) => {
          console.log('[EPUB Debug] 4. [HOOK] rendition.hooks.content registered view. Has doc:', Boolean(contents?.document));
          const doc = contents?.document;
          if (doc) {
            doc.addEventListener('mouseup', () => {
              const sel = contents.window?.getSelection();
              const selText = sel?.toString()?.trim();
              console.log('[EPUB Debug] 5. [DOM mouseup] inside iframe document. Selection text:', selText);
            });
            doc.addEventListener('selectionchange', () => {
              const sel = contents.window?.getSelection();
              const selText = sel?.toString()?.trim();
              console.log('[EPUB Debug] 6. [DOM selectionchange] inside iframe document. Selection text:', selText);
            });
          }
        });
      }

      listenersRef.current = { rendition, selected: handleSelected, click: handleClick };

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
