import React, { useRef, useState, useEffect } from "react";
import { Map } from "lucide-react";
import type {
  MindMapTreeNode,
  MindMapLayoutMode,
} from "../../lib/mindmapProjection";

export interface MindMapMinimapProps {
  tree: MindMapTreeNode;
  layoutMode?: MindMapLayoutMode;
  collapsedNodeIds?: Set<string>;
  zoom: number;
  pan: { x: number; y: number };
  backdropRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPanChange: (newPan: { x: number; y: number }) => void;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 120;
const MIN_RECT_WIDTH = 20;
const MIN_RECT_HEIGHT = 16;
const DEFAULT_BACKDROP_WIDTH = 800;
const DEFAULT_BACKDROP_HEIGHT = 600;
const DEFAULT_CONTENT_WIDTH = 1600;
const DEFAULT_CONTENT_HEIGHT = 1200;

export function MindMapMinimap({
  tree,
  zoom,
  pan,
  backdropRef,
  containerRef,
  onPanChange,
}: MindMapMinimapProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [observedDimensions, setObservedDimensions] = useState<{
    backdropWidth?: number;
    backdropHeight?: number;
    contentWidth?: number;
    contentHeight?: number;
  }>({});

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
  }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });

  const safeZoom = Math.max(0.1, zoom || 1.0);

  useEffect(() => {
    if (!isMobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileOpen]);

  // Dynamic ResizeObserver for reactive geometry measurement
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;

    const backdropEl = backdropRef.current;
    const contentEl = containerRef.current;
    if (!backdropEl && !contentEl) return;

    let isMounted = true;

    const measureElements = () => {
      if (!isMounted) return;

      let newBackdropW: number | undefined;
      let newBackdropH: number | undefined;
      let newContentW: number | undefined;
      let newContentH: number | undefined;

      if (backdropRef.current) {
        const rect = backdropRef.current.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          Number.isFinite(rect.width) &&
          Number.isFinite(rect.height)
        ) {
          newBackdropW = rect.width;
          newBackdropH = rect.height;
        }
      }

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          Number.isFinite(rect.width) &&
          Number.isFinite(rect.height)
        ) {
          newContentW = rect.width / safeZoom;
          newContentH = rect.height / safeZoom;
        }
      }

      setObservedDimensions((prev) => {
        const sameBackdropW = prev.backdropWidth === newBackdropW;
        const sameBackdropH = prev.backdropHeight === newBackdropH;
        const sameContentW = prev.contentWidth === newContentW;
        const sameContentH = prev.contentHeight === newContentH;

        if (sameBackdropW && sameBackdropH && sameContentW && sameContentH) {
          return prev;
        }

        return {
          backdropWidth: newBackdropW ?? prev.backdropWidth,
          backdropHeight: newBackdropH ?? prev.backdropHeight,
          contentWidth: newContentW ?? prev.contentWidth,
          contentHeight: newContentH ?? prev.contentHeight,
        };
      });
    };

    const observer = new ResizeObserver(() => {
      measureElements();
    });

    if (backdropEl) observer.observe(backdropEl);
    if (contentEl) observer.observe(contentEl);

    // Initial measurement on mount
    measureElements();

    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [backdropRef, containerRef, safeZoom]);

  // Only render for non-trivial tree with children
  const isNonTrivial = Boolean(tree.children && tree.children.length > 0);
  if (!isNonTrivial) {
    return null;
  }

  // Measure backdrop & content geometry with defensive fallbacks
  const backdropEl = backdropRef.current;
  const contentEl = containerRef.current;

  let backdropWidth = observedDimensions.backdropWidth ?? DEFAULT_BACKDROP_WIDTH;
  let backdropHeight = observedDimensions.backdropHeight ?? DEFAULT_BACKDROP_HEIGHT;
  let contentWidth = observedDimensions.contentWidth ?? DEFAULT_CONTENT_WIDTH;
  let contentHeight = observedDimensions.contentHeight ?? DEFAULT_CONTENT_HEIGHT;

  if (observedDimensions.backdropWidth === undefined && backdropEl) {
    const rect = backdropEl.getBoundingClientRect();
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height)
    ) {
      backdropWidth = rect.width;
      backdropHeight = rect.height;
    }
  }

  if (observedDimensions.contentWidth === undefined && contentEl) {
    const rect = contentEl.getBoundingClientRect();
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height)
    ) {
      contentWidth = rect.width / safeZoom;
      contentHeight = rect.height / safeZoom;
    }
  }

  // Calculate visible viewport size in unscaled coordinates
  const visibleContentWidth = backdropWidth / safeZoom;
  const visibleContentHeight = backdropHeight / safeZoom;

  // Scale ratio mapping content to minimap radar
  const scaleRatioX =
    MINIMAP_WIDTH / Math.max(contentWidth, visibleContentWidth, 100);
  const scaleRatioY =
    MINIMAP_HEIGHT / Math.max(contentHeight, visibleContentHeight, 100);
  const scaleRatio = Math.max(0.001, Math.min(scaleRatioX, scaleRatioY));

  // Viewport indicator dimensions clamped within radar boundaries
  const rawRectWidth = Math.round(visibleContentWidth * scaleRatio);
  const rawRectHeight = Math.round(visibleContentHeight * scaleRatio);

  const rectWidth = Math.max(
    MIN_RECT_WIDTH,
    Math.min(MINIMAP_WIDTH, isNaN(rawRectWidth) ? MIN_RECT_WIDTH : rawRectWidth)
  );
  const rectHeight = Math.max(
    MIN_RECT_HEIGHT,
    Math.min(
      MINIMAP_HEIGHT,
      isNaN(rawRectHeight) ? MIN_RECT_HEIGHT : rawRectHeight
    )
  );

  // Viewport indicator coordinates (inverted with pan offset)
  const rawRectX = Math.round(
    (MINIMAP_WIDTH - rectWidth) / 2 - (pan.x || 0) * scaleRatio
  );
  const rawRectY = Math.round(
    (MINIMAP_HEIGHT - rectHeight) / 2 - (pan.y || 0) * scaleRatio
  );

  const rectX = Math.max(
    0,
    Math.min(MINIMAP_WIDTH - rectWidth, isNaN(rawRectX) ? 0 : rawRectX)
  );
  const rectY = Math.max(
    0,
    Math.min(MINIMAP_HEIGHT - rectHeight, isNaN(rawRectY) ? 0 : rawRectY)
  );

  const handleClickRadar = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - svgRect.left;
    const clickY = e.clientY - svgRect.top;

    // Relative offset from center of minimap
    const deltaXFromCenter = clickX - MINIMAP_WIDTH / 2;
    const deltaYFromCenter = clickY - MINIMAP_HEIGHT / 2;

    // Target pan coordinates
    const targetPanX = Math.round(-deltaXFromCenter / scaleRatio);
    const targetPanY = Math.round(-deltaYFromCenter / scaleRatio);

    onPanChange({
      x: isNaN(targetPanX) ? 0 : targetPanX,
      y: isNaN(targetPanY) ? 0 : targetPanY,
    });
  };

  const handlePointerDownContainer = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleIndicatorPointerDown = (
    e: React.PointerEvent<SVGRectElement>
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Safe fallback for environments lacking pointer capture
    }

    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x || 0,
      panY: pan.y || 0,
    };
  };

  const handleIndicatorPointerMove = (
    e: React.PointerEvent<SVGRectElement>
  ) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();

    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;

    const targetPanX = Math.round(
      dragStartRef.current.panX - dx / scaleRatio
    );
    const targetPanY = Math.round(
      dragStartRef.current.panY - dy / scaleRatio
    );

    onPanChange({
      x: isNaN(targetPanX) ? 0 : targetPanX,
      y: isNaN(targetPanY) ? 0 : targetPanY,
    });
  };

  const handleIndicatorPointerUp = (
    e: React.PointerEvent<SVGRectElement>
  ) => {
    if (isDraggingRef.current) {
      e.stopPropagation();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      isDraggingRef.current = false;
    }
  };

  const handleIndicatorClick = (e: React.MouseEvent<SVGRectElement>) => {
    e.stopPropagation();
  };

  const renderRadarSvg = () => (
    <svg
      role="img"
      aria-label="Khung nhìn sơ đồ radar"
      data-testid="minimap-radar-svg"
      width={MINIMAP_WIDTH}
      height={MINIMAP_HEIGHT}
      onClick={handleClickRadar}
      className="w-[160px] h-[120px] bg-stone-100/60 dark:bg-stone-950/60 rounded-lg overflow-hidden cursor-crosshair"
    >
      {/* Subtle center crosshair lines */}
      <line
        x1={MINIMAP_WIDTH / 2}
        y1={0}
        x2={MINIMAP_WIDTH / 2}
        y2={MINIMAP_HEIGHT}
        stroke="currentColor"
        strokeDasharray="2 2"
        className="text-stone-300/50 dark:text-stone-700/50"
      />
      <line
        x1={0}
        y1={MINIMAP_HEIGHT / 2}
        x2={MINIMAP_WIDTH}
        y2={MINIMAP_HEIGHT / 2}
        stroke="currentColor"
        strokeDasharray="2 2"
        className="text-stone-300/50 dark:text-stone-700/50"
      />

      {/* Viewport Indicator Rectangle */}
      <rect
        data-testid="minimap-viewport-rect"
        x={rectX}
        y={rectY}
        width={rectWidth}
        height={rectHeight}
        rx={4}
        onPointerDown={handleIndicatorPointerDown}
        onPointerMove={handleIndicatorPointerMove}
        onPointerUp={handleIndicatorPointerUp}
        onPointerCancel={handleIndicatorPointerUp}
        onLostPointerCapture={handleIndicatorPointerUp}
        onClick={handleIndicatorClick}
        className="fill-amber-500/15 stroke-amber-500/80 dark:stroke-amber-400/80 stroke-1.5 transition-all duration-75 cursor-grab active:cursor-grabbing pointer-events-auto"
      />
    </svg>
  );

  return (
    <>
      {/* Desktop Minimap (Always visible on sm breakpoint and up) */}
      <div
        role="region"
        aria-label="Sơ đồ tổng quan thu nhỏ"
        data-testid="mindmap-minimap"
        onPointerDown={handlePointerDownContainer}
        onClick={(e) => e.stopPropagation()}
        className="hidden sm:block absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl p-2 shadow-sm pointer-events-auto select-none"
      >
        {renderRadarSvg()}
      </div>

      {/* Mobile Minimap Toggle Button (Visible only below sm) */}
      <button
        type="button"
        data-testid="mindmap-minimap-toggle"
        aria-expanded={isMobileOpen}
        aria-controls="mindmap-minimap-panel"
        aria-label={isMobileOpen ? "Thu gọn sơ đồ thu nhỏ" : "Mở sơ đồ thu nhỏ"}
        title={isMobileOpen ? "Thu gọn sơ đồ thu nhỏ" : "Mở sơ đồ thu nhỏ"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setIsMobileOpen((prev) => !prev);
        }}
        className="sm:hidden absolute bottom-4 left-4 z-20 flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl p-2 shadow-sm pointer-events-auto text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
      >
        <Map className="w-5 h-5" />
      </button>

      {/* Mobile Minimap Panel (Conditionally rendered when open) */}
      {isMobileOpen && (
        <div
          id="mindmap-minimap-panel"
          data-testid="mindmap-minimap-panel"
          role="region"
          aria-label="Sơ đồ tổng quan thu nhỏ di động"
          onPointerDown={handlePointerDownContainer}
          onClick={(e) => e.stopPropagation()}
          className="sm:hidden absolute bottom-16 left-4 z-20 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl p-2 shadow-md pointer-events-auto select-none"
        >
          {renderRadarSvg()}
        </div>
      )}
    </>
  );
}
