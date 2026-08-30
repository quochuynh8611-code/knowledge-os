import { Category, Topic, TopicStatus } from '../types';
import {
  getRootCategories,
  topicBelongsToRootCategory,
  resolveRootCategory,
} from './taxonomyMigration';
import { getReviewQueue, formatTimeAgo } from './spaced-repetition';

export type RecommendationTier = 'review_due' | 'in_progress' | 'next_step' | 'fallback';

export interface TodayRecommendation {
  topic: Topic;
  rootCategory: Category | null;
  tier: RecommendationTier;
  badgeLabel: string;
  reason: string;
}

export type DomainStatus = 'active' | 'maintenance' | 'dormant';

export interface DomainLearningState {
  rootCategory: Category;
  status: DomainStatus;
  statusLabel: string;
  isFocus?: boolean;
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  donePercent: number;
  totalTimeSpentMinutes: number;
  lastStudiedAt: string | null;
  nextStepTopic: Topic | null;
}

/**
 * Resolves the primary priority domain (root category) based on recency.
 * Primary: Root Category of topic with newest valid `studyProgress.lastStudied` (visibility !== 'hidden').
 * Fallback 1: Root Category of topic with newest `updatedAt` among `status === 'in_progress'` or `progress > 0`.
 * Fallback 2: First Root Category with active topics (or first root category).
 * Returns null if no root categories exist.
 */
export function getPriorityDomain(
  topics: Topic[],
  categories: Category[]
): Category | null {
  const rootCategories = getRootCategories(categories);
  if (!rootCategories || rootCategories.length === 0) return null;

  const activeTopics = (topics || []).filter((t) => t.visibility !== 'hidden');
  if (activeTopics.length === 0) return rootCategories[0];

  // 1. Primary Source: Newest valid lastStudied
  const topicsWithLastStudied = activeTopics
    .filter((t) => t.studyProgress?.lastStudied)
    .sort((a, b) => {
      const aTime = new Date(a.studyProgress.lastStudied!).getTime();
      const bTime = new Date(b.studyProgress.lastStudied!).getTime();
      if (bTime !== aTime) return bTime - aTime;
      return a.id.localeCompare(b.id);
    });

  if (topicsWithLastStudied.length > 0) {
    const root = resolveRootCategory(categories, topicsWithLastStudied[0].categoryId);
    if (root) return root;
  }

  // 2. Fallback 1: In-progress topic with newest updatedAt
  const inProgressTopics = activeTopics
    .filter(
      (t) =>
        t.studyProgress?.status === 'in_progress' ||
        ((t.studyProgress?.progress || 0) > 0 && (t.studyProgress?.progress || 0) < 100)
    )
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || 0).getTime();
      const bTime = new Date(b.updatedAt || 0).getTime();
      if (bTime !== aTime) return bTime - aTime;
      return a.id.localeCompare(b.id);
    });

  if (inProgressTopics.length > 0) {
    const root = resolveRootCategory(categories, inProgressTopics[0].categoryId);
    if (root) return root;
  }

  // 3. Fallback 2: First root category that has at least one active topic, or first root category
  for (const root of rootCategories) {
    const hasTopic = activeTopics.some((t) =>
      topicBelongsToRootCategory(t, categories, root.id)
    );
    if (hasTopic) return root;
  }

  return rootCategories[0];
}

/**
 * Generates the deterministic, evidence-based Today Recommendation.
 * Evaluation Cascade (Phase 14B):
 *   Tier 1: Spaced Review Due (SM-2 override all)
 *   Tier 2: Focus Domain Priority (if valid focusDomainId exists)
 *     2A: in_progress topic in focus domain
 *     2B: next_step topic in focus domain
 *   Tier 3: Auto Recommendation Flow (if no focusDomainId or focus domain completed)
 *     3A: in_progress active topic across workspace
 *     3B: next_step in Auto Priority Domain
 *     3C: fallback unstarted topic across workspace
 *   Tier 4: System Fallback (first active topic when all topics completed)
 * Returns null if no valid topic exists in the workspace.
 */
