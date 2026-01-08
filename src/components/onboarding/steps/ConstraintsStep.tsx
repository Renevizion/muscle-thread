import { OnboardingData } from '../OnboardingFlow';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const CONSTRAINTS = [
  { id: 'back-injury', label: 'Back issues/injury history' },
  { id: 'shoulder-injury', label: 'Shoulder problems' },
  { id: 'knee-injury', label: 'Knee issues' },
  { id: 'wrist-injury', label: 'Wrist/elbow issues' },
  { id: 'hip-injury', label: 'Hip mobility limitations' },
  { id: 'recovery', label: 'Slower recovery (age/sleep/stress)' },
  { id: 'beginner', label: 'New to lifting (need form focus)' },
  { id: 'cardio-poor', label: 'Poor cardiovascular conditioning' },
  { id: 'time-limited', label: 'Very limited time some days' },
  { id: 'travel', label: 'Travel frequently' },
];

export function ConstraintsStep({ data, updateData }: StepProps) {
  const toggleConstraint = (constraint: string) => {
    const current = data.constraints;
    if (current.includes(constraint)) {
      updateData({ constraints: current.filter(c => c !== constraint) });
    } else {
      updateData({ constraints: [...current, constraint] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold mb-2">Any constraints or concerns?</h2>
        <p className="text-muted-foreground text-sm">
          Help us avoid exercises that might not work for you
        </p>
      </div>

      <div className="space-y-2">
        {CONSTRAINTS.map(constraint => (
          <button
            key={constraint.id}
            onClick={() => toggleConstraint(constraint.id)}
            className={cn(
              "w-full p-4 rounded-xl text-left transition-all flex items-center gap-3",
              data.constraints.includes(constraint.id)
                ? "bg-primary/10 border-2 border-primary"
                : "bg-secondary hover:bg-secondary/80 border-2 border-transparent"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
              data.constraints.includes(constraint.id)
                ? "border-primary bg-primary"
                : "border-muted-foreground"
            )}>
              {data.constraints.includes(constraint.id) && (
                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
              )}
            </div>
            <span className="font-medium">{constraint.label}</span>
          </button>
        ))}
      </div>

      {/* Additional Notes */}
      <div>
        <label className="font-display font-semibold mb-2 block">
          Anything else we should know?
        </label>
        <textarea
          value={data.additionalNotes}
          onChange={(e) => updateData({ additionalNotes: e.target.value })}
          placeholder="E.g., specific exercises you love/hate, schedule constraints, past experience..."
          className="w-full p-4 bg-secondary rounded-xl text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
        />
      </div>

      <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-xl">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          After this, you'll chat with your AI coach to refine your plan further. 
          You can always iterate and adjust!
        </p>
      </div>
    </div>
  );
}
