import { useEffect, useCallback } from "react";

export interface ShortcutItem {
  key: string;
  displayKey: string;
  description: string;
  category: "navigation" | "actions" | "general";
  action: () => void;
  modifier?: "meta" | "ctrl" | "alt" | "shift";
}

export interface UseKeyboardShortcutsOptions {
  shortcuts?: ShortcutItem[];
  onOpenCommandPalette?: () => void;
  onOpenShortcutsModal?: () => void;
  onCloseModals?: () => void;
  onNavigateTab?: (tab: string) => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts = [],
  onOpenCommandPalette,
  onOpenShortcutsModal,
  onCloseModals,
  onNavigateTab,
  disabled = false,
}: UseKeyboardShortcutsOptions = {}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // 1. Command Palette: Ctrl+K or Cmd+K (allowed everywhere, even inside input)
      if (isCmdOrCtrl && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        e.stopPropagation();
        onOpenCommandPalette?.();
        return;
      }

      // 2. Escape to close modals / clear
      if (e.key === "Escape") {
        onCloseModals?.();
        return;
      }

      // If user is currently typing in an input field, do not trigger single-character shortcuts
      if (isInput) return;

      // 3. Shortcuts Modal: '?' or Shift+'/'
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        onOpenShortcutsModal?.();
        return;
      }

      // 4. Quick Navigation keys (1-9)
      if (
        ["1", "2", "3", "4", "5", "6", "7"].includes(e.key) &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const tabMap: Record<string, string> = {
          "1": "dashboard",
          "2": "topics",
          "3": "abhidharma_matrix",
          "4": "divination_matrix",
          "5": "graph",
          "6": "progress",
          "7": "notes",
        };
        const targetTab = tabMap[e.key];
        if (targetTab && onNavigateTab) {
          e.preventDefault();
          onNavigateTab(targetTab);
          return;
        }
      }

      // 5. Custom custom shortcut items
      for (const item of shortcuts) {
        let modifierMatch = true;
        if (item.modifier === "meta") modifierMatch = e.metaKey;
        if (item.modifier === "ctrl") modifierMatch = e.ctrlKey;
        if (item.modifier === "alt") modifierMatch = e.altKey;
        if (item.modifier === "shift") modifierMatch = e.shiftKey;

        if (e.key.toLowerCase() === item.key.toLowerCase() && modifierMatch) {
          e.preventDefault();
          item.action();
          return;
        }
      }
    },
    [
      disabled,
      onOpenCommandPalette,
      onOpenShortcutsModal,
      onCloseModals,
      onNavigateTab,
      shortcuts,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