export function getTodayRecommendation(
  topics: Topic[],
  categories: Category[],
  reviewQueueInput?: Topic[],
  now: Date = new Date(),
  focusDomainId?: string | null
): TodayRecommendation | null {
  const activeTopics = (topics || []).filter((t) => t.visibility !== 'hidden');
  if (activeTopics.length === 0) return null;

  const rootCategories = getRootCategories(categories);
  const validFocusDomain =
    focusDomainId && rootCategories.some((r) => r.id === focusDomainId)
      ? rootCategories.find((r) => r.id === focusDomainId) || null
      : null;

  // --- Tier 1: Spaced Review Due (SM-2 override all) ---
  const queue = reviewQueueInput || getReviewQueue(activeTopics);
  if (queue.length > 0) {
    const sortedReviews = [...queue].sort((a, b) => {
      const aNext = new Date(a.studyProgress?.nextReview || 0).getTime();
      const bNext = new Date(b.studyProgress?.nextReview || 0).getTime();
      if (aNext !== bNext) return aNext - bNext; // Oldest due first (smallest timestamp)

      const aInterval = a.studyProgress?.interval || 0;
      const bInterval = b.studyProgress?.interval || 0;
      if (aInterval !== bInterval) return aInterval - bInterval; // Shortest interval first

      const aEase = a.studyProgress?.easeFactor || 2.5;
      const bEase = b.studyProgress?.easeFactor || 2.5;
      if (aEase !== bEase) return aEase - bEase; // Lowest easeFactor first

      return a.id.localeCompare(b.id);
    });

    const chosen = sortedReviews[0];
    const root = resolveRootCategory(categories, chosen.categoryId);
    return {
      topic: chosen,
      rootCategory: root,
      tier: 'review_due',
      badgeLabel: 'Ôn tập định kỳ SM-2',
      reason: 'Đến hạn củng cố trí nhớ theo thuật toán lặp lại ngắt quãng',
    };
  }

  // Deterministic helper to sort in-progress topics
  const sortInProgress = (list: Topic[]) =>
    [...list].sort((a, b) => {
      const aStudied = new Date(a.studyProgress?.lastStudied || 0).getTime();
      const bStudied = new Date(b.studyProgress?.lastStudied || 0).getTime();
      if (aStudied !== bStudied) return bStudied - aStudied; // Newest lastStudied first

      const aUpdated = new Date(a.updatedAt || 0).getTime();
      const bUpdated = new Date(b.updatedAt || 0).getTime();
      if (aUpdated !== bUpdated) return bUpdated - aUpdated; // Newest updatedAt first

      const aProgress = a.studyProgress?.progress || 0;
      const bProgress = b.studyProgress?.progress || 0;
      if (aProgress !== bProgress) return bProgress - aProgress; // Highest progress first

      return a.id.localeCompare(b.id);
    });

  // Deterministic helper to sort unstarted topics
  const sortUnstarted = (list: Topic[]) =>
    [...list].sort((a, b) => {
      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();
      if (aCreated !== bCreated) return aCreated - bCreated; // Oldest createdAt first (curriculum proxy)
      return a.id.localeCompare(b.id);
    });

  // --- Tier 2: Focus Domain Priority (if valid focusDomainId exists) ---
  if (validFocusDomain) {
    const focusTopics = activeTopics.filter((t) =>
      topicBelongsToRootCategory(t, categories, validFocusDomain.id)
    );

    // 2A: Focus Domain in-progress topic
    const focusInProgress = focusTopics.filter(
      (t) =>
        (t.studyProgress?.status === 'in_progress' || t.studyProgress?.status === 'reviewing') &&
        (t.studyProgress?.progress || 0) < 100
    );

    if (focusInProgress.length > 0) {
      const chosen = sortInProgress(focusInProgress)[0];
      const progress = chosen.studyProgress?.progress || 0;
      const timeLabel = chosen.studyProgress?.lastStudied
        ? formatTimeAgo(chosen.studyProgress.lastStudied)
        : 'Gần đây';
      return {
        topic: chosen,
        rootCategory: validFocusDomain,
        tier: 'in_progress',
        badgeLabel: `Tiếp tục bài học dở dang (${validFocusDomain.name})`,
        reason: `Môn trọng tâm • Tiến độ hiện tại: ${progress}% • Đã học: ${timeLabel}`,
      };
    }

    // 2B: Focus Domain next-step (unstarted topic)
    const focusUnstarted = focusTopics.filter(
      (t) =>
        t.studyProgress?.status === 'not_started' || (t.studyProgress?.progress || 0) === 0
    );

    if (focusUnstarted.length > 0) {
      const chosen = sortUnstarted(focusUnstarted)[0];
      return {
        topic: chosen,
        rootCategory: validFocusDomain,
        tier: 'next_step',
        badgeLabel: `Bài học tiếp theo (${validFocusDomain.name})`,
        reason: `Môn trọng tâm • Bước kế tiếp trong lộ trình môn ${validFocusDomain.name}`,
      };
    }
  }

  // --- Tier 3: Auto Recommendation Flow ---
  // 3A: In-Progress Active Topic across workspace
  const inProgressList = activeTopics.filter(
    (t) =>
      (t.studyProgress?.status === 'in_progress' || t.studyProgress?.status === 'reviewing') &&
      (t.studyProgress?.progress || 0) < 100
  );

  if (inProgressList.length > 0) {
    const chosen = sortInProgress(inProgressList)[0];
    const root = resolveRootCategory(categories, chosen.categoryId);
    const progress = chosen.studyProgress?.progress || 0;
    const timeLabel = chosen.studyProgress?.lastStudied
      ? formatTimeAgo(chosen.studyProgress.lastStudied)
      : 'Gần đây';

    return {
      topic: chosen,
      rootCategory: root,
      tier: 'in_progress',
      badgeLabel: 'Tiếp tục bài học dở dang',
      reason: `Tiến độ hiện tại: ${progress}% • Đã học: ${timeLabel}`,
    };
  }

  // 3B: Next Step in Auto Priority Domain
  const priorityDomain = getPriorityDomain(activeTopics, categories);
  if (priorityDomain) {
    const domainUnstartedTopics = activeTopics.filter(
      (t) =>
        topicBelongsToRootCategory(t, categories, priorityDomain.id) &&
        (t.studyProgress?.status === 'not_started' || (t.studyProgress?.progress || 0) === 0)
    );

    if (domainUnstartedTopics.length > 0) {
      const chosen = sortUnstarted(domainUnstartedTopics)[0];
      return {
        topic: chosen,
        rootCategory: priorityDomain,
        tier: 'next_step',
        badgeLabel: `Bài học tiếp theo (${priorityDomain.name})`,
        reason: `Bước kế tiếp trong lộ trình môn ${priorityDomain.name}`,
      };
    }
  }

  // 3C: Fallback across any unstarted topic in the workspace
  const anyUnstarted = activeTopics.filter(
    (t) =>
      t.studyProgress?.status === 'not_started' || (t.studyProgress?.progress || 0) === 0
  );

  if (anyUnstarted.length > 0) {
    const sortedAnyUnstarted = [...anyUnstarted].sort((a, b) => {
      const aRoot = resolveRootCategory(categories, a.categoryId);
      const bRoot = resolveRootCategory(categories, b.categoryId);
      const aRootIndex = aRoot ? rootCategories.findIndex((r) => r.id === aRoot.id) : 999;
      const bRootIndex = bRoot ? rootCategories.findIndex((r) => r.id === bRoot.id) : 999;
      if (aRootIndex !== bRootIndex) return aRootIndex - bRootIndex;

      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();
      if (aCreated !== bCreated) return aCreated - bCreated;

      return a.id.localeCompare(b.id);
    });

    const chosen = sortedAnyUnstarted[0];
    const root = resolveRootCategory(categories, chosen.categoryId);
    return {
      topic: chosen,
      rootCategory: root,
      tier: 'fallback',
      badgeLabel: 'Khởi động bài học mới',
      reason: 'Bắt đầu bài học đầu tiên trong lộ trình học tập',
    };
  }

  // Final fallback: all topics are completed, pick first active topic
  const fallbackTopic = activeTopics[0];
  const root = resolveRootCategory(categories, fallbackTopic.categoryId);
  return {
    topic: fallbackTopic,
    rootCategory: root,
    tier: 'fallback',
    badgeLabel: 'Ôn tập tổng thể',
    reason: 'Toàn bộ bài học đã hoàn thành, chọn bài để ôn lại',
  };
}

