import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Dumbbell, Target, Calendar, Zap } from 'lucide-react';
import { OnboardingData } from './OnboardingFlow';
import { cn } from '@/lib/utils';

interface PlanGenerationRevealProps {
  data: OnboardingData;
  onDone: () => void;
}

/**
 * The "gotcha" moment. After the user invests effort in onboarding we run a
 * short, personalized analysis animation that builds anticipation, then reveal
 * that their plan is ready. This is the FOMO beat that turns answers into
 * commitment before the user reaches the coach.
 */
export function PlanGenerationReveal({ data, onDone }: PlanGenerationRevealProps) {
  const goalLabel = data.primaryGoal || 'your goal';
  const focus = data.focusAreas?.[0] || 'full body';

  const steps = [
    { icon: Target, label: `Reading your goal: ${goalLabel}` },
    { icon: Calendar, label: `Mapping ${data.daysPerWeek || 4} training days a week` },
    { icon: Dumbbell, label: `Selecting moves for ${focus}` },
    { icon: Zap, label: 'Calibrating progressive overload' },
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i + 1), 650 * (i + 1)));
    });
    timers.push(setTimeout(() => setDone(true), 650 * (steps.length + 1)));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-fire flex items-center justify-center shadow-glow mb-8"
              animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-9 h-9 text-primary-foreground" />
            </motion.div>

            <h1 className="font-display text-2xl font-bold text-foreground text-center mb-1">
              Building your plan
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Tuning every session to what you told us
            </p>

            <div className="w-full space-y-3">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const reached = i < activeStep;
                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: reached ? 1 : 0.35, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                        reached ? 'bg-gradient-fire' : 'bg-secondary'
                      )}
                    >
                      {reached ? (
                        <Check className="w-4 h-4 text-primary-foreground" />
                      ) : (
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">{step.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 16 }}
              className="w-20 h-20 rounded-full bg-gradient-fire flex items-center justify-center shadow-glow mb-6"
            >
              <Check className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Your plan is ready
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Built for {goalLabel.toLowerCase()} — {data.daysPerWeek || 4} days a week,
              starting today. Let's lock it in.
            </p>

            <button
              onClick={onDone}
              className="w-full py-4 rounded-xl bg-gradient-fire text-primary-foreground font-display font-bold text-lg shadow-glow"
            >
              Reveal my plan
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
