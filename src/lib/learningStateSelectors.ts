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
 * Generates the deterministic, evidence-based Today Recommendation for Phase 13.
 * Evaluation Cascade:
 *   Tier 1: Spaced Review Due (oldest due, shortest interval, lowest easeFactor, id asc)
 *   Tier 2: In-Progress Active Topic (newest lastStudied, newest updatedAt, highest progress, id asc)
 *   Tier 3: Next Step in Priority Domain (first not_started topic by createdAt asc, id asc)
 *   Tier 4: System Fallback (first not_started topic across all categories)
 * Returns null if no valid topic exists in the workspace.
 */
export function getTodayRecommendation(
  topics: Topic[],
  categories: Category[],
  reviewQueueInput?: Topic[],
  now: Date = new Date()
): TodayRecommendation | null {
  const activeTopics = (topics || []).filter((t) => t.visibility !== 'hidden');
  if (activeTopics.length === 0) return null;

  // --- Tier 1: Spaced Review Due ---
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

  // --- Tier 2: In-Progress Active Topic ---
  const inProgressList = activeTopics.filter(
    (t) =>
      (t.studyProgress?.status === 'in_progress' || t.studyProgress?.status === 'reviewing') &&
      (t.studyProgress?.progress || 0) < 100
  );

  if (inProgressList.length > 0) {
    const sortedInProgress = [...inProgressList].sort((a, b) => {
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

    const chosen = sortedInProgress[0];
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

  // --- Tier 3: Next Step in Priority Domain ---
  const priorityDomain = getPriorityDomain(activeTopics, categories);
  if (priorityDomain) {
    const domainUnstartedTopics = activeTopics.filter(
      (t) =>
        topicBelongsToRootCategory(t, categories, priorityDomain.id) &&
        (t.studyProgress?.status === 'not_started' || (t.studyProgress?.progress || 0) === 0)
    );

    if (domainUnstartedTopics.length > 0) {
      const sortedUnstarted = [...domainUnstartedTopics].sort((a, b) => {
        const aCreated = new Date(a.createdAt || 0).getTime();
        const bCreated = new Date(b.createdAt || 0).getTime();
        if (aCreated !== bCreated) return aCreated - bCreated; // Oldest createdAt first (curriculum proxy)
        return a.id.localeCompare(b.id);
      });

      const chosen = sortedUnstarted[0];
      return {
        topic: chosen,
        rootCategory: priorityDomain,
        tier: 'next_step',
        badgeLabel: `Bài học tiếp theo (${priorityDomain.name})`,
        reason: `Bước kế tiếp trong lộ trình môn ${priorityDomain.name}`,
      };
    }
  }

  // --- Tier 4: Fallback across any unstarted topic in the workspace ---
  const anyUnstarted = activeTopics.filter(
    (t) =>
      t.studyProgress?.status === 'not_started' || (t.studyProgress?.progress || 0) === 0
  );

  if (anyUnstarted.length > 0) {
    const rootCategories = getRootCategories(categories);
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
  now: Date = new Date()
): DomainLearningState[] {
  const rootCategories = getRootCategories(categories);
  if (!rootCategories || rootCategories.length === 0) return [];

  const activeTopics = (topics || []).filter((t) => t.visibility !== 'hidden');
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  return rootCategories.map((root) => {
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
