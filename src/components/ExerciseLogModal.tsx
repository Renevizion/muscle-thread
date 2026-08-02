import { useState, useEffect, useRef } from 'react';
import { X, Save, Plus, Minus, Calendar } from 'lucide-react';
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
  /** Stable key for autosaving draft inputs (user+plan+day+exercise+date) */
  draftKey?: string;
  /** Hint shown when logging a past day */
  isPastDay?: boolean;
}

export function ExerciseLogModal({ exercise, isOpen, onClose, onSave, initialSets, draftKey, isPastDay }: ExerciseLogModalProps) {
  const buildInitial = (): SetLog[] => {
    // 1. Try draft (in-progress, not yet saved)
    if (draftKey) {
      try {
        const raw = localStorage.getItem(`exercise-draft:${draftKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch { /* ignore */ }
    }
    // 2. Fall back to saved logs from DB
    if (initialSets && initialSets.length > 0) return initialSets;
    // 3. Empty grid sized to the exercise's prescribed sets
    return Array.from({ length: exercise.sets }, () => ({ reps: 0, weight: 0 }));
  };

  const [sets, setSets] = useState<SetLog[]>(buildInitial);
  const lastDraftKey = useRef<string | undefined>(draftKey);

  // When the modal opens (or the draft key changes), re-hydrate.
  useEffect(() => {
    if (!isOpen) return;
    if (lastDraftKey.current !== draftKey) {
      setSets(buildInitial());
      lastDraftKey.current = draftKey;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftKey]);

  // Autosave the in-progress draft on every change so a logout/refresh
  // doesn't lose the sets the user just typed.
  useEffect(() => {
    if (!isOpen || !draftKey) return;
    try {
      localStorage.setItem(`exercise-draft:${draftKey}`, JSON.stringify(sets));
    } catch { /* ignore */ }
  }, [sets, draftKey, isOpen]);

  if (!isOpen) return null;

  const updateSet = (index: number, field: 'reps' | 'weight', value: number) => {
    setSets(prev => prev.map((s, i) => i === index ? { ...s, [field]: Math.max(0, value) } : s));
  };

  const addSet = () => setSets(prev => [...prev, { ...(prev[prev.length - 1] ?? { reps: 0, weight: 0 }) }]);
  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    setSets(prev => prev.filter((_, i) => i !== index));
  };

  /** High-volume days (10×15-20) are miserable to type out — copy the last filled set forward. */
  const fillRemaining = () => {
    setSets(prev => {
      const lastFilled = [...prev].reverse().find(s => s.reps > 0 || s.weight > 0);
      if (!lastFilled) return prev;
      return prev.map(s => (s.reps > 0 || s.weight > 0) ? s : { ...lastFilled });
    });
  };

  const handleSave = () => {
    onSave(sets);
    // Clear the draft once it's persisted to the DB.
    if (draftKey) {
      try { localStorage.removeItem(`exercise-draft:${draftKey}`); } catch { /* ignore */ }
    }
    onClose();
  };

  const targetReps = exercise.reps;
  const totalVolume = sets.reduce((sum, s) => sum + s.reps * s.weight, 0);
  const filledCount = sets.filter(s => s.reps > 0 || s.weight > 0).length;
  const canFill = filledCount > 0 && filledCount < sets.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-5 pb-8 animate-slide-up max-h-[85dvh] overflow-y-auto">
        <div className="sticky -top-5 -mx-5 px-5 pt-1 pb-3 bg-background z-10 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-lg truncate">{exercise.name}</h3>
            <p className="text-sm text-muted-foreground">
              Target: {exercise.sets} × {targetReps}
              {totalVolume > 0 && <span className="text-primary"> · {totalVolume.toLocaleString()} lbs volume</span>}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>


        {isPastDay && (
          <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Logging a past session — only enter what you actually did.</span>
          </div>
        )}

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
                  inputMode="numeric"
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
                  inputMode="decimal"
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

        <div className="flex gap-2 mb-4">
          <button
            onClick={addSet}
            className="flex-1 py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add Set
          </button>
          {canFill && (
            <button
              onClick={fillRemaining}
              className="flex-1 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              Repeat for remaining {sets.length - filledCount}
            </button>
          )}
        </div>


        <button
          onClick={handleSave}
          className="w-full py-3 bg-gradient-fire text-primary-foreground rounded-xl font-display font-semibold shadow-glow flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isPastDay ? 'Save Past Workout' : 'Save Workout Log'}
        </button>
      </div>
    </div>
  );
}
