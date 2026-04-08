import { useState } from 'react';
import { X, Save, Plus, Minus } from 'lucide-react';
import { Exercise } from '@/data/workoutPlan';
import { cn } from '@/lib/utils';

interface SetLog {
  reps: number;
  weight: number;
}

interface ExerciseLogModalProps {
  exercise: Exercise;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sets: SetLog[]) => void;
  initialSets?: SetLog[];
}

export function ExerciseLogModal({ exercise, isOpen, onClose, onSave, initialSets }: ExerciseLogModalProps) {
  const [sets, setSets] = useState<SetLog[]>(
    initialSets && initialSets.length > 0
      ? initialSets
      : Array.from({ length: exercise.sets }, () => ({ reps: 0, weight: 0 }))
  );

  if (!isOpen) return null;

  const updateSet = (index: number, field: 'reps' | 'weight', value: number) => {
    setSets(prev => prev.map((s, i) => i === index ? { ...s, [field]: Math.max(0, value) } : s));
  };

  const addSet = () => setSets(prev => [...prev, { reps: 0, weight: 0 }]);
  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    setSets(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(sets);
    onClose();
  };

  const targetReps = exercise.reps;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-lg">{exercise.name}</h3>
            <p className="text-sm text-muted-foreground">Target: {exercise.sets} × {targetReps}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 mb-2 px-1">
          <span className="text-xs text-muted-foreground w-8">Set</span>
          <span className="text-xs text-muted-foreground text-center">Reps</span>
          <span className="text-xs text-muted-foreground text-center">Weight (lbs)</span>
          <span className="w-8" />
        </div>

        {/* Set rows */}
        <div className="space-y-2 mb-4">
          {sets.map((set, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
              <span className="w-8 h-10 flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex items-center bg-secondary rounded-lg">
                <button onClick={() => updateSet(i, 'reps', set.reps - 1)} className="p-2">
                  <Minus className="w-3 h-3 text-muted-foreground" />
                </button>
                <input
                  type="number"
                  value={set.reps || ''}
                  onChange={(e) => updateSet(i, 'reps', parseInt(e.target.value) || 0)}
                  className="w-full text-center bg-transparent text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  style={{ fontSize: '16px' }}
                  placeholder="0"
                />
                <button onClick={() => updateSet(i, 'reps', set.reps + 1)} className="p-2">
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center bg-secondary rounded-lg">
                <button onClick={() => updateSet(i, 'weight', set.weight - 5)} className="p-2">
                  <Minus className="w-3 h-3 text-muted-foreground" />
                </button>
                <input
                  type="number"
                  value={set.weight || ''}
                  onChange={(e) => updateSet(i, 'weight', parseFloat(e.target.value) || 0)}
                  className="w-full text-center bg-transparent text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  style={{ fontSize: '16px' }}
                  placeholder="0"
                />
                <button onClick={() => updateSet(i, 'weight', set.weight + 5)} className="p-2">
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <button
                onClick={() => removeSet(i)}
                className={cn("w-8 h-8 rounded-full flex items-center justify-center", sets.length <= 1 ? "opacity-30" : "hover:bg-secondary")}
                disabled={sets.length <= 1}
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addSet}
          className="w-full py-2 mb-4 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add Set
        </button>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-gradient-fire text-primary-foreground rounded-xl font-display font-semibold shadow-glow flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Workout Log
        </button>
      </div>
    </div>
  );
}
