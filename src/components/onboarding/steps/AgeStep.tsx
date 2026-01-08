import { useRef, useEffect } from 'react';
import { OnboardingData } from '../OnboardingFlow';
import { cn } from '@/lib/utils';

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const AGES = Array.from({ length: 63 }, (_, i) => i + 18); // 18-80

export function AgeStep({ data, updateData }: StepProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Scroll to selected age on mount
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const selected = selectedRef.current;
      const containerCenter = container.offsetHeight / 2;
      const selectedCenter = selected.offsetTop + selected.offsetHeight / 2;
      container.scrollTop = selectedCenter - containerCenter;
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold mb-2">How old are you?</h2>
        <p className="text-muted-foreground text-sm">
          This helps us tailor recovery times and exercise recommendations
        </p>
      </div>

      <div 
        ref={scrollRef}
        className="h-[300px] overflow-y-auto scrollbar-hide relative"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* Gradient overlays */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
        
        <div className="py-[120px] space-y-1">
          {AGES.map(age => (
            <button
              key={age}
              ref={age === data.age ? selectedRef : null}
              onClick={() => updateData({ age })}
              className={cn(
                "w-full py-3 text-center font-display text-xl transition-all",
                "scroll-snap-align-center",
                age === data.age
                  ? "text-primary text-4xl font-bold scale-110"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={{ scrollSnapAlign: 'center' }}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <span className="inline-block px-4 py-2 bg-secondary rounded-full text-lg font-display font-semibold">
          {data.age} years old
        </span>
      </div>
    </div>
  );
}
