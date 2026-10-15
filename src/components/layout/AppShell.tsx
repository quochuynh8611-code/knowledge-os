import React, { ReactNode } from "react";
import { useData } from "../../context/DataContext";
import { Navbar } from "./Navbar";
import { AppSidebar } from "./AppSidebar";
import { useSidebarState } from "./useSidebarState";
import { getTabContainerClass } from "./layoutPolicy";
import {
  LayoutDashboard,
  FolderTree,
  Share2,
  TrendingUp,
  FileText,
} from "lucide-react";

export interface AppShellProps {
  children: ReactNode;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenNotebookLMModal?: () => void;
  onOpenAntigravityModal?: () => void;
  initialSidebarCollapsed?: boolean;
}

export function AppShell({
  children,
  onOpenCommandPalette,
  onOpenShortcutsModal,
  onOpenNotebookLMModal,
  onOpenAntigravityModal,
  initialSidebarCollapsed,
}: AppShellProps) {
  const { activeTab, setActiveTab, subView } = useData();
  const { isCollapsed, toggleCollapse } = useSidebarState(initialSidebarCollapsed);

  const containerClass = getTabContainerClass(activeTab, subView);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-950">
      {/* Top Command Bar */}
      <Navbar
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenShortcutsModal={onOpenShortcutsModal}
        onOpenNotebookLMModal={onOpenNotebookLMModal}
        onOpenAntigravityModal={onOpenAntigravityModal}
      />

      {/* Main Container: Sidebar + Content */}
      <div
        data-testid="app-shell-main-container"
        className="flex-1 flex w-full min-w-0 pb-16 md:pb-0"
      >
        {/* Desktop & Tablet Collapsible Sidebar */}
        <div className="hidden md:block">
          <AppSidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={toggleCollapse}
          />
        </div>

        {/* Dynamic Center Stage with Tab Layout Policy */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className={containerClass}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        data-testid="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-100/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-around py-2 px-1"
      >
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition cursor-pointer ${
            activeTab === "dashboard"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Tổng quan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("topics")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition cursor-pointer ${
            activeTab === "topics"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Chủ đề</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("graph")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition cursor-pointer ${
            activeTab === "graph"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Đồ thị</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("progress")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition cursor-pointer ${
            activeTab === "progress"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Tiến độ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`flex flex-col items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-xl transition cursor-pointer ${
            activeTab === "notes"
              ? "text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80"
              : "text-stone-600 dark:text-stone-400"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Ghi chú</span>
        </button>
      </nav>
    </div>
  );
}
