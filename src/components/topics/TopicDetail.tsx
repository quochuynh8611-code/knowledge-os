import React, { useState } from "react";
import { useData } from "../../context/DataContext";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Compass,
  FileText,
  Library,
  Share2,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  Brain,
  Edit2,
  ExternalLink,
  Tag as TagIcon,
  HelpCircle,
  Lightbulb,
  Bookmark,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { NoteFormModal } from "../modals/NoteFormModal";
import { ResourceFormModal } from "../modals/ResourceFormModal";
import { TopicFormModal } from "../modals/TopicFormModal";
import { SpacedReviewModal } from "../modals/SpacedReviewModal";
import { StudyTimerModal } from "../modals/StudyTimerModal";
import { ResourceViewerModal } from "../modals/ResourceViewerModal";

const ObsidianBridgeModal = React.lazy(() =>
  import("../integrations/ObsidianBridgeModal").then((m) => ({
    default: m.ObsidianBridgeModal,
  }))
);
const NotebookLMStudioModal = React.lazy(() =>
  import("../integrations/NotebookLMStudioModal").then((m) => ({
    default: m.NotebookLMStudioModal,
  }))
);
const AntigravityHandoffModal = React.lazy(() =>
  import("../integrations/AntigravityHandoffModal").then((m) => ({
    default: m.AntigravityHandoffModal,
  }))
);
const AIResearchStudio = React.lazy(() =>
  import("../ai/AIResearchStudio").then((m) => ({
    default: m.AIResearchStudio,
  }))
);
import { Breadcrumbs } from "../layout/Breadcrumbs";
import { EmptyState } from "../ui/EmptyState";
import { Resource, Note, TopicStatus } from "../../types";
import { resolveResourceOpenTarget } from "../../lib/resourceOpenResolver";
import {
  MarkdownReadabilityRenderer,
  toReadablePlainTextPreview,
} from "../../lib/markdownReadability";
import {
  formatMinutesToHours,
  formatTimeAgo,
} from "../../lib/spaced-repetition";

