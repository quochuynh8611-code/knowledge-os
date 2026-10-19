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

/**
 * Format total reading seconds into a human-readable localized Vietnamese string.
 */
export function formatReadingDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds <= 0) {
    return '0 phút';
  }
  if (seconds < 60) {
    return '< 1 phút';
  }
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} phút`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} giờ`;
  }
  return `${hours}g ${minutes}p`;
}
