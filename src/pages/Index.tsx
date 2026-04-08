import { useState, useEffect, useCallback } from 'react';
import { workoutPlan as defaultPlan, WorkoutDay } from '@/data/workoutPlan';
import { WeeklySchedule } from '@/components/WeeklySchedule';
import { WorkoutView } from '@/components/WorkoutView';
import { ChatInterface } from '@/components/ChatInterface';
import { OnboardingFlow, OnboardingData } from '@/components/onboarding/OnboardingFlow';
import { ChatThreadsSidebar } from '@/components/ChatThreadsSidebar';
import { MonthlyPrompt } from '@/components/MonthlyPrompt';
import { ProgressCharts } from '@/components/ProgressCharts';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Flame, MessageSquarePlus, X, Dumbbell, LogOut, Menu, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ActivePlan {
  id: string;
  name: string;
  plan_data: any[];
  start_date: string | null;
  end_date: string | null;
  duration_weeks: number | null;
}

const Index = () => {
  const ONBOARDING_STORAGE_KEY = 'onboarding-data-v1';

  // OnboardingFlow saves { data, step } - we read .data from it
  const readSavedOnboarding = (): OnboardingData | null => {
    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Handle both formats: { data, step } from OnboardingFlow or raw OnboardingData
      if (parsed && typeof parsed === 'object' && 'data' in parsed) {
        return parsed.data as OnboardingData;
      }
      return parsed as OnboardingData;
    } catch {
      return null;
    }
  };

  const writeSavedOnboarding = (data: OnboardingData) => {
    try {
      // Save in the same format OnboardingFlow uses
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ data, step: 5 }));
    } catch {
      // ignore
    }
  };

  const clearSavedOnboarding = () => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const ACTIVE_PLAN_CACHE_KEY = 'active-plan-cache-v1';

  const normalizePlanDays = (raw: any): WorkoutDay[] => {
    if (Array.isArray(raw)) return raw as WorkoutDay[];
    if (raw && typeof raw === 'object' && Array.isArray(raw.days)) return raw.days as WorkoutDay[];
    return [];
  };

  const readCachedActivePlan = (userId: string): ActivePlan | null => {
    try {
      const raw = localStorage.getItem(ACTIVE_PLAN_CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const userMatch = parsed?.userId === userId;
      const plan = (parsed?.plan ?? parsed) as ActivePlan | undefined;
      if (!userMatch || !plan) return null;

      const days = normalizePlanDays((plan as any).plan_data);
      if (!Array.isArray(days) || days.length === 0) return null;

      return { ...plan, plan_data: days };
    } catch {
      return null;
    }
  };

  const writeCachedActivePlan = (userId: string, plan: ActivePlan) => {
    try {
      localStorage.setItem(ACTIVE_PLAN_CACHE_KEY, JSON.stringify({ userId, plan }));
    } catch {
      // ignore
    }
  };

  const clearCachedActivePlan = () => {
    try {
      localStorage.removeItem(ACTIVE_PLAN_CACHE_KEY);
    } catch {
      // ignore
    }
  };

  // Calculate today's day index (1-7, Monday=1)
  const todayIndex = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [showChat, setShowChat] = useState(false);
  const [showThreads, setShowThreads] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutDay[]>([]);
  const [planName, setPlanName] = useState('');
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [savedOnboardingData, setSavedOnboardingData] = useState<OnboardingData | null>(null);

  // Thread management
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [threadType, setThreadType] = useState<'plan' | 'advice' | 'general'>('advice');
  const [chatTitle, setChatTitle] = useState('Get Advice');
  const [chatKey, setChatKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'workout' | 'progress'>('workout');
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, { reps: number; weight: number }[]>>({});

  const { toggleExercise, markDayComplete, getExerciseProgress, getDayProgress, isDayComplete } = useWorkoutProgress();
  const { user, signOut } = useAuth();

  // Track if we've already loaded once to prevent re-running after plan creation
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const saved = readSavedOnboarding();
    if (saved) setSavedOnboardingData(saved);
  }, []);

  // Prevent background scroll when chat overlay or threads drawer is open (fixes “scrolling the app behind the chat”).
  useEffect(() => {
    const shouldLock = showChat || showThreads;
    if (!shouldLock) return;

    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [showChat, showThreads]);

  // Check if user has an active plan (only runs on initial mount)
  useEffect(() => {
    const loadActivePlan = async () => {
      if (!user || hasLoadedOnce) return;

      // Hydrate from cache first so the UI doesn't "lose" the plan during brief auth/network hiccups.
      const cachedPlan = readCachedActivePlan(user.id);
      if (cachedPlan) {
        setActivePlan(cachedPlan);
        setPlanName(cachedPlan.name);
        setWorkoutPlan(normalizePlanDays((cachedPlan as any).plan_data));
        setNeedsOnboarding(false);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      const saved = readSavedOnboarding();
      if (saved) setSavedOnboardingData(saved);

      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Don't treat transient errors as "no plan".
        if (!cachedPlan) {
          if (saved) {
            setNeedsOnboarding(false);
            setThreadType('plan');
            setChatTitle('Build New Plan');
          } else {
            setNeedsOnboarding(true);
          }
        }
        toast.error('Could not load your plan. Retrying later.');
        setHasLoadedOnce(true);
        setIsLoading(false);
        return;
      }

      const planDays = normalizePlanDays(data?.plan_data);

      if (data && Array.isArray(planDays) && planDays.length > 0) {
        const nextActivePlan: ActivePlan = {
          id: data.id,
          name: data.name,
          plan_data: planDays,
          start_date: data.start_date,
          end_date: data.end_date,
          duration_weeks: data.duration_weeks,
        };

        setActivePlan(nextActivePlan);
        setPlanName(data.name);
        setWorkoutPlan(planDays);
        setNeedsOnboarding(false);
        writeCachedActivePlan(user.id, nextActivePlan);
      } else {
        // No plan found (or empty plan)
        clearCachedActivePlan();

        if (saved) {
          setNeedsOnboarding(false);
          setThreadType('plan');
          setChatTitle('Build New Plan');
        } else {
          setNeedsOnboarding(true);
        }
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

  const startPlanChat = (useSavedContext: boolean) => {
    setThreadType('plan');
    setChatTitle('Build New Plan');
    setCurrentThreadId(null);
    setChatKey(prev => prev + 1);
    setOnboardingData(useSavedContext ? savedOnboardingData : null);
    setShowThreads(false);
    setShowChat(true);
  };

  const restartOnboarding = () => {
    clearSavedOnboarding();
    setSavedOnboardingData(null);
    setOnboardingData(null);
    setNeedsOnboarding(true);
    setShowChat(false);
    setShowThreads(false);
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    writeSavedOnboarding(data);
    setSavedOnboardingData(data);

    setOnboardingData(data);
    setThreadType('plan');
    setChatTitle('Build New Plan');
    setCurrentThreadId(null);
    setChatKey(prev => prev + 1);
    setShowChat(true);
    setNeedsOnboarding(false);
  };

  const handlePlanCreated = (plan: any) => {
    if (plan.days && plan.days.length > 0) {
      const newActivePlan: ActivePlan = {
        id: plan.id || '',
        name: plan.name,
        plan_data: plan.days,
        start_date: null,
        end_date: null,
        duration_weeks: plan.duration_weeks || 4,
      };

      setWorkoutPlan(plan.days);
      setPlanName(plan.name);
      setActivePlan(newActivePlan);
      setShowThreads(false);
      setShowChat(false);
      setOnboardingData(null);

      // Cache the plan so refreshes don't lose it
      if (user) {
        writeCachedActivePlan(user.id, newActivePlan);
      }

      // Clear onboarding data since we now have a plan
      clearSavedOnboarding();
      setSavedOnboardingData(null);
    }
  };

  const handleNewThread = (type: 'plan' | 'advice' | 'general') => {
    setThreadType(type);
    setCurrentThreadId(null);
    setChatKey(prev => prev + 1);
    setOnboardingData(null);
    
    const titles = {
      plan: 'Build New Plan',
      advice: 'Get Advice',
      general: 'General Chat',
    };
    setChatTitle(titles[type]);
    setShowThreads(false);
    setShowChat(true);
  };

  const handleSelectThread = (threadId: string | null, type: 'plan' | 'advice' | 'general') => {
    setCurrentThreadId(threadId);
    setThreadType(type);
    setChatKey(prev => prev + 1);
    setOnboardingData(null);
    if (threadId) {
      setChatTitle('Loading...');
    }
    setShowChat(true);
  };

  const handleMonthlyCreateNew = () => {
    handleNewThread('plan');
  };

  const handleMonthlyRevise = () => {
    setThreadType('plan');
    setCurrentThreadId(null);
    setChatKey(prev => prev + 1);
    // Pre-load context about current plan for revision
    setOnboardingData(null);
    setChatTitle('Revise Plan');
    setShowChat(true);
  };

  const handleMonthlyContinue = () => {
    toast.success('Plan extended for another month!');
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  const handleLogExercise = useCallback(async (workoutDay: string, exerciseName: string, sets: { reps: number; weight: number }[]) => {
    if (!user || !activePlan) return;

    const totalSets = sets.length;
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
    const maxWeight = Math.max(...sets.map(s => s.weight), 0);

    // Upsert into workout_logs
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_id', activePlan.id)
      .eq('workout_day', workoutDay)
      .eq('exercise_name', exerciseName)
      .gte('logged_at', today)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('workout_logs')
        .update({
          sets_completed: totalSets,
          reps_completed: totalReps,
          weight_used: maxWeight,
          completed: true,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('workout_logs')
        .insert({
          user_id: user.id,
          plan_id: activePlan.id,
          workout_day: workoutDay,
          exercise_name: exerciseName,
          sets_completed: totalSets,
          reps_completed: totalReps,
          weight_used: maxWeight,
          completed: true,
        });
    }

    // Update local state
    setExerciseLogs(prev => ({ ...prev, [`${workoutDay}:${exerciseName}`]: sets }));
    toast.success(`Logged ${exerciseName}`);
  }, [user, activePlan]);

  const getExerciseLogSets = useCallback((workoutDay: string, exerciseName: string) => {
    return exerciseLogs[`${workoutDay}:${exerciseName}`];
  }, [exerciseLogs]);

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
      {/* Monthly Prompt */}
      {activePlan && (
        <MonthlyPrompt
          currentPlan={activePlan}
          onCreateNew={handleMonthlyCreateNew}
          onRevise={handleMonthlyRevise}
          onContinue={handleMonthlyContinue}
        />
      )}

      {/* Chat Threads Sidebar */}
      <ChatThreadsSidebar
        isOpen={showThreads}
        onClose={() => setShowThreads(false)}
        currentThreadId={currentThreadId}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        activePlanId={activePlan?.id}
      />

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

        {/* Tab switcher */}
        {workoutPlan.length > 0 && (
          <div className="px-4 mb-2">
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              <button
                onClick={() => setActiveTab('workout')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                  activeTab === 'workout' ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                <Dumbbell className="w-4 h-4" />
                Workout
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                  activeTab === 'progress' ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Progress
              </button>
            </div>
          </div>
        )}

        {activeTab === 'workout' ? (
          <>
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
                  isToday={selectedDay === todayIndex}
                  todayIndex={todayIndex}
                  isDayComplete={isDayComplete(currentWorkout.id, currentWorkout.exercises?.length || 0)}
                  onLogExercise={(exerciseName, sets) => handleLogExercise(currentWorkout.name, exerciseName, sets)}
                  getExerciseLogs={(exerciseName) => getExerciseLogSets(currentWorkout.name, exerciseName)}
                />
              ) : (
                <div className="px-4 py-12 text-center">
                  <p className="text-muted-foreground">No active plan yet.</p>
                  <div className="mt-4 mx-auto max-w-xs space-y-2">
                    <button
                      onClick={() => startPlanChat(true)}
                      className="w-full py-3 rounded-xl bg-gradient-fire text-primary-foreground font-display font-semibold shadow-glow"
                    >
                      Continue building my plan
                    </button>
                    <button
                      onClick={restartOnboarding}
                      className="w-full py-3 rounded-xl bg-secondary text-foreground font-display font-semibold"
                    >
                      Restart onboarding
                    </button>
                  </div>
                </div>
              )}
            </main>
          </>
        ) : (
          <main className="mt-2 pb-20">
            <ProgressCharts planId={activePlan?.id || null} />
          </main>
        )}
      </div>

      {/* Chat Overlay */}
      <div className={cn(
        "fixed inset-0 bg-background z-50 transition-transform duration-300 ease-out overscroll-none",
        showChat ? "translate-x-0" : "translate-x-full",
        showThreads && "pointer-events-none"
      )}>
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border safe-top">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowThreads(true)}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-fire flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold">{chatTitle}</h2>
              <p className="text-xs text-muted-foreground">Chat with your AI coach</p>
            </div>
          </div>
          
          <button
            onClick={() => {
              setShowThreads(false);
              setShowChat(false);
            }}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="h-[calc(100vh-80px)]">
          <ChatInterface 
            key={chatKey}
            onPlanCreated={handlePlanCreated} 
            initialContext={onboardingData || undefined}
            conversationId={currentThreadId}
            planId={activePlan?.id}
            threadType={threadType}
            onTitleChange={setChatTitle}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
