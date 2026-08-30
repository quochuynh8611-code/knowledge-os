import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

export type TimerMode = 'stopwatch' | 'pomodoro';

export interface StudyTimerContextType {
  activeTimerTopicId: string | null;
  timerSeconds: number;
  isTimerRunning: boolean;
  timerMode: TimerMode;
  pomodoroTimeRemaining: number;

  startStudyTimer: (topicId: string, mode?: TimerMode) => void;
  pauseStudyTimer: () => void;
  resumeStudyTimer: () => void;
  stopAndSaveStudyTimer: () => void;
  resetTimer: () => void;
}

const StudyTimerContext = createContext<StudyTimerContextType | undefined>(undefined);

export interface StudyTimerProviderProps {
  children: ReactNode;
  onLogStudyTime?: (topicId: string, minutesSpent: number) => void;
}

export function StudyTimerProvider({
  children,
  onLogStudyTime,
}: StudyTimerProviderProps) {
  const [activeTimerTopicId, setActiveTimerTopicId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>('stopwatch');
  const [pomodoroTimeRemaining, setPomodoroTimeRemaining] = useState(25 * 60);

  // Timer interval ticker running independently within this provider
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        if (timerMode === 'stopwatch') {
          setTimerSeconds((prev) => prev + 1);
        } else {
          setPomodoroTimeRemaining((prev) => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerMode]);

  const startStudyTimer = useCallback(
    (topicId: string, mode: TimerMode = 'stopwatch') => {
      setActiveTimerTopicId(topicId);
      setTimerMode(mode);
      if (mode === 'pomodoro') {
        setPomodoroTimeRemaining(25 * 60);
      } else {
        setTimerSeconds(0);
      }
      setIsTimerRunning(true);
    },
    []
  );

  const pauseStudyTimer = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  // resume: continues counting from where the timer was paused (no second reset)
  const resumeStudyTimer = useCallback(() => {
    if (activeTimerTopicId) {
      setIsTimerRunning(true);
    }
  }, [activeTimerTopicId]);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setActiveTimerTopicId(null);
    setTimerSeconds(0);
    setPomodoroTimeRemaining(25 * 60);
  }, []);

  const stopAndSaveStudyTimer = useCallback(() => {
    setIsTimerRunning(false);
    if (activeTimerTopicId) {
      const minutesSpent =
        timerMode === 'stopwatch'
          ? Math.round(timerSeconds / 60)
          : Math.round((25 * 60 - pomodoroTimeRemaining) / 60);

      if (minutesSpent > 0 && onLogStudyTime) {
        onLogStudyTime(activeTimerTopicId, minutesSpent);
      }
    }
    setActiveTimerTopicId(null);
    setTimerSeconds(0);
    setPomodoroTimeRemaining(25 * 60);
  }, [activeTimerTopicId, timerMode, timerSeconds, pomodoroTimeRemaining, onLogStudyTime]);

  const contextValue = useMemo<StudyTimerContextType>(
    () => ({
      activeTimerTopicId,
      timerSeconds,
      isTimerRunning,
      timerMode,
      pomodoroTimeRemaining,
      startStudyTimer,
      pauseStudyTimer,
      resumeStudyTimer,
      stopAndSaveStudyTimer,
      resetTimer,
    }),
    [
      activeTimerTopicId,
      timerSeconds,
      isTimerRunning,
      timerMode,
      pomodoroTimeRemaining,
      startStudyTimer,
      pauseStudyTimer,
      resumeStudyTimer,
      stopAndSaveStudyTimer,
      resetTimer,
    ]
  );

  return (
    <StudyTimerContext.Provider value={contextValue}>
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer(): StudyTimerContextType {
  const context = useContext(StudyTimerContext);
  if (!context) {
    throw new Error('useStudyTimer must be used within a StudyTimerProvider');
  }
  return context;
}
