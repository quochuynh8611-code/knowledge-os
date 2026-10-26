import React, { useState, useMemo } from 'react';
import {
  Network,
  GitBranch,
  Link2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Share2,
  Compass,
  Layers,
  Zap,
} from 'lucide-react';
import type { Topic, Note, Resource, LinkType } from '../../types';
import {
  analyzeKnowledgeGraphIntelligence,
  SemanticBridgeRecommendation,
} from '../../lib/graphAnalyticsEngine';

export interface GraphInsightsPanelProps {
  topics: Topic[];
  notes?: Note[];
  resources?: Resource[];
  onConnectBridge?: (link: {
    sourceId: string;
    targetId: string;
    linkType: LinkType;
    strength: number;
    notes?: string;
  }) => void;
  onSelectTopic?: (topicId: string) => void;
}

export function GraphInsightsPanel({
  topics,
  notes = [],
  resources = [],
  onConnectBridge,
  onSelectTopic,
}: GraphInsightsPanelProps) {
  const [connectedBridgeIds, setConnectedBridgeIds] = useState<Set<string>>(new Set());
  const [customLinkTypes, setCustomLinkTypes] = useState<Record<string, LinkType>>({});

  // Compute master intelligence report
  const report = useMemo(() => {
    return analyzeKnowledgeGraphIntelligence({ topics, notes, resources });
  }, [topics, notes, resources]);

  // Active bridge recommendations (excluding connected pairs)
  const activeBridges = useMemo(() => {
    return report.bridgeRecommendations.filter((b) => !connectedBridgeIds.has(b.id));
  }, [report.bridgeRecommendations, connectedBridgeIds]);

  const handleConnectBridge = (bridge: SemanticBridgeRecommendation) => {
    const chosenType = customLinkTypes[bridge.id] || bridge.suggestedLinkType;
    onConnectBridge?.({
      sourceId: bridge.sourceTopicId,
      targetId: bridge.targetTopicId,
      linkType: chosenType,
      strength: bridge.suggestedStrength,
      notes: bridge.reason,
    });
    setConnectedBridgeIds((prev) => new Set(prev).add(bridge.id));
  };

  const handleTypeChange = (bridgeId: string, type: LinkType) => {
    setCustomLinkTypes((prev) => ({ ...prev, [bridgeId]: type }));
  };

  return (
    <div
      data-testid="graph-insights-panel"
      className="mt-6 bg-stone-900/95 dark:bg-stone-950/95 border border-stone-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md text-stone-100 space-y-6"
    >
      {/* Topology Health Header Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              Graph Intelligence & Semantic Analytics
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Phase 10 (ADR-114)
              </span>
            </h3>
            <p className="text-xs text-stone-400">
              PageRank Centrality • Orphan Detector • Local Vector Semantic Bridges
            </p>
          </div>
        </div>

        {/* Global Topology Metrics Bar */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700/60 flex items-center gap-2">
            <span className="text-stone-400">Mật độ mạng:</span>
            <strong className="text-amber-400 font-mono">
              {(report.topology.networkDensity * 100).toFixed(1)}%
            </strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700/60 flex items-center gap-2">
            <span className="text-stone-400">Phân cụm:</span>
            <strong className="text-emerald-400 font-mono">{report.topology.clusterCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700/60 flex items-center gap-2">
            <span className="text-stone-400">Chủ đề cô lập:</span>
            <strong
              className={`font-mono ${
                report.topology.orphanTopics.length > 0 ? 'text-rose-400' : 'text-stone-300'
              }`}
            >
              {report.topology.orphanTopics.length}
            </strong>
          </div>
        </div>
      </div>

      {/* 3 Core Intelligence Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: PageRank Hubs */}
        <div
          data-testid="graph-hubs-section"
          className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-stone-200">Trụ cột Tri thức (PageRank Hubs)</h4>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                Top {report.topHubs.length}
              </span>
            </div>
            <p className="text-xs text-stone-400 mb-3">
              Các chủ đề có sức ảnh hưởng và bậc kết nối trọng số cao nhất toàn hệ thống.
            </p>

            {report.topHubs.length === 0 ? (
              <div className="text-xs text-stone-500 py-6 text-center italic">
                Chưa có đủ liên kết để tính toán PageRank Hubs.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {report.topHubs.map((hub, idx) => (
                  <div
                    key={hub.nodeId}
                    data-testid={`hub-rank-item-${hub.nodeId}`}
                    onClick={() => onSelectTopic?.(hub.nodeId)}
                    className="p-3 bg-stone-800/50 hover:bg-stone-800/90 border border-stone-700/50 rounded-xl transition cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-200 group-hover:text-amber-300 truncate transition">
                          {hub.title}
                        </div>
                        <div className="text-[10px] text-stone-400 flex items-center gap-2 mt-0.5">
                          <span>Bậc: {hub.weightedDegree}</span>
                          <span>•</span>
                          <span>In: {hub.inDegree}</span>
                          <span>•</span>
                          <span>Out: {hub.outDegree}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-amber-400">
                        {hub.pageRankScore.toFixed(1)}
                      </div>
                      <div className="text-[9px] text-stone-400">PageRank</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Orphan Detector */}
        <div
          data-testid="graph-orphans-section"
          className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <h4 className="text-sm font-bold text-stone-200">
                  Phát hiện Chủ đề Cô lập (Orphans)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {report.topology.orphanTopics.length} chủ đề
              </span>
            </div>
            <p className="text-xs text-stone-400 mb-3">
              Chủ đề chưa có liên kết 2 chiều với mạng lưới nghiên cứu học thuật.
            </p>

            {report.topology.orphanTopics.length === 0 ? (
              <div className="text-xs text-emerald-400/90 bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4 text-center flex flex-col items-center gap-2 py-6">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>Toàn bộ chủ đề đã được liên kết vào đồ thị tri thức!</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {report.topology.orphanTopics.map((orphan) => {
                  const isCompletelyIsolated = orphan.status === 'completely-isolated';
                  return (
                    <div
                      key={orphan.topicId}
                      data-testid={`orphan-topic-item-${orphan.topicId}`}
                      onClick={() => onSelectTopic?.(orphan.topicId)}
                      className="p-3 bg-stone-800/50 hover:bg-stone-800/90 border border-stone-700/50 rounded-xl transition cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-stone-200 group-hover:text-rose-300 truncate transition">
                          {orphan.title}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-2">
                          <span>{orphan.noteCount} ghi chú</span>
                          <span>•</span>
                          <span>{orphan.resourceCount} tài liệu</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isCompletelyIsolated ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Cô lập hoàn toàn
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Ốc đảo chưa liên kết
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Semantic Bridges */}
        <div
          data-testid="graph-bridges-section"
          className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-bold text-stone-200">
                  Cầu nối Ngữ nghĩa (Semantic Bridges)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {activeBridges.length} gợi ý
              </span>
            </div>
            <p className="text-xs text-stone-400 mb-3">
              Dựa trên vector 128 chiều & cosine similarity để phát hiện mối liên hệ tiềm ẩn.
            </p>

            {activeBridges.length === 0 ? (
              <div className="text-xs text-stone-500 py-6 text-center italic">
                Chưa có gợi ý cầu nối mới (các chủ đề liên quan đều đã được kết nối).
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {activeBridges.map((bridge) => {
                  const currentLinkType =
                    customLinkTypes[bridge.id] || bridge.suggestedLinkType;
                  const similarityPct = Math.round(bridge.similarityScore * 100);

                  return (
                    <div
                      key={bridge.id}
                      data-testid={`bridge-recommendation-${bridge.id}`}
                      className="p-3 bg-stone-800/60 border border-stone-700/60 rounded-xl space-y-2.5"
                    >
                      {/* Topics pair header */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-stone-200 truncate flex-1 min-w-0 pr-2">
                          <span
                            onClick={() => onSelectTopic?.(bridge.sourceTopicId)}
                            className="cursor-pointer hover:text-sky-300 truncate"
                            title={bridge.sourceTitle}
                          >
                            {bridge.sourceTitle}
                          </span>
                          <ArrowRight className="w-3 h-3 text-stone-500 shrink-0" />
                          <span
                            onClick={() => onSelectTopic?.(bridge.targetTopicId)}
                            className="cursor-pointer hover:text-sky-300 truncate"
                            title={bridge.targetTitle}
                          >
                            {bridge.targetTitle}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          {bridge.isCrossDomain && (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Liên ngành
                            </span>
                          )}
                          <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/40">
                            {similarityPct}%
                          </span>
                        </div>
                      </div>

                      {/* Shared terms / reasoning */}
                      {bridge.sharedTerms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {bridge.sharedTerms.slice(0, 4).map((term, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-mono px-1.5 py-0.5 bg-stone-700/50 text-stone-300 rounded"
                            >
                              #{term}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Connection controls */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-700/40">
                        <select
                          data-testid={`bridge-type-select-${bridge.id}`}
                          aria-label={`Loại liên kết cho ${bridge.sourceTitle}`}
                          value={currentLinkType}
                          onChange={(e) =>
                            handleTypeChange(bridge.id, e.target.value as LinkType)
                          }
                          className="px-2 py-1 bg-stone-900 border border-stone-700 rounded-lg text-[11px] text-stone-300 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="related">Tương quan (related)</option>
                          <option value="prerequisite">Tiên quyết (prerequisite)</option>
                          <option value="advanced">Nâng cao (advanced)</option>
                          <option value="contradicts">Đối lập (contradicts)</option>
                        </select>

                        <button
                          data-testid={`connect-bridge-btn-${bridge.id}`}
                          onClick={() => handleConnectBridge(bridge)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition shrink-0"
                          title="Kết nối cầu nối ngữ nghĩa vào đồ thị"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>Kết nối ngay</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
