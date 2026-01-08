import { OnboardingData } from '../OnboardingFlow';
import { cn } from '@/lib/utils';
import { Target, TrendingUp, Scale, Heart, Zap, Dumbbell } from 'lucide-react';

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const PRIMARY_GOALS = [
  { id: 'mass', label: 'Build Muscle Mass', icon: Dumbbell, description: 'Hypertrophy-focused training' },
  { id: 'strength', label: 'Get Stronger', icon: TrendingUp, description: 'Strength and power development' },
  { id: 'fat-loss', label: 'Lose Fat', icon: Scale, description: 'Maintain muscle while cutting' },
  { id: 'athletic', label: 'Athletic Performance', icon: Zap, description: 'Speed, power, agility' },
  { id: 'general', label: 'General Fitness', icon: Heart, description: 'Overall health and wellbeing' },
];

const SECONDARY_GOALS = [
  'Improve flexibility',
  'Better cardiovascular health',
  'Learn calisthenics/bodyweight skills',
  'Injury prevention',
  'Improve posture',
  'Functional strength for daily life',
];

export function GoalsStep({ data, updateData }: StepProps) {
  const toggleSecondary = (goal: string) => {
    const current = data.secondaryGoals;
    if (current.includes(goal)) {
      updateData({ secondaryGoals: current.filter(g => g !== goal) });
    } else {
      updateData({ secondaryGoals: [...current, goal] });
    }
  };

  return (
    <div className="space-y-8">
      {/* Primary Goal */}
      <div>
        <h2 className="font-display text-xl font-bold mb-2">What's your main goal?</h2>
        <p className="text-muted-foreground text-sm mb-4">
          This determines the structure and focus of your program
        </p>
        
        <div className="space-y-2">
          {PRIMARY_GOALS.map(goal => {
            const Icon = goal.icon;
            const isSelected = data.primaryGoal === goal.id;
            
            return (
              <button
                key={goal.id}
                onClick={() => updateData({ primaryGoal: goal.id })}
                className={cn(
                  "w-full p-4 rounded-xl flex items-center gap-4 transition-all text-left",
                  isSelected
                    ? "bg-gradient-fire text-primary-foreground shadow-glow"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                  isSelected ? "bg-white/20" : "bg-background"
                )}>
                  <Icon className={cn("w-6 h-6", isSelected ? "text-primary-foreground" : "text-primary")} />
                </div>
                <div>
                  <div className="font-display font-semibold">{goal.label}</div>
                  <div className={cn("text-sm", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {goal.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Goals */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-2">Any secondary goals?</h3>
        <p className="text-muted-foreground text-sm mb-3">Select all that apply (optional)</p>
        
        <div className="flex flex-wrap gap-2">
          {SECONDARY_GOALS.map(goal => (
            <button
              key={goal}
              onClick={() => toggleSecondary(goal)}
              className={cn(
                "px-3 py-2 rounded-full text-sm font-medium transition-all",
                data.secondaryGoals.includes(goal)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
