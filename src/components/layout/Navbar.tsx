import React, { useState } from "react";
import { useData } from "../../context/DataContext";
import {
  Search,
  Plus,
  Play,
  Timer,
  Download,
  Brain,
  Sparkles,
  BookOpen,
  FileText,
  Keyboard,
  ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { SyncStatusBadge } from "../ui/SyncStatusBadge";
import { TopicFormModal } from "../modals/TopicFormModal";
import { NoteFormModal } from "../modals/NoteFormModal";
import { ResourceFormModal } from "../modals/ResourceFormModal";
import { StudyTimerModal } from "../modals/StudyTimerModal";
import { SpacedReviewModal } from "../modals/SpacedReviewModal";
import { ExportImportModal } from "../modals/ExportImportModal";
import { Resource } from "../../types";
import { FileViewer } from "../docs/FileViewer";

const ObsidianVaultBrowserModal = React.lazy(() =>
  import("../modals/ObsidianVaultBrowserModal").then((m) => ({
    default: m.ObsidianVaultBrowserModal,
  }))
);
const ObsidianDocumentViewerModal = React.lazy(() =>
  import("../modals/ObsidianDocumentViewerModal").then((m) => ({
    default: m.ObsidianDocumentViewerModal,
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

export interface NavbarProps {
  onOpenCommandPalette?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenNotebookLMModal?: () => void;
  onOpenAntigravityModal?: () => void;
}

export function Navbar({
  onOpenCommandPalette,
  onOpenShortcutsModal,
  onOpenNotebookLMModal,
  onOpenAntigravityModal,
}: NavbarProps = {}) {
  const {
    searchQuery,
    setSearchQuery,
    setActiveTab,
    isTimerRunning,
    timerSeconds,
    activeTimerTopicId,
    topics,
    reviewQueue,
  } = useData();

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showObsidianBrowserModal, setShowObsidianBrowserModal] = useState(false);
  const [viewingObsidianResource, setViewingObsidianResource] = useState<Resource | null>(null);
  const [activeEpubFile, setActiveEpubFile] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [showNotebookLMModal, setShowNotebookLMModal] = useState(false);
  const [showAntigravityModal, setShowAntigravityModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);

  const activeTopic = topics.find((t) => t.id === activeTimerTopicId);

  const formatTimerMinSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab("search");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 px-3.5 lg:px-6 py-2.5 select-none">
        <div className="flex items-center justify-between gap-3 sm:gap-4 max-w-7xl mx-auto">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-800 dark:bg-amber-700 text-amber-50 flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base tracking-tight leading-none font-serif-title">
                  Nghiên Cứu
                </h1>
                <span className="hidden sm:inline text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 rounded-md border border-amber-300/80 dark:border-amber-700/80">
                  Workbench
                </span>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 hidden sm:block leading-tight mt-0.5">
                Hệ thống hóa tri thức đa môn &amp; không gian nghiên cứu
              </p>
            </div>
          </div>

          {/* Quick Search with Command Palette Hotkey Trigger */}
          <div className="flex-1 max-w-md hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm chủ đề, ghi chú, tài liệu, liên kết..."
                className="w-full pl-9 pr-14 py-1.5 text-xs bg-white dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-700/40 focus:border-amber-700 dark:focus:border-amber-500 transition shadow-2xs"
              />
              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  className="hidden sm:inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700/70 border border-stone-200 dark:border-stone-600 rounded-md absolute right-2 top-1/2 -translate-y-1/2 hover:text-amber-800 dark:hover:text-amber-300 transition cursor-pointer"
                  title="Mở thanh lệnh (Ctrl/Cmd + K)"
                >
                  ⌘K
                </button>
              )}
            </form>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Spaced Review Due Queue button */}
            {reviewQueue.length > 0 && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition animate-pulse cursor-pointer"
                title="Hôm nay có chủ đề cần ôn tập lại (SM-2)"
              >
                <Brain className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ôn tập</span>
                <span className="w-4 h-4 bg-amber-900 text-amber-100 rounded-full text-[10px] flex items-center justify-center font-bold tabular-nums">
                  {reviewQueue.length}
                </span>
              </button>
            )}

            {/* Live Study Timer CTA Pill */}
            <button
              onClick={() => setShowTimerModal(true)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition border shadow-2xs cursor-pointer ${
                isTimerRunning
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 animate-pulse"
                  : "bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
              }`}
              title={isTimerRunning ? "Đang đếm giờ học - Nhấn để quản lý" : "Khởi động phiên tính giờ học"}
            >
              {isTimerRunning ? (
                <Timer className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current text-amber-700 dark:text-amber-400" />
              )}
              <span className="font-mono font-bold tabular-nums">
                {formatTimerMinSec(timerSeconds)}
              </span>
              {isTimerRunning && activeTopic ? (
                <span className="hidden lg:inline text-[10px] font-normal truncate max-w-[90px] opacity-90">
                  ({activeTopic.title})
                </span>
              ) : (
                <span className="hidden sm:inline text-[10px] font-medium text-stone-500 dark:text-stone-400">
                  Vào học
                </span>
              )}
            </button>

            {/* Subordinated Integration Triggers */}
            <button
              onClick={() => setShowObsidianBrowserModal(true)}
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 text-stone-600 dark:text-stone-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-xs transition cursor-pointer"
              title="Duyệt Obsidian Vault"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <span className="text-[11px] font-medium">Obsidian</span>
            </button>

            <button
              onClick={() => {
                if (onOpenNotebookLMModal) {
                  onOpenNotebookLMModal();
                } else {
                  setShowNotebookLMModal(true);
                }
              }}
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 text-stone-600 dark:text-stone-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-xs transition cursor-pointer"
              title="Đóng gói Google NotebookLM & Audio Overview"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span className="text-[11px] font-medium">NotebookLM</span>
            </button>

            <button
              onClick={() => {
                if (onOpenAntigravityModal) {
                  onOpenAntigravityModal();
                } else {
                  setShowAntigravityModal(true);
                }
              }}
              className="hidden lg:flex items-center gap-1.5 px-2 py-1 text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-xs transition cursor-pointer"
              title="Đóng gói Antigravity AI Handoff Bundle"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span className="text-[11px] font-medium">Handoff</span>
            </button>

            {/* Sync Queue Status Indicator */}
            <SyncStatusBadge />

            {/* Dark / Light Theme Toggle */}
            <ThemeToggle />

            {/* Shortcuts Modal Trigger */}
            {onOpenShortcutsModal && (
              <button
                type="button"
                onClick={onOpenShortcutsModal}
                className="hidden sm:flex p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
                title="Bảng tra cứu phím tắt (?)"
                aria-label="Mở bảng phím tắt"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            )}

            {/* Export / Backup modal trigger */}
            <button
              onClick={() => setShowExportModal(true)}
              className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition cursor-pointer"
              title="Sao lưu / Xuất dữ liệu"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Quick Add Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-amber-50 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer border border-amber-900/60"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tạo Mới</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {showQuickAddMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowQuickAddMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl z-50 py-1.5 text-xs text-stone-800 dark:text-stone-200 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setShowQuickAddMenu(false);
                        setShowTopicModal(true);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <span>Thêm Chủ Đề Mới</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickAddMenu(false);
                        setShowNoteModal(true);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>Thêm Ghi Chú</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickAddMenu(false);
                        setShowResourceModal(true);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                      <span>Thêm Tài Liệu</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Modals */}
      <TopicFormModal
        isOpen={showTopicModal}
        onClose={() => setShowTopicModal(false)}
      />
      <NoteFormModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
      />
      <ResourceFormModal
        isOpen={showResourceModal}
        onClose={() => setShowResourceModal(false)}
      />
      <ExportImportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
      {showObsidianBrowserModal && (
        <React.Suspense fallback={null}>
          <ObsidianVaultBrowserModal
            isOpen={showObsidianBrowserModal}
            onClose={() => setShowObsidianBrowserModal(false)}
            onSelectFile={(filePath) => {
              setShowObsidianBrowserModal(false);
              const fileName = filePath.split("/").pop() || filePath;
              if (filePath.toLowerCase().endsWith(".epub")) {
                setActiveEpubFile({
                  fileName,
                  fileUrl: `/api/obsidian/vault/attachment?path=${encodeURIComponent(filePath)}`,
                });
                return;
              }
              const previewResource: Resource = {
                id: "preview-" + filePath,
                topicId: "",
                title: fileName,
                type: "md",
                filePath,
                createdAt: new Date().toISOString(),
              };
              setViewingObsidianResource(previewResource);
            }}
          />
        </React.Suspense>
      )}
      {viewingObsidianResource && (
        <React.Suspense fallback={null}>
          <ObsidianDocumentViewerModal
            isOpen={Boolean(viewingObsidianResource)}
            onClose={() => setViewingObsidianResource(null)}
            resource={viewingObsidianResource}
          />
        </React.Suspense>
      )}
      {activeEpubFile && (
        <FileViewer
          fileUrl={activeEpubFile.fileUrl}
          fileName={activeEpubFile.fileName}
          onClose={() => setActiveEpubFile(null)}
        />
      )}
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
      <StudyTimerModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
      />
      <SpacedReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
      />
    </>
  );
}
