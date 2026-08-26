import { Topic, Category } from "../types";

export interface RetentionMetrics {
  estimatedRetentionRate: number; // 0 - 100%
  masteredCount: number;
  learningCount: number;
  consolidatingCount: number;
  unstartedCount: number;
  totalStudiedTopics: number;
  totalTimeSpentMinutes: number;
}

export interface DomainReviewBreakdown {
  domain: string;
  count: number;
}

export interface DailyForecast {
  dateStr: string; // "YYYY-MM-DD"
  dayLabel: string; // "Hôm nay", "Ngày mai", "T5 28/08",...
  phatHocCount: number;
  huyenHocCount: number;
  domainCounts: Record<string, number>;
  domains?: DomainReviewBreakdown[];
  totalCount: number;
  isOverdue?: boolean;
}

export interface ForgettingCurvePoint {
  day: number; // 0 - 30
  masteredRetention: number; // %
  moderateRetention: number; // %
  strugglingRetention: number; // %
}

export interface DomainStudySummary {
  domain: string;
  totalTopics: number;
  masteredCount: number;
  learningCount: number;
  consolidatingCount: number;
  unstartedCount: number;
  totalTimeSpentMinutes: number;
  estimatedRetentionRate: number;
}

/**
 * Resolves the canonical root domain key for a given topic from the category hierarchy.
 * Traverses parentId upwards until reaching the top-level root category (parentId === null).
 * Fallback to topic.categorySlug, topic.type, or 'other'.
 */
export function getTopicRootDomain(
  topic: Topic | undefined,
  categories: Category[] = []
): string {
  if (!topic) return "other";

  if (categories && categories.length > 0 && topic.categoryId) {
    const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
    let current = categoryMap.get(topic.categoryId);
    const visited = new Set<string>();

    while (current && current.parentId) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      const parent = categoryMap.get(current.parentId);
      if (!parent) break;
      current = parent;
    }

    if (current) {
      return current.slug || current.id;
    }
  }

  if (topic.categorySlug) return topic.categorySlug;
  if (topic.type) return topic.type;
  return "other";
}

/**
 * Calculates estimated retention rate and mastery stage distribution from topics' studyProgress.
 * Guarantees zero-safety for empty or all-unstarted datasets.
 */
export function calculateRetentionMetrics(topics: Topic[] = []): RetentionMetrics {
  if (!topics || topics.length === 0) {
    return {
      estimatedRetentionRate: 0,
      masteredCount: 0,
      learningCount: 0,
      consolidatingCount: 0,
      unstartedCount: 0,
      totalStudiedTopics: 0,
      totalTimeSpentMinutes: 0,
    };
  }

  let masteredCount = 0;
  let consolidatingCount = 0;
  let learningCount = 0;
  let unstartedCount = 0;
  let totalTimeSpentMinutes = 0;

  const studiedTopicRetentions: number[] = [];
  const now = Date.now();

  for (const topic of topics) {
    const progress = topic.studyProgress;
    if (!progress) {
      unstartedCount += 1;
      continue;
    }

    totalTimeSpentMinutes += progress.timeSpent || 0;

    const repetitions = progress.repetitions || 0;
    const status = progress.status || "not_started";

    // Mastery Stage Grouping (Disjoint Partitioning)
    if (status === "not_started" || repetitions === 0) {
      unstartedCount += 1;
    } else if (repetitions >= 5 || (progress.progress === 100 && repetitions >= 3)) {
      masteredCount += 1;
    } else if (repetitions >= 3) {
      consolidatingCount += 1;
    } else {
      // repetitions 1 or 2
      learningCount += 1;
    }

    // Retention Rate Calculation for active studied topics
    if (repetitions > 0 && status !== "not_started") {
      let daysElapsed = 0;
      if (progress.lastStudied) {
        const lastStudiedTime = new Date(progress.lastStudied).getTime();
        daysElapsed = Math.max(0, (now - lastStudiedTime) / (24 * 60 * 60 * 1000));
      } else if (progress.nextReview && progress.interval) {
        // Fallback: estimate last study date from nextReview - interval
        const nextReviewTime = new Date(progress.nextReview).getTime();
        const estimatedLastStudied = nextReviewTime - (progress.interval * 24 * 60 * 60 * 1000);
        daysElapsed = Math.max(0, (now - estimatedLastStudied) / (24 * 60 * 60 * 1000));
      }

      const ease = progress.easeFactor || 2.5;
      const interval = Math.max(1, progress.interval || 1);
      // Stability formula S = interval * (ease / 2.5)
      const stability = Math.max(1, interval * (ease / 2.5));

      // Ebbinghaus exponential decay R = exp(-daysElapsed / stability)
      const topicRetention = Math.min(
        100,
        Math.max(0, Math.exp(-daysElapsed / stability) * 100)
      );

      studiedTopicRetentions.push(topicRetention);
    }
  }

  const totalStudiedTopics = studiedTopicRetentions.length;
  let estimatedRetentionRate = 0;

  if (totalStudiedTopics > 0) {
    const sumRetention = studiedTopicRetentions.reduce((acc, val) => acc + val, 0);
    estimatedRetentionRate = Number((sumRetention / totalStudiedTopics).toFixed(1));
  }

  return {
    estimatedRetentionRate,
    masteredCount,
    learningCount,
    consolidatingCount,
    unstartedCount,
    totalStudiedTopics,
    totalTimeSpentMinutes,
  };
}

