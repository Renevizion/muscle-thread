import { OnboardingData } from '../OnboardingFlow';
import { cn } from '@/lib/utils';
import { Building2, Home, Dumbbell } from 'lucide-react';

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const EQUIPMENT_OPTIONS = [
  { 
    id: 'full-gym', 
    label: 'Full Gym Access', 
    icon: Building2, 
    description: 'Commercial gym with full equipment: barbells, machines, cables, etc.' 
  },
  { 
    id: 'home-equipped', 
    label: 'Home Gym', 
    icon: Dumbbell, 
    description: 'Dumbbells, barbell, pull-up bar, bench - the essentials' 
  },
  { 
    id: 'minimal', 
    label: 'Minimal Equipment', 
    icon: Home, 
    description: 'Bodyweight, resistance bands, maybe a pull-up bar' 
  },
];

export function EquipmentStep({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold mb-2">What equipment do you have?</h2>
        <p className="text-muted-foreground text-sm">
          We'll design your program around what's available to you
        </p>
      </div>

      <div className="space-y-3">
        {EQUIPMENT_OPTIONS.map(option => {
          const Icon = option.icon;
          const isSelected = data.equipment === option.id;
          
          return (
            <button
              key={option.id}
              onClick={() => updateData({ equipment: option.id })}
              className={cn(
                "w-full p-5 rounded-xl flex items-start gap-4 transition-all text-left",
                isSelected
                  ? "bg-gradient-fire text-primary-foreground shadow-glow"
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center shrink-0",
                isSelected ? "bg-white/20" : "bg-background"
              )}>
                <Icon className={cn("w-7 h-7", isSelected ? "text-primary-foreground" : "text-primary")} />
              </div>
              <div className="pt-1">
                <div className="font-display font-semibold text-lg">{option.label}</div>
                <div className={cn("text-sm mt-1", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {option.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
