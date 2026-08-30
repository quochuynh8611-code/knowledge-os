import React, { useState, useMemo } from "react";
import { DataProvider, useData } from "./context/DataContext";
import { AppErrorBoundary } from "./components/error/AppErrorBoundary";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import { DashboardHome } from "./components/dashboard/DashboardHome";
import { TopicTree } from "./components/topics/TopicTree";
import { TopicDetail } from "./components/topics/TopicDetail";
import { NotesManager } from "./components/notes/NotesManager";
import { ResourcesManager } from "./components/resources/ResourcesManager";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useTheme } from "./hooks/useTheme";
import { CommandPalette } from "./components/search/CommandPalette";
import { ShortcutsModal } from "./components/modals/ShortcutsModal";
import {
  LayoutDashboard,
  FolderTree,
  Share2,
  TrendingUp,
  FileText,
  Library,
  Search,
  Sparkles,
  Brain,
} from "lucide-react";
import {
  useCommandPalette,
  CommandPaletteItem,
} from "./hooks/useCommandPalette";
import { ActiveLearningSessionBar } from "./components/dashboard/ActiveLearningSessionBar";
import { SessionWrapupModal } from "./components/modals/SessionWrapupModal";

// Lazy-loaded heavy & specialized workspace tabs
const KnowledgeGraph = React.lazy(() =>
  import("./components/graph/KnowledgeGraph").then((m) => ({
    default: m.KnowledgeGraph,
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
const AbhidharmaMatrix = React.lazy(() =>
  import("./components/matrix/AbhidharmaMatrix").then((m) => ({
    default: m.AbhidharmaMatrix,
  }))
);
const DivinationMatrix = React.lazy(() =>
  import("./components/matrix/DivinationMatrix").then((m) => ({
    default: m.DivinationMatrix,
  }))
);
const MultilingualLexicon = React.lazy(() =>
  import("./components/lexicon/MultilingualLexicon").then((m) => ({
    default: m.MultilingualLexicon,
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

function TabLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-stone-400 dark:text-stone-500 animate-pulse">
      <div className="w-8 h-8 rounded-full border-2 border-amber-600/30 border-t-amber-600 animate-spin mb-3" />
      <span className="text-xs font-semibold tracking-wide text-stone-500 dark:text-stone-400">
        Đang nạp không gian nghiên cứu...
      </span>
    </div>
  );
}

function AppContent() {
  const { activeTab, setActiveTab, selectedTopicId, openTopicDetail,
    activeTimerTopicId, timerSeconds, isTimerRunning,
    pauseStudyTimer, resumeStudyTimer, stopAndSaveStudyTimer,
    logStudyTime, topics, addNote, updateTopicProgress,
  } = useData();
  const { toggleTheme } = useTheme();
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showNotebookLMModal, setShowNotebookLMModal] = useState(false);
  const [showAntigravityModal, setShowAntigravityModal] = useState(false);
  const [showWrapupModal, setShowWrapupModal] = useState(false);

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
    ],
    []
  );

  // Command Palette hook
  const palette = useCommandPalette({
    customItems: customPaletteItems,
    onNavigateTab: (tab) => setActiveTab(tab as any),
    onOpenTopic: (id) => openTopicDetail(id),
    onToggleTheme: () => toggleTheme(),
  });

  // Global Keyboard Shortcuts hook
  useKeyboardShortcuts({
    onOpenCommandPalette: palette.openPalette,
    onOpenShortcutsModal: () => setShowShortcutsModal(true),
    onCloseModals: () => {
      palette.closePalette();
      setShowShortcutsModal(false);
    },
    onNavigateTab: (tab) => setActiveTab(tab as any),
  });

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardHome />;
      case "topics":
        return selectedTopicId ? <TopicDetail /> : <TopicTree />;
      case "graph":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <KnowledgeGraph />
          </React.Suspense>
        );
      case "progress":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <StudyProgressView />
          </React.Suspense>
        );
      case "notes":
        return <NotesManager />;
      case "resources":
        return <ResourcesManager />;
      case "search":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <AdvancedSearch />
          </React.Suspense>
        );
      case "ai_studio":
        return (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <React.Suspense fallback={<TabLoadingFallback />}>
              <AIResearchStudio />
            </React.Suspense>
          </div>
        );
      case "abhidharma_matrix":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <AbhidharmaMatrix />
          </React.Suspense>
        );
      case "divination_matrix":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <DivinationMatrix />
          </React.Suspense>
        );
      case "lexicon":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <MultilingualLexicon />
          </React.Suspense>
        );
      case "docs":
        return (
          <React.Suspense fallback={<TabLoadingFallback />}>
            <DocsExplorerView />
          </React.Suspense>
        );
      default:
        return <DashboardHome />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-950">
      {/* Top Navigation */}
      <Navbar
        onOpenCommandPalette={palette.openPalette}
        onOpenShortcutsModal={() => setShowShortcutsModal(true)}
        onOpenNotebookLMModal={() => setShowNotebookLMModal(true)}
        onOpenAntigravityModal={() => setShowAntigravityModal(true)}
      />

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto pb-16 md:pb-0">
        {/* Desktop & Tablet Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Dynamic Center Stage */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {renderActiveTab()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-100/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 flex items-center justify-around py-2 px-1">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition ${
            activeTab === "dashboard"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Tổng quan</span>
        </button>

        <button
          onClick={() => setActiveTab("topics")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition ${
            activeTab === "topics"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Chủ đề</span>
        </button>

        <button
          onClick={() => setActiveTab("graph")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition ${
            activeTab === "graph"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Đồ thị</span>
        </button>

        <button
          onClick={() => setActiveTab("progress")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition ${
            activeTab === "progress"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Tiến độ</span>
        </button>

        <button
          onClick={() => setActiveTab("notes")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition ${
            activeTab === "notes"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Ghi chú</span>
        </button>
      </nav>

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

      {/* Global Phase 5 Integration Modals */}
      {showNotebookLMModal && (
        <React.Suspense fallback={null}>
          <NotebookLMStudioModal
            isOpen={showNotebookLMModal}
            onClose={() => setShowNotebookLMModal(false)}
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

      {/* Global Phase 17: Active Learning Session Bar */}
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

      {/* Global Phase 17: Session Wrapup Modal */}
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
    </div>
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
