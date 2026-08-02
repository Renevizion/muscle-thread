import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, ArrowRight, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, endOfMonth } from 'date-fns';
import { loadDecisions, saveDecision, isSilenced, type MonthDecisionAction } from '@/lib/planDecisions';

interface MonthlyPromptProps {
  currentPlan: any;
  onCreateNew: () => void;
  onRevise: () => void;
  onContinue: () => void;
  onReview?: () => void;
}

export function MonthlyPrompt({ currentPlan, onCreateNew, onRevise, onContinue, onReview }: MonthlyPromptProps) {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [completionRate, setCompletionRate] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const planId = currentPlan?.id ?? '';
  const endKey = currentPlan?.end_date ?? '';

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setShowPrompt(false);
      setDismissed(false);
      setCompletionRate(null);

      if (!currentPlan || !user) return;

      // Durable, account-wide check first — a decision made on any device silences this.
      const decisions = await loadDecisions(user.id);
      if (cancelled) return;
      if (isSilenced(decisions, planId, endKey)) return;

      const endDate = currentPlan.end_date ? new Date(currentPlan.end_date) : null;
      if (!endDate) return;

      const daysUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilEnd > 3) return;

      await loadCompletionRate();
      if (cancelled) return;
      setShowPrompt(true);
    };

    run();
    return () => { cancelled = true; };
  }, [planId, endKey, user?.id]);

  const close = (action: MonthDecisionAction) => {
    // Optimistic: hide immediately, persist in the background.
    setShowPrompt(false);
    setDismissed(true);
    void saveDecision(user?.id, planId, endKey, action);
  };



  const loadCompletionRate = async () => {
    if (!user || !currentPlan) return;
    
    const { data, count } = await supabase
      .from('workout_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('plan_id', currentPlan.id)
      .eq('completed', true);
    
    // Estimate based on plan structure
    const totalExpectedWorkouts = (currentPlan.duration_weeks || 4) * (currentPlan.plan_data?.length || 4);
    if (count && totalExpectedWorkouts > 0) {
      setCompletionRate(Math.round((count / totalExpectedWorkouts) * 100));
    }
  };

  const handleContinue = async () => {
    // Extend the plan by another month
    const newEndDate = endOfMonth(new Date(new Date().setMonth(new Date().getMonth() + 1)));
    
    await supabase
      .from('workout_plans')
      .update({ end_date: format(newEndDate, 'yyyy-MM-dd') })
      .eq('id', currentPlan.id);
    
    close('continue');
    onContinue();
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 safe-bottom">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-card max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-fire flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg leading-tight">Your plan is wrapping up</h2>
              <p className="text-sm text-muted-foreground">Pick once — I won't ask again for this plan</p>
            </div>
          </div>
          <button
            onClick={() => close('later')}
            aria-label="Ask me later"
            className="p-2 hover:bg-secondary rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Summary */}
        {completionRate !== null && (
          <div className="bg-secondary/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">This month's completion</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-display font-bold">{completionRate}%</span>
              <span className="text-muted-foreground text-sm mb-1">of workouts completed</span>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="space-y-2">
          <button
            onClick={() => {
              close('new');
              onCreateNew();
            }}
            className="w-full flex items-center gap-4 p-4 bg-gradient-fire text-primary-foreground rounded-xl text-left"
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="font-display font-semibold">Create Fresh Plan</p>
              <p className="text-xs opacity-80">New goals, new program</p>
            </div>
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              close('revise');
              onRevise();
            }}
            className="w-full flex items-center gap-4 p-4 bg-secondary hover:bg-secondary/80 rounded-xl text-left transition-colors"
          >
            <RefreshCw className="w-5 h-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-display font-semibold">Revise Current Plan</p>
              <p className="text-xs text-muted-foreground">Adjust based on progress</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <button
            onClick={handleContinue}
            className="w-full flex items-center gap-4 p-4 bg-secondary hover:bg-secondary/80 rounded-xl text-left transition-colors"
          >
            <ArrowRight className="w-5 h-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-display font-semibold">Continue This Plan</p>
              <p className="text-xs text-muted-foreground">Extend for another month</p>
            </div>
          </button>

          {onReview && (
            <button
              onClick={() => {
                close('review');
                onReview();
              }}
              className="w-full flex items-center gap-4 p-4 bg-secondary/60 hover:bg-secondary rounded-xl text-left transition-colors"
            >
              <Sparkles className="w-5 h-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="font-display font-semibold">Honest Month Review</p>
                <p className="text-xs text-muted-foreground">See how planned vs actual lines up with your goals</p>
              </div>
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
