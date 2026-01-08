import { useState, useEffect } from 'react';
import { workoutPlan } from '@/data/workoutPlan';
import { WeeklySchedule } from '@/components/WeeklySchedule';
import { WorkoutView } from '@/components/WorkoutView';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';
import { Flame } from 'lucide-react';

const Index = () => {
  const [selectedDay, setSelectedDay] = useState(1);
  const { toggleExercise, markDayComplete, getExerciseProgress, getDayProgress } = useWorkoutProgress();

  // Auto-select today's workout on load
  useEffect(() => {
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 7 : today; // Sunday = 7, Mon = 1
    setSelectedDay(dayIndex);
  }, []);

  const currentWorkout = workoutPlan.find(d => d.id === selectedDay) || workoutPlan[0];

  // Calculate week progress
  const weekProgress = workoutPlan.reduce((acc, day) => {
    const exerciseCount = day.exercises?.length || 1;
    return acc + getDayProgress(day.id, exerciseCount);
  }, 0) / workoutPlan.length;

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Mass Gain
            </h1>
            <p className="text-sm text-muted-foreground">4-Week Program</p>
          </div>
          
          <div className="flex items-center gap-2 bg-gradient-card rounded-full px-4 py-2">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold">{Math.round(weekProgress)}%</span>
          </div>
        </div>

        {/* Week progress bar */}
        <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-fire transition-all duration-500"
            style={{ width: `${weekProgress}%` }}
          />
        </div>
      </header>

      {/* Weekly Schedule */}
      <WeeklySchedule 
        currentDay={selectedDay}
        onSelectDay={setSelectedDay}
        getDayProgress={getDayProgress}
      />

      {/* Workout Content */}
      <main className="mt-2">
        <WorkoutView
          day={currentWorkout}
          getExerciseProgress={getExerciseProgress}
          toggleExercise={toggleExercise}
          markDayComplete={markDayComplete}
        />
      </main>
    </div>
  );
};

export default Index;
