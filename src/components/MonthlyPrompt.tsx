import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, ArrowRight, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, endOfMonth } from 'date-fns';

interface MonthlyPromptProps {
  currentPlan: any;
  onCreateNew: () => void;
  onRevise: () => void;
  onContinue: () => void;
  onReview?: () => void;
}

const DECISION_KEY = 'monthly-prompt-decision-v2';
const SNOOZE_DAYS = 5;

type Decision = { planId: string; endDate: string; action: string; at: number };

function readDecisions(): Decision[] {
  try {
    const raw = localStorage.getItem(DECISION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordDecision(planId: string, endDate: string, action: string) {
  try {
    const next = readDecisions()
      .filter(d => !(d.planId === planId && d.endDate === endDate))
      .slice(-20);
    next.push({ planId, endDate, action, at: Date.now() });
    localStorage.setItem(DECISION_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

/** A decision on this exact plan+end_date silences the prompt. A "later" dismiss silences it for a few days. */
function hasDecided(planId: string, endDate: string) {
  const d = readDecisions().find(x => x.planId === planId && x.endDate === endDate);
  if (!d) return false;
  if (d.action !== 'later') return true;
  return Date.now() - d.at < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}

export function MonthlyPrompt({ currentPlan, onCreateNew, onRevise, onContinue, onReview }: MonthlyPromptProps) {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [completionRate, setCompletionRate] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const planId = currentPlan?.id ?? '';
  const endKey = currentPlan?.end_date ?? '';

  useEffect(() => {
    setShowPrompt(false);
    setDismissed(false);
    setCompletionRate(null);
    checkMonthlyStatus();
  }, [planId, endKey, user?.id]);

  const close = (action: string) => {
    recordDecision(planId, endKey, action);
    setShowPrompt(false);
    setDismissed(true);
  };

  const checkMonthlyStatus = async () => {
    if (!currentPlan || !user) {
      setShowPrompt(false);
      return;
    }

    if (hasDecided(planId, endKey)) {
      setShowPrompt(false);
      return;
    }

    // Check if plan has ended or it's a new month
    const endDate = currentPlan.end_date ? new Date(currentPlan.end_date) : null;
    const now = new Date();
    
    // Show prompt if plan has ended or we're in the last 3 days of the plan
    if (endDate) {
      const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilEnd <= 3) {
        await loadCompletionRate();
        setShowPrompt(true);
        return;
      }
    }

    setShowPrompt(false);
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
