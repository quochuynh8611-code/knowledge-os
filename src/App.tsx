import React, { useState, useMemo } from "react";
import { DataProvider, useData } from "./context/DataContext";
import { AppErrorBoundary } from "./components/error/AppErrorBoundary";
import { AppShell } from "./components/layout/AppShell";
import { DashboardHome } from "./components/dashboard/DashboardHome";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useTheme } from "./hooks/useTheme";
import { CommandPalette } from "./components/search/CommandPalette";
import { ShortcutsModal } from "./components/modals/ShortcutsModal";
import { QuickCaptureModal } from "./components/modals/QuickCaptureModal";
import type { ResearchExcerpt } from "./types";
import {
  LayoutDashboard,
  FolderTree,
  Share2,
  TrendingUp,
  FileText,
  Search,
  Sparkles,
  Brain,
  Zap,
  Copy,
} from "lucide-react";
import {
  useCommandPalette,
  CommandPaletteItem,
} from "./hooks/useCommandPalette";
import { ActiveLearningSessionBar } from "./components/dashboard/ActiveLearningSessionBar";
import { SessionWrapupModal } from "./components/modals/SessionWrapupModal";
import { resolveDefaultRuntimeStatus } from "./components/integrations/notebooklm/runtimeBridgeConfig";

// Lazy-loaded heavy & specialized workspace tabs
const TopicTree = React.lazy(() =>
  import("./components/topics/TopicTree").then((m) => ({
    default: m.TopicTree,
  }))
);
const TopicDetail = React.lazy(() =>
  import("./components/topics/TopicDetail").then((m) => ({
    default: m.TopicDetail,
  }))
);
const NotesManager = React.lazy(() =>
  import("./components/notes/NotesManager").then((m) => ({
    default: m.NotesManager,
  }))
);
const ResourcesManager = React.lazy(() =>
  import("./components/resources/ResourcesManager").then((m) => ({
    default: m.ResourcesManager,
  }))
);
const KnowledgeGraph = React.lazy(() =>
  import("./components/graph/KnowledgeGraph").then((m) => ({
    default: m.KnowledgeGraph,
  }))
);
const MindMapView = React.lazy(() =>
  import("./components/mindmap/MindMapView").then((m) => ({
    default: m.MindMapView,
  }))
);
const StudyProgressView = React.lazy(() =>
  import("./components/progress/StudyProgressView").then((m) => ({
    default: m.StudyProgressView,
  }))
);
const AdvancedSearch = React.lazy(() =>
  import("./components/search/AdvancedSearch").then((m) => ({
    default: m.AdvancedSearch,
  }))
);
const AIResearchStudio = React.lazy(() =>
  import("./components/ai/AIResearchStudio").then((m) => ({
    default: m.AIResearchStudio,
  }))
);
const DocsExplorerView = React.lazy(() =>
  import("./components/docs/DocsExplorerView").then((m) => ({
    default: m.DocsExplorerView,
  }))
);
const NotebookLMStudioModal = React.lazy(() =>
  import("./components/integrations/NotebookLMStudioModal").then((m) => ({
    default: m.NotebookLMStudioModal,
  }))
);
const AntigravityHandoffModal = React.lazy(() =>
  import("./components/integrations/AntigravityHandoffModal").then((m) => ({
    default: m.AntigravityHandoffModal,
  }))
);
const FlashcardReviewStudio = React.lazy(() =>
  import("./components/flashcards/FlashcardReviewStudio").then((m) => ({
    default: m.FlashcardReviewStudio,
  }))
);
const CardBrowser = React.lazy(() =>
  import("./components/flashcards/CardBrowser").then((m) => ({
    default: m.CardBrowser,
  }))
);
const StudyLauncher = React.lazy(() =>
  import("./components/flashcards/StudyLauncher").then((m) => ({
    default: m.StudyLauncher,
  }))
);
const FlashcardAnalyticsDashboard = React.lazy(() =>
  import("./components/flashcards/FlashcardAnalyticsDashboard").then((m) => ({
    default: m.FlashcardAnalyticsDashboard,
  }))
);
const DuplicateDetectionDashboard = React.lazy(() =>
  import("./components/flashcards/DuplicateDetectionDashboard").then((m) => ({
    default: m.DuplicateDetectionDashboard,
  }))
);

function TabLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-stone-400 dark:text-stone-500 animate-pulse">
      <div className="w-8 h-8 rounded-full border-2 border-amber-600/30 border-t-amber-600 animate-spin mb-3" />
      <span className="text-xs font-semibold tracking-wide text-stone-500 dark:text-stone-400 font-sans">
        Đang nạp không gian nghiên cứu...
      </span>
    </div>
  );
}

function AppContent() {
  const {
    activeTab,
    setActiveTab,
    selectedTopicId,
    openTopicDetail,
    subView,
    sessionType,
    openFlashcardReview,
    openCardBrowser,
    openStudyLauncher,
    openFlashcardAnalytics,
    openDuplicateDetection,
    activeTimerTopicId,
    timerSeconds,
    isTimerRunning,
    pauseStudyTimer,
    resumeStudyTimer,
    stopAndSaveStudyTimer,
    logStudyTime,
    topics,
    addNote,
    updateTopicProgress,
    addExcerptToInbox,
  } = useData();
  const { toggleTheme } = useTheme();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showQuickCaptureModal, setShowQuickCaptureModal] = useState(false);
  const [showNotebookLMModal, setShowNotebookLMModal] = useState(false);
  const [showAntigravityModal, setShowAntigravityModal] = useState(false);
  const [showWrapupModal, setShowWrapupModal] = useState(false);

  const handleSaveQuickCapture = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const excerpt: ResearchExcerpt = {
      id: `excerpt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      archivedDocumentId: "quick-capture",
      topicId: null,
      targetNoteId: null,
      selectedText: trimmed,
      contextPrefix: null,
      contextSuffix: null,
      positionSelector: {},
      highlightColor: "#f59e0b",
      citationSnapshot: {
        title: "Ghi chú chớp nhoáng",
        author: "Quick Capture",
      },
      userNote: null,
      status: "inbox",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addExcerptToInbox(excerpt);
  };

  const customPaletteItems: CommandPaletteItem[] = useMemo(
    () => [
      {
        id: "act-open-notebooklm",
        title: "Mở NotebookLM Studio",
        description:
          "Sinh bản đồ tri thức, podcast âm thanh và câu hỏi trắc nghiệm",
        category: "Hành động nhanh",
        icon: Sparkles,
        keywords: [
          "notebooklm",
          "studio",
          "gemini",
          "ai podcast",
          "audio overview",
          "study guide",
          "tong hop",
        ],
        action: () => setShowNotebookLMModal(true),
      },
      {
        id: "act-open-antigravity",
        title: "Chuẩn Bị Antigravity Handoff",
        description:
          "Đóng gói bối cảnh khảo cứu gửi Antigravity AI Scholar (.agents/handoffs/)",
        category: "Hành động nhanh",
        icon: Brain,
        keywords: [
          "antigravity",
          "handoff",
          "ai scholar",
          "agent",
          "xuat goi",
          "chuyen giao",
        ],
        action: () => setShowAntigravityModal(true),
      },
      {
        id: "act-open-flashcards",
        title: "Ôn Tập Thẻ Nhớ (Flashcards)",
        description:
          "Thu hồi chủ động (Active Recall) với thuật toán ngắt quãng SM-2",
        category: "Hành động nhanh",
        icon: Brain,
        keywords: [
          "flashcards",
          "the nho",
          "on tap",
          "review",
          "spaced repetition",
          "active recall",
          "sm2",
        ],
        action: () => setActiveTab("flashcards"),
      },
      {
        id: "act-open-mindmap",
        title: selectedTopicId
          ? `Mở Sơ Đồ Tư Duy: ${topics.find((t) => t.id === selectedTopicId)?.title || "Chủ đề hiện tại"}`
          : "Mở Sơ Đồ Tư Duy (Mind Map)",
        description: selectedTopicId
          ? "Trực quan hóa cấu trúc tri thức cho chủ đề đang chọn"
          : "Khám phá sơ đồ tư duy phân cấp và xuất Markdown",
        category: "Hành động nhanh",
        icon: Share2,
        keywords: [
          "mindmap",
          "so do tu duy",
          "mind map",
          "so do",
          "xuat markdown",
        ],
        action: () => setActiveTab("mindmap"),
      },
    ],
    [setActiveTab, selectedTopicId, topics]
  );

  // Command Palette hook
  const palette = useCommandPalette({
    customItems: customPaletteItems,
    onNavigateTab: (tab) => setActiveTab(tab as any),
    onOpenTopic: (id) => openTopicDetail(id),
    onToggleTheme: () => toggleTheme(),
    onOpenQuickCapture: () => setShowQuickCaptureModal(true),
  });

  // Global Keyboard Shortcuts hook
  useKeyboardShortcuts({
    onOpenCommandPalette: palette.openPalette,
    onOpenQuickCapture: () => setShowQuickCaptureModal(true),
    onOpenShortcutsModal: () => setShowShortcutsModal(true),
    onCloseModals: () => {
      palette.closePalette();
      setShowShortcutsModal(false);
      setShowQuickCaptureModal(false);
    },
    onNavigateTab: (tab) => setActiveTab(tab as any),
  });

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardHome />;
      case "topics":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            {selectedTopicId ? <TopicDetail /> : <TopicTree />}
          </React.Suspense>
        );
      case "graph":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <KnowledgeGraph />
          </React.Suspense>
        );
      case "mindmap":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <MindMapView />
          </React.Suspense>
        );
      case "progress":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <StudyProgressView />
          </React.Suspense>
        );
      case "notes":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <NotesManager />
          </React.Suspense>
        );
      case "resources":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <ResourcesManager />
          </React.Suspense>
        );
      case "search":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <AdvancedSearch />
          </React.Suspense>
        );
      case "ai_studio":
        return (
          <div className="py-4 md:py-8 w-full">
            <React.Suspense fallback={<TabLoadingFallback />}>
              <AIResearchStudio />
            </React.Suspense>
          </div>
        );
      case "library":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <DocsExplorerView mode="epub-only" />
          </React.Suspense>
        );
      case "flashcards":
        if (subView === "duplicates") {
          return (
            <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
              <React.Suspense fallback={<TabLoadingFallback />}>
                <DuplicateDetectionDashboard
                  topicId={selectedTopicId || undefined}
                />
              </React.Suspense>
            </div>
          );
        }
        if (subView === "analytics") {
          return (
            <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
              <React.Suspense fallback={<TabLoadingFallback />}>
                <FlashcardAnalyticsDashboard
                  topicId={selectedTopicId || undefined}
                  onLaunchSession={(st) => {
                    openFlashcardReview(selectedTopicId, st);
                  }}
                />
              </React.Suspense>
            </div>
          );
        }
        if (subView === "launch") {
          return (
            <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
              <React.Suspense fallback={<TabLoadingFallback />}>
                <StudyLauncher
                  topicId={selectedTopicId || undefined}
                  onLaunchSession={(st) => {
                    openFlashcardReview(selectedTopicId, st);
                  }}
                  onOpenBrowser={() => {
                    openCardBrowser(selectedTopicId);
                  }}
                />
              </React.Suspense>
            </div>
          );
        }
        if (subView === "browse") {
          return (
            <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                    Trình Duyệt Thẻ Nhớ (Card Browser)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openStudyLauncher(selectedTopicId)}
                    className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-stone-200 dark:border-stone-700"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Khởi tạo học</span>
                  </button>
                  <button
                    onClick={() => openFlashcardReview(selectedTopicId)}
                    className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Chuyển sang Ôn tập</span>
                  </button>
                </div>
              </div>
              <React.Suspense fallback={<TabLoadingFallback />}>
                <CardBrowser
                  topicId={selectedTopicId || undefined}
                  onClose={() => {
                    if (selectedTopicId) {
                      openTopicDetail(selectedTopicId);
                    } else {
                      setActiveTab("dashboard");
                    }
                  }}
                />
              </React.Suspense>
            </div>
          );
        }
        return (
          <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => openDuplicateDetection(selectedTopicId)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-stone-200 dark:border-stone-700"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Trùng lặp</span>
              </button>
              <button
                onClick={() => openFlashcardAnalytics(selectedTopicId)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-stone-200 dark:border-stone-700"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Phân tích</span>
              </button>
              <button
                onClick={() => openStudyLauncher(selectedTopicId)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-stone-200 dark:border-stone-700"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Khởi tạo học</span>
              </button>
              <button
                onClick={() => openCardBrowser(selectedTopicId)}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-stone-200 dark:border-stone-700"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Duyệt danh sách thẻ</span>
              </button>
            </div>
            <React.Suspense fallback={<TabLoadingFallback />}>
              <FlashcardReviewStudio
                topicId={selectedTopicId || undefined}
                sessionType={sessionType || undefined}
                onClose={() => {
                  if (selectedTopicId) {
                    openTopicDetail(selectedTopicId);
                  } else {
                    setActiveTab("dashboard");
                  }
                }}
              />
            </React.Suspense>
          </div>
        );
      default:
        return <DashboardHome />;
    }
  };

  return (
    <>
      {/* App Shell: Collapsible Left Sidebar + Central Stage + Mobile Bottom Nav */}
      <AppShell
        onOpenCommandPalette={palette.openPalette}
        onOpenShortcutsModal={() => setShowShortcutsModal(true)}
        onOpenNotebookLMModal={() => setShowNotebookLMModal(true)}
        onOpenAntigravityModal={() => setShowAntigravityModal(true)}
      >
        {renderActiveTab()}
      </AppShell>

      {/* Global Phase 1 Modals */}
      <CommandPalette
        isOpen={palette.isOpen}
        onClose={palette.closePalette}
        query={palette.query}
        onQueryChange={palette.setQuery}
        items={palette.filteredItems}
        selectedIndex={palette.selectedIndex}
        onSelectIndex={palette.setSelectedIndex}
        onExecuteItem={palette.executeItem}
      />
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
      <QuickCaptureModal
        isOpen={showQuickCaptureModal}
        onClose={() => setShowQuickCaptureModal(false)}
        onSave={handleSaveQuickCapture}
      />

      {/* Global Phase 5 Integration Modals */}
      {showNotebookLMModal && (
        <React.Suspense fallback={null}>
          <NotebookLMStudioModal
            isOpen={showNotebookLMModal}
            onClose={() => setShowNotebookLMModal(false)}
            runtimeStatus={resolveDefaultRuntimeStatus({ isConfigured: true })}
          />
        </React.Suspense>
      )}
      {showAntigravityModal && (
        <React.Suspense fallback={null}>
          <AntigravityHandoffModal
            isOpen={showAntigravityModal}
            onClose={() => setShowAntigravityModal(false)}
          />
        </React.Suspense>
      )}

      {/* Global Active Learning Session Bar */}
      {activeTimerTopicId && (
        <ActiveLearningSessionBar
          topicId={activeTimerTopicId}
          topicTitle={topics.find((t) => t.id === activeTimerTopicId)?.title ?? ''}
          timerSeconds={timerSeconds}
          isTimerRunning={isTimerRunning}
          onPause={pauseStudyTimer}
          onResume={resumeStudyTimer}
          onOpenWrapup={() => setShowWrapupModal(true)}
          onNavigateToTopic={(id) => openTopicDetail(id)}
        />
      )}

      {/* Global Session Wrapup Modal */}
      {showWrapupModal && (() => {
        const activeTopic = topics.find((t) => t.id === activeTimerTopicId);
        if (!activeTopic) return null;
        const minutesSpent = Math.max(1, Math.round(timerSeconds / 60));
        return (
          <SessionWrapupModal
            isOpen={showWrapupModal}
            topic={activeTopic}
            minutesSpent={minutesSpent}
            onClose={() => setShowWrapupModal(false)}
            onSaveWrapup={({ progress, status, takeaway }) => {
              // 1. Log accumulated time then stop timer
              logStudyTime(activeTimerTopicId!, minutesSpent);
              stopAndSaveStudyTimer();
              // 2. Update progress
              updateTopicProgress(activeTimerTopicId!, progress, status);
              // 3. Conditional note creation — only when takeaway is non-empty
              if (takeaway && takeaway.trim().length > 0) {
                const today = new Date().toLocaleDateString('vi-VN');
                addNote({
                  topicId: activeTimerTopicId!,
                  topicTitle: activeTopic.title,
                  title: `Đúc kết: ${activeTopic.title} (${today})`,
                  content: takeaway.trim(),
                  type: 'insight',
                  isPrivate: false,
                  tags: ['Takeaway', 'StudySession'],
                });
              }
              setShowWrapupModal(false);
            }}
          />
        );
      })()}
    </>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AppErrorBoundary>
  );
}

export default App;
