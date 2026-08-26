import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  TrendingUp,
  Brain,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Compass,
  Play,
  RotateCcw,
  BarChart2,
  Award,
  ChevronRight,
  Filter,
  CalendarDays,
} from 'lucide-react';
import { Topic, TopicStatus } from '../../types';
import { formatMinutesToHours } from '../../lib/spaced-repetition';
import {
  calculateRetentionMetrics,
  calculateReviewForecast,
  getTopicRootDomain,
} from '../../lib/studyAnalytics';
import { SpacedReviewModal } from '../modals/SpacedReviewModal';
import { StudyTimerModal } from '../modals/StudyTimerModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

function getTopicPresentation(topic: Topic, categories?: any[]) {
  const rootDomain = categories?.length ? getTopicRootDomain(topic, categories) : (topic.type || 'other');

  if (rootDomain === 'phat-hoc' || topic.type === 'phat-hoc') {
    return {
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300',
      progressBarClass: 'bg-amber-600',
    };
  }

  if (rootDomain === 'huyen-hoc' || topic.type === 'huyen-hoc') {
    return {
      badgeClass: 'bg-indigo-100 text-indigo-900 border border-indigo-300',
      progressBarClass: 'bg-indigo-600',
    };
  }

  return {
    badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
    progressBarClass: 'bg-emerald-600',
  };
}