/**
 * Generates a 7-day review queue forecast from topics' nextReview dates,
 * separating counts dynamically by all root domains.
 */
export function calculateReviewForecast(
  topics: Topic[] = [],
  daysAhead: number = 7,
  categories?: Category[]
): DailyForecast[] {
  const safeDays = Math.max(1, Math.min(daysAhead || 7, 30));
  const forecastList: DailyForecast[] = [];

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Initialize daily buckets
  for (let i = 0; i < safeDays; i++) {
    const bucketDate = new Date(startOfDay + i * oneDayMs);
    const dateStr = bucketDate.toISOString().split("T")[0];

    let dayLabel = "";
    if (i === 0) {
      dayLabel = "Hôm nay";
    } else if (i === 1) {
      dayLabel = "Ngày mai";
    } else {
      const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const dayName = dayNames[bucketDate.getDay()];
      const dayNum = String(bucketDate.getDate()).padStart(2, "0");
      const monthNum = String(bucketDate.getMonth() + 1).padStart(2, "0");
      dayLabel = `${dayName} ${dayNum}/${monthNum}`;
    }

    forecastList.push({
      dateStr,
      dayLabel,
      phatHocCount: 0,
      huyenHocCount: 0,
      domainCounts: {},
      domains: [],
      totalCount: 0,
      isOverdue: i === 0,
    });
  }

  // Group topics into forecast buckets
  for (const topic of topics) {
    if (!topic.studyProgress?.nextReview) continue;

    const nextReviewTime = new Date(topic.studyProgress.nextReview).getTime();
    const diffDays = Math.floor((nextReviewTime - startOfDay) / oneDayMs);

    const domainKey = getTopicRootDomain(topic, categories);

    const targetBucketIdx = diffDays <= 0 ? 0 : diffDays < safeDays ? diffDays : -1;

    if (targetBucketIdx >= 0) {
      const bucket = forecastList[targetBucketIdx];
      bucket.domainCounts[domainKey] = (bucket.domainCounts[domainKey] || 0) + 1;
      if (domainKey === "phat-hoc") {
        bucket.phatHocCount += 1;
      } else if (domainKey === "huyen-hoc") {
        bucket.huyenHocCount += 1;
      }
      bucket.totalCount += 1;
    }
  }

  // Compute deterministic sorted domains list for each forecast bucket
  for (const bucket of forecastList) {
    const domainKeys = Object.keys(bucket.domainCounts).sort();
    bucket.domains = domainKeys.map((domain) => ({
      domain,
      count: bucket.domainCounts[domain],
    }));
  }

  return forecastList;
}

/**
 * Aggregates study progress metrics grouped deterministically by root domain.
 */
export function calculateDomainRetentionSummary(
  topics: Topic[] = [],
  categories?: Category[]
): DomainStudySummary[] {
  if (!topics || topics.length === 0) return [];

  const domainMap = new Map<string, Topic[]>();
  for (const topic of topics) {
    const domainKey = getTopicRootDomain(topic, categories);
    const list = domainMap.get(domainKey) || [];
    list.push(topic);
    domainMap.set(domainKey, list);
  }

  const sortedDomainKeys = Array.from(domainMap.keys()).sort();
  return sortedDomainKeys.map((domain) => {
    const domainTopics = domainMap.get(domain) || [];
    const metrics = calculateRetentionMetrics(domainTopics);
    return {
      domain,
      totalTopics: domainTopics.length,
      masteredCount: metrics.masteredCount,
      learningCount: metrics.learningCount,
      consolidatingCount: metrics.consolidatingCount,
      unstartedCount: metrics.unstartedCount,
      totalTimeSpentMinutes: metrics.totalTimeSpentMinutes,
      estimatedRetentionRate: metrics.estimatedRetentionRate,
    };
  });
}

/**
 * Generates a 30-day theoretical forgetting curve projection
 * based on natural exponential decay for 3 ease factor groups.
 */
export function generateForgettingCurveProjection(): ForgettingCurvePoint[] {
  const points: ForgettingCurvePoint[] = [];

  // Theoretical stability parameters (days)
  const masteredStability = 18.0;
  const moderateStability = 7.0;
  const strugglingStability = 2.5;

  let prevMastered = 100;
  let prevModerate = 100;
  let prevStruggling = 100;

  for (let day = 0; day <= 30; day++) {
    if (day === 0) {
      points.push({
        day: 0,
        masteredRetention: 100,
        moderateRetention: 100,
        strugglingRetention: 100,
      });
      continue;
    }

    const rawMastered = Math.round(100 * Math.exp(-day / masteredStability));
    const rawModerate = Math.round(100 * Math.exp(-day / moderateStability));
    const rawStruggling = Math.round(100 * Math.exp(-day / strugglingStability));

    // Ensure strict monotonic non-increasing decay
    const masteredRetention = Math.min(prevMastered, Math.max(0, rawMastered));
    const moderateRetention = Math.min(prevModerate, Math.max(0, rawModerate));
    const strugglingRetention = Math.min(prevStruggling, Math.max(0, rawStruggling));

    prevMastered = masteredRetention;
    prevModerate = moderateRetention;
    prevStruggling = strugglingRetention;

    points.push({
      day,
      masteredRetention,
      moderateRetention,
      strugglingRetention,
    });
  }

  return points;
}
