import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface WorkoutLog {
  id: string;
  plan_id: string;
  workout_day: string;
  exercise_name: string;
  completed: boolean;
  sets_completed: number;
  notes: string | null;
  logged_at: string;
}

export function useWorkoutLogs(planId: string | null) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && planId) {
      loadLogs();
    }
  }, [user, planId]);

  const loadLogs = async () => {
    if (!user || !planId) return;
    
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_id', planId)
      .order('logged_at', { ascending: false });
    
    if (!error && data) {
      setLogs(data as WorkoutLog[]);
    }
    setLoading(false);
  };

  const logExercise = useCallback(async (
    workoutDay: string,
    exerciseName: string,
    completed: boolean,
    setsCompleted?: number,
    notes?: string
  ) => {
    if (!user || !planId) return;

    // Check if log exists for today
    const today = new Date().toISOString().split('T')[0];
    const existingLog = logs.find(
      l => l.workout_day === workoutDay && 
           l.exercise_name === exerciseName &&
           l.logged_at.startsWith(today)
    );

    if (existingLog) {
      // Update existing
      const { error } = await supabase
        .from('workout_logs')
        .update({
          completed,
          sets_completed: setsCompleted ?? existingLog.sets_completed,
          notes: notes ?? existingLog.notes,
        })
        .eq('id', existingLog.id);
      
      if (!error) {
        setLogs(prev => prev.map(l => 
          l.id === existingLog.id 
            ? { ...l, completed, sets_completed: setsCompleted ?? l.sets_completed, notes: notes ?? l.notes }
            : l
        ));
      }
    } else {
      // Create new
      const { data, error } = await supabase
        .from('workout_logs')
        .insert({
          user_id: user.id,
          plan_id: planId,
          workout_day: workoutDay,
          exercise_name: exerciseName,
          completed,
          sets_completed: setsCompleted ?? 0,
          notes,
        })
        .select()
        .single();
      
      if (!error && data) {
        setLogs(prev => [data as WorkoutLog, ...prev]);
      }
    }
  }, [user, planId, logs]);

  const getExerciseLog = useCallback((workoutDay: string, exerciseName: string, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return logs.find(
      l => l.workout_day === workoutDay && 
           l.exercise_name === exerciseName &&
           l.logged_at.startsWith(targetDate)
    );
  }, [logs]);

  const getDayCompletionRate = useCallback((workoutDay: string) => {
    const dayLogs = logs.filter(l => l.workout_day === workoutDay && l.completed);
    return dayLogs.length;
  }, [logs]);

  const getOverallCompletionRate = useCallback(() => {
    if (logs.length === 0) return 0;
    const completed = logs.filter(l => l.completed).length;
    return Math.round((completed / logs.length) * 100);
  }, [logs]);

  return {
    logs,
    loading,
    logExercise,
    getExerciseLog,
    getDayCompletionRate,
    getOverallCompletionRate,
    refresh: loadLogs,
  };
}
