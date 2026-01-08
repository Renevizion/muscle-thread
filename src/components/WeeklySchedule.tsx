import { WorkoutDay, dayLabels } from '@/data/workoutPlan';
import { cn } from '@/lib/utils';
import { Check, Dumbbell, Wind, Moon } from 'lucide-react';

interface WeeklyScheduleProps {
  currentDay: number;
  onSelectDay: (dayId: number) => void;
  getDayProgress: (dayId: number, exerciseCount: number) => number;
  workoutPlan?: WorkoutDay[];
}

export function WeeklySchedule({ currentDay, onSelectDay, getDayProgress, workoutPlan }: WeeklyScheduleProps) {
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  // Use provided plan or fall back to default labels
  const days = workoutPlan || Array.from({ length: 7 }, (_, i) => ({
    id: i + 1,
    type: 'training' as const,
    exercises: []
  }));

  return (
    <div className="px-4 py-3">
      <div className="flex justify-between gap-1">
        {days.map((day, index) => {
          const exerciseCount = day.exercises?.length || 1;
          const progress = getDayProgress(day.id, exerciseCount);
          const isToday = index === todayIndex;
          const isComplete = progress === 100;
          const isSelected = day.id === currentDay;

          return (
            <button
              key={day.id}
              onClick={() => onSelectDay(day.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all",
                isSelected && "bg-secondary",
                !isSelected && "hover:bg-secondary/50"
              )}
            >
              <span className={cn(
                "text-xs font-medium",
                isToday ? "text-primary" : "text-muted-foreground"
              )}>
                {dayLabels[index]}
              </span>
              
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center relative",
                isComplete && "bg-success/20",
                !isComplete && isToday && "bg-primary/20 ring-2 ring-primary",
                !isComplete && !isToday && "bg-secondary"
              )}>
                {isComplete ? (
                  <Check className="w-5 h-5 text-success" />
                ) : day.type === 'training' ? (
                  <Dumbbell className={cn(
                    "w-5 h-5",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )} />
                ) : day.type === 'conditioning' ? (
                  <Wind className={cn(
                    "w-5 h-5",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )} />
                ) : (
                  <Moon className={cn(
                    "w-5 h-5",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )} />
                )}
                
                {/* Progress ring */}
                {progress > 0 && progress < 100 && (
                  <svg className="absolute inset-0 w-10 h-10 -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      strokeDasharray={`${(progress / 100) * 113} 113`}
                      className="opacity-60"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
