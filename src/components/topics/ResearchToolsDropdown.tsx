/**
 * ResearchToolsDropdown
 *
 * A compact dropdown that groups 4 advanced integration tools (AI Scholar,
 * Handoff Bundle, Obsidian, NotebookLM) behind a single trigger button.
 *
 * Design principles:
 * - Learning-first: advanced tools are accessible but not visually dominant.
 * - One useState for open/close — no external library needed.
 * - Closes when any item is selected.
 * - Keyboard accessible: trigger is a button, items are buttons.
 *
 * Phase 17B spec: docs/specs/phase-17b-topic-detail-toolbar.md
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles, ExternalLink, BookOpen, Package } from 'lucide-react';

export interface ResearchToolsDropdownProps {
  onOpenAIStudio: () => void;
  onOpenHandoff: () => void;
  onOpenObsidian: () => void;
  onOpenNotebookLM: () => void;
}

export function ResearchToolsDropdown({
  onOpenAIStudio,
  onOpenHandoff,
  onOpenObsidian,
  onOpenNotebookLM,
}: ResearchToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [isOpen]);

  function pick(fn: () => void) {
    setIsOpen(false);
    fn();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        data-testid="research-tools-menu-trigger"
        onClick={() => setIsOpen((v) => !v)}
        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Công cụ nghiên cứu nâng cao"
      >
        Công cụ nghiên cứu
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          data-testid="research-tools-menu"
          role="menu"
          className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl overflow-hidden z-30 py-1"
        >
          <button
            data-testid="research-tool-ai-studio"
            role="menuitem"
            onClick={() => pick(onOpenAIStudio)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition text-left"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            Antigravity AI Scholar
          </button>

          <button
            data-testid="research-tool-handoff"
            role="menuitem"
            onClick={() => pick(onOpenHandoff)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition text-left"
          >
            <Package className="w-3.5 h-3.5 text-amber-700 dark:text-amber-500 shrink-0" />
            Handoff Bundle
          </button>

          <div className="my-1 border-t border-stone-100 dark:border-stone-800" />

          <button
            data-testid="research-tool-obsidian"
            role="menuitem"
            onClick={() => pick(onOpenObsidian)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition text-left"
          >
            <ExternalLink className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            Obsidian Bridge
          </button>

          <button
            data-testid="research-tool-notebooklm"
            role="menuitem"
            onClick={() => pick(onOpenNotebookLM)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition text-left"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            NotebookLM Studio
          </button>
        </div>
      )}
    </div>
  );
}
