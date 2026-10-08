import React, { useState, useEffect, useCallback } from "react";
import { MindMapCrossEdge } from "../../lib/mindmapProjection";

interface MindMapCrossLinksLayerProps {
  crossEdges: MindMapCrossEdge[];
  collapsedNodeIds?: Set<string>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  hoveredNodeId?: string | null;
}

interface ComputedPath {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  d: string;
  strength: number;
  label?: string;
  midX: number;
  midY: number;
  isMultiParent: boolean;
}

export function MindMapCrossLinksLayer({
  crossEdges,
  collapsedNodeIds,
  containerRef,
  hoveredNodeId,
}: MindMapCrossLinksLayerProps) {
  const [paths, setPaths] = useState<ComputedPath[]>([]);

  const updatePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setPaths([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const newPaths: ComputedPath[] = [];

    for (const edge of crossEdges) {
      // If either endpoint is collapsed, skip
      if (
        collapsedNodeIds?.has(edge.sourceNodeId) ||
        collapsedNodeIds?.has(edge.targetNodeId)
      ) {
        continue;
      }

      const sourceEl = container.querySelector(
        `[data-node-id="${edge.sourceNodeId}"]`
      );
      const targetEl = container.querySelector(
        `[data-node-id="${edge.targetNodeId}"]`
      );

      if (!sourceEl || !targetEl) {
        continue;
      }

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      // Relative coordinates
      const x1 = sourceRect.left - containerRect.left + sourceRect.width / 2;
      const y1 = sourceRect.top - containerRect.top + sourceRect.height / 2;
      const x2 = targetRect.left - containerRect.left + targetRect.width / 2;
      const y2 = targetRect.top - containerRect.top + targetRect.height / 2;

      // Cubic Bezier control points for organic arc
      const dx = (x2 - x1) * 0.4;
      const dy = (y2 - y1) * 0.4;
      const cx1 = x1 + dx;
      const cy1 = y1;
      const cx2 = x2 - dx;
      const cy2 = y2;

      const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

      const midX = (x1 + 3 * cx1 + 3 * cx2 + x2) / 8;
      const midY = (y1 + 3 * cy1 + 3 * cy2 + y2) / 8;

      newPaths.push({
        id: edge.id,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        d,
        strength: edge.strength,
        label: edge.label,
        midX,
        midY,
        isMultiParent: edge.isMultiParent === true,
      });
    }

    setPaths(newPaths);
  }, [crossEdges, collapsedNodeIds, containerRef]);

  useEffect(() => {
    updatePaths();

    // Recompute on window resize or layout shift
    window.addEventListener("resize", updatePaths);
    return () => {
      window.removeEventListener("resize", updatePaths);
    };
  }, [updatePaths]);

  return (
    <svg
      data-testid="mindmap-crosslinks-layer"
      className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-10"
      style={{ pointerEvents: "none" }}
    >
      <defs>
        <marker
          id="crosslink-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 1 L 8 5 L 0 9 z"
            fill="currentColor"
            className="text-amber-500/80 dark:text-amber-400/80"
          />
        </marker>
        <marker
          id="multiparent-arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 1 L 8 5 L 0 9 z"
            fill="currentColor"
            className="text-indigo-500/80 dark:text-indigo-400/80"
          />
        </marker>
      </defs>
      {paths.map((p) => {
        const isConnected =
          Boolean(hoveredNodeId) &&
          (p.sourceNodeId === hoveredNodeId || p.targetNodeId === hoveredNodeId);
        const isDimmed = Boolean(hoveredNodeId) && !isConnected;

        const colorClasses = p.isMultiParent
          ? isConnected
            ? "text-indigo-600 dark:text-indigo-300 opacity-100"
            : isDimmed
              ? "text-indigo-500/30 dark:text-indigo-400/30 opacity-20"
              : "text-indigo-500/70 dark:text-indigo-400/70 opacity-70"
          : isConnected
            ? "text-amber-600 dark:text-amber-300 opacity-100"
            : isDimmed
              ? "text-amber-500/30 dark:text-amber-400/30 opacity-20"
              : "text-amber-500/70 dark:text-amber-400/70 opacity-70";

        return (
          <g key={p.id}>
            <path
              data-edge-id={p.id}
              data-multi-parent={p.isMultiParent ? "true" : "false"}
              data-highlighted={isConnected ? "true" : undefined}
              data-dimmed={isDimmed ? "true" : undefined}
              d={p.d}
              fill="none"
              stroke="currentColor"
              strokeWidth={
                isConnected
                  ? p.strength >= 4
                    ? 3
                    : 2.5
                  : p.strength >= 4
                    ? 2
                    : 1.5
              }
              strokeDasharray={isConnected ? "6 3" : "4 4"}
              markerEnd={
                p.isMultiParent
                  ? "url(#multiparent-arrow)"
                  : "url(#crosslink-arrow)"
              }
              className={`transition-all duration-150 pointer-events-none ${colorClasses}`}
            />
            {isConnected && p.label && (
              <g
                data-edge-label-id={p.id}
                transform={`translate(${p.midX}, ${p.midY})`}
                className="pointer-events-none select-none transition-opacity duration-150"
              >
                <rect
                  x={-(p.label.length * 5 + 6)}
                  y={-9}
                  width={(p.label.length * 5 + 6) * 2}
                  height={18}
                  rx={9}
                  className={
                    p.isMultiParent
                      ? "fill-indigo-50/95 dark:fill-indigo-950/95 stroke-indigo-400 dark:stroke-indigo-600 stroke-1"
                      : "fill-amber-50/95 dark:fill-amber-950/95 stroke-amber-400 dark:stroke-amber-600 stroke-1"
                  }
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={
                    p.isMultiParent
                      ? "fill-indigo-900 dark:fill-indigo-200 text-[10px] font-semibold"
                      : "fill-amber-900 dark:fill-amber-200 text-[10px] font-semibold"
                  }
                >
                  {p.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
