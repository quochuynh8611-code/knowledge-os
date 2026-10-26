import React from 'react';
import {
  List,
  StickyNote,
  Highlighter,
  Inbox,
  X,
  Hash,
  BookOpen,
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Brain,
  Search,
} from 'lucide-react';
import { TocItem } from './ReaderTocDrawer';
import { HIGHLIGHT_COLOR_PALETTE } from './UnifiedSelectionToolbar';
import { ResearchExcerpt, ResearchInboxItem, Note } from '../../types';
import { MarkdownReadabilityRenderer } from '../../lib/markdownReadability';
import { CitationBacklinkEntry } from '../../lib/readerBacklinksSelector';

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export type ReaderSidebarTab = 'outline' | 'notes' | 'highlights' | 'inbox';

export interface ReaderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ReaderSidebarTab;
  onTabChange: (tab: ReaderSidebarTab) => void;
  tocItems: TocItem[];
  activeTocId?: string;
  onSelectTocItem: (item: TocItem) => void;
  documentId: string;
  documentTitle: string;
  notes?: Note[];
  backlinks?: CitationBacklinkEntry[];
  onOpenBacklinkNote?: (noteId: string, locator?: string) => void;
  excerpts?: ResearchExcerpt[];
  onSelectExcerpt?: (excerpt: ResearchExcerpt) => void;
  onUpdateExcerpt?: (
    id: string,
    updates: Partial<Pick<ResearchExcerpt, 'userNote' | 'highlightColor' | 'status' | 'targetNoteId'>>
  ) => void;
  onDeleteExcerpt?: (id: string) => void;
  inboxItems?: ResearchInboxItem[];
  onDeleteInboxItem?: (id: string) => void;
  onPromoteToFlashcard?: (item: ResearchInboxItem) => void;
  onOpenArchiveLink?: (documentId: string, locator?: string) => void;
  onOpenNoteDetail?: (noteId: string) => void;
  onSynthesizeFlashcards?: (excerpts: ResearchExcerpt[]) => void;
}

function formatBadgeCount(count: number): string | null {
  if (count <= 0) return null;
  if (count > 99) return '99+';
  return String(count);
}

