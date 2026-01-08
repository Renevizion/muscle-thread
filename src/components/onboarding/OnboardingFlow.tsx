import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgeStep } from './steps/AgeStep';
import { GoalsStep } from './steps/GoalsStep';
import { EquipmentStep } from './steps/EquipmentStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { FocusAreasStep } from './steps/FocusAreasStep';
import { ConstraintsStep } from './steps/ConstraintsStep';

export interface OnboardingData {
  age: number;
  primaryGoal: string;
  secondaryGoals: string[];
  equipment: string;
  daysPerWeek: number;
  sessionLength: string;
  focusAreas: string[];
  constraints: string[];
  additionalNotes: string;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

const STEPS = [
  { id: 'age', title: 'Your Age', component: AgeStep },
  { id: 'goals', title: 'Your Goals', component: GoalsStep },
  { id: 'equipment', title: 'Equipment Access', component: EquipmentStep },
  { id: 'schedule', title: 'Your Schedule', component: ScheduleStep },
  { id: 'focus', title: 'Focus Areas', component: FocusAreasStep },
  { id: 'constraints', title: 'Considerations', component: ConstraintsStep },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    age: 25,
    primaryGoal: '',
    secondaryGoals: [],
    equipment: '',
    daysPerWeek: 4,
    sessionLength: '',
    focusAreas: [],
    constraints: [],
    additionalNotes: '',
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.age > 0;
      case 1: return data.primaryGoal !== '';
      case 2: return data.equipment !== '';
      case 3: return data.sessionLength !== '';
      case 4: return data.focusAreas.length > 0;
      case 5: return true; // constraints are optional
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(data);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col safe-top safe-bottom">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-fire flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Let's Build Your Plan
            </h1>
            <p className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-fire"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CurrentStepComponent data={data} updateData={updateData} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <div className="px-4 py-4 border-t border-border flex gap-3">
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-display font-semibold flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        )}
        
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={cn(
            "flex-1 py-3 rounded-xl font-display font-semibold flex items-center justify-center gap-2 transition-all",
            canProceed()
              ? "bg-gradient-fire text-primary-foreground shadow-glow"
              : "bg-muted text-muted-foreground"
          )}
        >
          {currentStep === STEPS.length - 1 ? 'Start Chat' : 'Continue'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
