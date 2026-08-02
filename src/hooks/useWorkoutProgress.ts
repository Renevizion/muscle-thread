import { useState, useEffect } from 'react';

interface ExerciseProgress {
  completed: boolean;
  setsCompleted: number;
}

interface DayProgress {
  [exerciseId: string]: ExerciseProgress;
}

interface WeekProgress {
  [dayId: number]: DayProgress;
}

const STORAGE_KEY = 'workout-progress';
const WEEK_START_KEY = 'workout-week-start';

export function useWorkoutProgress() {
  const [progress, setProgress] = useState<WeekProgress>({});
  const [weekStart, setWeekStart] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedWeekStart = localStorage.getItem(WEEK_START_KEY);
    
    const currentWeekStart_ = currentWeekStart();
    const currentWeekStart = currentWeekStart_;

    // Reset progress if it's a new week
    if (storedWeekStart !== currentWeekStart) {
      localStorage.setItem(WEEK_START_KEY, currentWeekStart);
      localStorage.removeItem(STORAGE_KEY);
      setWeekStart(currentWeekStart);
      setProgress({});
    } else {
      setWeekStart(storedWeekStart || currentWeekStart);
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    }
  }, []);

  const saveProgress = (newProgress: WeekProgress) => {
    setProgress(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
  };

  const toggleExercise = (dayId: number, exerciseId: string, totalSets: number) => {
    const newProgress = { ...progress };
    if (!newProgress[dayId]) {
      newProgress[dayId] = {};
    }
    
    const current = newProgress[dayId][exerciseId] || { completed: false, setsCompleted: 0 };
    
    if (current.setsCompleted < totalSets) {
      newProgress[dayId][exerciseId] = {
        setsCompleted: current.setsCompleted + 1,
        completed: current.setsCompleted + 1 >= totalSets
      };
    } else {
      // Reset if all sets are done
      newProgress[dayId][exerciseId] = { completed: false, setsCompleted: 0 };
    }
    
    saveProgress(newProgress);
  };

  const markDayComplete = (dayId: number) => {
    const newProgress = { ...progress };
    newProgress[dayId] = { _dayComplete: { completed: true, setsCompleted: 1 } };
    saveProgress(newProgress);
  };

  const isDayComplete = (dayId: number, exerciseCount: number) => {
    if (!progress[dayId]) return false;
    if (progress[dayId]._dayComplete?.completed) return true;
    
    const completedExercises = Object.values(progress[dayId]).filter(e => e.completed).length;
    return completedExercises >= exerciseCount;
  };

  const getExerciseProgress = (dayId: number, exerciseId: string) => {
    return progress[dayId]?.[exerciseId] || { completed: false, setsCompleted: 0 };
  };

  const getDayProgress = (dayId: number, exerciseCount: number) => {
    if (!progress[dayId]) return 0;
    if (progress[dayId]._dayComplete?.completed) return 100;
    
    const completed = Object.values(progress[dayId]).filter(e => e.completed).length;
    return Math.round((completed / exerciseCount) * 100);
  };

  return {
    progress,
    toggleExercise,
    markDayComplete,
    isDayComplete,
    getExerciseProgress,
    getDayProgress,
    weekStart
  };
}