export function ReaderSidebar({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  tocItems,
  activeTocId,
  onSelectTocItem,
  documentId,
  documentTitle,
  notes = [],
  backlinks = [],
  onOpenBacklinkNote,
  excerpts = [],
  onSelectExcerpt,
  onUpdateExcerpt,
  onDeleteExcerpt,
  inboxItems = [],
  onDeleteInboxItem,
  onPromoteToFlashcard,
  onOpenArchiveLink,
  onOpenNoteDetail,
  onSynthesizeFlashcards,
}: ReaderSidebarProps) {
  const [editingExcerptId, setEditingExcerptId] = React.useState<string | null>(null);
  const [noteDraft, setNoteDraft] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedColorFilter, setSelectedColorFilter] = React.useState<string | null>(null);

  const normalizedQuery = normalizeSearchText(searchQuery);

  const colorCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: excerpts.length };
    for (const p of HIGHLIGHT_COLOR_PALETTE) {
      counts[p.id] = 0;
    }
    for (const exc of excerpts) {
      const effectiveColor = exc.highlightColor || '#fef08a';
      const matched = HIGHLIGHT_COLOR_PALETTE.find((p) => p.color.toLowerCase() === effectiveColor.toLowerCase());
      if (matched) {
        counts[matched.id] = (counts[matched.id] || 0) + 1;
      } else {
        counts['yellow'] = (counts['yellow'] || 0) + 1;
      }
    }
    return counts;
  }, [excerpts]);

  const filteredExcerpts = React.useMemo(() => {
    return excerpts.filter((excerpt) => {
      // 1. Color filter
      if (selectedColorFilter !== null) {
        const effectiveColor = excerpt.highlightColor || '#fef08a';
        const matched = HIGHLIGHT_COLOR_PALETTE.find((p) => p.id === selectedColorFilter);
        if (matched) {
          if (matched.id === 'yellow') {
            if (effectiveColor.toLowerCase() !== '#fef08a'.toLowerCase()) return false;
          } else {
            if (effectiveColor.toLowerCase() !== matched.color.toLowerCase()) return false;
          }
        }
      }

      // 2. Search query filter
      if (normalizedQuery) {
        const textMatch = normalizeSearchText(excerpt.selectedText).includes(normalizedQuery);
        const noteMatch = excerpt.userNote
          ? normalizeSearchText(excerpt.userNote).includes(normalizedQuery)
          : false;
        if (!textMatch && !noteMatch) {
          return false;
        }
      }

      return true;
    });
  }, [excerpts, selectedColorFilter, normalizedQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedColorFilter(null);
  };

  if (!isOpen) return null;

  const outlineBadge = formatBadgeCount(tocItems.length);
  const notesBadge = formatBadgeCount(notes.length);
  const highlightsBadge = formatBadgeCount(excerpts.length);
  const inboxBadge = formatBadgeCount(inboxItems.filter((i) => !i.isProcessed).length);

  return (
    <aside
      data-testid="reader-sidebar-container"
      className="w-72 sm:w-[300px] h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 flex flex-col shrink-0 z-30 shadow-lg animate-in slide-in-from-right-4 duration-150"
    >
      {/* Sidebar Header & Tab Switcher */}
      <div className="p-3 border-b border-stone-200 dark:border-stone-800 space-y-2 bg-stone-50/80 dark:bg-stone-900/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Thanh Công Cụ Nghiên Cứu</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng sidebar"
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Tabs */}
        <div
          role="tablist"
          className="grid grid-cols-4 gap-1 bg-stone-200/70 dark:bg-stone-800/80 p-1 rounded-xl text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'outline'}
            data-testid="sidebar-tab-outline"
            onClick={() => onTabChange('outline')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
              activeTab === 'outline'
                ? 'bg-white dark:bg-stone-700 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1">
              <span>Mục lục</span>
              {outlineBadge && (
                <span
                  data-testid="tab-badge-outline"
                  className="px-1 min-w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 leading-none"
                >
                  {outlineBadge}
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'notes'}
            data-testid="sidebar-tab-notes"
            onClick={() => onTabChange('notes')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
              activeTab === 'notes'
                ? 'bg-white dark:bg-stone-700 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1">
              <span>Ghi chú</span>
              {notesBadge && (
                <span
                  data-testid="tab-badge-notes"
                  className="px-1 min-w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 leading-none"
                >
                  {notesBadge}
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'highlights'}
            data-testid="sidebar-tab-highlights"
            onClick={() => onTabChange('highlights')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
              activeTab === 'highlights'
                ? 'bg-white dark:bg-stone-700 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1">
              <span>Đánh dấu</span>
              {highlightsBadge && (
                <span
                  data-testid="tab-badge-highlights"
                  className="px-1 min-w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 leading-none"
                >
                  {highlightsBadge}
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'inbox'}
            data-testid="sidebar-tab-inbox"
            onClick={() => onTabChange('inbox')}
            className={`flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg font-medium transition cursor-pointer text-[11px] relative ${
              activeTab === 'inbox'
                ? 'bg-white dark:bg-stone-700 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span className="flex items-center gap-1">
              <span>Inbox</span>
              {inboxBadge && (
                <span
                  data-testid="tab-badge-inbox"
                  className="px-1 min-w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 leading-none"
                >
                  {inboxBadge}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Panels Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Outline Panel */}
        {activeTab === 'outline' && (
          <div data-testid="sidebar-panel-outline" className="space-y-1">
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-2 pb-1.5">
              Mục lục tài liệu ({tocItems.length})
            </div>
            {tocItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 dark:text-stone-500">
                Tài liệu không có mục lục hoặc đang nạp...
              </div>
            ) : (
              tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectTocItem(item)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-2 ${
                    activeTocId === item.id
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold shadow-2xs'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                  style={{
                    paddingLeft: `${Math.max((item.level || 1) - 1, 0) * 12 + 12}px`,
                  }}
                >
                  <Hash className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Notes Panel */}
        {activeTab === 'notes' && (
          <div data-testid="sidebar-panel-notes" className="space-y-4">
            {/* 1. Scoped / Linked Notes */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
                Ghi chú liên kết ({notes.length})
              </div>
              {notes.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400 dark:text-stone-500 space-y-1.5 bg-stone-50/50 dark:bg-stone-800/30 rounded-xl border border-dashed border-stone-200 dark:border-stone-700">
                  <StickyNote className="w-5 h-5 mx-auto text-stone-300 dark:text-stone-600" />
                  <p>Chưa có ghi chú nào. Hãy bôi đen văn bản để thêm ghi chú mới.</p>
                </div>
              ) : (
                notes.map((note) => {
                  const activeDocProvenances = (note.citationProvenances || []).filter(
                    (p) => p.documentId === documentId
                  );
                  const hasSingleActiveProv = activeDocProvenances.length === 1;
                  const hasMultiActiveProv = activeDocProvenances.length > 1;

                  return (
                    <div
                      key={note.id}
                      className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 rounded-xl space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          onClick={() => onOpenNoteDetail?.(note.id)}
                          className={`text-xs font-bold text-stone-900 dark:text-stone-100 line-clamp-1 ${
                            onOpenNoteDetail ? 'hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer transition' : ''
                          }`}
                        >
                          {note.title}
                        </h4>
                      </div>

                      <div className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                        <MarkdownReadabilityRenderer
                          content={note.content}
                          docPath={note.sourcePath ? note.sourcePath.replace(/^vault:/i, "") : undefined}
                          sourceType={note.sourcePath?.startsWith("docs/") ? "docs" : note.sourcePath ? "vault" : undefined}
                          onOpenArchiveLink={onOpenArchiveLink}
                        />
                      </div>

                      {/* Phase R3: Same-document Provenance Action Footer */}
                      {hasSingleActiveProv && onOpenArchiveLink && (
                        <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 truncate">
                            {activeDocProvenances[0].locator || 'Đoạn trích'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenArchiveLink(
                                activeDocProvenances[0].documentId,
                                activeDocProvenances[0].locator
                              )
                            }
                            className="px-2 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                            title="Tới đoạn trích trong tài liệu"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Tới đoạn trích</span>
                          </button>
                        </div>
                      )}

                      {hasMultiActiveProv && (
                        <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between gap-2">
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-md">
                            {activeDocProvenances.length} nguồn
                          </span>
                          {onOpenNoteDetail && (
                            <button
                              type="button"
                              onClick={() => onOpenNoteDetail(note.id)}
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                              title="Xem chi tiết các nguồn trích dẫn"
                            >
                              <span>Xem chi tiết</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Phase 21A: Reverse Citations (Backlinks) Subsection */}
            <div data-testid="sidebar-backlinks-section" className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider px-1 flex items-center justify-between">
                <span>Trích dẫn liên kết ngược ({backlinks.length})</span>
              </div>
              {backlinks.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400 dark:text-stone-500 space-y-1 bg-stone-50/50 dark:bg-stone-800/30 rounded-xl border border-dashed border-stone-200 dark:border-stone-700">
                  <p>Chưa có ghi chú nào trích dẫn tài liệu này.</p>
                </div>
              ) : (
                backlinks.map((bl) => (
                  <div
                    key={bl.noteId}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenBacklinkNote?.(bl.noteId, bl.locators[0])}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenBacklinkNote?.(bl.noteId, bl.locators[0]);
                      }
                    }}
                    className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-xl space-y-1.5 shadow-2xs hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition cursor-pointer text-left w-full group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 line-clamp-1 group-hover:text-amber-900 dark:group-hover:text-amber-200 transition">
                        {bl.noteTitle}
                      </h4>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-full shrink-0">
                        {bl.referenceCount} trích dẫn
                      </span>
                    </div>
                    {bl.snippet && (
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        {bl.snippet}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Highlights Panel */}
        {activeTab === 'highlights' && (
          <div data-testid="sidebar-panel-highlights" className="space-y-3">
            {excerpts.length === 0 ? (
              <>
                <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
                  Các đoạn trích & Highlight (0)
                </div>
                <div className="p-6 text-center text-xs text-stone-400 dark:text-stone-500 space-y-2">
                  <Highlighter className="w-6 h-6 mx-auto text-stone-300 dark:text-stone-600" />
                  <p>Bôi đen bất kỳ đoạn văn nào để highlight và lưu trích đoạn nghiên cứu.</p>
                </div>
              </>
            ) : (
              <>
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    data-testid="highlights-search-input"
                    aria-label="Tìm kiếm đoạn trích"
                    placeholder="Tìm trong đoạn trích & ghi chú..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setSearchQuery('');
                      }
                    }}
                    className="w-full text-xs pl-8 pr-7 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      data-testid="highlights-search-clear"
                      aria-label="Xóa tìm kiếm"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Color Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none" role="group" aria-label="Lọc theo màu sắc">
                  <button
                    type="button"
                    data-testid="filter-color-all"
                    aria-pressed={selectedColorFilter === null}
                    onClick={() => setSelectedColorFilter(null)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      selectedColorFilter === null
                        ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    <span>Tất cả</span>
                    <span className="text-[10px] opacity-75 font-mono">{colorCounts.all}</span>
                  </button>
                  {HIGHLIGHT_COLOR_PALETTE.map((p) => {
                    const isActive = selectedColorFilter === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        data-testid={`filter-color-${p.id}`}
                        aria-pressed={isActive}
                        onClick={() => setSelectedColorFilter(isActive ? null : p.id)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                          isActive
                            ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-stone-900 dark:text-stone-100 shadow-xs ring-1 ring-amber-400/50'
                            : 'bg-stone-100/80 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200/80 dark:hover:bg-stone-700/80'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-stone-300 dark:border-stone-600"
                          style={{ backgroundColor: p.color }}
                        />
                        <span>{p.label}</span>
                        <span className="text-[10px] opacity-75 font-mono">{colorCounts[p.id]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Header counts & Reset filter */}
                <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>
                    Các đoạn trích & Highlight ({searchQuery || selectedColorFilter ? `${filteredExcerpts.length}/${excerpts.length}` : excerpts.length})
                  </span>
                  {(searchQuery || selectedColorFilter) && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Đặt lại
                    </button>
                  )}
                </div>

                {/* 1-Click Flashcard Synthesis Trigger Button */}
                {onSynthesizeFlashcards && excerpts.length > 0 && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      data-testid="btn-open-highlight-synthesis"
                      onClick={() => onSynthesizeFlashcards(filteredExcerpts)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-400/15 dark:hover:bg-amber-400/25 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                    >
                      <Brain className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Tổng hợp Flashcard</span>
                    </button>
                  </div>
                )}

                {filteredExcerpts.length === 0 ? (
                  <div
                    data-testid="highlights-empty-filter-state"
                    className="p-6 text-center text-xs text-stone-500 dark:text-stone-400 space-y-3 bg-stone-50/50 dark:bg-stone-800/30 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700"
                  >
                    <Search className="w-6 h-6 mx-auto text-stone-300 dark:text-stone-600" />
                    <p className="font-medium text-stone-700 dark:text-stone-300">
                      Không tìm thấy đoạn trích phù hợp với bộ lọc
                    </p>
                    <p className="text-[11px] text-stone-400 dark:text-stone-500">
                      Thử tìm với từ khóa khác hoặc bỏ chọn màu sắc đang lọc.
                    </p>
                    <button
                      type="button"
                      data-testid="btn-reset-highlights-filter"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>Đặt lại bộ lọc</span>
                    </button>
                  </div>
                ) : (
                  filteredExcerpts.map((excerpt) => (
                <div
                  key={excerpt.id}
                  data-testid={`excerpt-card-${excerpt.id}`}
                  onClick={() => onSelectExcerpt?.(excerpt)}
                  style={{ borderLeftColor: excerpt.highlightColor || '#fef08a' }}
                  className="p-3 bg-stone-50/70 dark:bg-stone-900/60 border-l-4 rounded-r-xl space-y-1.5 shadow-2xs hover:bg-stone-100/80 dark:hover:bg-stone-800/60 transition cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectExcerpt?.(excerpt);
                    }
                  }}
                >
                  <blockquote className="text-xs italic text-stone-800 dark:text-stone-200 line-clamp-4">
                    "{excerpt.selectedText}"
                  </blockquote>

                  {excerpt.userNote && editingExcerptId !== excerpt.id && (
                    <div
                      data-testid={`excerpt-note-display-${excerpt.id}`}
                      className="mt-1.5 p-2 bg-stone-100/90 dark:bg-stone-800/90 rounded-lg text-xs text-stone-700 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60 flex items-start gap-1.5"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span className="whitespace-pre-wrap break-words">{excerpt.userNote}</span>
                    </div>
                  )}

                  {editingExcerptId === excerpt.id && (
                    <div
                      data-testid={`excerpt-note-editor-${excerpt.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 space-y-2 p-2 bg-white dark:bg-stone-900 rounded-lg border border-amber-400 dark:border-amber-600 shadow-sm"
                    >
                      <textarea
                        data-testid={`excerpt-note-textarea-${excerpt.id}`}
                        autoFocus
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.stopPropagation();
                            setEditingExcerptId(null);
                          } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            const trimmed = noteDraft.trim();
                            onUpdateExcerpt?.(excerpt.id, { userNote: trimmed.length > 0 ? trimmed : undefined });
                            setEditingExcerptId(null);
                          }
                        }}
                        placeholder="Nhập ghi chú cho đoạn trích này... (Esc để hủy, Cmd+Enter để lưu)"
                        className="w-full text-xs p-1.5 bg-transparent border border-stone-200 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none h-16"
                      />
                      <div className="flex items-center justify-end gap-1.5 text-xs">
                        <button
                          type="button"
                          data-testid={`excerpt-note-cancel-${excerpt.id}`}
                          onClick={() => setEditingExcerptId(null)}
                          className="px-2 py-1 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          data-testid={`excerpt-note-save-${excerpt.id}`}
                          onClick={() => {
                            const trimmed = noteDraft.trim();
                            onUpdateExcerpt?.(excerpt.id, { userNote: trimmed.length > 0 ? trimmed : undefined });
                            setEditingExcerptId(null);
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-medium rounded transition cursor-pointer"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500 font-mono pt-1">
                    <span>
                      {excerpt.positionSelector?.headingId || (excerpt.positionSelector?.pageNumber ? `Trang ${excerpt.positionSelector.pageNumber}` : excerpt.positionSelector?.cfi || '–')}
                    </span>
                    <div className="flex items-center gap-1">
                      {onUpdateExcerpt && (
                        <button
                          type="button"
                          data-testid={`excerpt-note-toggle-${excerpt.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingExcerptId(excerpt.id);
                            setNoteDraft(excerpt.userNote || '');
                          }}
                          aria-label={excerpt.userNote ? "Sửa ghi chú" : "Thêm ghi chú"}
                          title={excerpt.userNote ? "Sửa ghi chú" : "Thêm ghi chú"}
                          className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                        >
                          <StickyNote className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteExcerpt && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteExcerpt(excerpt.id);
                          }}
                          aria-label="Xóa điểm trích"
                          className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          title="Xóa điểm trích"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
        )}

        {/* Inbox Panel */}
        {activeTab === 'inbox' && (
          <div data-testid="sidebar-panel-inbox" className="space-y-3">
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>Research Inbox</span>
              <span className="text-amber-800 dark:text-amber-400 font-mono font-semibold">
                {inboxItems.filter((i) => !i.isProcessed).length} chưa xử lý
              </span>
            </div>
            {inboxItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 dark:text-stone-500 space-y-2">
                <Inbox className="w-6 h-6 mx-auto text-stone-300 dark:text-stone-600" />
                <p>Inbox trống. Các trích đoạn cần xem lại sau sẽ hiển thị ở đây.</p>
              </div>
            ) : (
              inboxItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 rounded-xl space-y-2 shadow-2xs"
                >
                  <blockquote className="text-xs italic text-stone-800 dark:text-stone-200 line-clamp-3">
                    "{item.excerpt?.selectedText || 'Trích đoạn'}"
                  </blockquote>
                  <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 dark:border-stone-700/60 text-[10px] text-stone-500 dark:text-stone-400">
                    <span className="truncate max-w-[140px]">
                      {item.excerpt?.citationSnapshot?.title || documentTitle}
                    </span>
                    <div className="flex items-center gap-1">
                      {!item.isProcessed && onPromoteToFlashcard && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPromoteToFlashcard(item);
                          }}
                          aria-label="Tạo thẻ nhớ từ trích đoạn"
                          className="p-1 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                          title="Tạo thẻ nhớ từ trích đoạn"
                        >
                          <Brain className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteInboxItem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteInboxItem(item.id);
                          }}
                          aria-label="Xóa trích đoạn"
                          className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          title="Xóa trích đoạn khỏi Inbox"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono ${
                          item.isProcessed
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-semibold'
                        }`}
                      >
                        {item.isProcessed ? 'ĐÃ XỬ LÝ' : 'CHƯA XỬ LÝ'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
