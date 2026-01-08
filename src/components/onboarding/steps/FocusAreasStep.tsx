import { OnboardingData } from '../OnboardingFlow';
import { cn } from '@/lib/utils';

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', emoji: '🫁' },
  { id: 'back', label: 'Back', emoji: '🔙' },
  { id: 'shoulders', label: 'Shoulders', emoji: '💪' },
  { id: 'arms', label: 'Arms (Biceps/Triceps)', emoji: '💪' },
  { id: 'legs', label: 'Legs (Quads/Hams)', emoji: '🦵' },
  { id: 'glutes', label: 'Glutes', emoji: '🍑' },
  { id: 'calves', label: 'Calves', emoji: '🦶' },
  { id: 'traps', label: 'Traps/Upper Back', emoji: '🔺' },
  { id: 'core', label: 'Core/Abs', emoji: '🎯' },
  { id: 'forearms', label: 'Forearms/Grip', emoji: '✊' },
];

const SKILLS = [
  { id: 'pull-ups', label: 'Pull-ups/Muscle-ups' },
  { id: 'handstand', label: 'Handstands' },
  { id: 'pistol-squat', label: 'Pistol Squats' },
  { id: 'l-sit', label: 'L-Sits' },
  { id: 'planche', label: 'Planche/Front Lever' },
];

export function FocusAreasStep({ data, updateData }: StepProps) {
  const toggleFocus = (area: string) => {
    const current = data.focusAreas;
    if (current.includes(area)) {
      updateData({ focusAreas: current.filter(a => a !== area) });
    } else {
      updateData({ focusAreas: [...current, area] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold mb-2">What do you want to focus on?</h2>
        <p className="text-muted-foreground text-sm">
          Select muscle groups or skills you want extra attention on
        </p>
      </div>

      {/* Muscle Groups */}
      <div>
        <h3 className="font-display font-semibold mb-3">Muscle Groups</h3>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map(muscle => (
            <button
              key={muscle.id}
              onClick={() => toggleFocus(muscle.id)}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                data.focusAreas.includes(muscle.id)
                  ? "bg-gradient-fire text-primary-foreground shadow-glow"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              <span>{muscle.emoji}</span>
              {muscle.label}
            </button>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div>
        <h3 className="font-display font-semibold mb-3">Calisthenics/Skills</h3>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map(skill => (
            <button
              key={skill.id}
              onClick={() => toggleFocus(skill.id)}
              className={cn(
                "px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                data.focusAreas.includes(skill.id)
                  ? "bg-gradient-fire text-primary-foreground shadow-glow"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              )}
            >
              {skill.label}
            </button>
          ))}
        </div>
      </div>

      {data.focusAreas.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Selected: {data.focusAreas.length} focus area{data.focusAreas.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
