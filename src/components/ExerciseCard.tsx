import { Exercise } from '@/data/workoutPlan';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  setsCompleted: number;
  isComplete: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ExerciseCard({ exercise, index, setsCompleted, isComplete, onToggle, disabled }: ExerciseCardProps) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={cn(
        "w-full text-left bg-gradient-card rounded-xl p-4 transition-all",
        !disabled && "active:scale-[0.98]",
        isComplete && "opacity-60",
        disabled && "cursor-not-allowed opacity-50"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Completion indicator */}
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isComplete ? "bg-success" : "bg-secondary"
        )}>
          {isComplete ? (
            <Check className="w-6 h-6 text-success-foreground" />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">
              {setsCompleted}/{exercise.sets}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-display font-semibold text-foreground",
            isComplete && "line-through opacity-70"
          )}>
            {exercise.name}
          </h3>
          
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{exercise.sets} × {exercise.reps}</span>
            <span className="text-xs">•</span>
            <span>Rest {exercise.rest}</span>
          </div>

          {exercise.notes && (
            <p className="mt-2 text-xs text-primary/80 italic">
              {exercise.notes}
            </p>
          )}
        </div>
      </div>

      {/* Set progress bar */}
      {!isComplete && setsCompleted > 0 && (
        <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-fire transition-all"
            style={{ width: `${(setsCompleted / exercise.sets) * 100}%` }}
          />
        </div>
      )}
    </button>
  );
}
