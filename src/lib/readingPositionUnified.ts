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

export interface ReadingAnalyticsSummary {
  totalReadingSeconds: number;
  completedCount: number;
  inProgressCount: number;
  totalDocsRead: number;
}

export interface ReadingAnalyticsBreakdown extends ReadingAnalyticsSummary {
  completionRate: number;
  completedDocIds: string[];
  inProgressDocIds: string[];
}

/**
 * Pure calculation helper to break down reading analytics and calculate completion rate in a single pass.
 */
export function calculateReadingAnalyticsBreakdown(
  docs?: Array<{ id?: string; sourceKey?: string; fileName?: string; storageRelPath?: string; sourcePath?: string; lastPosition?: any }>
): ReadingAnalyticsBreakdown {
  let totalReadingSeconds = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  const completedDocIds: string[] = [];
  const inProgressDocIds: string[] = [];

  if (Array.isArray(docs)) {
    for (const doc of docs) {
      const lp = doc?.lastPosition;
      if (!lp) continue;

      const sec =
        typeof lp.totalReadingSeconds === 'number' && !isNaN(lp.totalReadingSeconds) && lp.totalReadingSeconds > 0
          ? lp.totalReadingSeconds
          : 0;
      totalReadingSeconds += sec;

      const id = doc.id || doc.sourceKey || doc.storageRelPath || doc.fileName || doc.sourcePath;

      if (lp.isCompleted === true) {
        completedCount++;
        if (id) {
          completedDocIds.push(id);
        }
      } else if (
        sec > 0 ||
        (typeof lp.percentage === 'number' && lp.percentage > 0) ||
        Boolean(lp.cfi) ||
        Boolean(lp.headingId)
      ) {
        inProgressCount++;
        if (id) {
          inProgressDocIds.push(id);
        }
      }
    }
  }

  const totalDocsRead = completedCount + inProgressCount;
  const completionRate =
    totalDocsRead > 0 ? Math.round((completedCount / totalDocsRead) * 100) : 0;

  return {
    totalReadingSeconds,
    completedCount,
    inProgressCount,
    totalDocsRead,
    completionRate,
    completedDocIds,
    inProgressDocIds,
  };
}

/**
 * Pure calculation helper to aggregate reading analytics across documents.
 * Delegates to single-pass engine to guarantee single source of truth.
 */
export function calculateReadingAnalyticsSummary(
  docs?: Array<{ id?: string; sourceKey?: string; fileName?: string; storageRelPath?: string; sourcePath?: string; lastPosition?: any }>
): ReadingAnalyticsSummary {
  const breakdown = calculateReadingAnalyticsBreakdown(docs);
  return {
    totalReadingSeconds: breakdown.totalReadingSeconds,
    completedCount: breakdown.completedCount,
    inProgressCount: breakdown.inProgressCount,
    totalDocsRead: breakdown.totalDocsRead,
  };
}
