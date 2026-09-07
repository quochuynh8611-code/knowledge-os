import React, { useState, useMemo } from "react";
import type { Note, Resource, Topic } from "../../types";
import type { Flashcard, FlashcardReview } from "../../types/flashcard";
import {
  aggregateTopicAssets,
  calculateTopicStats,
  calculateTopicRetentionTrend,
  getRecentTopicActivities,
  type TopicActivityItem,
  type RetentionTrendPoint,
} from "../../lib/researchAggregationService";
import {
  FileText,
  Brain,
  Library,
  TrendingUp,
  Zap,
  Clock,
  Search,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  Sparkles,
} from "lucide-react";

export interface TopicDashboardProps {
  topicId: string;
  topicTitle?: string;
  topicDomain?: string;
  topicCategory?: string;
  notes?: Note[];
  flashcards?: Flashcard[];
  resources?: Resource[];
  reviews?: FlashcardReview[];
  onOpenSearch?: () => void;
  onOpenExport?: () => void;
  onNavigateTab?: (tab: string) => void;
  onSelectActivity?: (activity: TopicActivityItem) => void;
}

export function TopicDashboard({
  topicId,
  topicTitle = "Chủ đề nghiên cứu",
  topicDomain,
  topicCategory,
  notes = [],
  flashcards = [],
  resources = [],
  reviews = [],
  onOpenSearch,
  onOpenExport,
  onNavigateTab,
  onSelectActivity,
}: TopicDashboardProps) {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [hoveredPoint, setHoveredPoint] = useState<RetentionTrendPoint | null>(null);

  // 1. Asset aggregation
  const assets = useMemo(() => {
    return aggregateTopicAssets(topicId, { notes, flashcards, resources });
  }, [topicId, notes, flashcards, resources]);

  // 2. Learning performance stats
  const stats = useMemo(() => {
    return calculateTopicStats(topicId, { reviews, flashcards });
  }, [topicId, reviews, flashcards]);

  // 3. Retention trend points
  const trendPoints = useMemo(() => {
    const cardIdSet = new Set(
      flashcards.filter((f) => f.topicId === topicId).map((f) => f.id)
    );
    const topicReviews = reviews.filter(
      (r) => r.topicId === topicId || cardIdSet.has(r.flashcardId || r.cardId || "")
    );
    return calculateTopicRetentionTrend(topicReviews, dateRange);
  }, [topicId, reviews, flashcards, dateRange]);

  // 4. Recent activities
  const recentActivities = useMemo(() => {
    return getRecentTopicActivities(
      topicId,
      { notes, flashcards, reviews, resources },
      10
    );
  }, [topicId, notes, flashcards, reviews, resources]);

  // SVG Chart Dimensions
  const svgWidth = 650;
  const svgHeight = 220;
  const pad = { top: 25, right: 30, bottom: 35, left: 45 };
  const chartW = svgWidth - pad.left - pad.right;
  const chartH = svgHeight - pad.top - pad.bottom;

  // Chart coordinate mapping
  const pointsWithCoords = useMemo(() => {
    if (trendPoints.length === 0) return [];
    if (trendPoints.length === 1) {
      return [
        {
          ...trendPoints[0],
          x: pad.left + chartW / 2,
          y: pad.top + ((100 - trendPoints[0].retentionRate) / 100) * chartH,
        },
      ];
    }
    return trendPoints.map((pt, i) => {
      const x = pad.left + (i / (trendPoints.length - 1)) * chartW;
      const y = pad.top + ((100 - pt.retentionRate) / 100) * chartH;
      return { ...pt, x, y };
    });
  }, [trendPoints, chartW, chartH, pad.left, pad.top]);

  // SVG Line path & filled gradient area
  const linePath = useMemo(() => {
    if (pointsWithCoords.length === 0) return "";
    return pointsWithCoords.reduce(
      (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
      ""
    );
  }, [pointsWithCoords]);

  const areaPath = useMemo(() => {
    if (pointsWithCoords.length === 0) return "";
    const first = pointsWithCoords[0];
    const last = pointsWithCoords[pointsWithCoords.length - 1];
    const bottomY = pad.top + chartH;
    return `${linePath} L ${last.x},${bottomY} L ${first.x},${bottomY} Z`;
  }, [linePath, pointsWithCoords, pad.top, chartH]);

  // Helper for activity icons
  const getActivityMeta = (type: TopicActivityItem["type"]) => {
    switch (type) {
      case "note":
        return {
          icon: <FileText className="w-4 h-4 text-blue-500" />,
          badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
          label: "Ghi chú",
        };
      case "flashcard":
        return {
          icon: <Brain className="w-4 h-4 text-purple-500" />,
          badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
          label: "Thẻ ghi nhớ",
        };
      case "review":
        return {
          icon: <Zap className="w-4 h-4 text-emerald-500" />,
          badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
          label: "Phiên ôn tập",
        };
      case "resource":
        return {
          icon: <Library className="w-4 h-4 text-amber-500" />,
          badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
          label: "Tài liệu",
        };
    }
  };

  return (
    <div className="space-y-6" data-testid="topic-research-dashboard">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              {topicCategory || topicDomain || "Nghiên Cứu"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Độ ổn định trí nhớ: ~{stats.stabilityDays} ngày
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            Tổng Quan Nghiên Cứu: {topicTitle}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Hợp nhất ghi chú, thẻ SRS, tài liệu nguồn và phân tích tiến độ ghi nhớ đa miền.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Tìm kiếm toàn văn (BM25)"
              data-testid="research-search-btn"
            >
              <Search className="w-4 h-4 text-indigo-500" />
              <span>Tìm kiếm</span>
            </button>
          )}
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              title="Xuất Báo Cáo Nghiên Cứu (Markdown / In PDF)"
              data-testid="research-export-btn"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Báo Cáo</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Metrics Grid (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Ghi chú */}
        <div
          onClick={() => onNavigateTab && onNavigateTab("notes")}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${
            onNavigateTab ? "cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all" : ""
          }`}
          data-testid="kpi-notes"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Ghi Chú</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {assets.notesCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">bài viết</span>
          </div>
        </div>

        {/* Card 2: Flashcards */}
        <div
          onClick={() => onNavigateTab && onNavigateTab("card_browser")}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${
            onNavigateTab ? "cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 transition-all" : ""
          }`}
          data-testid="kpi-flashcards"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Flashcards</span>
            <Brain className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {assets.flashcardsCount}
            </span>
            {assets.cardsDueCount > 0 ? (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                ({assets.cardsDueCount} cần ôn)
              </span>
            ) : (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">chuẩn bị sẵn</span>
            )}
          </div>
        </div>

        {/* Card 3: Tài liệu nguồn */}
        <div
          onClick={() => onNavigateTab && onNavigateTab("resources")}
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${
            onNavigateTab ? "cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-all" : ""
          }`}
          data-testid="kpi-resources"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Tài Liệu</span>
            <Library className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {assets.resourcesCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">nguồn</span>
          </div>
        </div>

        {/* Card 4: Tỷ lệ nhớ */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" data-testid="kpi-retention">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Tỷ Lệ Nhớ</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                stats.retentionRate >= 80
                  ? "text-emerald-600 dark:text-emerald-400"
                  : stats.retentionRate >= 60
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {stats.retentionRate}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({stats.totalReviews} lượt ôn)
            </span>
          </div>
        </div>

        {/* Card 5: Chuỗi học */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" data-testid="kpi-streak">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Chuỗi Học</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.streakDays}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">ngày liên tiếp</span>
          </div>
        </div>

        {/* Card 6: Thời gian học */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm" data-testid="kpi-time">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Thời Gian</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.timeSpentMinutes < 60
                ? `${stats.timeSpentMinutes}m`
                : `${(stats.timeSpentMinutes / 60).toFixed(1)}h`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">tổng ôn tập</span>
          </div>
        </div>
      </div>

      {/* 3. Retention Trend Chart */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span>Xu Hướng Ghi Nhớ (Retention Trend)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Biểu diễn tỷ lệ nhớ (%) của các phiên ôn tập thực tế theo thời gian.
            </p>
          </div>

          {/* Date range filter buttons */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
            {(
              [
                { key: "7d", label: "7 ngày" },
                { key: "30d", label: "30 ngày" },
                { key: "90d", label: "90 ngày" },
                { key: "all", label: "Tất cả" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => setDateRange(item.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  dateRange === item.key
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Canvas */}
        {trendPoints.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <Activity className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Chưa có dữ liệu ôn tập trong khoảng thời gian này
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Hãy hoàn thành một phiên ôn tập Flashcard để hệ thống bắt đầu vẽ biểu đồ xu hướng ghi nhớ thực tế.
            </p>
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-48 sm:h-56"
              data-testid="retention-trend-svg"
            >
              <defs>
                <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[100, 80, 50, 0].map((val) => {
                const y = pad.top + ((100 - val) / 100) * chartH;
                const isTarget = val === 80;
                return (
                  <g key={val}>
                    <line
                      x1={pad.left}
                      y1={y}
                      x2={svgWidth - pad.right}
                      y2={y}
                      stroke={isTarget ? "#10b981" : "#94a3b8"}
                      strokeDasharray={isTarget ? "4 3" : "2 3"}
                      strokeWidth={isTarget ? 1.2 : 0.6}
                      strokeOpacity={isTarget ? 0.8 : 0.3}
                    />
                    <text
                      x={pad.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill={isTarget ? "#10b981" : "#94a3b8"}
                      className="font-mono font-medium"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Target 80% watermark label */}
              <text
                x={svgWidth - pad.right - 5}
                y={pad.top + ((100 - 80) / 100) * chartH - 4}
                textAnchor="end"
                fontSize="9"
                fill="#10b981"
                className="font-medium"
              >
                Mục tiêu: 80%
              </text>

              {/* Gradient area */}
              {areaPath && (
                <path d={areaPath} fill="url(#retentionGrad)" />
              )}

              {/* Main trend line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {pointsWithCoords.map((pt, idx) => (
                <g key={pt.date + idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.date === pt.date ? 6 : 4}
                    fill="#ffffff"
                    stroke="#6366f1"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* Date label for first, last, and every few */}
                  {(idx === 0 ||
                    idx === pointsWithCoords.length - 1 ||
                    pointsWithCoords.length <= 6 ||
                    idx % Math.ceil(pointsWithCoords.length / 5) === 0) && (
                    <text
                      x={pt.x}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#64748b"
                      className="font-mono"
                    >
                      {pt.date.slice(5)}
                    </text>
                  )}
                </g>
              ))}
            </svg>

            {/* Hover Tooltip Card */}
            {hoveredPoint && (
              <div
                className="absolute top-2 right-4 p-2.5 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 text-xs pointer-events-none"
                data-testid="trend-tooltip"
              >
                <div className="font-semibold">{hoveredPoint.date}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-indigo-300">Tỷ lệ nhớ:</span>
                  <span className="font-bold text-emerald-400">
                    {hoveredPoint.retentionRate}%
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  {hoveredPoint.rememberedCount}/{hoveredPoint.reviewCount} lượt nhớ thành công
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Recent Activities Section */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Hoạt Động Nghiên Cứu Gần Đây</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              10 hoạt động tạo mới, cập nhật ghi chú hoặc ôn tập thẻ gần nhất.
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {recentActivities.length} sự kiện
          </span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            Chưa có hoạt động nào được ghi nhận cho chủ đề này.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.map((act) => {
              const meta = getActivityMeta(act.type);
              const formattedDate = new Date(act.timestamp).toLocaleDateString("vi-VN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={act.id}
                  onClick={() => onSelectActivity && onSelectActivity(act)}
                  className={`py-3 flex items-start gap-3 transition-colors ${
                    onSelectActivity
                      ? "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 px-2 rounded-xl"
                      : ""
                  }`}
                  data-testid="activity-item"
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {formattedDate}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {act.title}
                    </div>
                    {act.snippet && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {act.snippet}
                      </p>
                    )}
                  </div>
                  {onSelectActivity && (
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
