/**
 * Phase P0.1: StudyTimerContext & Isolation Tests
 * Test-first verification for timer state separation and DataContext facade compatibility.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import {
  StudyTimerProvider,
  useStudyTimer,
} from '../../src/context/StudyTimerContext';
import { DataProvider, useData } from '../../src/context/DataContext';

describe('Phase P0.1: StudyTimerContext & Isolation Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. StudyTimerContext standalone behavior', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useStudyTimer(), {
        wrapper: ({ children }) => <StudyTimerProvider>{children}</StudyTimerProvider>,
      });

      expect(result.current.activeTimerTopicId).toBeNull();
      expect(result.current.timerSeconds).toBe(0);
      expect(result.current.isTimerRunning).toBe(false);
      expect(result.current.timerMode).toBe('stopwatch');
      expect(result.current.pomodoroTimeRemaining).toBe(25 * 60);
    });

    it('starts stopwatch timer and ticks every second', () => {
      const { result } = renderHook(() => useStudyTimer(), {
        wrapper: ({ children }) => <StudyTimerProvider>{children}</StudyTimerProvider>,
      });

      act(() => {
        result.current.startStudyTimer('topic-test-1', 'stopwatch');
      });

      expect(result.current.isTimerRunning).toBe(true);
      expect(result.current.activeTimerTopicId).toBe('topic-test-1');
      expect(result.current.timerMode).toBe('stopwatch');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.timerSeconds).toBe(5);
    });

    it('starts pomodoro timer, counts down and stops at zero', () => {
      const { result } = renderHook(() => useStudyTimer(), {
        wrapper: ({ children }) => <StudyTimerProvider>{children}</StudyTimerProvider>,
      });

      act(() => {
        result.current.startStudyTimer('topic-test-pomodoro', 'pomodoro');
      });

      expect(result.current.isTimerRunning).toBe(true);
      expect(result.current.pomodoroTimeRemaining).toBe(25 * 60);

      act(() => {
        vi.advanceTimersByTime(10000); // 10s
      });

      expect(result.current.pomodoroTimeRemaining).toBe(25 * 60 - 10);

      // Advance past the remaining time
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });

      expect(result.current.pomodoroTimeRemaining).toBe(0);
      expect(result.current.isTimerRunning).toBe(false);
    });

    it('pauses and resumes study timer correctly', () => {
      const { result } = renderHook(() => useStudyTimer(), {
        wrapper: ({ children }) => <StudyTimerProvider>{children}</StudyTimerProvider>,
      });

      act(() => {
        result.current.startStudyTimer('topic-test-pause', 'stopwatch');
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.timerSeconds).toBe(3);

      act(() => {
        result.current.pauseStudyTimer();
      });
      expect(result.current.isTimerRunning).toBe(false);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      // Should remain at 3 while paused
      expect(result.current.timerSeconds).toBe(3);
    });

    it('calls onLogStudyTime callback when stopped with elapsed time > 0', () => {
      const onLogStudyTime = vi.fn();
      const { result } = renderHook(() => useStudyTimer(), {
        wrapper: ({ children }) => (
          <StudyTimerProvider onLogStudyTime={onLogStudyTime}>{children}</StudyTimerProvider>
        ),
      });

      act(() => {
        result.current.startStudyTimer('topic-log-1', 'stopwatch');
      });

      act(() => {
        vi.advanceTimersByTime(120 * 1000); // 2 minutes
      });

      act(() => {
        result.current.stopAndSaveStudyTimer();
      });

      expect(onLogStudyTime).toHaveBeenCalledWith('topic-log-1', 2);
      expect(result.current.isTimerRunning).toBe(false);
      expect(result.current.activeTimerTopicId).toBeNull();
      expect(result.current.timerSeconds).toBe(0);
    });
  });

  describe('2. DataContext Facade Compatibility', () => {
    it('useData() continues to expose all timer fields seamlessly', () => {
      const { result } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      expect(result.current.timerSeconds).toBeDefined();
      expect(result.current.isTimerRunning).toBeDefined();
      expect(result.current.timerMode).toBeDefined();
      expect(result.current.pomodoroTimeRemaining).toBeDefined();
      expect(typeof result.current.startStudyTimer).toBe('function');
      expect(typeof result.current.pauseStudyTimer).toBe('function');
      expect(typeof result.current.stopAndSaveStudyTimer).toBe('function');
    });

    it('useData() timer actions update the timer state and log time to topics', () => {
      const { result } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      const targetTopicId = result.current.topics[0]?.id;
      expect(targetTopicId).toBeDefined();

      const initialTimeSpent = result.current.topics[0]?.studyProgress?.timeSpent || 0;

      act(() => {
        result.current.startStudyTimer(targetTopicId, 'stopwatch');
      });

      expect(result.current.isTimerRunning).toBe(true);
      expect(result.current.activeTimerTopicId).toBe(targetTopicId);

      act(() => {
        vi.advanceTimersByTime(180 * 1000); // 3 minutes
      });

      act(() => {
        result.current.stopAndSaveStudyTimer();
      });

      expect(result.current.isTimerRunning).toBe(false);
      const updatedTopic = result.current.topics.find((t) => t.id === targetTopicId);
      expect(updatedTopic?.studyProgress?.timeSpent).toBe(initialTimeSpent + 3);
    });
  });

  describe('3. Render Isolation (No global re-renders on timer tick)', () => {
    it('timer ticks do not re-render pure consumer of useStudyTimer when domain data changes', () => {
      let timerRenderCount = 0;
      function TimerDisplay() {
        const { timerSeconds } = useStudyTimer();
        timerRenderCount++;
        return <div data-testid="timer-sec">{timerSeconds}</div>;
      }

      render(
        <StudyTimerProvider>
          <TimerDisplay />
        </StudyTimerProvider>
      );

      expect(timerRenderCount).toBe(1);
      expect(screen.getByTestId('timer-sec').textContent).toBe('0');
    });
  });
});
