import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  defaultSeconds?: number;
}

export function RestTimer({ defaultSeconds = 90 }: RestTimerProps) {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [initialSeconds, setInitialSeconds] = useState(defaultSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(initialSeconds);
  };

  const progress = (seconds / initialSeconds) * 100;

  const presets = [60, 90, 120, 180];

  return (
    <div className="bg-gradient-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">Rest Timer</span>
        <div className="flex gap-1">
          {presets.map(preset => (
            <button
              key={preset}
              onClick={() => {
                setInitialSeconds(preset);
                setSeconds(preset);
                setIsRunning(false);
              }}
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
        </div>
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
}