export function TopicDetail() {
  const {
    selectedTopicId,
    setSelectedTopicId,
    topics,
    notes,
    resources,
    updateTopicProgress,
    deleteNote,
    deleteResource,
    openTopicDetail,
    addKnowledgeLink,
    removeKnowledgeLink,
  } = useData();

  const [activeTab, setActiveTab] = useState<
    "content" | "notes" | "links" | "resources" | "spaced"
  >("content");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showEditTopicModal, setShowEditTopicModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showObsidianModal, setShowObsidianModal] = useState(false);
  const [showNotebookLMModal, setShowNotebookLMModal] = useState(false);
  const [showAntigravityModal, setShowAntigravityModal] = useState(false);
  const [showAIStudioModal, setShowAIStudioModal] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Link addition helper
  const [showAddLink, setShowAddLink] = useState(false);
  const [targetTopicId, setTargetTopicId] = useState("");
  const [linkType, setLinkType] = useState<
    "related" | "prerequisite" | "advanced" | "contradicts"
  >("related");
  const [linkStrength, setLinkStrength] = useState(3);

  const topic = topics.find((t) => t.id === selectedTopicId) || topics[0];

  if (!topic) {
    return (
      <div className="p-8 text-center text-stone-500">
        <p>Không tìm thấy chủ đề.</p>
        <button
          onClick={() => setSelectedTopicId(null)}
          className="mt-3 px-4 py-2 bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  // Filter notes and resources belonging to this topic
  const topicNotes = notes.filter((n) => n.topicId === topic.id);
  const topicResources = resources.filter((r) => r.topicId === topic.id);

  // Linked topics
  const linkedTopics = topic.links.map((link) => {
    const linked = topics.find((t) => t.id === link.targetId);
    return {
      ...link,
      targetTopic: linked,
    };
  });

  const handleAddLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTopicId) return;
    const targetObj = topics.find((t) => t.id === targetTopicId);
    addKnowledgeLink({
      sourceId: topic.id,
      targetId: targetTopicId,
      sourceTitle: topic.title,
      targetTitle: targetObj?.title || "Chủ đề",
      linkType,
      strength: linkStrength,
    });
    setShowAddLink(false);
    setTargetTopicId("");
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
        <Breadcrumbs
          items={[
            {
              label: topic.type === "phat-hoc" ? "Phật Học" : "Huyền Học",
              onClick: () => setSelectedTopicId(null),
            },
            {
              label:
                topic.categoryName ||
                (topic.type === "phat-hoc" ? "Tam Tạng" : "Dịch Học"),
              onClick: () => setSelectedTopicId(null),
            },
            {
              label: topic.title,
              isCurrent: true,
            },
          ]}
          onHomeClick={() => setSelectedTopicId(null)}
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Scholar trigger */}
          <button
            onClick={() => setShowAIStudioModal(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-800 to-stone-900 hover:from-amber-900 hover:to-black text-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Antigravity AI
          </button>

          {/* Antigravity Handoff Bundle trigger */}
          <button
            onClick={() => setShowAntigravityModal(true)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
            title="Đóng gói Handoff Bundle cho Antigravity AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Handoff Bundle
          </button>

          {/* Obsidian Bridge trigger */}
          <button
            onClick={() => setShowObsidianModal(true)}
            className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Đồng bộ với Obsidian Vault"
          >
            <ExternalLink className="w-3.5 h-3.5 text-purple-700" /> Obsidian
          </button>

          {/* NotebookLM Hub trigger */}
          <button
            onClick={() => setShowNotebookLMModal(true)}
            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Đóng gói nguồn và Audio Overview NotebookLM"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-700" /> NotebookLM
          </button>

          <button
            onClick={() => setShowTimerModal(true)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Học (Timer)
          </button>
          <button
            onClick={() => setShowReviewModal(true)}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Brain className="w-3.5 h-3.5 text-amber-700" /> Ôn tập SM-2
          </button>
          <button
            onClick={() => setShowEditTopicModal(true)}
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-xl transition"
            title="Chỉnh sửa chủ đề"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Topic Header & Description Banner */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                topic.type === "phat-hoc"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-indigo-100 text-indigo-900 border border-indigo-300"
              }`}
            >
              {topic.type === "phat-hoc" ? "Phật Học" : "Huyền Học"} •{" "}
              {topic.categoryName}
            </span>
            <span className="text-xs text-stone-500 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-400" />
              Tích lũy: {formatMinutesToHours(topic.studyProgress.timeSpent)}
            </span>
          </div>

          {/* Status badge & selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-medium">
              Trạng thái:
            </span>
            <select
              value={topic.studyProgress.status}
              onChange={(e) =>
                updateTopicProgress(
                  topic.id,
                  topic.studyProgress.progress,
                  e.target.value as TopicStatus,
                )
              }
              className="text-xs px-2.5 py-1 bg-stone-100 border border-stone-300 rounded-lg font-semibold text-stone-800"
            >
              <option value="not_started">Chưa học</option>
              <option value="in_progress">Đang học</option>
              <option value="reviewing">Đang ôn tập</option>
              <option value="completed">Đã hoàn thành</option>
            </select>
          </div>
        </div>

        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight font-serif-title">
            {topic.title}
          </h1>
          <p className="text-xs sm:text-sm text-stone-700 mt-2 leading-relaxed bg-stone-50 p-3.5 rounded-xl border border-stone-200">
            <span className="font-semibold text-stone-900">Mô tả:</span>{" "}
            {topic.description}
          </p>
        </div>

        {/* Progress Bar & Slider (Matching Page 5: Tiến độ [████████░░] 80%) */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" /> Tiến độ
              nghiên cứu
            </span>
            <span className="font-bold font-mono text-amber-900 text-sm">
              {topic.studyProgress.progress}% hoàn thành
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-stone-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  topic.type === "phat-hoc" ? "bg-amber-600" : "bg-indigo-600"
                }`}
                style={{ width: `${topic.studyProgress.progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={topic.studyProgress.progress}
              onChange={(e) =>
                updateTopicProgress(topic.id, Number(e.target.value))
              }
              className="w-28 accent-amber-700 cursor-pointer"
              title="Kéo thanh trượt để cập nhật tiến độ"
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Topic Detail */}
      <div className="flex border-b border-stone-200 gap-2">
        <button
          onClick={() => setActiveTab("content")}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "content"
              ? "border-amber-700 text-amber-900"
              : "border-transparent text-stone-600 hover:text-stone-900"
          }`}
        >
          <BookOpen className="w-4 h-4" /> Nội Dung (Markdown)
        </button>

        <button
          onClick={() => setActiveTab("notes")}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "notes"
              ? "border-amber-700 text-amber-900"
              : "border-transparent text-stone-600 hover:text-stone-900"
          }`}
        >
          <FileText className="w-4 h-4" /> Ghi Chú ({topicNotes.length})
        </button>

        <button
          onClick={() => setActiveTab("links")}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "links"
              ? "border-amber-700 text-amber-900"
              : "border-transparent text-stone-600 hover:text-stone-900"
          }`}
        >
          <Share2 className="w-4 h-4" /> Liên Kết Tri Thức ({topic.links.length}
          )
        </button>

        <button
          onClick={() => setActiveTab("resources")}
          className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === "resources"
              ? "border-amber-700 text-amber-900"
              : "border-transparent text-stone-600 hover:text-stone-900"
          }`}
        >
          <Library className="w-4 h-4" /> Tài Liệu Đính Kèm (
          {topicResources.length})
        </button>
      </div>

      {/* Tab 1: Nội dung (Markdown Reader & Wiki Link Parser) */}
      {activeTab === "content" && (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-700" /> Hệ thống luận giải
              &amp; Giáo lý
            </h3>
            <button
              onClick={() => setShowEditTopicModal(true)}
              className="text-xs text-stone-600 hover:text-amber-800 font-medium flex items-center gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" /> Chỉnh sửa nội dung
            </button>
          </div>

          {/* Render Markdown with Wiki Link styling */}
          <div className="text-stone-800 text-sm leading-relaxed font-sans">
            <MarkdownReadabilityRenderer
              content={topic.content}
              topics={topics}
              onOpenTopic={openTopicDetail}
            />
          </div>

          {/* Tags */}
          <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-stone-500 font-medium mr-1 flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5 text-stone-400" /> Thẻ chủ đề:
            </span>
            {topic.tags.map((tg) => (
              <span
                key={tg}
                className="px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg text-xs font-medium"
              >
                #{tg}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Ghi chú (Notes matching Page 5 wireframe) */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              Ghi chú nghiên cứu ({topicNotes.length} notes)
            </h3>
            <button
              onClick={() => {
                setEditingNote(null);
                setShowNoteModal(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Thêm ghi chú mới
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topicNotes.map((note) => {
              const getTypeIcon = () => {
                switch (note.type) {
                  case "insight":
                    return <Lightbulb className="w-3.5 h-3.5 text-amber-700" />;
                  case "question":
                    return <HelpCircle className="w-3.5 h-3.5 text-rose-700" />;
                  case "summary":
                    return (
                      <Bookmark className="w-3.5 h-3.5 text-emerald-700" />
                    );
                  default:
                    return <FileText className="w-3.5 h-3.5 text-blue-700" />;
                }
              };

              return (
                <div
                  key={note.id}
                  className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-2.5 flex flex-col justify-between hover:border-amber-300 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 border-b border-stone-100 pb-1.5">
                      <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                        {getTypeIcon()}
                        {note.type}
                      </span>
                      <span>{formatTimeAgo(note.createdAt)}</span>
                    </div>

                    <h4 className="font-bold text-stone-900 text-sm">
                      {note.title}
                    </h4>

                    <p className="text-xs text-stone-700 leading-relaxed line-clamp-4">
                      {toReadablePlainTextPreview(note.content)}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingNote(note);
                          setShowNoteModal(true);
                        }}
                        className="p-1 text-stone-400 hover:text-stone-700 rounded"
                        title="Sửa ghi chú"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Xóa ghi chú này?"))
                            deleteNote(note.id);
                        }}
                        className="p-1 text-stone-400 hover:text-rose-700 rounded"
                        title="Xóa ghi chú"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {topicNotes.length === 0 && (
              <div className="col-span-2">
                <EmptyState
                  icon={FileText}
                  title="Chưa có ghi chú nào cho chủ đề này"
                  description="Ghi lại các kiến giải sâu sắc, đoạn kinh tạng đối chiếu hoặc câu hỏi khảo cứu của bạn."
                  primaryAction={{
                    label: "Thêm ghi chú đầu tiên",
                    onClick: () => {
                      setEditingNote(null);
                      setShowNoteModal(true);
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Liên kết tri thức (Knowledge Links) */}
      {activeTab === "links" && (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-700" /> Sơ đồ mối quan hệ
                tri thức
              </h3>
              <p className="text-xs text-stone-500">
                Các chủ đề liên quan, tiền đề (prerequisite) và tương hợp học
                thuật
              </p>
            </div>
            <button
              onClick={() => setShowAddLink(!showAddLink)}
              className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Liên Kết
            </button>
          </div>

          {/* Add Link Form */}
          {showAddLink && (
            <form
              onSubmit={handleAddLinkSubmit}
              className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Liên kết tới chủ đề *
                  </label>
                  <select
                    value={targetTopicId}
                    onChange={(e) => setTargetTopicId(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="">-- Chọn chủ đề --</option>
                    {topics
                      .filter((t) => t.id !== topic.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          [{t.type === "phat-hoc" ? "Phật Học" : "Huyền Học"}]{" "}
                          {t.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Loại quan hệ
                  </label>
                  <select
                    value={linkType}
                    onChange={(e) => setLinkType(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="related">Tương quan (Related)</option>
                    <option value="prerequisite">
                      Tiền đề nền tảng (Prerequisite)
                    </option>
                    <option value="advanced">
                      Mở rộng nâng cao (Advanced)
                    </option>
                    <option value="contradicts">
                      Biện luận đối nghịch (Contradicts)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Độ gắn kết (1-5 sao)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={linkStrength}
                    onChange={(e) => setLinkStrength(Number(e.target.value))}
                    className="w-full accent-amber-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLink(false)}
                  className="px-3 py-1 text-xs text-stone-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-amber-700 text-white rounded-lg text-xs font-semibold"
                >
                  Xác nhận liên kết
                </button>
              </div>
            </form>
          )}

          {/* Links List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {linkedTopics.map((link) => {
              if (!link.targetTopic) return null;
              return (
                <div
                  key={link.id}
                  className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-100 flex items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-900 rounded">
                        {link.linkType}
                      </span>
                      <span className="text-amber-800 text-[10px] font-bold">
                        {"★".repeat(link.strength)}
                      </span>
                    </div>
                    <h4
                      onClick={() => openTopicDetail(link.targetTopic!.id)}
                      className="text-xs font-bold text-stone-900 hover:text-amber-800 cursor-pointer flex items-center gap-1"
                    >
                      {link.targetTopic.title}{" "}
                      <ChevronRight className="w-3 h-3" />
                    </h4>
                    {link.notes && (
                      <p className="text-[11px] text-stone-500">{link.notes}</p>
                    )}
                  </div>

                  <button
                    onClick={() => removeKnowledgeLink(link.id)}
                    className="text-stone-400 hover:text-rose-700 p-1"
                    title="Xóa liên kết"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {linkedTopics.length === 0 && (
              <div className="col-span-2 text-center py-6 text-stone-400 text-xs">
                Chưa có liên kết tri thức nào được thiết lập. Hãy tạo liên kết
                giữa các chủ đề liên quan để biểu đồ tri thức phong phú hơn!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Tài liệu đính kèm (Resources) */}
      {activeTab === "resources" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              Tài liệu &amp; Nguồn tham khảo ({topicResources.length})
            </h3>
            <button
              onClick={() => setShowResourceModal(true)}
              className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Thêm tài liệu
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topicResources.map((res) => (
              <div
                key={res.id}
                className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between hover:border-indigo-300 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-stone-500">
                    <span className="font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded">
                      {res.type.toUpperCase()}
                    </span>
                    <span>{formatTimeAgo(res.createdAt)}</span>
                  </div>
                  <h4 className="font-bold text-stone-900 text-sm line-clamp-2">
                    {res.title}
                  </h4>
                  {res.author && (
                    <p className="text-xs text-stone-600">
                      Tác giả: <span className="font-medium">{res.author}</span>
                    </p>
                  )}
                  {res.notes && (
                    <p className="text-xs text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-100">
                      {res.notes}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={() => setViewingResource(res)}
                    className="px-3 py-1 bg-stone-100 hover:bg-indigo-50 text-indigo-900 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    Xem tài liệu
                  </button>

                  <div className="flex items-center gap-1">
                    {(() => {
                      const resolution = resolveResourceOpenTarget(res);
                      if (!resolution.canOpenDirectly || !resolution.targetUrl) return null;
                      return (
                        <a
                          href={resolution.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-stone-400 hover:text-stone-700"
                          title={resolution.label}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      );
                    })()}
                    <button
                      onClick={() => {
                        if (window.confirm("Xóa tài liệu này?"))
                          deleteResource(res.id);
                      }}
                      className="p-1 text-stone-400 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {topicResources.length === 0 && (
              <div className="col-span-2">
                <EmptyState
                  icon={Library}
                  title="Chưa có tài liệu đính kèm cho chủ đề này"
                  description="Đính kèm tài liệu PDF, sách tham khảo cổ học hoặc liên kết số hóa phục vụ khảo cứu."
                  primaryAction={{
                    label: "Thêm tài liệu mới",
                    onClick: () => setShowResourceModal(true),
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <NoteFormModal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          setEditingNote(null);
        }}
        defaultTopicId={topic.id}
        initialNote={editingNote}
      />
      <ResourceFormModal
        isOpen={showResourceModal}
        onClose={() => setShowResourceModal(false)}
        defaultTopicId={topic.id}
      />
      <TopicFormModal
        isOpen={showEditTopicModal}
        onClose={() => setShowEditTopicModal(false)}
        initialTopic={topic}
      />
      <SpacedReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        initialTopic={topic}
      />
      <StudyTimerModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        defaultTopicId={topic.id}
      />
      <ResourceViewerModal
        resource={viewingResource}
        onClose={() => setViewingResource(null)}
      />

      {showObsidianModal && (
        <React.Suspense fallback={null}>
          <ObsidianBridgeModal
            isOpen={showObsidianModal}
            onClose={() => setShowObsidianModal(false)}
            topic={topic}
          />
        </React.Suspense>
      )}

      {showNotebookLMModal && (
        <React.Suspense fallback={null}>
          <NotebookLMStudioModal
            isOpen={showNotebookLMModal}
            onClose={() => setShowNotebookLMModal(false)}
            topic={topic}
          />
        </React.Suspense>
      )}

      {showAntigravityModal && (
        <React.Suspense fallback={null}>
          <AntigravityHandoffModal
            isOpen={showAntigravityModal}
            onClose={() => setShowAntigravityModal(false)}
            topic={topic}
          />
        </React.Suspense>
      )}

      {showAIStudioModal && (
        <React.Suspense fallback={null}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <div className="w-full max-w-4xl max-h-[90vh]">
              <AIResearchStudio
                currentTopic={topic}
                onClose={() => setShowAIStudioModal(false)}
              />
            </div>
          </div>
        </React.Suspense>
      )}
    </div>
  );
}
