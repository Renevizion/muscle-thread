import { WorkoutDay } from '@/data/workoutPlan';
import { ExerciseCard } from './ExerciseCard';
import { RestTimer } from './RestTimer';
import { Dumbbell, Wind, Moon, Flame, Droplets } from 'lucide-react';

interface WorkoutViewProps {
  day: WorkoutDay;
  getExerciseProgress: (dayId: number, exerciseId: string) => { completed: boolean; setsCompleted: number };
  toggleExercise: (dayId: number, exerciseId: string, totalSets: number) => void;
  markDayComplete: (dayId: number) => void;
}

export function WorkoutView({ day, getExerciseProgress, toggleExercise, markDayComplete }: WorkoutViewProps) {
  if (day.type === 'rest') {
    return (
      <div className="px-4 py-6 animate-slide-up">
        <div className="bg-gradient-card rounded-2xl p-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
            <Moon className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Complete Rest</h2>
          <p className="text-muted-foreground mb-6">Your body repairs and grows</p>
          
          <div className="space-y-3 text-left">
            {day.extras?.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Droplets className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => markDayComplete(day.id)}
            className="mt-6 w-full py-4 bg-gradient-fire rounded-xl font-display font-semibold text-primary-foreground shadow-glow"
          >
            Mark Day Complete
          </button>
        </div>
      </div>
    );
  }

  if (day.type === 'conditioning') {
    return (
      <div className="px-4 py-6 animate-slide-up">
        <div className="bg-gradient-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Wind className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">{day.name}</h2>
              <p className="text-sm text-muted-foreground">Active Recovery</p>
            </div>
          </div>

          {day.conditioning && (
            <div className="bg-secondary/50 rounded-xl p-4 mb-4">
              <h3 className="font-semibold mb-2">{day.conditioning.activity}</h3>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>⏱ {day.conditioning.duration}</span>
                <span>💪 {day.conditioning.intensity}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {day.extras?.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                <Flame className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => markDayComplete(day.id)}
            className="mt-6 w-full py-4 bg-gradient-fire rounded-xl font-display font-semibold text-primary-foreground shadow-glow"
          >
            Mark Day Complete
          </button>
        </div>
      </div>
    );
  }

  // Training day
  return (
    <div className="px-4 pb-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-fire flex items-center justify-center shadow-glow">
          <Dumbbell className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">{day.name}</h2>
          <p className="text-sm text-muted-foreground">{day.focus}</p>
        </div>
      </div>

      {/* Rest Timer */}
      <div className="mb-4">
        <RestTimer />
      </div>

      {/* Warmup */}
      {day.warmup && (
        <div className="mb-4 bg-gradient-card rounded-xl p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">WARM-UP (5 min)</h3>
          <ul className="space-y-1 text-sm text-foreground/80">
            {day.warmup.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-3">
        {day.exercises?.map((exercise, index) => {
          const progress = getExerciseProgress(day.id, exercise.id);
          return (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              setsCompleted={progress.setsCompleted}
              isComplete={progress.completed}
              onToggle={() => toggleExercise(day.id, exercise.id, exercise.sets)}
            />
          );
        })}
      </div>
    </div>
  );
}
