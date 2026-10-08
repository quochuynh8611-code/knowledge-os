import React from "react";
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
  // Only render for non-trivial tree with children
  const isNonTrivial = Boolean(tree.children && tree.children.length > 0);
  if (!isNonTrivial) {
    return null;
  }

  const safeZoom = Math.max(0.1, zoom || 1.0);

  // Measure backdrop & content geometry with defensive fallbacks
  const backdropEl = backdropRef.current;
  const contentEl = containerRef.current;

  let backdropWidth = DEFAULT_BACKDROP_WIDTH;
  let backdropHeight = DEFAULT_BACKDROP_HEIGHT;
  let contentWidth = DEFAULT_CONTENT_WIDTH;
  let contentHeight = DEFAULT_CONTENT_HEIGHT;

  if (backdropEl) {
    const rect = backdropEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      backdropWidth = rect.width;
      backdropHeight = rect.height;
    }
  }

  if (contentEl) {
    const rect = contentEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div
      role="region"
      aria-label="Sơ đồ tổng quan thu nhỏ"
      data-testid="mindmap-minimap"
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
      className="hidden sm:block absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl p-2 shadow-sm pointer-events-auto select-none"
    >
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
          className="fill-amber-500/15 stroke-amber-500/80 dark:stroke-amber-400/80 stroke-1.5 transition-all duration-75"
        />
      </svg>
    </div>
  );
}
