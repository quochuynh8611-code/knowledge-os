import { describe, it, expect } from 'vitest';
import { getWeeklyLearningCadence } from '../../src/lib/learningStateSelectors';
import { Topic } from '../../src/types';

// Helper to create test topics with minimal required fields
function createMockTopic(
  id: string,
  lastStudied?: string,
  visibility: 'active' | 'hidden' = 'active'
): Topic {
  return {
    id,
    title: `Topic ${id}`,
    slug: `topic-${id}`,
    categoryId: 'cat-root-phat-hoc',
    type: 'phat-hoc',
    description: 'Description',
    content: '',
    tags: [],
    links: [],
    visibility,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    studyProgress: {
      topicId: id,
      status: lastStudied ? 'in_progress' : 'not_started',
      progress: lastStudied ? 30 : 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 0,
      timeSpent: 25,
      lastStudied,
    },
  };
}

// Helper to construct local ISO date string from year, month, day, hour, min
function toLocalISO(year: number, month: number, day: number, hour: number = 10, min: number = 0): string {
  return new Date(year, month - 1, day, hour, min, 0, 0).toISOString();
}

describe('Phase 14C: Weekly Learning Cadence Selector (Wave 14C.0)', () => {
  // Reference date: Friday, 2026-08-28 14:00:00 (Local Time)
  // Week spans: Monday 2026-08-24 -> Sunday 2026-08-30
  const refFriday = new Date(2026, 7, 28, 14, 0, 0, 0);

  it('TC-CAD-01: Returns starting status and empty days when no activity exists in current week', () => {
    // Topics with lastStudied in previous week (e.g. 2026-08-15)
    const oldTopics = [
      createMockTopic('t-old-1', toLocalISO(2026, 8, 15, 10, 0)),
      createMockTopic('t-old-2', toLocalISO(2026, 8, 18, 15, 0)),
    ];

    const result = getWeeklyLearningCadence(oldTopics, refFriday);

    expect(result.activeDaysCount).toBe(0);
    expect(result.activeTopicsCount).toBe(0);
    expect(result.cadenceStatus).toBe('starting');
    expect(result.headlineMessage).toBe('Khởi động nhịp học tuần mới');
    expect(result.days).toHaveLength(7);

    // Verify all 7 days have no activity
    result.days.forEach((d) => {
      expect(d.hasActivity).toBe(false);
      expect(d.activeTopicCount).toBe(0);
    });

    // Check Friday isToday = true
    expect(result.days[4].dayLabel).toBe('T6');
    expect(result.days[4].isToday).toBe(true);
    expect(result.days[4].isFuture).toBe(false);

    // Check Saturday & Sunday are future
    expect(result.days[5].dayLabel).toBe('T7');
    expect(result.days[5].isFuture).toBe(true);
    expect(result.days[6].dayLabel).toBe('CN');
    expect(result.days[6].isFuture).toBe(true);
  });

  it('TC-CAD-02: Evaluates Monday reference date and future day flags correctly', () => {
    // Reference date is Monday morning: 2026-08-24 09:00:00
    const refMonday = new Date(2026, 7, 24, 9, 0, 0, 0);
    const topics = [createMockTopic('t-mon', toLocalISO(2026, 8, 24, 8, 30))];

    const result = getWeeklyLearningCadence(topics, refMonday);

    expect(result.activeDaysCount).toBe(1);
    expect(result.activeTopicsCount).toBe(1);
    expect(result.cadenceStatus).toBe('building');
    expect(result.headlineMessage).toBe('Đang tạo nhịp học: 1/7 ngày (1 chủ đề)');

    // Monday (index 0)
    expect(result.days[0].dayLabel).toBe('T2');
    expect(result.days[0].isToday).toBe(true);
    expect(result.days[0].isFuture).toBe(false);
    expect(result.days[0].hasActivity).toBe(true);
    expect(result.days[0].activeTopicCount).toBe(1);

    // Tuesday to Sunday (indices 1 to 6) must all be future days
    for (let i = 1; i < 7; i++) {
      expect(result.days[i].isToday).toBe(false);
      expect(result.days[i].isFuture).toBe(true);
      expect(result.days[i].hasActivity).toBe(false);
    }
  });

  it('TC-CAD-03: Evaluates Sunday reference date and non-consecutive multi-day activities', () => {
    // Reference date is Sunday evening: 2026-08-30 20:00:00
    const refSunday = new Date(2026, 7, 30, 20, 0, 0, 0);
    const topics = [
      createMockTopic('t-mon', toLocalISO(2026, 8, 24, 9, 0)),
      createMockTopic('t-wed', toLocalISO(2026, 8, 26, 14, 0)),
      createMockTopic('t-fri', toLocalISO(2026, 8, 28, 19, 0)),
      createMockTopic('t-sun', toLocalISO(2026, 8, 30, 10, 0)),
    ];

    const result = getWeeklyLearningCadence(topics, refSunday);

    expect(result.activeDaysCount).toBe(4);
    expect(result.activeTopicsCount).toBe(4);
    expect(result.cadenceStatus).toBe('consistent');
    expect(result.headlineMessage).toBe('Nhịp học đều đặn: 4/7 ngày (4 chủ đề)');

    // Check active days: Mon (0), Wed (2), Fri (4), Sun (6)
    expect(result.days[0].hasActivity).toBe(true);
    expect(result.days[1].hasActivity).toBe(false); // Tue
    expect(result.days[2].hasActivity).toBe(true);
    expect(result.days[3].hasActivity).toBe(false); // Thu
    expect(result.days[4].hasActivity).toBe(true);
    expect(result.days[5].hasActivity).toBe(false); // Sat
    expect(result.days[6].hasActivity).toBe(true);

    // Sunday is today, no future days exist in this week
    expect(result.days[6].isToday).toBe(true);
    result.days.forEach((d) => expect(d.isFuture).toBe(false));
  });

  it('TC-CAD-04: Aggregates multiple topics studied on the same day correctly', () => {
    // 3 different topics all studied on Tuesday 2026-08-25
    const topics = [
      createMockTopic('t-tue-1', toLocalISO(2026, 8, 25, 8, 0)),
      createMockTopic('t-tue-2', toLocalISO(2026, 8, 25, 12, 30)),
      createMockTopic('t-tue-3', toLocalISO(2026, 8, 25, 21, 0)),
    ];

    const result = getWeeklyLearningCadence(topics, refFriday);

    // 1 active day, but 3 active topics
    expect(result.activeDaysCount).toBe(1);
    expect(result.activeTopicsCount).toBe(3);
    expect(result.cadenceStatus).toBe('building');
    expect(result.headlineMessage).toBe('Đang tạo nhịp học: 1/7 ngày (3 chủ đề)');

    // Tuesday day item
    const tuesday = result.days[1];
    expect(tuesday.dayLabel).toBe('T3');
    expect(tuesday.hasActivity).toBe(true);
    expect(tuesday.activeTopicCount).toBe(3);

    // Other days
    result.days
      .filter((_, idx) => idx !== 1)
      .forEach((d) => {
        expect(d.hasActivity).toBe(false);
        expect(d.activeTopicCount).toBe(0);
      });
  });

  it('TC-CAD-05: Handles missing, empty, or invalid lastStudied gracefully without error', () => {
    const topics = [
      createMockTopic('t-valid', toLocalISO(2026, 8, 27, 10, 0)), // Thu
      createMockTopic('t-undefined', undefined),
      createMockTopic('t-empty', ''),
      createMockTopic('t-invalid', 'not-a-valid-date-string'),
    ];

    const result = getWeeklyLearningCadence(topics, refFriday);

    expect(result.activeDaysCount).toBe(1);
    expect(result.activeTopicsCount).toBe(1);
    expect(result.days[3].dayLabel).toBe('T5');
    expect(result.days[3].hasActivity).toBe(true);
  });

  it('TC-CAD-06: Excludes topics with visibility = "hidden" from weekly cadence', () => {
    const topics = [
      createMockTopic('t-hidden-tue', toLocalISO(2026, 8, 25, 10, 0), 'hidden'),
      createMockTopic('t-active-thu', toLocalISO(2026, 8, 27, 10, 0), 'active'),
    ];

    const result = getWeeklyLearningCadence(topics, refFriday);

    expect(result.activeDaysCount).toBe(1);
    expect(result.activeTopicsCount).toBe(1);
    // Tuesday (hidden) must have no activity
    expect(result.days[1].hasActivity).toBe(false);
    expect(result.days[1].activeTopicCount).toBe(0);
    // Thursday (active) must have activity
    expect(result.days[3].hasActivity).toBe(true);
    expect(result.days[3].activeTopicCount).toBe(1);
  });

  it('TC-CAD-07: Calculates week dates correctly across month crossover boundaries', () => {
    // Reference date: Wednesday 2026-09-02
    // Week spans: Monday 2026-08-31 -> Sunday 2026-09-06
    const refCrossing = new Date(2026, 8, 2, 10, 0, 0, 0); // Month index 8 = September
    const topics = [
      createMockTopic('t-aug-31', toLocalISO(2026, 8, 31, 10, 0)), // Mon in August
      createMockTopic('t-sep-02', toLocalISO(2026, 9, 2, 14, 0)),  // Wed in September
    ];

    const result = getWeeklyLearningCadence(topics, refCrossing);

    expect(result.activeDaysCount).toBe(2);
    expect(result.activeTopicsCount).toBe(2);

    // Monday (August 31)
    expect(result.days[0].dateStr).toBe('2026-08-31');
    expect(result.days[0].dayNumber).toBe(31);
    expect(result.days[0].hasActivity).toBe(true);

    // Tuesday (September 1)
    expect(result.days[1].dateStr).toBe('2026-09-01');
    expect(result.days[1].dayNumber).toBe(1);
    expect(result.days[1].hasActivity).toBe(false);

    // Wednesday (September 2)
    expect(result.days[2].dateStr).toBe('2026-09-02');
    expect(result.days[2].dayNumber).toBe(2);
    expect(result.days[2].isToday).toBe(true);
    expect(result.days[2].hasActivity).toBe(true);

    // Sunday (September 6)
    expect(result.days[6].dateStr).toBe('2026-09-06');
    expect(result.days[6].dayNumber).toBe(6);
  });

  it('TC-CAD-08: Classifies cadenceStatus and headlineMessage across all quantitative tiers', () => {
    // Tier 0: 0 days -> starting
    const zeroDays = getWeeklyLearningCadence([], refFriday);
    expect(zeroDays.cadenceStatus).toBe('starting');
    expect(zeroDays.headlineMessage).toBe('Khởi động nhịp học tuần mới');

    // Tier 1: 1 day -> building
    const oneDayTopics = [createMockTopic('t-1', toLocalISO(2026, 8, 24, 10, 0))];
    const oneDay = getWeeklyLearningCadence(oneDayTopics, refFriday);
    expect(oneDay.cadenceStatus).toBe('building');
    expect(oneDay.headlineMessage).toBe('Đang tạo nhịp học: 1/7 ngày (1 chủ đề)');

    // Tier 2: 2 days -> building
    const twoDayTopics = [
      createMockTopic('t-1', toLocalISO(2026, 8, 24, 10, 0)),
      createMockTopic('t-2', toLocalISO(2026, 8, 25, 10, 0)),
    ];
    const twoDays = getWeeklyLearningCadence(twoDayTopics, refFriday);
    expect(twoDays.cadenceStatus).toBe('building');
    expect(twoDays.headlineMessage).toBe('Đang tạo nhịp học: 2/7 ngày (2 chủ đề)');

    // Tier 3: 3 days -> consistent
    const threeDayTopics = [
      ...twoDayTopics,
      createMockTopic('t-3', toLocalISO(2026, 8, 26, 10, 0)),
    ];
    const threeDays = getWeeklyLearningCadence(threeDayTopics, refFriday);
    expect(threeDays.cadenceStatus).toBe('consistent');
    expect(threeDays.headlineMessage).toBe('Nhịp học đều đặn: 3/7 ngày (3 chủ đề)');

    // Tier 4: 4 days -> consistent
    const fourDayTopics = [
      ...threeDayTopics,
      createMockTopic('t-4', toLocalISO(2026, 8, 27, 10, 0)),
    ];
    const fourDays = getWeeklyLearningCadence(fourDayTopics, refFriday);
    expect(fourDays.cadenceStatus).toBe('consistent');
    expect(fourDays.headlineMessage).toBe('Nhịp học đều đặn: 4/7 ngày (4 chủ đề)');

    // Tier 5: 5 days -> strong
    const fiveDayTopics = [
      ...fourDayTopics,
      createMockTopic('t-5', toLocalISO(2026, 8, 28, 10, 0)),
    ];
    const fiveDays = getWeeklyLearningCadence(fiveDayTopics, refFriday);
    expect(fiveDays.cadenceStatus).toBe('strong');
    expect(fiveDays.headlineMessage).toBe('Duy trì nhịp học xuất sắc: 5/7 ngày (5 chủ đề)');

    // Tier 7: 7 days -> strong
    const sevenDayTopics = [
      ...fiveDayTopics,
      createMockTopic('t-6', toLocalISO(2026, 8, 29, 10, 0)),
      createMockTopic('t-7', toLocalISO(2026, 8, 30, 10, 0)),
    ];
    const sevenDays = getWeeklyLearningCadence(sevenDayTopics, refFriday);
    expect(sevenDays.cadenceStatus).toBe('strong');
    expect(sevenDays.headlineMessage).toBe('Duy trì nhịp học xuất sắc: 7/7 ngày (7 chủ đề)');
  });
});
