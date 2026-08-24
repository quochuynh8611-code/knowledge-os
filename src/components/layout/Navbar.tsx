import React, { useState } from "react";
import { useData } from "../../context/DataContext";
import {
  Search,
  Plus,
  Play,
  Pause,
  Timer,
  Download,
  Brain,
  Sparkles,
  BookOpen,
  HelpCircle,
  FileText,
  Keyboard,
} from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { TopicFormModal } from "../modals/TopicFormModal";
import { NoteFormModal } from "../modals/NoteFormModal";
import { ResourceFormModal } from "../modals/ResourceFormModal";
import { ExportImportModal } from "../modals/ExportImportModal";
import { StudyTimerModal } from "../modals/StudyTimerModal";
import { SpacedReviewModal } from "../modals/SpacedReviewModal";
import { ObsidianBridgeModal } from "../integrations/ObsidianBridgeModal";
import { NotebookLMStudioModal } from "../integrations/NotebookLMStudioModal";
import { AntigravityHandoffModal } from "../integrations/AntigravityHandoffModal";

export interface NavbarProps {
  onOpenCommandPalette?: () => void;
  onOpenShortcutsModal?: () => void;
}

export function Navbar({
  onOpenCommandPalette,
  onOpenShortcutsModal,
}: NavbarProps = {}) {
  const {
    searchQuery,
    setSearchQuery,
    setActiveTab,
    isTimerRunning,
    timerSeconds,
    activeTimerTopicId,
    topics,
    stats,
    reviewQueue,
  } = useData();

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showObsidianModal, setShowObsidianModal] = useState(false);
  const [showNotebookLMModal, setShowNotebookLMModal] = useState(false);
  const [showAntigravityModal, setShowAntigravityModal] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);

  const activeTopic = topics.find((t) => t.id === activeTimerTopicId);

  const formatTimerMinSec = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-800 text-amber-50 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base tracking-tight leading-tight flex items-center gap-2">
                Nghiên Cứu Phật Học &amp; Huyền Học
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700">
                  Knowledge OS
                </span>
              </h1>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block">
                Hệ thống hóa Abhidharma, Tam Tạng, Thiền định &amp; Huyền học
                phương Đông
              </p>
            </div>
          </div>

          {/* Quick Search with Command Palette Hotkey Trigger */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length > 0) {
                    setActiveTab("search");
                  }
                }}
                placeholder="Tìm nhanh: Abhidharma, Kỳ Môn, Tứ Niệm Xứ, Quẻ Dịch..."
                className="w-full pl-9 pr-14 py-1.5 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-700/50 transition"
              />
              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  className="hidden sm:inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700/60 border border-stone-200 dark:border-stone-600 rounded-md absolute right-2.5 top-1/2 -translate-y-1/2 hover:text-amber-800 dark:hover:text-amber-300 transition cursor-pointer"
                  title="Mở thanh lệnh (Ctrl/Cmd + K)"
                >
                  ⌘K
                </button>
              )}
            </div>
          </div>

          {/* Right Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Spaced Review Due Queue button */}
            {reviewQueue.length > 0 && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-semibold border border-amber-300 dark:border-amber-700 transition"
                title="Hôm nay có chủ đề cần ôn tập lại"
              >
                <Brain className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />
                <span className="hidden sm:inline">Ôn tập SM-2</span>
                <span className="w-4 h-4 bg-amber-800 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {reviewQueue.length}
                </span>
              </button>
            )}

            {/* Live Study Timer Pill */}
            <button
              onClick={() => setShowTimerModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                isTimerRunning
                  ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 animate-pulse"
                  : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700"
              }`}
            >
              <Timer
                className={`w-3.5 h-3.5 ${isTimerRunning ? "text-emerald-700 animate-spin" : "text-stone-500"}`}
              />
              <span className="font-mono">
                {formatTimerMinSec(timerSeconds)}
              </span>
              {isTimerRunning && activeTopic && (
                <span className="hidden lg:inline text-[10px] font-normal text-emerald-800 truncate max-w-[90px]">
                  ({activeTopic.title})
                </span>
              )}
            </button>

            {/* Obsidian Vault trigger */}
            <button
              onClick={() => setShowObsidianModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 border border-purple-200/80 dark:border-purple-800 rounded-xl text-xs font-semibold transition"
              title="Đồng bộ Obsidian Vault (obsidian://)"
            >
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              <span>Obsidian</span>
            </button>

            {/* NotebookLM Hub trigger */}
            <button
              onClick={() => setShowNotebookLMModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800 rounded-xl text-xs font-semibold transition"
              title="Đóng gói Google NotebookLM & Audio Overview"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>NotebookLM</span>
            </button>

            {/* Antigravity Handoff trigger */}
            <button
              onClick={() => setShowAntigravityModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800 rounded-xl text-xs font-semibold transition"
              title="Đóng gói Antigravity AI Handoff Bundle"
            >
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              <span>Handoff</span>
            </button>

            {/* Dark / Light Theme Toggle */}
            <ThemeToggle />

            {/* Shortcuts Modal Trigger */}
            {onOpenShortcutsModal && (
              <button
                type="button"
                onClick={onOpenShortcutsModal}
                className="hidden sm:flex p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition"
                title="Bảng tra cứu phím tắt (?)"
                aria-label="Mở bảng phím tắt"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            )}

            {/* Export / Backup modal trigger */}
            <button
              onClick={() => setShowExportModal(true)}
              className="p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition"
              title="Sao lưu / Xuất dữ liệu"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Quick Add Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Mới</span>
              </button>

              {showQuickAddMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowQuickAddMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 py-1.5 text-xs text-stone-800">
                    <button
                      onClick={() => {
                        setShowQuickAddMenu(false);
                        setShowTopicModal(true);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-stone-100 flex items-center gap-2 text-stone-700"
                    >
                      <BookOpen className="w-4 h-4 text-amber-700" />
                      <span>Thêm Chủ Đề Mới</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickAddMenu(false);
                        setShowNoteModal(true);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-stone-100 flex items-center gap-2 text-stone-700"
                    >
                      <FileText className="w-4 h-4 text-emerald-700" />
                      <span>Thêm Ghi Chú</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowQuickAddMenu(false);
                        setShowResourceModal(true);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-stone-100 flex items-center gap-2 text-stone-700"
                    >
                      <Download className="w-4 h-4 text-indigo-700" />
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
      <ObsidianBridgeModal
        isOpen={showObsidianModal}
        onClose={() => setShowObsidianModal(false)}
      />
      <NotebookLMStudioModal
        isOpen={showNotebookLMModal}
        onClose={() => setShowNotebookLMModal(false)}
      />
      <AntigravityHandoffModal
        isOpen={showAntigravityModal}
        onClose={() => setShowAntigravityModal(false)}
      />
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
