import { describe, it, expect } from 'vitest';
import {
  getPriorityDomain,
  getTodayRecommendation,
  getDomainLearningStates,
  getResumeQueue,
} from '../../src/lib/learningStateSelectors';
import { Category, Topic } from '../../src/types';

describe('Phase 13: Learning State Selectors (Wave 0)', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-dong-y',
      name: 'Đông y',
      slug: 'dong-y',
      parentId: null,
      color: '#059669',
    },
    {
      id: 'cat-tieng-trung',
      name: 'Tiếng Trung',
      slug: 'tieng-trung',
      parentId: null,
      color: '#d97706',
    },
    {
      id: 'cat-phat-hoc',
      name: 'Phật học',
      slug: 'phat-hoc',
      parentId: null,
      color: '#7c3aed',
    },
    {
      id: 'cat-dong-y-sub',
      name: 'Bát Cương',
      slug: 'bat-cuong',
      parentId: 'cat-dong-y',
    },
  ];

  const createTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: 'topic-1',
    title: 'Chủ đề mẫu',
    slug: 'chu-de-mau',
    categoryId: 'cat-dong-y',
    type: 'general',
    description: 'Mô tả',
    content: 'Nội dung',
    tags: [],
    links: [],
    visibility: 'active',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    studyProgress: {
      topicId: 'topic-1',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    ...overrides,
  });

  describe('getPriorityDomain', () => {
    it('TC-01: Primary source - picks root category of topic with newest lastStudied', () => {
      const topics: Topic[] = [
        createTopic({
          id: 't-dy',
          categoryId: 'cat-dong-y',
          studyProgress: {
            topicId: 't-dy',
            status: 'in_progress',
            progress: 50,
            interval: 1,
            easeFactor: 2.5,
            repetitions: 1,
            totalNotes: 0,
            timeSpent: 60,
            lastStudied: '2026-08-30T10:00:00.000Z', // Newest
          },
        }),
        createTopic({
          id: 't-tt',
          categoryId: 'cat-tieng-trung',
          studyProgress: {
            topicId: 't-tt',
            status: 'in_progress',
            progress: 30,
            interval: 1,
            easeFactor: 2.5,
            repetitions: 1,
            totalNotes: 0,
            timeSpent: 40,
            lastStudied: '2026-08-27T10:00:00.000Z', // 3 days ago
          },
        }),
      ];

      const domain = getPriorityDomain(topics, mockCategories);
      expect(domain?.id).toBe('cat-dong-y');
      expect(domain?.name).toBe('Đông y');
    });

    it('TC-02: Fallback 1 - no lastStudied, picks domain with newest updatedAt among in-progress topics', () => {
      const topics: Topic[] = [
        createTopic({
          id: 't-dy',
          categoryId: 'cat-dong-y',
          updatedAt: '2026-08-10T00:00:00.000Z',
          studyProgress: {
            topicId: 't-dy',
            status: 'in_progress',
            progress: 20,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            totalNotes: 0,
            timeSpent: 20,
          },
        }),
        createTopic({
          id: 't-tt',
          categoryId: 'cat-tieng-trung',
          updatedAt: '2026-08-20T00:00:00.000Z', // Newest updatedAt
          studyProgress: {
            topicId: 't-tt',
            status: 'in_progress',
            progress: 40,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            totalNotes: 0,
            timeSpent: 40,
          },
        }),
      ];

      const domain = getPriorityDomain(topics, mockCategories);
      expect(domain?.id).toBe('cat-tieng-trung');
    });

    it('TC-03: Fallback 2 - cold start, returns first root category with active topic', () => {
      const topics: Topic[] = [
        createTopic({
          id: 't-tt-cold',
          categoryId: 'cat-tieng-trung',
          studyProgress: {
            topicId: 't-tt-cold',
            status: 'not_started',
            progress: 0,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            totalNotes: 0,
            timeSpent: 0,
          },
        }),
      ];

      const domain = getPriorityDomain(topics, mockCategories);
      expect(domain?.id).toBe('cat-tieng-trung');
    });

    it('TC-04: Edge case - empty categories returns null', () => {
      const domain = getPriorityDomain([], []);
      expect(domain).toBeNull();
    });
  });

  describe('getTodayRecommendation', () => {
    it('TC-05: Tier 1 - Spaced Review Due picks oldest overdue topic', () => {
      const topicA = createTopic({
        id: 't-overdue-3days',
        title: 'Bát Quái Ôn Tập',
        categoryId: 'cat-dong-y',
        studyProgress: {
          topicId: 't-overdue-3days',
          status: 'reviewing',
          progress: 100,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 100,
          nextReview: '2026-08-27T00:00:00.000Z', // 3 days overdue
        },
      });

      const topicB = createTopic({
        id: 't-overdue-1day',
        title: 'Hán Tự Ôn Tập',
        categoryId: 'cat-tieng-trung',
        studyProgress: {
          topicId: 't-overdue-1day',
          status: 'reviewing',
          progress: 100,
          interval: 6,
          easeFactor: 2.5,
          repetitions: 2,
          totalNotes: 0,
          timeSpent: 120,
          nextReview: '2026-08-29T00:00:00.000Z', // 1 day overdue
        },
      });

      const rec = getTodayRecommendation([topicA, topicB], mockCategories, [topicA, topicB]);
      expect(rec).not.toBeNull();
      expect(rec?.tier).toBe('review_due');
      expect(rec?.topic.id).toBe('t-overdue-3days');
      expect(rec?.badgeLabel).toBe('Ôn tập định kỳ SM-2');
    });

    it('TC-06: Tier 1 Tie-break - same nextReview, picks shorter interval', () => {
      const topicA = createTopic({
        id: 't-short-interval',
        categoryId: 'cat-dong-y',
        studyProgress: {
          topicId: 't-short-interval',
          status: 'reviewing',
          progress: 80,
          interval: 1, // Shorter
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 50,
          nextReview: '2026-08-29T00:00:00.000Z',
        },
      });

      const topicB = createTopic({
        id: 't-long-interval',
        categoryId: 'cat-tieng-trung',
        studyProgress: {
          topicId: 't-long-interval',
          status: 'reviewing',
          progress: 80,
          interval: 6, // Longer
          easeFactor: 2.5,
          repetitions: 2,
          totalNotes: 0,
          timeSpent: 80,
          nextReview: '2026-08-29T00:00:00.000Z',
        },
      });

      const rec = getTodayRecommendation([topicA, topicB], mockCategories, [topicA, topicB]);
      expect(rec?.topic.id).toBe('t-short-interval');
    });

    it('TC-07: Tier 2 - In-Progress Active Topic picks newest lastStudied', () => {
      const topicX = createTopic({
        id: 't-in-progress-new',
        categoryId: 'cat-dong-y',
        studyProgress: {
          topicId: 't-in-progress-new',
          status: 'in_progress',
          progress: 40,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 30,
          lastStudied: '2026-08-30T09:00:00.000Z', // 2 hours ago
        },
      });

      const topicY = createTopic({
        id: 't-in-progress-old',
        categoryId: 'cat-tieng-trung',
        studyProgress: {
          topicId: 't-in-progress-old',
          status: 'in_progress',
          progress: 80,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 70,
          lastStudied: '2026-08-29T09:00:00.000Z', // yesterday
        },
      });

      const rec = getTodayRecommendation([topicX, topicY], mockCategories, []);
      expect(rec?.tier).toBe('in_progress');
      expect(rec?.topic.id).toBe('t-in-progress-new');
      expect(rec?.badgeLabel).toBe('Tiếp tục bài học dở dang');
    });

    it('TC-08: Tier 3 - Next Step in Priority Domain picks oldest not_started topic', () => {
      // Dong Y was studied recently
      const studiedTopic = createTopic({
        id: 't-dy-done',
        categoryId: 'cat-dong-y',
        createdAt: '2026-08-01T00:00:00.000Z',
        studyProgress: {
          topicId: 't-dy-done',
          status: 'completed',
          progress: 100,
          interval: 10,
          easeFactor: 2.5,
          repetitions: 3,
          totalNotes: 0,
          timeSpent: 120,
          lastStudied: '2026-08-29T00:00:00.000Z',
        },
      });

      // Next unstarted topic in Dong Y
      const nextTopic1 = createTopic({
        id: 't-dy-next-1',
        categoryId: 'cat-dong-y-sub', // child category of Dong Y
        createdAt: '2026-08-02T00:00:00.000Z', // Older creation date (Bài 1)
        studyProgress: {
          topicId: 't-dy-next-1',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
      });

      const nextTopic2 = createTopic({
        id: 't-dy-next-2',
        categoryId: 'cat-dong-y',
        createdAt: '2026-08-05T00:00:00.000Z', // Newer creation date (Bài 2)
        studyProgress: {
          topicId: 't-dy-next-2',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
      });

      const rec = getTodayRecommendation([studiedTopic, nextTopic1, nextTopic2], mockCategories, []);
      expect(rec?.tier).toBe('next_step');
      expect(rec?.topic.id).toBe('t-dy-next-1');
      expect(rec?.rootCategory?.id).toBe('cat-dong-y');
    });

    it('TC-09: Edge case - all topics completed fallback gracefully', () => {
      const topicA = createTopic({
        id: 't-all-done',
        categoryId: 'cat-dong-y',
        studyProgress: {
          topicId: 't-all-done',
          status: 'completed',
          progress: 100,
          interval: 30,
          easeFactor: 2.5,
          repetitions: 5,
          totalNotes: 0,
          timeSpent: 200,
          lastStudied: '2026-08-25T00:00:00.000Z',
        },
      });

      const rec = getTodayRecommendation([topicA], mockCategories, []);
      expect(rec).not.toBeNull();
      expect(rec?.topic.id).toBe('t-all-done');
    });
  });

  describe('getDomainLearningStates', () => {
    it('TC-10: Classifies domains correctly into active, maintenance, and dormant', () => {
      const now = new Date('2026-08-30T12:00:00.000Z');

      const topics: Topic[] = [
        // Dong Y: studied 2 days ago -> active
        createTopic({
          id: 't-dy',
          categoryId: 'cat-dong-y',
          studyProgress: {
            topicId: 't-dy',
            status: 'in_progress',
            progress: 50,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            totalNotes: 0,
            timeSpent: 90,
            lastStudied: '2026-08-28T12:00:00.000Z',
          },
        }),
        // Phat Hoc: 100% completed, not studied in 20 days -> maintenance
        createTopic({
          id: 't-ph',
          categoryId: 'cat-phat-hoc',
          studyProgress: {
            topicId: 't-ph',
            status: 'completed',
            progress: 100,
            interval: 20,
            easeFactor: 2.5,
            repetitions: 3,
            totalNotes: 0,
            timeSpent: 300,
            lastStudied: '2026-08-10T12:00:00.000Z',
          },
        }),
        // Tieng Trung: 0% not started -> dormant
        createTopic({
          id: 't-tt',
          categoryId: 'cat-tieng-trung',
          studyProgress: {
            topicId: 't-tt',
            status: 'not_started',
            progress: 0,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            totalNotes: 0,
            timeSpent: 0,
          },
        }),
      ];

      const states = getDomainLearningStates(topics, mockCategories, now);
      expect(states).toHaveLength(3);

      const dyState = states.find((s) => s.rootCategory.id === 'cat-dong-y');
      expect(dyState?.status).toBe('active');
      expect(dyState?.statusLabel).toBe('Đang học');
      expect(dyState?.totalTimeSpentMinutes).toBe(90);

      const phState = states.find((s) => s.rootCategory.id === 'cat-phat-hoc');
      expect(phState?.status).toBe('maintenance');
      expect(phState?.statusLabel).toBe('Cần ôn tập');
      expect(phState?.donePercent).toBe(100);

      const ttState = states.find((s) => s.rootCategory.id === 'cat-tieng-trung');
      expect(ttState?.status).toBe('dormant');
      expect(ttState?.statusLabel).toBe('Tạm dừng');
      expect(ttState?.donePercent).toBe(0);
    });
  });

  describe('getResumeQueue', () => {
    it('TC-11: Filters in_progress & reviewing topics, sorts by lastStudied desc, excludes completed', () => {
      const topics: Topic[] = [
        createTopic({
          id: 't-done',
          studyProgress: {
            topicId: 't-done',
            status: 'completed',
            progress: 100,
            interval: 10,
            easeFactor: 2.5,
            repetitions: 2,
            totalNotes: 0,
            timeSpent: 100,
          },
        }),
        createTopic({
          id: 't-prog-1',
          studyProgress: {
            topicId: 't-prog-1',
            status: 'in_progress',
            progress: 40,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            totalNotes: 0,
            timeSpent: 40,
            lastStudied: '2026-08-30T10:00:00.000Z', // Newest
          },
        }),
        createTopic({
          id: 't-prog-2',
          studyProgress: {
            topicId: 't-prog-2',
            status: 'reviewing',
            progress: 80,
            interval: 1,
            easeFactor: 2.5,
            repetitions: 1,
            totalNotes: 0,
            timeSpent: 60,
            lastStudied: '2026-08-29T10:00:00.000Z',
          },
        }),
      ];

      const queue = getResumeQueue(topics, 5);
      expect(queue).toHaveLength(2);
      expect(queue[0].id).toBe('t-prog-1');
      expect(queue[1].id).toBe('t-prog-2');
    });

    it('TC-12: Edge case - returns empty array when no topics are in progress', () => {
      const topics: Topic[] = [
        createTopic({
          id: 't-not-started',
          studyProgress: {
            topicId: 't-not-started',
            status: 'not_started',
            progress: 0,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            totalNotes: 0,
            timeSpent: 0,
          },
        }),
      ];

      const queue = getResumeQueue(topics, 5);
      expect(queue).toEqual([]);
    });
  });

  describe('Phase 14B: Explicit Focus Domain Semantics', () => {
    it('TC-13: Review Due Override - SM-2 review due in any domain overrides focusDomainId', () => {
      const focusTopic = createTopic({
        id: 't-focus-prog',
        title: 'Đông Y Đang Học',
        categoryId: 'cat-dong-y',
        studyProgress: {
          topicId: 't-focus-prog',
          status: 'in_progress',
          progress: 60,
          interval: 2,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 80,
          lastStudied: '2026-08-30T10:00:00.000Z',
        },
      });

      const dueTopic = createTopic({
        id: 't-due-chinese',
        title: 'Hán Tự Đến Hạn Ôn',
        categoryId: 'cat-tieng-trung',
        studyProgress: {
          topicId: 't-due-chinese',
          status: 'reviewing',
          progress: 100,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 100,
          nextReview: '2026-08-28T00:00:00.000Z',
        },
      });

      const rec = getTodayRecommendation(
        [focusTopic, dueTopic],
        mockCategories,
        [dueTopic],
        new Date(),
        'cat-dong-y' // Focus domain is Đông Y
      );

      expect(rec).not.toBeNull();
      expect(rec?.tier).toBe('review_due');
      expect(rec?.topic.id).toBe('t-due-chinese');
      expect(rec?.rootCategory?.id).toBe('cat-tieng-trung');
    });

    it('TC-14: Focus Domain In-Progress Priority - picks focus domain in-progress topic over non-focus in-progress topic', () => {
      const nonFocusInProgress = createTopic({
        id: 't-nonfocus-prog',
        title: 'Tiếng Trung Đang Học',
        categoryId: 'cat-tieng-trung',
        studyProgress: {
          topicId: 't-nonfocus-prog',
          status: 'in_progress',
          progress: 75,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 120,
          lastStudied: '2026-08-30T11:00:00.000Z', // Even if newer
        },
      });

      const focusInProgress = createTopic({
        id: 't-focus-prog',
        title: 'Đông Y Đang Học',
        categoryId: 'cat-dong-y',
        studyProgress: {
          topicId: 't-focus-prog',
          status: 'in_progress',
          progress: 30,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 40,
          lastStudied: '2026-08-29T10:00:00.000Z',
        },
      });

      const rec = getTodayRecommendation(
        [nonFocusInProgress, focusInProgress],
        mockCategories,
        [],
        new Date(),
        'cat-dong-y' // Focus on Đông y
      );

      expect(rec?.tier).toBe('in_progress');
      expect(rec?.topic.id).toBe('t-focus-prog');
      expect(rec?.rootCategory?.id).toBe('cat-dong-y');
      expect(rec?.reason).toContain('Môn trọng tâm');
    });

    it('TC-15: Focus Domain Next-Step Priority - deliberately prioritizes focus domain unstarted topic over non-focus in-progress topic', () => {
      // PRODUCT INTENT: When user sets an explicit focus domain, they intend to concentrate on this subject.
      // Therefore, starting the next step in the focus domain takes precedence over non-focus lingering in-progress topics.
      const nonFocusInProgress = createTopic({
        id: 't-nonfocus-prog',
        title: 'Tiếng Trung Dở Dang',
        categoryId: 'cat-tieng-trung',
        studyProgress: {
          topicId: 't-nonfocus-prog',
          status: 'in_progress',
          progress: 50,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 60,
          lastStudied: '2026-08-30T09:00:00.000Z',
        },
      });

      const focusUnstarted = createTopic({
        id: 't-focus-next',
        title: 'Đông Y Bài Kế Tiếp',
        categoryId: 'cat-dong-y',
        createdAt: '2026-08-01T00:00:00.000Z',
        studyProgress: {
          topicId: 't-focus-next',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
      });

      const rec = getTodayRecommendation(
        [nonFocusInProgress, focusUnstarted],
        mockCategories,
        [],
        new Date(),
        'cat-dong-y' // Focus on Đông Y
      );

      expect(rec?.tier).toBe('next_step');
      expect(rec?.topic.id).toBe('t-focus-next');
      expect(rec?.rootCategory?.id).toBe('cat-dong-y');
      expect(rec?.badgeLabel).toContain('Bài học tiếp theo (Đông y)');
      expect(rec?.reason).toContain('Môn trọng tâm');
    });

    it('TC-16: Focus Domain Completed Fallback - when all focus domain topics are completed, falls back gracefully to auto flow', () => {
      const focusCompleted = createTopic({
        id: 't-focus-done',
        title: 'Đông Y Đã Hoàn Thành',
        categoryId: 'cat-dong-y',
        studyProgress: {
          topicId: 't-focus-done',
          status: 'completed',
          progress: 100,
          interval: 10,
          easeFactor: 2.5,
          repetitions: 3,
          totalNotes: 5,
          timeSpent: 300,
        },
      });

      const otherInProgress = createTopic({
        id: 't-other-prog',
        title: 'Phật Học Dở Dang',
        categoryId: 'cat-phat-hoc',
        studyProgress: {
          topicId: 't-other-prog',
          status: 'in_progress',
          progress: 40,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 1,
          timeSpent: 45,
          lastStudied: '2026-08-30T08:00:00.000Z',
        },
      });

      const rec = getTodayRecommendation(
        [focusCompleted, otherInProgress],
        mockCategories,
        [],
        new Date(),
        'cat-dong-y' // Focus domain has nothing left to start/resume
      );

      expect(rec?.tier).toBe('in_progress');
      expect(rec?.topic.id).toBe('t-other-prog');
      expect(rec?.rootCategory?.id).toBe('cat-phat-hoc');
    });

    it('TC-17: Invalid focusDomainId Fallback - non-existent ID gracefully executes auto recommendation flow', () => {
      const inProgressTopic = createTopic({
        id: 't-prog',
        title: 'Chủ đề dở dang',
        categoryId: 'cat-tieng-trung',
        studyProgress: {
          topicId: 't-prog',
          status: 'in_progress',
          progress: 25,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 20,
        },
      });

      const rec = getTodayRecommendation(
        [inProgressTopic],
        mockCategories,
        [],
        new Date(),
        'non_existent_category_id'
      );

      expect(rec?.topic.id).toBe('t-prog');
      expect(rec?.tier).toBe('in_progress');
    });

    it('TC-18: Derived isFocus Flag in getDomainLearningStates - sets isFocus = true only for the matching root domain', () => {
      const topics: Topic[] = [
        createTopic({
          id: 't-dy',
          categoryId: 'cat-dong-y',
        }),
        createTopic({
          id: 't-tt',
          categoryId: 'cat-tieng-trung',
        }),
      ];

      const states = getDomainLearningStates(topics, mockCategories, new Date(), 'cat-dong-y');

      const dongYState = states.find((s) => s.rootCategory.id === 'cat-dong-y');
      const tiengTrungState = states.find((s) => s.rootCategory.id === 'cat-tieng-trung');
      const phatHocState = states.find((s) => s.rootCategory.id === 'cat-phat-hoc');

      expect(dongYState?.isFocus).toBe(true);
      expect(tiengTrungState?.isFocus).toBe(false);
      expect(phatHocState?.isFocus).toBe(false);
    });
  });
});
