import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import {
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Sparkles,
  Compass,
  FileText,
  Library,
  BookOpen,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Topic, Note, Resource } from '../../types';

interface GraphNode {
  id: string;
  title: string;
  type: 'topic' | 'note' | 'resource';
  domain: 'phat-hoc' | 'huyen-hoc' | 'other';
  category?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  progress?: number;
  originalData: Topic | Note | Resource;
}

interface GraphLink {
  source: string;
  target: string;
  linkType: string;
  strength: number;
}

export function KnowledgeGraph() {
  const { topics, notes, resources, openTopicDetail, categories, tags } = useData();

  // Filters
  const [domainFilter, setDomainFilter] = useState<'all' | 'phat-hoc' | 'huyen-hoc'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<{ topic: boolean; note: boolean; resource: boolean }>({
    topic: true,
    note: true,
    resource: true,
  });

  // Selected node inspection
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Canvas / SVG Transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Generate Nodes & Links
  const { initialNodes, initialLinks } = useMemo(() => {
    const nodeList: GraphNode[] = [];
    const linkList: GraphLink[] = [];

    // Filter topics
    const validTopics = topics.filter((t) => {
      if (domainFilter !== 'all' && t.type !== domainFilter) return false;
      if (selectedTag !== 'all' && !t.tags.includes(selectedTag)) return false;
      return true;
    });

    const topicIds = new Set(validTopics.map((t) => t.id));

    // Calculate circular cluster layout for initial node positions
    validTopics.forEach((topic, idx) => {
      const angle = (idx / (validTopics.length || 1)) * 2 * Math.PI;
      const radiusDist = topic.type === 'phat-hoc' ? 240 : 270;
      const clusterOffsetX = topic.type === 'phat-hoc' ? -120 : 120;

      nodeList.push({
        id: topic.id,
        title: topic.title,
        type: 'topic',
        domain: topic.type,
        category: topic.categoryName,
        x: 450 + Math.cos(angle) * radiusDist + clusterOffsetX,
        y: 350 + Math.sin(angle) * radiusDist,
        vx: 0,
        vy: 0,
        radius: 24,
        progress: topic.studyProgress.progress,
        originalData: topic,
      });

      // Links between topics
      topic.links.forEach((link) => {
        if (topicIds.has(link.targetId)) {
          linkList.push({
            source: topic.id,
            target: link.targetId,
            linkType: link.linkType,
            strength: link.strength,
          });
        }
      });
    });

    // Notes attached to visible topics
    if (nodeTypeFilter.note) {
      notes.forEach((note, idx) => {
        if (topicIds.has(note.topicId)) {
          const parentTopic = nodeList.find((n) => n.id === note.topicId);
          const angle = idx * 1.3;
          const dist = 60 + (idx % 3) * 20;
          nodeList.push({
            id: note.id,
            title: note.title,
            type: 'note',
            domain: parentTopic?.domain || 'other',
            category: `Ghi chú (${note.type})`,
            x: (parentTopic?.x || 450) + Math.cos(angle) * dist,
            y: (parentTopic?.y || 350) + Math.sin(angle) * dist,
            vx: 0,
            vy: 0,
            radius: 14,
            originalData: note,
          });

          linkList.push({
            source: note.topicId,
            target: note.id,
            linkType: 'has_note',
            strength: 2,
          });
        }
      });
    }

    // Resources attached to visible topics
    if (nodeTypeFilter.resource) {
      resources.forEach((res, idx) => {
        if (topicIds.has(res.topicId)) {
          const parentTopic = nodeList.find((n) => n.id === res.topicId);
          const angle = idx * 1.7 + 0.8;
          const dist = 65 + (idx % 3) * 25;
          nodeList.push({
            id: res.id,
            title: res.title,
            type: 'resource',
            domain: parentTopic?.domain || 'other',
            category: `Tài liệu (${res.type.toUpperCase()})`,
            x: (parentTopic?.x || 450) + Math.cos(angle) * dist,
            y: (parentTopic?.y || 350) + Math.sin(angle) * dist,
            vx: 0,
            vy: 0,
            radius: 14,
            originalData: res,
          });

          linkList.push({
            source: res.topicId,
            target: res.id,
            linkType: 'has_resource',
            strength: 2,
          });
        }
      });
    }

    return { initialNodes: nodeList, initialLinks: linkList };
  }, [topics, notes, resources, domainFilter, selectedTag, nodeTypeFilter]);

  const [nodes, setNodes] = useState<GraphNode[]>(initialNodes);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  // Node Dragging Handling
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (draggingNodeId) {
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.id === draggingNodeId) {
            return {
              ...node,
              x: (e.clientX - pan.x) / zoom,
              y: (e.clientY - pan.y) / zoom,
            };
          }
          return node;
        })
      );
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z + 0.2));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.2));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'note') return '#E11D48'; // Rose
    if (node.type === 'resource') return '#8B5CF6'; // Purple
    if (node.domain === 'phat-hoc') return '#D97706'; // Amber / Gold
    if (node.domain === 'huyen-hoc') return '#4F46E5'; // Indigo
    return '#64748B';
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header (Matching Page 6 Wireframe) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
            <Share2 className="w-3.5 h-3.5" />
            <span>Đồ Thị Tri Thức Đa Chiều</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-serif-title">
            Knowledge Graph (Biểu đồ tri thức)
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Trực quan hóa mạng lưới liên kết giữa Vi Diệu Pháp, Thiền định, Kỳ Môn, Thái Ất, Kinh Dịch &amp; Ghi chú
          </p>
        </div>

        {/* Legend pills (Matching Page 6: Legend: ● Topic ● Note ● Resource) */}
        <div className="flex items-center gap-3 bg-white p-2 px-3.5 border border-stone-200 rounded-xl text-xs font-medium shadow-2xs">
          <span className="text-stone-400 text-[11px]">Chú thích:</span>
          <span className="flex items-center gap-1.5 text-stone-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> Phật Học
          </span>
          <span className="flex items-center gap-1.5 text-stone-700">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Huyền Học
          </span>
          <span className="flex items-center gap-1.5 text-stone-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Ghi Chú
          </span>
          <span className="flex items-center gap-1.5 text-stone-700">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Tài Liệu
          </span>
        </div>
      </div>

      {/* Filter Toolbar (Matching Page 6: Filter: [Phật học ▼] [Huyền học ▼] [Tất cả tags ▼]) */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Bộ Lọc:
          </span>

          {/* Domain selector */}
          <div className="flex bg-stone-100 p-0.5 rounded-xl text-xs font-medium">
            <button
              onClick={() => setDomainFilter('all')}
              className={`px-3 py-1 rounded-lg transition ${
                domainFilter === 'all' ? 'bg-white text-stone-900 font-bold shadow-2xs' : 'text-stone-600'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setDomainFilter('phat-hoc')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                domainFilter === 'phat-hoc'
                  ? 'bg-amber-700 text-white font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-amber-900'
              }`}
            >
              <Sparkles className="w-3 h-3" /> Phật Học
            </button>
            <button
              onClick={() => setDomainFilter('huyen-hoc')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                domainFilter === 'huyen-hoc'
                  ? 'bg-indigo-700 text-white font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-indigo-900'
              }`}
            >
              <Compass className="w-3 h-3" /> Huyền Học
            </button>
          </div>

          {/* Tag selector */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-3 py-1 bg-stone-100 border border-stone-200 rounded-xl text-xs font-medium text-stone-800"
          >
            <option value="all">Tất cả thẻ phân loại (Tags)</option>
            {tags.map((t) => (
              <option key={t.id} value={t.name}>
                #{t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Node Type Toggles */}
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1 text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={nodeTypeFilter.note}
              onChange={(e) => setNodeTypeFilter({ ...nodeTypeFilter, note: e.target.checked })}
              className="accent-rose-600 rounded"
            />
            <span>Ghi chú ({notes.length})</span>
          </label>
          <label className="flex items-center gap-1 text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={nodeTypeFilter.resource}
              onChange={(e) => setNodeTypeFilter({ ...nodeTypeFilter, resource: e.target.checked })}
              className="accent-purple-600 rounded"
            />
            <span>Tài liệu ({resources.length})</span>
          </label>
        </div>
      </div>

      {/* Main Interactive Graph Visualizer Stage (Page 6 & Page 15-16 wireframe) */}
      <div className="relative bg-stone-900 rounded-3xl border border-stone-800 overflow-hidden shadow-2xl h-[620px] select-none">
        {/* Instruction overlay */}
        <div className="absolute top-4 left-4 z-10 bg-stone-800/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-stone-300 border border-stone-700/80 pointer-events-none flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span>Kéo thả node • Cuộn/Zoom để mở rộng • Nhấp node để xem thông tin</span>
        </div>

        {/* Zoom & Canvas Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-stone-800/80 backdrop-blur-md p-1 rounded-xl border border-stone-700">
          <button
            onClick={handleZoomIn}
            className="p-2 text-stone-300 hover:text-white hover:bg-stone-700 rounded-lg transition"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-stone-300 hover:text-white hover:bg-stone-700 rounded-lg transition"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 text-stone-300 hover:text-white hover:bg-stone-700 rounded-lg transition"
            title="Căn giữa màn hình"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* SVG Interactive Canvas */}
        <svg
          ref={svgRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edge Connecting Lines */}
            {initialLinks.map((link, idx) => {
              const sourceNode = nodes.find((n) => n.id === link.source);
              const targetNode = nodes.find((n) => n.id === link.target);
              if (!sourceNode || !targetNode) return null;

              const isHighlighted =
                selectedNode && (selectedNode.id === link.source || selectedNode.id === link.target);

              // Curved bezier connection
              const midX = (sourceNode.x + targetNode.x) / 2;
              const midY = (sourceNode.y + targetNode.y) / 2;

              return (
                <g key={`edge-${idx}`}>
                  <path
                    d={`M ${sourceNode.x} ${sourceNode.y} Q ${midX} ${midY - 10} ${targetNode.x} ${targetNode.y}`}
                    stroke={
                      isHighlighted
                        ? '#F59E0B'
                        : link.linkType === 'has_note' || link.linkType === 'has_resource'
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.28)'
                    }
                    strokeWidth={isHighlighted ? 2.5 : link.strength >= 4 ? 2 : 1}
                    strokeDasharray={link.linkType === 'contradicts' ? '4 4' : undefined}
                    fill="none"
                  />
                  {/* Link type tag on hover or highlight */}
                  {isHighlighted && link.linkType !== 'has_note' && link.linkType !== 'has_resource' && (
                    <text
                      x={midX}
                      y={midY - 6}
                      fill="#FCD34D"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none"
                    >
                      {link.linkType}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const nodeColor = getNodeColor(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (node.type === 'topic') {
                      openTopicDetail(node.id);
                    } else if ('topicId' in node.originalData) {
                      openTopicDetail((node.originalData as any).topicId);
                    }
                  }}
                  className="cursor-pointer group"
                >
                  {/* Outer Glow Halo on Selection */}
                  {isSelected && (
                    <circle
                      r={node.radius + 8}
                      fill="none"
                      stroke={nodeColor}
                      strokeWidth={2}
                      opacity={0.8}
                      className="animate-ping"
                    />
                  )}

                  {/* Progress Ring for Topics */}
                  {node.type === 'topic' && node.progress !== undefined && (
                    <circle
                      r={node.radius + 3}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.15)"
                      strokeWidth={2}
                    />
                  )}

                  {/* Main Circle */}
                  <circle
                    r={node.radius}
                    fill={isSelected ? '#FFFFFF' : nodeColor}
                    stroke={isSelected ? nodeColor : '#1E293B'}
                    strokeWidth={2.5}
                    className="transition-transform group-hover:scale-110"
                  />

                  {/* Inner Icon or Letter */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isSelected ? '#0F172A' : '#FFFFFF'}
                    fontSize={node.type === 'topic' ? '11' : '8'}
                    fontWeight="bold"
                    className="select-none pointer-events-none"
                  >
                    {node.type === 'topic'
                      ? node.domain === 'phat-hoc' ? '佛' : '易'
                      : node.type === 'note' ? '📝' : '📖'}
                  </text>

                  {/* Text Label Below Node */}
                  <text
                    y={node.radius + 14}
                    textAnchor="middle"
                    fill={isSelected ? '#FCD34D' : '#E2E8F0'}
                    fontSize="11"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    className="select-none pointer-events-none"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                  >
                    {node.title.length > 22 ? `${node.title.slice(0, 20)}...` : node.title}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected Node Details Side Drawer */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 z-20 w-80 bg-stone-900/95 border border-stone-700 text-stone-100 p-4 rounded-2xl shadow-2xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ backgroundColor: getNodeColor(selectedNode), color: '#FFF' }}
              >
                {selectedNode.type.toUpperCase()} • {selectedNode.category}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-stone-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="font-bold text-sm text-stone-100 leading-tight">{selectedNode.title}</h4>
              <p className="text-xs text-stone-400 mt-1 line-clamp-3">
                {selectedNode.type === 'topic'
                  ? (selectedNode.originalData as Topic).description
                  : selectedNode.type === 'note'
                  ? (selectedNode.originalData as Note).content
                  : (selectedNode.originalData as Resource).notes || 'Tài liệu tham khảo'}
              </p>
            </div>

            {selectedNode.type === 'topic' && (
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-400">
                  Tiến độ: <strong className="text-amber-400">{selectedNode.progress}%</strong>
                </span>
                <button
                  onClick={() => openTopicDetail(selectedNode.id)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  Mở chi tiết <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {selectedNode.type !== 'topic' && 'topicId' in selectedNode.originalData && (
              <button
                onClick={() => openTopicDetail((selectedNode.originalData as any).topicId)}
                className="w-full py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                Mở chủ đề chính <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
