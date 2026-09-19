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
} from 'lucide-react';
import { TocItem } from './ReaderTocDrawer';
import { ResearchExcerpt, ResearchInboxItem, Note } from '../../types';

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
  excerpts?: ResearchExcerpt[];
  inboxItems?: ResearchInboxItem[];
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
  excerpts = [],
  inboxItems = [],
}: ReaderSidebarProps) {
  if (!isOpen) return null;

  return (
    <aside
      data-testid="reader-sidebar-container"
      className="w-80 sm:w-96 h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 flex flex-col shrink-0 z-30 shadow-lg animate-in slide-in-from-right-4 duration-150"
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
            <span>Mục lục</span>
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
            <span>Ghi chú</span>
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
            <span>Đánh dấu</span>
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
            <span>Inbox</span>
            {inboxItems.filter((i) => !i.isProcessed).length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
            )}
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
          <div data-testid="sidebar-panel-notes" className="space-y-3">
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
              Ghi chú liên kết ({notes.length})
            </div>
            {notes.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 dark:text-stone-500 space-y-2">
                <StickyNote className="w-6 h-6 mx-auto text-stone-300 dark:text-stone-600" />
                <p>Chưa có ghi chú nào. Hãy bôi đen văn bản để thêm ghi chú mới.</p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 rounded-xl space-y-1.5 shadow-2xs"
                >
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                    {note.title}
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                    {note.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Highlights Panel */}
        {activeTab === 'highlights' && (
          <div data-testid="sidebar-panel-highlights" className="space-y-3">
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
              Các đoạn trích & Highlight ({excerpts.length})
            </div>
            {excerpts.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 dark:text-stone-500 space-y-2">
                <Highlighter className="w-6 h-6 mx-auto text-stone-300 dark:text-stone-600" />
                <p>Bôi đen bất kỳ đoạn văn nào để highlight và lưu trích đoạn nghiên cứu.</p>
              </div>
            ) : (
              excerpts.map((excerpt) => (
                <div
                  key={excerpt.id}
                  className="p-3 bg-amber-50/50 dark:bg-amber-950/30 border-l-2 border-amber-500 dark:border-amber-400 rounded-r-xl space-y-1 shadow-2xs"
                >
                  <blockquote className="text-xs italic text-stone-800 dark:text-stone-200 line-clamp-4">
                    "{excerpt.selectedText}"
                  </blockquote>
                  <div className="text-[10px] text-stone-400 dark:text-stone-500 font-mono pt-1">
                    {excerpt.positionSelector?.headingId || `Trang ${excerpt.positionSelector?.pageNumber || '–'}`}
                  </div>
                </div>
              ))
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
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
