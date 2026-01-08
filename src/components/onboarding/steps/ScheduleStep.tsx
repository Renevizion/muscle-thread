import { OnboardingData } from '../OnboardingFlow';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

const SESSION_LENGTHS = [
  { id: '30-45', label: '30-45 min', description: 'Quick and efficient' },
  { id: '45-60', label: '45-60 min', description: 'Standard sessions' },
  { id: '60-90', label: '60-90 min', description: 'Thorough training' },
  { id: '90+', label: '90+ min', description: 'Extended sessions' },
];

export function ScheduleStep({ data, updateData }: StepProps) {
  return (
    <div className="space-y-8">
      {/* Days per week */}
      <div>
        <h2 className="font-display text-xl font-bold mb-2">How many days per week?</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Be realistic - consistency beats intensity
        </p>
        
        <div className="flex justify-between gap-2">
          {DAYS_OPTIONS.map(days => (
            <button
              key={days}
              onClick={() => updateData({ daysPerWeek: days })}
              className={cn(
                "flex-1 py-4 rounded-xl font-display text-xl font-bold transition-all",
                data.daysPerWeek === days
                  ? "bg-gradient-fire text-primary-foreground shadow-glow"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {days}
            </button>
          ))}
        </div>
        
        <p className="text-center mt-3 text-muted-foreground text-sm">
          {data.daysPerWeek} days per week
        </p>
      </div>

      {/* Session length */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Session length?</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          How long can you dedicate to each workout?
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          {SESSION_LENGTHS.map(session => (
            <button
              key={session.id}
              onClick={() => updateData({ sessionLength: session.id })}
              className={cn(
                "p-4 rounded-xl text-left transition-all",
                data.sessionLength === session.id
                  ? "bg-gradient-fire text-primary-foreground shadow-glow"
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              <div className="font-display font-semibold">{session.label}</div>
              <div className={cn(
                "text-xs mt-0.5",
                data.sessionLength === session.id ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {session.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