/**
 * Computes the multi-disciplinary learning state for each root domain.
 */
export function getDomainLearningStates(
  topics: Topic[],
  categories: Category[],
  now: Date = new Date(),
  focusDomainId?: string | null
): DomainLearningState[] {
  const rootCategories = getRootCategories(categories);
  if (!rootCategories || rootCategories.length === 0) return [];

  const activeTopics = (topics || []).filter((t) => t.visibility !== 'hidden');
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  return rootCategories.map((root) => {
    const isFocus = Boolean(focusDomainId && root.id === focusDomainId);
    const domainTopics = activeTopics.filter((t) =>
      topicBelongsToRootCategory(t, categories, root.id)
    );

    const totalTopics = domainTopics.length;
    const completedTopics = domainTopics.filter(
      (t) =>
        (t.studyProgress?.progress || 0) >= 100 ||
        t.studyProgress?.status === 'completed'
    ).length;

    const inProgressTopics = domainTopics.filter(
      (t) =>
        t.studyProgress?.status === 'in_progress' ||
        ((t.studyProgress?.progress || 0) > 0 && (t.studyProgress?.progress || 0) < 100)
    ).length;

    const donePercent =
      totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    const totalTimeSpentMinutes = domainTopics.reduce(
      (acc, t) => acc + (t.studyProgress?.timeSpent || 0),
      0
    );

    // Determine newest lastStudied in this domain
    let latestStudiedTime = 0;
    let lastStudiedAt: string | null = null;
    domainTopics.forEach((t) => {
      if (t.studyProgress?.lastStudied) {
        const time = new Date(t.studyProgress.lastStudied).getTime();
        if (time > latestStudiedTime) {
          latestStudiedTime = time;
          lastStudiedAt = t.studyProgress.lastStudied;
        }
      }
    });

    // Next step topic for this domain:
    // First in_progress topic, or first not_started topic by createdAt asc
    const uncompleted = domainTopics.filter(
      (t) =>
        (t.studyProgress?.progress || 0) < 100 &&
        t.studyProgress?.status !== 'completed'
    );

    let nextStepTopic: Topic | null = null;
    if (uncompleted.length > 0) {
      const sortedUncompleted = [...uncompleted].sort((a, b) => {
        const aIsProgress = a.studyProgress?.status === 'in_progress' ? 0 : 1;
        const bIsProgress = b.studyProgress?.status === 'in_progress' ? 0 : 1;
        if (aIsProgress !== bIsProgress) return aIsProgress - bIsProgress;

        const aCreated = new Date(a.createdAt || 0).getTime();
        const bCreated = new Date(b.createdAt || 0).getTime();
        if (aCreated !== bCreated) return aCreated - bCreated;

        return a.id.localeCompare(b.id);
      });
      nextStepTopic = sortedUncompleted[0];
    }

    // Determine domainStatus
    let status: DomainStatus = 'dormant';
    let statusLabel = 'Tạm dừng';

    const isStudiedRecently =
      latestStudiedTime > 0 && nowMs - latestStudiedTime <= sevenDaysMs;

    if (isStudiedRecently || inProgressTopics > 0) {
      status = 'active';
      statusLabel = 'Đang học';
    } else if (donePercent >= 80 && totalTopics > 0) {
      status = 'maintenance';
      statusLabel = 'Cần ôn tập';
    } else {
      status = 'dormant';
      statusLabel = 'Tạm dừng';
    }

    return {
      rootCategory: root,
      status,
      statusLabel,
      isFocus,
      totalTopics,
      completedTopics,
      inProgressTopics,
      donePercent,
      totalTimeSpentMinutes,
      lastStudiedAt,
      nextStepTopic,
    };
  });
}

