import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeeklyCadenceBar } from '../../src/components/dashboard/WeeklyCadenceBar';
import { WeeklyCadenceSummary } from '../../src/lib/learningStateSelectors';

describe('Phase 14C: WeeklyCadenceBar Presentational Component (Wave 14C.1)', () => {
  const mockCadence: WeeklyCadenceSummary = {
    activeDaysCount: 3,
    activeTopicsCount: 4,
    cadenceStatus: 'consistent',
    headlineMessage: 'Nhịp học đều đặn: 3/7 ngày (4 chủ đề)',
    days: [
      { dateStr: '2026-08-24', dayLabel: 'T2', dayNumber: 24, isToday: false, isFuture: false, hasActivity: true, activeTopicCount: 1 },
      { dateStr: '2026-08-25', dayLabel: 'T3', dayNumber: 25, isToday: false, isFuture: false, hasActivity: true, activeTopicCount: 2 },
      { dateStr: '2026-08-26', dayLabel: 'T4', dayNumber: 26, isToday: false, isFuture: false, hasActivity: false, activeTopicCount: 0 },
      { dateStr: '2026-08-27', dayLabel: 'T5', dayNumber: 27, isToday: false, isFuture: false, hasActivity: true, activeTopicCount: 1 },
      { dateStr: '2026-08-28', dayLabel: 'T6', dayNumber: 28, isToday: true, isFuture: false, hasActivity: false, activeTopicCount: 0 },
      { dateStr: '2026-08-29', dayLabel: 'T7', dayNumber: 29, isToday: false, isFuture: true, hasActivity: false, activeTopicCount: 0 },
      { dateStr: '2026-08-30', dayLabel: 'CN', dayNumber: 30, isToday: false, isFuture: true, hasActivity: false, activeTopicCount: 0 },
    ],
  };

  it('1. Renders headlineMessage and active count badge accurately', () => {
    render(<WeeklyCadenceBar cadence={mockCadence} />);

    expect(screen.getByText('Nhịp học đều đặn: 3/7 ngày (4 chủ đề)')).toBeInTheDocument();
    expect(screen.getByTestId('cadence-active-badge')).toHaveTextContent('3/7 ngày • 4 chủ đề');
  });

  it('2. Renders exactly 7 day pills in correct order from T2 to CN', () => {
    render(<WeeklyCadenceBar cadence={mockCadence} />);

    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    labels.forEach((label) => {
      const pill = screen.getByTestId(`cadence-day-${label}`);
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveTextContent(label);
    });

    // Check specific day numbers
    expect(screen.getByTestId('cadence-day-T2')).toHaveTextContent('24');
    expect(screen.getByTestId('cadence-day-CN')).toHaveTextContent('30');
  });

  it('3. Renders visual activity marker on days with activity', () => {
    render(<WeeklyCadenceBar cadence={mockCadence} />);

    // T2, T3, T5 have activity
    expect(screen.getByTestId('cadence-day-T2')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('activity-dot-T2')).toBeInTheDocument();

    expect(screen.getByTestId('cadence-day-T3')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('activity-dot-T3')).toBeInTheDocument();

    expect(screen.getByTestId('cadence-day-T5')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('activity-dot-T5')).toBeInTheDocument();

    // T4 has no activity
    expect(screen.getByTestId('cadence-day-T4')).toHaveAttribute('data-active', 'false');
    expect(screen.queryByTestId('activity-dot-T4')).toBeNull();
  });

  it('4. Highlights current day (isToday) with ring emphasis', () => {
    render(<WeeklyCadenceBar cadence={mockCadence} />);

    const fridayPill = screen.getByTestId('cadence-day-T6');
    expect(fridayPill).toHaveAttribute('data-today', 'true');
    expect(fridayPill.className).toContain('ring-1.5');
  });

  it('5. Applies soft visual state for future days', () => {
    render(<WeeklyCadenceBar cadence={mockCadence} />);

    const saturdayPill = screen.getByTestId('cadence-day-T7');
    const sundayPill = screen.getByTestId('cadence-day-CN');

    expect(saturdayPill).toHaveAttribute('data-future', 'true');
    expect(saturdayPill.className).toContain('opacity-40');

    expect(sundayPill).toHaveAttribute('data-future', 'true');
    expect(sundayPill.className).toContain('opacity-40');
  });

  it('6. Renders starting / empty state gracefully without badge', () => {
    const emptyCadence: WeeklyCadenceSummary = {
      activeDaysCount: 0,
      activeTopicsCount: 0,
      cadenceStatus: 'starting',
      headlineMessage: 'Khởi động nhịp học tuần mới',
      days: mockCadence.days.map((d) => ({
        ...d,
        hasActivity: false,
        activeTopicCount: 0,
      })),
    };

    render(<WeeklyCadenceBar cadence={emptyCadence} />);

    expect(screen.getByText('Khởi động nhịp học tuần mới')).toBeInTheDocument();
    expect(screen.queryByTestId('cadence-active-badge')).toBeNull();
  });

  it('7. Renders standalone without DataContext dependency', () => {
    // Render without DataProvider wrapper
    const { container } = render(<WeeklyCadenceBar cadence={mockCadence} />);
    expect(container.querySelector('[data-testid="weekly-cadence-bar"]')).toBeInTheDocument();
  });
});
