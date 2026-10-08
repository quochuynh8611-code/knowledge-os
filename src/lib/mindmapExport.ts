import {
  MindMapTreeProjection,
  MindMapTreeNode,
  MindMapLayoutMode,
  MindMapCrossEdge,
  getSemanticEdgeLabel,
} from "./mindmapProjection";

export interface MindMapSvgExportOptions {
  layoutMode?: MindMapLayoutMode;
  collapsedNodeIds?: Set<string>;
  showCrossLinks?: boolean;
  crossEdges?: MindMapCrossEdge[];
}

export interface MindMapPngExportOptions {
  scale?: number;
}

interface SvgLayoutNode {
  node: MindMapTreeNode;
  x: number;
  y: number;
  width: number;
  height: number;
  isCollapsed: boolean;
  collapseCount: number;
  children: SvgLayoutNode[];
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Generates a clean, deterministic filename for MindMap exports.
 */
export function getMindMapExportFilename(
  rootTitle: string,
  layoutMode: MindMapLayoutMode,
  extension: "svg" | "png" = "svg"
): string {
  const normalized = removeVietnameseTones(rootTitle || "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const safeTitle = normalized.length > 0 ? normalized : "Topic";
  const dateStr = new Date().toISOString().slice(0, 10);
  return `MindMap-${safeTitle}-${layoutMode}-${dateStr}.${extension}`;
}

/**
 * Counts total descendants under a node.
 */
function countDescendants(node: MindMapTreeNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

/**
 * Pure function to export a MindMapTreeProjection into a standalone W3C compliant XML SVG.
 */
export function exportMindMapToSvg(
  projection: MindMapTreeProjection,
  options?: MindMapSvgExportOptions
): string {
  const layoutMode = options?.layoutMode ?? projection.layoutMode;
  const isHorizontal = layoutMode === "tree_horizontal";
  const collapsedSet = options?.collapsedNodeIds ?? new Set<string>();
  const showCrossLinks = Boolean(options?.showCrossLinks);
  const activeCrossEdges = options?.crossEdges ?? projection.crossEdges ?? [];

  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 64;
  const MARGIN_X = 40;
  const MARGIN_Y = 60;
  const GAP_X = isHorizontal ? 60 : 24;
  const GAP_Y = isHorizontal ? 20 : 60;

  // 1. Build layout tree
  function buildLayoutTree(node: MindMapTreeNode): SvgLayoutNode {
    const isCollapsed = collapsedSet.has(node.id);
    const collapseCount = isCollapsed ? countDescendants(node) : 0;
    const children = isCollapsed
      ? []
      : node.children.map((child) => buildLayoutTree(child));

    return {
      node,
      x: 0,
      y: 0,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      isCollapsed,
      collapseCount,
      children,
    };
  }

  const rootLayout = buildLayoutTree(projection.tree);

  // 2. Position nodes recursively
  const nodeMap = new Map<string, SvgLayoutNode>();

  if (isHorizontal) {
    let currentY = MARGIN_Y;

    function layoutHorizontal(item: SvgLayoutNode, depth: number): number {
      item.x = MARGIN_X + depth * (NODE_WIDTH + GAP_X);
      nodeMap.set(item.node.id, item);

      if (item.children.length === 0) {
        item.y = currentY;
        currentY += NODE_HEIGHT + GAP_Y;
        return item.y;
      }

      const childYs: number[] = [];
      for (const child of item.children) {
        childYs.push(layoutHorizontal(child, depth + 1));
      }

      item.y = (childYs[0] + childYs[childYs.length - 1]) / 2;
      return item.y;
    }

    layoutHorizontal(rootLayout, 0);
  } else {
    // Vertical Tree layout
    let currentX = MARGIN_X;

    function layoutVertical(item: SvgLayoutNode, depth: number): number {
      item.y = MARGIN_Y + depth * (NODE_HEIGHT + GAP_Y);
      nodeMap.set(item.node.id, item);

      if (item.children.length === 0) {
        item.x = currentX;
        currentX += NODE_WIDTH + GAP_X;
        return item.x;
      }

      const childXs: number[] = [];
      for (const child of item.children) {
        childXs.push(layoutVertical(child, depth + 1));
      }

      item.x = (childXs[0] + childXs[childXs.length - 1]) / 2;
      return item.x;
    }

    layoutVertical(rootLayout, 0);
  }

  // Calculate total canvas bounds
  let maxX = 0;
  let maxY = 0;
  for (const item of nodeMap.values()) {
    maxX = Math.max(maxX, item.x + item.width);
    maxY = Math.max(maxY, item.y + item.height);
  }

  const canvasWidth = Math.max(800, maxX + MARGIN_X);
  const canvasHeight = Math.max(500, maxY + MARGIN_Y + 40);

  // 3. Render tree connectors
  const connectorPaths: string[] = [];

  function renderConnectors(item: SvgLayoutNode) {
    for (const child of item.children) {
      if (isHorizontal) {
        const x1 = item.x + item.width;
        const y1 = item.y + item.height / 2;
        const x2 = child.x;
        const y2 = child.y + child.height / 2;
        const midX = (x1 + x2) / 2;
        connectorPaths.push(
          `<path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" fill="none" stroke="#d6d3d1" stroke-width="2" />`
        );
      } else {
        const x1 = item.x + item.width / 2;
        const y1 = item.y + item.height;
        const x2 = child.x + child.width / 2;
        const y2 = child.y;
        const midY = (y1 + y2) / 2;
        connectorPaths.push(
          `<path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" fill="none" stroke="#d6d3d1" stroke-width="2" />`
        );
      }
      renderConnectors(child);
    }
  }

  renderConnectors(rootLayout);

  // 4. Render cross-links
  const crossLinkElements: string[] = [];
  if (showCrossLinks && activeCrossEdges.length > 0) {
    for (const edge of activeCrossEdges) {
      if (collapsedSet.has(edge.sourceNodeId) || collapsedSet.has(edge.targetNodeId)) {
        continue;
      }
      const source = nodeMap.get(edge.sourceNodeId);
      const target = nodeMap.get(edge.targetNodeId);
      if (!source || !target) continue;

      const x1 = source.x + source.width / 2;
      const y1 = source.y + source.height / 2;
      const x2 = target.x + target.width / 2;
      const y2 = target.y + target.height / 2;

      const dx = (x2 - x1) * 0.3;
      const dy = (y2 - y1) * 0.3;
      const cx1 = x1 + dx;
      const cy1 = y1;
      const cx2 = x2 - dx;
      const cy2 = y2;

      const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
      const midX = (x1 + 3 * cx1 + 3 * cx2 + x2) / 8;
      const midY = (y1 + 3 * cy1 + 3 * cy2 + y2) / 8;

      const isMultiParent = edge.isMultiParent === true;
      const groupClass = isMultiParent
        ? "crosslink-edge multiparent-edge"
        : "crosslink-edge";
      const strokeColor = isMultiParent ? "#6366f1" : "#f59e0b";
      const markerId = isMultiParent ? "multiparent-arrow" : "crosslink-arrow";
      const rectFill = isMultiParent ? "#eef2ff" : "#fffbeb";
      const rectStroke = isMultiParent ? "#6366f1" : "#f59e0b";
      const textFill = isMultiParent ? "#3730a3" : "#92400e";

      crossLinkElements.push(`
        <g class="${groupClass}">
          <path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#${markerId})" opacity="0.85" />
          <g transform="translate(${midX}, ${midY})">
            <rect x="-35" y="-10" width="70" height="20" rx="10" fill="${rectFill}" stroke="${rectStroke}" stroke-width="1" />
            <text text-anchor="middle" dominant-baseline="central" fill="${textFill}" font-size="9" font-weight="600">${escapeXml(
              edge.label || getSemanticEdgeLabel(edge.type)
            )}</text>
          </g>
        </g>
      `);
    }
  }

  // 5. Render Node Cards
  const nodeElements: string[] = [];

  for (const item of nodeMap.values()) {
    const { node, x, y, width, height, isCollapsed, collapseCount } = item;
    const isRoot = node.hopDistance === 0;
    const bgFill = isRoot ? "#fef3c7" : "#ffffff";
    const strokeColor = isRoot ? "#d97706" : "#e7e5e4";
    const strokeWidth = isRoot ? "2" : "1";
    const titleColor = isRoot ? "#78350f" : "#1c1917";

    const relationLabel = node.edgeTypeToParent
      ? getSemanticEdgeLabel(node.edgeTypeToParent)
      : null;

    const cycleAnnotation = projection.cycleAnnotations.find(
      (ca) => ca.nodeId === node.id
    );

    nodeElements.push(`
      <g class="mindmap-node" transform="translate(${x}, ${y})">
        <!-- Node Box -->
        <rect width="${width}" height="${height}" rx="12" fill="${bgFill}" stroke="${strokeColor}" stroke-width="${strokeWidth}" filter="url(#node-shadow)" />

        <!-- Header Type Badge -->
        <text x="12" y="18" fill="#78716c" font-size="9" font-weight="700" letter-spacing="0.5" text-transform="uppercase">${escapeXml(
          node.type
        )}</text>

        <!-- Node Title -->
        <text x="12" y="36" fill="${titleColor}" font-size="12" font-weight="700" font-family="system-ui, -apple-system, sans-serif">
          ${escapeXml(node.title.length > 24 ? node.title.slice(0, 23) + "…" : node.title)}
        </text>

        <!-- Footer Relations & Badges -->
        ${
          relationLabel
            ? `<g transform="translate(12, 45)">
                <rect width="${relationLabel.length * 7 + 10}" height="14" rx="4" fill="#f5f5f4" stroke="#d6d3d1" stroke-width="1" />
                <text x="5" y="10" fill="#57534e" font-size="8" font-weight="600">${escapeXml(
                  relationLabel
                )}</text>
              </g>`
            : ""
        }

        <!-- Cycle Badge -->
        ${
          cycleAnnotation
            ? `<g transform="translate(${width - 80}, 45)">
                <rect width="70" height="14" rx="4" fill="#fffbeb" stroke="#f59e0b" stroke-width="1" />
                <text x="5" y="10" fill="#92400e" font-size="8" font-weight="600">↻ ${escapeXml(
                  cycleAnnotation.targetAncestorTitle.slice(0, 8)
                )}</text>
              </g>`
            : ""
        }

        <!-- Collapse Indicator -->
        ${
          isCollapsed && collapseCount > 0
            ? `<g transform="translate(${width - 34}, 8)">
                <rect width="26" height="16" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="1" />
                <text x="13" y="11" text-anchor="middle" fill="#b45309" font-size="9" font-weight="700">+${collapseCount}</text>
              </g>`
            : ""
        }
      </g>
    `);
  }

  // 6. Assemble complete SVG string
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">
  <defs>
    <style>
      text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    </style>
    <filter id="node-shadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.06" />
    </filter>
    <marker id="crosslink-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#f59e0b" />
    </marker>
    <marker id="multiparent-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9 z" fill="#6366f1" />
    </marker>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="#fafaf9" />

  <!-- Watermark Header -->
  <g transform="translate(${MARGIN_X}, 30)">
    <text fill="#a8a29e" font-size="11" font-weight="600">Knowledge OS • Sơ Đồ Tư Duy: ${escapeXml(
      projection.rootTitle
    )} (${layoutMode})</text>
  </g>

  <!-- Tree Connectors -->
  <g class="tree-connectors">
    ${connectorPaths.join("\n    ")}
  </g>

  <!-- Cross Links -->
  <g class="cross-links">
    ${crossLinkElements.join("\n    ")}
  </g>

  <!-- Tree Nodes -->
  <g class="tree-nodes">
    ${nodeElements.join("\n    ")}
  </g>

  <!-- Footer Watermark -->
  <g transform="translate(${MARGIN_X}, ${canvasHeight - 15})">
    <text fill="#d6d3d1" font-size="9">Xuất bản: ${escapeXml(
      projection.generatedAt
    )} • Pure Derived Read-Model</text>
  </g>
</svg>`;
}

/**
 * Asynchronously rasterizes a standalone XML SVG string into a high-DPI PNG Blob.
 * Uses browser-native HTMLImageElement and HTMLCanvasElement without external libraries.
 * Cleans up temporary object URLs in all execution paths.
 */
export function rasterizeSvgToPng(
  svgString: string,
  options?: MindMapPngExportOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let url = "";
    try {
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        try {
          const scale = options?.scale ?? 2;
          const canvas = document.createElement("canvas");
          const naturalW = img.naturalWidth || img.width || 800;
          const naturalH = img.naturalHeight || img.height || 500;

          canvas.width = naturalW * scale;
          canvas.height = naturalH * scale;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error("Canvas 2D context is unavailable"));
            return;
          }

          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create PNG blob from canvas"));
            }
          }, "image/png");
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error("Image decode failed"));
      };

      img.src = url;
    } catch (err) {
      if (url) URL.revokeObjectURL(url);
      reject(err);
    }
  });
}