export function StudyProgressView() {
  const { topics, stats, reviewQueue, openTopicDetail, updateTopicProgress, categories } = useData();

  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'reviewing'>('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewTopic, setSelectedReviewTopic] = useState<Topic | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerTopicId, setTimerTopicId] = useState<string | undefined>();

  // 1. Compute in-memory retention metrics and review forecast safely with dynamic categories
  const retentionMetrics = useMemo(() => calculateRetentionMetrics(topics), [topics]);
  const reviewForecast = useMemo(() => calculateReviewForecast(topics, 7, categories), [topics, categories]);

  // Dynamic forecast domains and chart dataset
  const activeForecastDomains = useMemo(() => {
    const domainSet = new Set<string>();
    reviewForecast.forEach((f) => {
      if (f.domainCounts) {
        Object.keys(f.domainCounts).forEach((dom) => domainSet.add(dom));
      }
    });

    if (domainSet.size === 0) {
      return [
        { domain: 'phat-hoc', name: 'Phật Học', color: '#D97706', dataKey: 'phatHocCount' },
        { domain: 'huyen-hoc', name: 'Huyền Học', color: '#4F46E5', dataKey: 'huyenHocCount' },
      ];
    }

    const colors = ['#D97706', '#4F46E5', '#059669', '#0284C7', '#7C3AED', '#DB2777', '#EA580C', '#475569'];
    const sorted = Array.from(domainSet).sort();
    return sorted.map((domKey, idx) => {
      const cat = categories?.find((c) => c.slug === domKey || c.id === domKey);
      const name = cat?.name || (domKey === 'phat-hoc' ? 'Phật Học' : domKey === 'huyen-hoc' ? 'Huyền Học' : domKey === 'other' ? 'Khác' : domKey);
      const color = domKey === 'phat-hoc' ? '#D97706' : domKey === 'huyen-hoc' ? '#4F46E5' : colors[idx % colors.length];
      return {
        domain: domKey,
        name,
        color,
        dataKey: domKey === 'phat-hoc' && !categories?.length ? 'phatHocCount' : domKey === 'huyen-hoc' && !categories?.length ? 'huyenHocCount' : `domain_${domKey}`,
      };
    });
  }, [reviewForecast, categories]);

  const chartForecastData = useMemo(() => {
    return reviewForecast.map((f) => {
      const item: Record<string, any> = {
        ...f,
        dayLabel: f.dayLabel,
        phatHocCount: f.phatHocCount,
        huyenHocCount: f.huyenHocCount,
      };
      if (f.domainCounts) {
        Object.entries(f.domainCounts).forEach(([domKey, count]) => {
          item[`domain_${domKey}`] = count;
        });
      }
      return item;
    });
  }, [reviewForecast]);

  // Filtered topics
  const filteredTopics = topics.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.studyProgress.status === statusFilter;
  });

  // Dynamic weekly study domains and data calculation
  const weeklyDomains = useMemo(() => {
    if (categories && categories.length > 0) {
      const rootCats = categories.filter((c) => !c.parentId);
      const colors = ['#D97706', '#4F46E5', '#059669', '#0284C7', '#7C3AED', '#DB2777', '#EA580C', '#475569'];
      return rootCats.map((cat, idx) => ({
        domain: cat.slug || cat.id,
        name: cat.name,
        color: cat.color || (cat.slug === 'phat-hoc' ? '#D97706' : cat.slug === 'huyen-hoc' ? '#4F46E5' : colors[idx % colors.length]),
        dataKey: `weekly_${cat.slug || cat.id}`,
      }));
    }

    return [
      { domain: 'phat-hoc', name: 'Phật Học', color: '#D97706', dataKey: 'weekly_phat-hoc' },
      { domain: 'huyen-hoc', name: 'Huyền Học', color: '#4F46E5', dataKey: 'weekly_huyen-hoc' },
    ];
  }, [categories]);

  const weeklyStudyData = useMemo(() => {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0

    // Compute total study time per domain for topics
    const domainTimeMap: Record<string, number> = {};
    topics.forEach((t) => {
      const rootDomain = categories?.length ? getTopicRootDomain(t, categories) : (t.type || 'other');
      const timeSpent = t.studyProgress?.timeSpent || 0;
      domainTimeMap[rootDomain] = (domainTimeMap[rootDomain] || 0) + timeSpent;
    });

    return days.map((day, idx) => {
      const entry: Record<string, any> = { day };
      weeklyDomains.forEach((dom) => {
        entry[dom.dataKey] = idx === todayIdx ? (domainTimeMap[dom.domain] || 0) : 0;
      });
      return entry;
    });
  }, [topics, categories, weeklyDomains]);

  const categoryPieData = useMemo(() => {
    if (categories && categories.length > 0) {
      const rootCats = categories.filter((c) => !c.parentId);
      const colors = ['#D97706', '#4F46E5', '#059669', '#0284C7', '#7C3AED', '#DB2777', '#EA580C', '#475569'];
      const items = rootCats.map((cat, idx) => {
        const catTopicsCount = topics.filter((t) => {
          return t.categoryId === cat.id || t.type === cat.slug || t.type === cat.id;
        }).length;
        return {
          name: cat.name,
          value: catTopicsCount,
          color: cat.slug === 'phat-hoc' ? '#D97706' : cat.slug === 'huyen-hoc' ? '#4F46E5' : colors[idx % colors.length],
        };
      });
      items.push({ name: 'Ghi Chú & Khảo Cứu', value: stats.totalNotesCount || 0, color: '#059669' });
      return items;
    }

    return [
      { name: 'Phật Học (Tam Tạng & Luận)', value: stats.phatHocTopics || 0, color: '#D97706' },
      { name: 'Huyền Học (Tam Thức & Dịch)', value: stats.huyenHocTopics || 0, color: '#4F46E5' },
      { name: 'Ghi Chú & Khảo Cứu', value: stats.totalNotesCount || 0, color: '#059669' },
    ];
  }, [categories, topics, stats]);

  const handleStartReview = (topic?: Topic) => {
    setSelectedReviewTopic(topic || null);
    setShowReviewModal(true);
  };

  const handleStartStudy = (topicId: string) => {
    setTimerTopicId(topicId);
    setShowTimerModal(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Hệ Thống Theo Dõi Học Tập &amp; Trí Nhớ</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-serif-title">
            Tiến Độ Học Tập &amp; Spaced Repetition (SM-2)
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Quản lý nhịp độ ôn tập ngắt quãng và phân tích khả năng ghi nhớ dự phóng theo mô hình SM-2
          </p>
        </div>

        {/* Start Spaced Repetition Review Button */}
        {reviewQueue.length > 0 && (
          <button
            onClick={() => handleStartReview()}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition animate-pulse"
          >
            <Brain className="w-4 h-4" /> Bắt đầu ôn tập ({reviewQueue.length} thẻ đến hạn)
          </button>
        )}
      </div>

      {/* Thống kê KPI Dự Phóng (Memory & Retention Analytics Summary Box) */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
            <BarChart2 className="w-4 h-4 text-amber-700" />
            <span>Phân tích trí nhớ &amp; Thống kê nghiên cứu</span>
          </div>
          <span className="text-[11px] text-stone-400 font-medium">
            Mô hình Spaced Repetition SM-2 &amp; Ebbinghaus
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* KPI 1: Estimated Retention Rate */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 block">Tỷ lệ ghi nhớ dự phóng</span>
            <span className="text-xl font-bold font-mono text-amber-900">
              {retentionMetrics.estimatedRetentionRate}%
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">
              Ước tính suy giảm theo chu kỳ
            </span>
          </div>

          {/* KPI 2: Mastery Distribution */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 block">Mức độ thuần thục</span>
            <span className="text-xl font-bold font-mono text-emerald-800">
              {retentionMetrics.masteredCount} / {topics.length} thuần thục
            </span>
            <span className="text-[10px] text-stone-500 block mt-0.5">
              {retentionMetrics.consolidatingCount} đang củng cố • {retentionMetrics.learningCount} đang học
            </span>
          </div>

          {/* KPI 3: Total Study Time */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 block">Tổng thời gian học</span>
            <span className="text-xl font-bold font-mono text-stone-900">
              {stats.totalTimeSpentMinutes} phút
            </span>
            <span className="text-[10px] text-stone-500 block mt-0.5">
              {formatMinutesToHours(stats.totalTimeSpentMinutes)} ({retentionMetrics.totalStudiedTopics} topics)
            </span>
          </div>

          {/* KPI 4: Due Reviews Today */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 block">Hàng đợi hôm nay</span>
            <span className="text-xl font-bold font-mono text-rose-800">
              {reviewForecast[0]?.totalCount ?? stats.dueReviewsCount} mục cần ôn
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">
              Đến hạn ôn tập ngắt quãng
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Review Queue Forecast Bar Chart */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-700" />
            <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
              Dự báo hàng đợi ôn tập 7 ngày
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {activeForecastDomains.map((dom) => (
              <span key={dom.domain} className="flex items-center gap-1 font-medium text-stone-800">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: dom.color }} /> {dom.name}
              </span>
            ))}
          </div>
        </div>

        {/* Forecast Days Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 pb-2">
          {reviewForecast.map((f, idx) => (
            <div
              key={`forecast-badge-${idx}`}
              className={`p-2 rounded-xl border text-center transition ${
                idx === 0
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-stone-50 border-stone-200/80'
              }`}
            >
              <span className="text-[11px] font-semibold text-stone-600 block">
                {f.dayLabel}
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  f.totalCount > 0
                    ? idx === 0
                      ? 'text-rose-700'
                      : 'text-amber-900'
                    : 'text-stone-400'
                }`}
              >
                {f.totalCount} mục
              </span>
            </div>
          ))}
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartForecastData}>
              <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#78716C' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#78716C' }} unit=" mục" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1C1917', color: '#FFF', borderRadius: '12px', fontSize: '11px' }}
              />
              {activeForecastDomains.map((dom) => (
                <Bar
                  key={dom.domain}
                  dataKey={dom.dataKey}
                  name={dom.name}
                  fill={dom.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Charts: Weekly Study Trends & Category Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
              Thời gian nghiên cứu tuần này (Phút)
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {weeklyDomains.map((dom) => (
                <span key={dom.domain} className="flex items-center gap-1 font-medium text-stone-800">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: dom.color }} /> {dom.name}
                </span>
              ))}
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyStudyData}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#78716C' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716C' }} unit="p" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1C1917', color: '#FFF', borderRadius: '12px', fontSize: '11px' }}
                />
                {weeklyDomains.map((dom) => (
                  <Bar
                    key={dom.domain}
                    dataKey={dom.dataKey}
                    name={dom.name}
                    fill={dom.color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Knowledge Distribution */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <h3 className="font-bold text-xs text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Cân bằng lĩnh vực
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1C1917', color: '#FFF', borderRadius: '12px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 text-xs">
            {categoryPieData.map((item) => (
              <div key={item.name} className="flex justify-between">
                <span className="font-medium" style={{ color: item.color }}>{item.name}</span>
                <span className="font-bold font-mono">{item.value} {item.name.includes('Ghi Chú') ? 'mục' : 'topics'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 border border-stone-200/90 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-stone-500 font-semibold mr-1">Bộ lọc tiến độ:</span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'in_progress', label: 'Đang học' },
            { id: 'reviewing', label: 'Cần ôn tập (Reviewing)' },
            { id: 'completed', label: 'Đã hoàn thành' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                statusFilter === f.id
                  ? 'bg-amber-700 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-stone-500 font-mono">
          Hiển thị {filteredTopics.length} / {topics.length} chủ đề
        </span>
      </div>

      {/* Topic Progress Cards */}
      <div className="space-y-4">
        {filteredTopics.map((topic) => {
          const isOverdue =
            topic.studyProgress.nextReview && new Date(topic.studyProgress.nextReview) <= new Date();
          const presentation = getTopicPresentation(topic, categories);

          return (
            <div
              key={topic.id}
              className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs hover:border-amber-400 transition space-y-3"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${presentation.badgeClass}`}
                    >
                      {topic.categoryName || topic.type || 'Chủ đề'}
                    </span>
                    <h3
                      onClick={() => openTopicDetail(topic.id)}
                      className="font-bold text-stone-900 text-sm hover:text-amber-800 cursor-pointer"
                    >
                      {topic.title}
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 line-clamp-1">{topic.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartStudy(topic.id)}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Bấm giờ học
                  </button>
                  <button
                    onClick={() => handleStartReview(topic)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Brain className="w-3.5 h-3.5 text-amber-700" /> Ôn tập
                  </button>
                </div>
              </div>

              {/* Progress and Stats Row */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-3 font-mono text-stone-700">
                    <span className="font-bold text-amber-900">
                      {topic.studyProgress.progress}% hoàn thành
                    </span>
                    <span>•</span>
                    <span>⏱️ {topic.studyProgress.timeSpent} phút</span>
                    <span>•</span>
                    <span>Khoảng cách: {topic.studyProgress.interval} ngày</span>
                    <span>•</span>
                    <span>Hệ số Ease: {topic.studyProgress.easeFactor}</span>
                  </div>

                  <div className="text-xs font-medium">
                    {isOverdue ? (
                      <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        ⚠️ Next review: Hôm nay / Quá hạn
                      </span>
                    ) : topic.studyProgress.nextReview ? (
                      <span className="text-stone-600">
                        Next review: {new Date(topic.studyProgress.nextReview).toLocaleDateString('vi-VN')}
                      </span>
                    ) : (
                      <span className="text-stone-400">Chưa xếp lịch ôn</span>
                    )}
                  </div>
                </div>

                {/* Progress Bar with direct drag slider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${presentation.progressBarClass}`}
                      style={{ width: `${topic.studyProgress.progress}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={topic.studyProgress.progress}
                    onChange={(e) => updateTopicProgress(topic.id, Number(e.target.value))}
                    className="w-24 accent-amber-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {filteredTopics.length === 0 && (
          <div className="text-center py-12 bg-white border border-stone-200 rounded-2xl p-6 text-stone-400 text-xs">
            Không tìm thấy chủ đề nào theo bộ lọc tiến độ này.
          </div>
        )}
      </div>

      {/* Modals */}
      <SpacedReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedReviewTopic(null);
        }}
        initialTopic={selectedReviewTopic}
      />
      <StudyTimerModal
        isOpen={showTimerModal}
        onClose={() => {
          setShowTimerModal(false);
          setTimerTopicId(undefined);
        }}
        defaultTopicId={timerTopicId}
      />
    </div>
  );
}