/**
 * Sorts domain learning states by priority:
 * 1. isFocus === true (pinned focus domain always in slot 1)
 * 2. totalTopics descending (domain with more topics first)
 * 3. Vietnamese alphabetical order (name A-Z) for stable tie-breaking
 */
export function sortDomainLearningStates(states: DomainLearningState[]): DomainLearningState[] {
  if (!Array.isArray(states)) return [];

  return [...states].sort((a, b) => {
    // 1. isFocus
    if (a.isFocus && !b.isFocus) return -1;
    if (!a.isFocus && b.isFocus) return 1;

    // 2. totalTopics desc
    if (b.totalTopics !== a.totalTopics) {
      return b.totalTopics - a.totalTopics;
    }

    // 3. name A-Z (localeCompare 'vi')
    return a.rootCategory.name.localeCompare(b.rootCategory.name, 'vi');
  });
}

/**
 * Returns the resume queue of in-progress topics sorted by recency.
 */
export function getResumeQueue(topics: Topic[], limit: number = 5): Topic[] {
  const activeTopics = (topics || []).filter((t) => t.visibility !== 'hidden');

  const inProgressList = activeTopics.filter(
    (t) =>
      (t.studyProgress?.status === 'in_progress' || t.studyProgress?.status === 'reviewing') &&
      (t.studyProgress?.progress || 0) < 100
  );

  return inProgressList
    .sort((a, b) => {
      const aStudied = new Date(a.studyProgress?.lastStudied || 0).getTime();
      const bStudied = new Date(b.studyProgress?.lastStudied || 0).getTime();
      if (aStudied !== bStudied) return bStudied - aStudied;

      const aUpdated = new Date(a.updatedAt || 0).getTime();
      const bUpdated = new Date(b.updatedAt || 0).getTime();
      if (aUpdated !== bUpdated) return bUpdated - aUpdated;

      const aProgress = a.studyProgress?.progress || 0;
      const bProgress = b.studyProgress?.progress || 0;
      if (aProgress !== bProgress) return bProgress - aProgress;

      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

export type WeeklyCadenceStatus = 'starting' | 'building' | 'consistent' | 'strong';

export interface DayCadenceItem {
  /** Định dạng "YYYY-MM-DD" theo local timezone của client */
  dateStr: string;
  /** Nhãn ngày rút gọn: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN' */
  dayLabel: string;
  /** Ngày trong tháng (1 - 31) */
  dayNumber: number;
  /** True nếu ngày này trùng với referenceDate (local calendar day) */
  isToday: boolean;
  /** True nếu ngày này nằm sau referenceDate trong tuần hiện tại */
  isFuture: boolean;
  /** True nếu có ít nhất 1 topic mà lastStudied rơi vào ngày này (local date) */
  hasActivity: boolean;
  /** Số lượng topic khác nhau có lastStudied rơi vào ngày này */
  activeTopicCount: number;
}

export interface WeeklyCadenceSummary {
  /** Số ngày trong tuần hiện tại (Thứ 2 -> Chủ Nhật) có hasActivity = true (từ 0 đến 7) */
  activeDaysCount: number;
  /** Tổng số topic khác nhau có lastStudied rơi vào tuần hiện tại */
  activeTopicsCount: number;
  /** Đúng 7 phần tử tương ứng Thứ 2 đến Chủ Nhật của tuần chứa referenceDate */
  days: DayCadenceItem[];
  /** Phân loại nhịp học tuần theo luật định lượng */
  cadenceStatus: WeeklyCadenceStatus;
  /** Thông điệp tóm tắt nhịp học trung thực với dữ liệu */
  headlineMessage: string;
}

/**
 * Pure selector tính toán nhịp học tuần hiện tại từ snapshot lastStudied của danh sách topics.
 * Calendar week tính từ Thứ Hai (00:00:00) đến Chủ Nhật (23:59:59.999) theo local time.
 */
export function getWeeklyLearningCadence(
  topics: Topic[],
  referenceDate: Date = new Date()
): WeeklyCadenceSummary {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  // JavaScript getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayOfWeek = referenceDate.getDay();
  // Difference to Monday of current week:
  // If Sunday (0), Monday was 6 days ago (-6). Otherwise, 1 - dayOfWeek.
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayDate = new Date(refYear, refMonth, refDay + diffToMon, 0, 0, 0, 0);

  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const days: DayCadenceItem[] = [];

  // Generate 7 days (Monday -> Sunday)
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i, 0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;

    const isToday = y === refYear && d.getMonth() === refMonth && d.getDate() === refDay;
    const isFuture = d.getTime() > new Date(refYear, refMonth, refDay, 0, 0, 0, 0).getTime();

    days.push({
      dateStr,
      dayLabel: dayLabels[i],
      dayNumber: d.getDate(),
      isToday,
      isFuture,
      hasActivity: false,
      activeTopicCount: 0,
    });
  }

  // Map dateStr to index in days array
  const dateMap = new Map<string, number>();
  days.forEach((item, index) => {
    dateMap.set(item.dateStr, index);
  });

  // Filter valid active topics (exclude visibility === 'hidden')
  const validTopics = (topics || []).filter((t) => t.visibility !== 'hidden');

  validTopics.forEach((t) => {
    const lastStudied = t.studyProgress?.lastStudied;
    if (!lastStudied || typeof lastStudied !== 'string' || lastStudied.trim() === '') {
      return;
    }

    const studyDate = new Date(lastStudied);
    if (isNaN(studyDate.getTime())) {
      return;
    }

    const sY = studyDate.getFullYear();
    const sM = String(studyDate.getMonth() + 1).padStart(2, '0');
    const sD = String(studyDate.getDate()).padStart(2, '0');
    const studyDateStr = `${sY}-${sM}-${sD}`;

    const dayIndex = dateMap.get(studyDateStr);
    if (dayIndex !== undefined) {
      days[dayIndex].activeTopicCount += 1;
      days[dayIndex].hasActivity = true;
    }
  });

  const activeDaysCount = days.filter((d) => d.hasActivity).length;
  const activeTopicsCount = days.reduce((sum, d) => sum + d.activeTopicCount, 0);

  let cadenceStatus: WeeklyCadenceStatus = 'starting';
  if (activeDaysCount >= 5) {
    cadenceStatus = 'strong';
  } else if (activeDaysCount >= 3) {
    cadenceStatus = 'consistent';
  } else if (activeDaysCount >= 1) {
    cadenceStatus = 'building';
  }

  let headlineMessage = 'Khởi động nhịp học tuần mới';
  if (cadenceStatus === 'building') {
    headlineMessage = `Đang tạo nhịp học: ${activeDaysCount}/7 ngày (${activeTopicsCount} chủ đề)`;
  } else if (cadenceStatus === 'consistent') {
    headlineMessage = `Nhịp học đều đặn: ${activeDaysCount}/7 ngày (${activeTopicsCount} chủ đề)`;
  } else if (cadenceStatus === 'strong') {
    headlineMessage = `Duy trì nhịp học xuất sắc: ${activeDaysCount}/7 ngày (${activeTopicsCount} chủ đề)`;
  }

  return {
    activeDaysCount,
    activeTopicsCount,
    days,
    cadenceStatus,
    headlineMessage,
  };
}
