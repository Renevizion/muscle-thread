import { useState, useEffect, useRef, forwardRef } from 'react';
import { Play, Pause, RotateCcw, Settings2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  defaultSeconds?: number;
}

const PRESETS_KEY = 'rest-timer-presets-v1';
const LAST_KEY = 'rest-timer-last-v1';
const DEFAULT_PRESETS = [60, 90, 120, 180];

function readPresets(): number[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number' && n > 0)) {
      return parsed.slice(0, 4);
    }
  } catch { /* ignore */ }
  return DEFAULT_PRESETS;
}

function readLast(fallback: number): number {
  const n = Number(localStorage.getItem(LAST_KEY));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const RestTimer = forwardRef<HTMLDivElement, RestTimerProps>(function RestTimer({ defaultSeconds = 90 }, ref) {
  const [presets, setPresets] = useState<number[]>(() => readPresets());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(() => readPresets().map(String));
  const [initialSeconds, setInitialSeconds] = useState(() => readLast(defaultSeconds));
  const [seconds, setSeconds] = useState(() => readLast(defaultSeconds));
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsRunning(false);
      // Vibrate on completion if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, seconds]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const selectDuration = (value: number) => {
    setInitialSeconds(value);
    setSeconds(value);
    setIsRunning(false);
    try { localStorage.setItem(LAST_KEY, String(value)); } catch { /* ignore */ }
  };

  const savePresets = () => {
    const next = draft
      .map(v => Math.max(5, Math.min(900, Math.round(Number(v) || 0))))
      .filter(n => n > 0)
      .slice(0, 4);
    const final = next.length ? next : DEFAULT_PRESETS;
    setPresets(final);
    setDraft(final.map(String));
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(final)); } catch { /* ignore */ }
    setEditing(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(initialSeconds);
  };

  const progress = (seconds / initialSeconds) * 100;


  return (
    <div ref={ref} className="bg-gradient-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <span className="text-sm font-medium text-muted-foreground shrink-0">Rest Timer</span>
        {editing ? (
          <div className="flex items-center gap-1">
            {draft.map((v, i) => (
              <input
                key={i}
                type="number"
                inputMode="numeric"
                value={v}
                onChange={e => setDraft(d => d.map((x, j) => (j === i ? e.target.value : x)))}
                aria-label={`Rest preset ${i + 1} in seconds`}
                className="w-12 px-1 py-1 text-xs rounded-md bg-secondary text-foreground text-center"
              />
            ))}
            <button
              onClick={savePresets}
              aria-label="Save rest presets"
              className="p-1.5 rounded-md bg-primary text-primary-foreground"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {presets.map(preset => (
              <button
                key={preset}
                onClick={() => selectDuration(preset)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-colors",
                  initialSeconds === preset
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {preset}s
              </button>
            ))}
            <button
              onClick={() => { setDraft(presets.map(String)); setEditing(true); }}
              aria-label="Edit rest presets"
              className="p-1.5 rounded-md bg-secondary text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>


      <div className="flex items-center gap-4">
        {/* Timer display */}
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="4"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(progress / 100) * 226} 226`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              "font-display text-xl font-bold",
              seconds === 0 && "text-success animate-pulse-glow"
            )}>
              {formatTime(seconds)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-glow",
              isRunning ? "bg-secondary" : "bg-gradient-fire"
            )}
          >
            {isRunning ? (
              <Pause className="w-6 h-6 text-foreground" />
            ) : (
              <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
            )}
          </button>
          
          <button
            onClick={handleReset}
            className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center"
          >
            <RotateCcw className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
});

RestTimer.displayName = 'RestTimer';
