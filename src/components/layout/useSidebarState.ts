import { useState, useCallback } from "react";
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from "../../lib/storage";

export const SIDEBAR_STORAGE_KEY = "app-shell-sidebar-collapsed";

/**
 * Resilient hook to manage collapsible left sidebar state with safe localStorage persistence.
 * Leverages safe storage wrappers to avoid crashes under SecurityError, sandboxed iframes,
 * or quota limits, smoothly falling back to in-memory state.
 */
export function useSidebarState(initialCollapsed?: boolean) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof initialCollapsed === "boolean") {
      return initialCollapsed;
    }
    const stored = safeGetLocalStorageItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      return stored === "true";
    }
    return false;
  });

  const setCollapsed = useCallback((value: boolean) => {
    setIsCollapsed(value);
    safeSetLocalStorageItem(SIDEBAR_STORAGE_KEY, String(value));
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      safeSetLocalStorageItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return {
    isCollapsed,
    setCollapsed,
    toggleCollapse,
  };
}
