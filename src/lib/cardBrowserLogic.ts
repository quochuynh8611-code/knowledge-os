import type {
  Flashcard,
  FlashcardState,
  FlashcardLifecycleStatus,
} from "../types/flashcard";

export interface CardBrowserFilterOptions {
  query?: string;
  topicId?: string;
  state?: FlashcardState | "all";
  lifecycleStatus?: FlashcardLifecycleStatus | "all";
  dueStatus?: "all" | "due" | "overdue" | "notDue";
  weakOnly?: boolean;
}

export type CardBrowserSortOption =
  | "dueAt_asc"
  | "dueAt_desc"
  | "easeFactor_asc"
  | "easeFactor_desc"
  | "lapses_desc"
  | "createdAt_desc"
  | "createdAt_asc"
  | "front_asc";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Normalizes text for search: removes diacritics, strips markdown & cloze formatting, converts to lowercase.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return "";

  let cleaned = text
    // Strip cloze patterns {{c1::answer}} or {{c1::answer::hint}} -> answer
    .replace(/\{\{c\d+::([^:}]+)(?:::([^}]+))?\}\}/g, "$1")
    // Strip bold/italic markdown (**text**, *text*, _text_)
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Strip headers # Header
    .replace(/^#+\s+/gm, "")
    // Strip backticks `code`
    .replace(/`([^`]+)`/g, "$1");

  // Normalize accents/diacritics and convert to lowercase
  return cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

/**
 * Pure function: Filters flashcards in-memory according to search query, topicId, SRS state, lifecycle, due status, and weak status.
 */
export function filterCards(
  cards: Flashcard[],
  options: CardBrowserFilterOptions,
  now: Date = new Date()
): Flashcard[] {
  const queryNorm = options.query ? normalizeSearchText(options.query) : "";

  // Start of today in local/UTC context of `now`
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return cards.filter((card) => {
    // 1. Filter by Topic
    if (options.topicId && card.topicId !== options.topicId) {
      return false;
    }

    // 2. Filter by Lifecycle Status
    if (
      options.lifecycleStatus &&
      options.lifecycleStatus !== "all" &&
      card.lifecycleStatus !== options.lifecycleStatus
    ) {
      return false;
    }

    // 3. Filter by SRS state
    if (options.state && options.state !== "all") {
      const cardState = card.schedule?.state ?? "new";
      if (cardState !== options.state) {
        return false;
      }
    }

    // 4. Filter by Due Status
    if (options.dueStatus && options.dueStatus !== "all") {
      const dueAt = card.schedule?.dueAt ? new Date(card.schedule.dueAt) : now;
      if (options.dueStatus === "due") {
        if (dueAt > now) return false;
      } else if (options.dueStatus === "overdue") {
        if (dueAt >= startOfToday) return false;
      } else if (options.dueStatus === "notDue") {
        if (dueAt <= now) return false;
      }
    }

    // 5. Filter by Weak Cards (lapses >= 3 or easeFactor <= 2.0)
    if (options.weakOnly) {
      const lapses = card.schedule?.lapses ?? 0;
      const ease = card.schedule?.easeFactor ?? 2.5;
      if (lapses < 3 && ease > 2.0) {
        return false;
      }
    }

    // 6. Full-text search
    if (queryNorm) {
      const frontNorm = normalizeSearchText(card.front);
      const backNorm = normalizeSearchText(card.back);
      if (!frontNorm.includes(queryNorm) && !backNorm.includes(queryNorm)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Pure function: Sorts flashcards by criteria.
 */
export function sortCards(
  cards: Flashcard[],
  sortBy: CardBrowserSortOption
): Flashcard[] {
  const cloned = [...cards];

  return cloned.sort((a, b) => {
    const sA = a.schedule;
    const sB = b.schedule;

    switch (sortBy) {
      case "dueAt_asc": {
        const tA = sA?.dueAt ? new Date(sA.dueAt).getTime() : 0;
        const tB = sB?.dueAt ? new Date(sB.dueAt).getTime() : 0;
        return tA - tB;
      }
      case "dueAt_desc": {
        const tA = sA?.dueAt ? new Date(sA.dueAt).getTime() : 0;
        const tB = sB?.dueAt ? new Date(sB.dueAt).getTime() : 0;
        return tB - tA;
      }
      case "easeFactor_asc": {
        const eA = sA?.easeFactor ?? 2.5;
        const eB = sB?.easeFactor ?? 2.5;
        return eA - eB;
      }
      case "easeFactor_desc": {
        const eA = sA?.easeFactor ?? 2.5;
        const eB = sB?.easeFactor ?? 2.5;
        return eB - eA;
      }
      case "lapses_desc": {
        const lA = sA?.lapses ?? 0;
        const lB = sB?.lapses ?? 0;
        return lB - lA;
      }
      case "createdAt_desc": {
        const tA = new Date(a.createdAt).getTime();
        const tB = new Date(b.createdAt).getTime();
        return tB - tA;
      }
      case "createdAt_asc": {
        const tA = new Date(a.createdAt).getTime();
        const tB = new Date(b.createdAt).getTime();
        return tA - tB;
      }
      case "front_asc": {
        return a.front.localeCompare(b.front, "vi", { sensitivity: "base" });
      }
      default:
        return 0;
    }
  });
}

/**
 * Pure function: Slices cards list deterministically into paginated result.
 */
export function paginateCards<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const safePageSize = Math.max(1, pageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));

  const start = (currentPage - 1) * safePageSize;
  const paginatedItems = items.slice(start, start + safePageSize);

  return {
    items: paginatedItems,
    total,
    totalPages,
    currentPage,
    pageSize: safePageSize,
  };
}
