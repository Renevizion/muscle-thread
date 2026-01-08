import { useState, useEffect } from 'react';
import { workoutPlan as defaultPlan, WorkoutDay } from '@/data/workoutPlan';
import { WeeklySchedule } from '@/components/WeeklySchedule';
import { WorkoutView } from '@/components/WorkoutView';
import { ChatInterface } from '@/components/ChatInterface';
import { OnboardingFlow, OnboardingData } from '@/components/onboarding/OnboardingFlow';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Flame, MessageSquarePlus, X, Dumbbell, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Index = () => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [showChat, setShowChat] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutDay[]>([]);
  const [planName, setPlanName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const { toggleExercise, markDayComplete, getExerciseProgress, getDayProgress } = useWorkoutProgress();
  const { user, signOut } = useAuth();

  // Track if we've already loaded once to prevent re-running after plan creation
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Check if user has an active plan (only runs on initial mount)
  useEffect(() => {
    const loadActivePlan = async () => {
      if (!user || hasLoadedOnce) return;
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setPlanName(data.name);
        const planData = data.plan_data as any[];
        if (planData && planData.length > 0) {
          setWorkoutPlan(planData);
          setNeedsOnboarding(false);
        } else {
          setNeedsOnboarding(true);
        }
      } else {
        // No plan found - new user needs onboarding
        setNeedsOnboarding(true);
      }
      
      setHasLoadedOnce(true);
      setIsLoading(false);
    };

    loadActivePlan();
  }, [user, hasLoadedOnce]);

  // Auto-select today's workout on load
  useEffect(() => {
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 7 : today;
    setSelectedDay(dayIndex);
  }, []);

  const currentWorkout = workoutPlan.find(d => d.id === selectedDay) || workoutPlan[0];

  const weekProgress = workoutPlan.length > 0 
    ? workoutPlan.reduce((acc, day) => {
        const exerciseCount = day.exercises?.length || 1;
        return acc + getDayProgress(day.id, exerciseCount);
      }, 0) / workoutPlan.length
    : 0;

  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setShowChat(true);
    setNeedsOnboarding(false);
  };

  const handlePlanCreated = (plan: any) => {
    if (plan.days && plan.days.length > 0) {
      setWorkoutPlan(plan.days);
      setPlanName(plan.name);
      setShowChat(false);
      setOnboardingData(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-gradient-fire flex items-center justify-center shadow-glow animate-pulse">
          <Dumbbell className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    );
  }

  // Onboarding flow for new users
  if (needsOnboarding && !showChat) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background safe-top">
      {/* Main Workout View */}
      <div className={cn(
        "transition-transform duration-300",
        showChat && "translate-x-[-100%] md:translate-x-0"
      )}>
        {/* Header */}
        <header className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-fire flex items-center justify-center shadow-glow">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">
                  {planName || 'Your Plan'}
                </h1>
                <p className="text-xs text-muted-foreground">4-Week Program</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-card rounded-full px-3 py-1.5">
                <Flame className="w-4 h-4 text-primary" />
                <span className="font-display text-sm font-semibold">{Math.round(weekProgress)}%</span>
              </div>
              
              <button
                onClick={() => setShowChat(true)}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
              >
                <MessageSquarePlus className="w-5 h-5 text-muted-foreground" />
              </button>

              <button
                onClick={handleSignOut}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
              >
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Week progress bar */}
          <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-fire transition-all duration-500"
              style={{ width: `${weekProgress}%` }}
            />
          </div>
        </header>

        {/* Weekly Schedule */}
        {workoutPlan.length > 0 && (
          <WeeklySchedule 
            currentDay={selectedDay}
            onSelectDay={setSelectedDay}
            getDayProgress={getDayProgress}
            workoutPlan={workoutPlan}
          />
        )}

        {/* Workout Content */}
        <main className="mt-2 pb-20">
          {currentWorkout ? (
            <WorkoutView
              day={currentWorkout}
              getExerciseProgress={getExerciseProgress}
              toggleExercise={toggleExercise}
              markDayComplete={markDayComplete}
            />
          ) : (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground">No workout plan yet. Chat with your coach to create one!</p>
            </div>
          )}
        </main>
      </div>

      {/* Chat Overlay */}
      <div className={cn(
        "fixed inset-0 bg-background z-50 transition-transform duration-300",
        showChat ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-fire flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold">AI Fitness Coach</h2>
              <p className="text-xs text-muted-foreground">Build & iterate on your plan</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowChat(false)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="h-[calc(100vh-80px)]">
          <ChatInterface 
            onPlanCreated={handlePlanCreated} 
            initialContext={onboardingData || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
