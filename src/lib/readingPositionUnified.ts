/**
 * Pure in-memory reading position management for Unified Research Reader.
 * Strictly operates without accessing browser localStorage/sessionStorage.
 */

export function formatReadingPositionKey(documentId: string, format: string): string {
  const safeDocId = (documentId || '').trim();
  const safeFormat = (format || '').trim().toLowerCase();
  return `doc:${safeDocId}:${safeFormat}`;
}

export interface UnifiedReadingPositionStore {
  getPosition: (documentId: string, format: string) => string | null;
  setPosition: (documentId: string, format: string, locator: string) => void;
  clearPosition: (documentId: string, format: string) => void;
  getAllPositions: () => Record<string, string>;
}

export function createUnifiedReadingPositionStore(
  initialState: Record<string, string> = {}
): UnifiedReadingPositionStore {
  const state = new Map<string, string>(Object.entries(initialState));

  return {
    getPosition(documentId: string, format: string): string | null {
      if (!documentId || !format) return null;
      const key = formatReadingPositionKey(documentId, format);
      return state.get(key) ?? null;
    },

    setPosition(documentId: string, format: string, locator: string): void {
      if (!documentId || !format) return;
      const key = formatReadingPositionKey(documentId, format);
      const safeLocator = (locator || '').trim();
      if (!safeLocator) {
        state.delete(key);
        return;
      }
      state.set(key, safeLocator);
    },

    clearPosition(documentId: string, format: string): void {
      if (!documentId || !format) return;
      const key = formatReadingPositionKey(documentId, format);
      state.delete(key);
    },

    getAllPositions(): Record<string, string> {
      return Object.fromEntries(state.entries());
    },
  };
}

// Global in-memory singleton instance for unified reading sessions
export const globalReadingPositionStore = createUnifiedReadingPositionStore();
