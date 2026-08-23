import React, { useState } from 'react';
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
} from 'lucide-react';
import { Topic, TopicStatus } from '../../types';
import { formatMinutesToHours } from '../../lib/spaced-repetition';
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

export function StudyProgressView() {
  const { topics, stats, reviewQueue, openTopicDetail, updateTopicProgress } = useData();

  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'reviewing'>('all');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewTopic, setSelectedReviewTopic] = useState<Topic | null>(null);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerTopicId, setTimerTopicId] = useState<string | undefined>();

  // Filtered topics
  const filteredTopics = topics.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.studyProgress.status === statusFilter;
  });

  // Dynamic weekly study data reflecting actual logged study time
  const totalPhatHocTime = topics
    .filter((t) => t.type === 'phat-hoc')
    .reduce((acc, t) => acc + (t.studyProgress?.timeSpent || 0), 0);
  const totalHuyenHocTime = topics
    .filter((t) => t.type === 'huyen-hoc')
    .reduce((acc, t) => acc + (t.studyProgress?.timeSpent || 0), 0);

  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const todayIdx = (new Date().getDay() + 6) % 7; // Monday = 0

  const weeklyStudyData = days.map((day, idx) => ({
    day,
    phatHoc: idx === todayIdx ? totalPhatHocTime : 0,
    huyenHoc: idx === todayIdx ? totalHuyenHocTime : 0,
  }));

  const categoryPieData = [
    { name: 'Phật Học (Tam Tạng & Luận)', value: stats.phatHocTopics, color: '#D97706' },
    { name: 'Huyền Học (Tam Thức & Dịch)', value: stats.huyenHocTopics, color: '#4F46E5' },
    { name: 'Ghi Chú & Khảo Cứu', value: stats.totalNotesCount, color: '#059669' },
  ];

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
      {/* Header (Matching Page 6 Wireframe: Tiến độ học tập) */}
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
            Quản lý nhịp độ ôn tập ngắt quãng và đo lường thời gian nghiên cứu thực tế
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

      {/* Thống kê (Statistics Summary Box matching Page 6 wireframe) */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-2 text-stone-900 font-bold text-sm mb-3">
          <BarChart2 className="w-4 h-4 text-amber-700" />
          <span>Thống kê tổng hợp nghiên cứu</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 block">Tổng thời gian học</span>
            <span className="text-lg font-bold font-mono text-stone-900">
              {stats.totalTimeSpentMinutes} phút ({formatMinutesToHours(stats.totalTimeSpentMinutes)})
            </span>
          </div>
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 block">Topics hoàn thành</span>
            <span className="text-lg font-bold font-mono text-emerald-800">
              {stats.completedTopicsCount} / {stats.totalTopics}
            </span>
          </div>
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 block">Ghi chú đã tạo</span>
            <span className="text-lg font-bold font-mono text-amber-800">
              {stats.totalNotesCount} notes
            </span>
          </div>
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-xs text-stone-500 block">Hàng đợi ôn tập hôm nay</span>
            <span className="text-lg font-bold font-mono text-rose-800">
              {stats.dueReviewsCount} mục cần ôn
            </span>
          </div>
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
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-amber-800">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> Phật Học
              </span>
              <span className="flex items-center gap-1 text-indigo-800">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Huyền Học
              </span>
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
                <Bar dataKey="phatHoc" name="Phật Học" fill="#D97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="huyenHoc" name="Huyền Học" fill="#4F46E5" radius={[4, 4, 0, 0]} />
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
            <div className="flex justify-between">
              <span className="text-amber-800 font-medium">Phật Học</span>
              <span className="font-bold">{stats.phatHocTopics} topics</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-800 font-medium">Huyền Học</span>
              <span className="font-bold">{stats.huyenHocTopics} topics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Matching Page 6: Bộ lọc: [Tất cả ▼] [Đang học ▼] [Hoặc thành ▼]) */}
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

      {/* Topic Progress Cards (Matching Page 6 wireframe layout) */}
      <div className="space-y-4">
        {filteredTopics.map((topic) => {
          const isOverdue =
            topic.studyProgress.nextReview && new Date(topic.studyProgress.nextReview) <= new Date();

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
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        topic.type === 'phat-hoc'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                      }`}
                    >
                      {topic.categoryName}
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

              {/* Progress and Stats Row (Matching Page 6: [████████░░] 80% | 15 ngày | ⏱️ 420 phút | Next review: 2 ngày nữa) */}
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
                      className={`h-full rounded-full transition-all duration-300 ${
                        topic.type === 'phat-hoc' ? 'bg-amber-600' : 'bg-indigo-600'
                      }`}
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
