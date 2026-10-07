import React, { useState, useEffect, useCallback } from "react";
import { MindMapCrossEdge } from "../../lib/mindmapProjection";

interface MindMapCrossLinksLayerProps {
  crossEdges: MindMapCrossEdge[];
  collapsedNodeIds?: Set<string>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface ComputedPath {
  id: string;
  d: string;
  strength: number;
}

export function MindMapCrossLinksLayer({
  crossEdges,
  collapsedNodeIds,
  containerRef,
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

      newPaths.push({
        id: edge.id,
        d,
        strength: edge.strength,
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
      </defs>
      {paths.map((p) => (
        <g key={p.id}>
          <path
            d={p.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={p.strength >= 4 ? 2 : 1.5}
            strokeDasharray="4 4"
            markerEnd="url(#crosslink-arrow)"
            className="text-amber-500/70 dark:text-amber-400/70 pointer-events-none"
          />
        </g>
      ))}
    </svg>
  );
}
