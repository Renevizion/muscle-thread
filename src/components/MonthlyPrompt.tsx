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
}

export function MonthlyPrompt({ currentPlan, onCreateNew, onRevise, onContinue }: MonthlyPromptProps) {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [completionRate, setCompletionRate] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setShowPrompt(false);
    setDismissed(false);
    setCompletionRate(null);
    checkMonthlyStatus();
  }, [currentPlan?.id, currentPlan?.end_date, user?.id]);

  const checkMonthlyStatus = async () => {
    if (!currentPlan || !user) {
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
    
    setShowPrompt(false);
    setDismissed(true);
    onContinue();
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-card">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-fire flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">New Month Ahead!</h2>
              <p className="text-sm text-muted-foreground">Your current plan is ending</p>
            </div>
          </div>
          <button 
            onClick={() => setDismissed(true)}
            className="p-2 hover:bg-secondary rounded"
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
              setShowPrompt(false);
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
              setShowPrompt(false);
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
        </div>
      </div>
    </div>
  );
}
