import { useEffect } from "react";

export interface UseVaultKeyboardShortcutOptions {
  targetRef: React.RefObject<HTMLElement | null>;
  onEscape?: () => void;
  enabled?: boolean;
}

/**
 * useVaultKeyboardShortcut (P4.3D)
 *
 * Dedicated keyboard accessibility hook for Obsidian Vault selection:
 * - Alt+V / Option+V: Focuses the vault selector dropdown
 * - Escape: Calls onEscape or blurs the element if focused
 */
export function useVaultKeyboardShortcut({
  targetRef,
  onEscape,
  enabled = true,
}: UseVaultKeyboardShortcutOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check Alt+V (or Option+V on Mac)
      if (event.altKey && (event.key === "v" || event.key === "V")) {
        event.preventDefault();
        targetRef.current?.focus();
        return;
      }

      // Check Escape
      if (event.key === "Escape") {
        if (
          document.activeElement === targetRef.current ||
          targetRef.current?.contains(document.activeElement)
        ) {
          if (onEscape) {
            event.preventDefault();
            onEscape();
          } else {
            targetRef.current?.blur();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [targetRef, onEscape, enabled]);
}
