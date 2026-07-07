import { useState, useEffect, useCallback } from 'react';
import { workoutPlan as defaultPlan, WorkoutDay } from '@/data/workoutPlan';
import { WeeklySchedule } from '@/components/WeeklySchedule';
import { WorkoutView } from '@/components/WorkoutView';
import { ChatInterface } from '@/components/ChatInterface';
import { OnboardingFlow, OnboardingData } from '@/components/onboarding/OnboardingFlow';
import { PlanGenerationReveal } from '@/components/onboarding/PlanGenerationReveal';
import { ChatThreadsSidebar } from '@/components/ChatThreadsSidebar';
import { MonthlyPrompt } from '@/components/MonthlyPrompt';
import { ProgressCharts } from '@/components/ProgressCharts';
import { ProgressPhotos } from '@/components/ProgressPhotos';
import { DayActionsMenu } from '@/components/DayActionsMenu';
import { CatchUpInline, SubstituteEntry, CatchUpReason } from '@/components/CatchUpInline';
import { QuickCapture } from '@/components/QuickCapture';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';
import { useDayOverrides } from '@/hooks/useDayOverrides';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Flame, MessageSquarePlus, X, Dumbbell, LogOut, Menu, TrendingUp, Camera, Clock } from 'lucide-react';
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
  const [revealData, setRevealData] = useState<OnboardingData | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [savedOnboardingData, setSavedOnboardingData] = useState<OnboardingData | null>(null);

  // Thread management
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [threadType, setThreadType] = useState<'plan' | 'advice' | 'general'>('advice');
  const [chatTitle, setChatTitle] = useState('Get Advice');
  const [chatKey, setChatKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'workout' | 'progress' | 'photos'>('workout');
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, { reps: number; weight: number }[]>>({});
  const [monthSubs, setMonthSubs] = useState<Array<{ activity: string; durationMin: number; intensity: string; reason?: string; forDate: string; note?: string; kind: 'substitute' | 'missed' }>>([]);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [coachNotes, setCoachNotes] = useState<Array<{ content: string; date: string }>>([]);
  const [weightLog, setWeightLog] = useState<Array<{ value: number; date: string }>>([]);

  const { toggleExercise, markDayComplete, getExerciseProgress, getDayProgress, isDayComplete } = useWorkoutProgress();
  const { overrides, swapDays, markSkipped, remindLater, clearLater, resetWeek, resolveDayId, isSkipped } = useDayOverrides();
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

  // Resolve which workout to show in each calendar slot (handles swaps + skipped).
  const displayedPlan: WorkoutDay[] = workoutPlan.map(d => {
    if (isSkipped(d.id)) {
      return { ...d, type: 'rest' as const, name: 'Rest (skipped)', exercises: [], extras: ['You pushed this one — no worries, get the next session.'] };
    }
    const targetId = resolveDayId(d.id);
    if (targetId === d.id) return d;
    const source = workoutPlan.find(x => x.id === targetId);
    return source ? { ...source, id: d.id } : d;
  });

  const currentWorkout = displayedPlan.find(d => d.id === selectedDay) || displayedPlan[0];

  const weekProgress = displayedPlan.length > 0
    ? displayedPlan.reduce((acc, day) => {
        const exerciseCount = day.exercises?.length || 1;
        return acc + getDayProgress(day.id, exerciseCount);
      }, 0) / displayedPlan.length
    : 0;

  // "Remind me later" countdown banner
  const laterAt = overrides.laterAt ? new Date(overrides.laterAt) : null;
  const laterActive = !!(laterAt && laterAt.getTime() > Date.now());
  const laterLabel = laterActive
    ? laterAt!.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

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
    // Show the personalized "gotcha" reveal before dropping into the coach.
    setRevealData(data);
    setNeedsOnboarding(false);
  };

  const handleRevealDone = () => {
    const data = revealData;
    setRevealData(null);
    if (!data) return;
    setOnboardingData(data);
    setThreadType('plan');
    setChatTitle('Build New Plan');
    setCurrentThreadId(null);
    setChatKey(prev => prev + 1);
    setShowChat(true);
  };

  const handlePlanCreated = (plan: any) => {
    if (plan.days && plan.days.length > 0) {
      const planEndDate = plan.end_date || null;
      const newActivePlan: ActivePlan = {
        id: plan.id || '',
        name: plan.name,
        plan_data: plan.days,
        start_date: plan.start_date || null,
        end_date: planEndDate,
        duration_weeks: plan.duration_weeks || 4,
      };

      setWorkoutPlan(plan.days);
      setPlanName(plan.name);
      setActivePlan(newActivePlan);
      setSelectedDay(todayIndex);
      setActiveTab('workout');
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

  // Load all exercise logs for the active plan so they survive logout/refresh.
  useEffect(() => {
    const loadLogs = async () => {
      if (!user || !activePlan) return;
      const { data } = await supabase
        .from('workout_logs')
        .select('workout_day, exercise_name, sets_completed, reps_completed, weight_used, logged_at')
        .eq('user_id', user.id)
        .eq('plan_id', activePlan.id)
        .order('logged_at', { ascending: false })
        .limit(500);

      if (!data) return;

      // Take the newest entry per (workout_day, exercise_name)
      const byKey: Record<string, { reps: number; weight: number }[]> = {};
      const seen = new Set<string>();
      for (const row of data) {
        // Skip substitute / missed marker rows — they're handled separately.
        if (row.exercise_name?.startsWith('[SUB]') || row.exercise_name?.startsWith('[MISSED]')) continue;
        const key = `${row.workout_day}:${row.exercise_name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const setsCount = Math.max(1, row.sets_completed || 1);
        const repsPer = Math.round((row.reps_completed || 0) / setsCount);
        // We only persist totals + max weight; reconstruct an even split for display.
        byKey[key] = Array.from({ length: setsCount }, () => ({
          reps: repsPer,
          weight: Number(row.weight_used) || 0,
        }));
      }
      setExerciseLogs(byKey);
    };
    loadLogs();
  }, [user, activePlan]);

  // Load this-month substitutes / missed entries (used for catch-up display + month summary)
  const loadMonthSubs = useCallback(async () => {
    if (!user || !activePlan) return;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('workout_logs')
      .select('exercise_name, notes, logged_at, workout_day')
      .eq('user_id', user.id)
      .eq('plan_id', activePlan.id)
      .gte('logged_at', monthStart.toISOString())
      .order('logged_at', { ascending: false });
    if (!data) return;
    const parsed = data
      .map(row => {
        if (!row.exercise_name?.startsWith('[SUB]') && !row.exercise_name?.startsWith('[MISSED]')) return null;
        let meta: any = {};
        try { meta = row.notes ? JSON.parse(row.notes) : {}; } catch { /* ignore */ }
        const kind: 'substitute' | 'missed' = row.exercise_name.startsWith('[SUB]') ? 'substitute' : 'missed';
        return {
          kind,
          activity: meta.activity || row.exercise_name.replace(/^\[(SUB|MISSED)\]\s*/, ''),
          durationMin: Number(meta.durationMin) || 0,
          intensity: meta.intensity || 'medium',
          reason: meta.reason,
          forDate: (meta.forDate as string) || row.logged_at.split('T')[0],
          note: meta.note,
        };
      })
      .filter(Boolean) as any[];
    setMonthSubs(parsed);
  }, [user, activePlan]);

  useEffect(() => { loadMonthSubs(); }, [loadMonthSubs]);

  // Load persistent "coach memory": quick notes + bodyweight check-ins.
  const loadCoachMemory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('coach_notes')
      .select('kind, content, value, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60);
    if (!data) return;
    setCoachNotes(
      data.filter(r => r.kind === 'note' && r.content)
        .map(r => ({ content: r.content as string, date: r.created_at.split('T')[0] }))
    );
    setWeightLog(
      data.filter(r => r.kind === 'weight' && r.value != null)
        .map(r => ({ value: Number(r.value), date: r.created_at.split('T')[0] }))
    );
  }, [user]);

  useEffect(() => { loadCoachMemory(); }, [loadCoachMemory]);

  const writeMetaLog = useCallback(async (
    exerciseTag: string,
    meta: Record<string, any>,
    forDate: string,
  ) => {
    if (!user || !activePlan) return;
    const dayLabel = workoutPlan.find(d => {
      const dt = new Date(forDate);
      const idx = dt.getDay() === 0 ? 7 : dt.getDay();
      return d.id === idx;
    })?.name || 'Catch-up';
    await supabase.from('workout_logs').insert({
      user_id: user.id,
      plan_id: activePlan.id,
      workout_day: dayLabel,
      exercise_name: exerciseTag,
      sets_completed: 0,
      reps_completed: 0,
      weight_used: 0,
      completed: true,
      notes: JSON.stringify(meta),
      logged_at: new Date(forDate + 'T12:00:00').toISOString(),
    });
    await loadMonthSubs();
  }, [user, activePlan, workoutPlan, loadMonthSubs]);

  const handleLogSubstitute = useCallback(async (entry: SubstituteEntry) => {
    await writeMetaLog(`[SUB] ${entry.activity}`, { ...entry, kind: 'substitute' }, entry.forDate);
    toast.success(`Logged ${entry.activity}`);
  }, [writeMetaLog]);

  const handleMarkSlacked = useCallback(async (date: string, reason: CatchUpReason) => {
    await writeMetaLog('[MISSED]', { reason, forDate: date, kind: 'missed' }, date);
    toast.success('Marked as missed');
  }, [writeMetaLog]);

  const handleLogExercise = useCallback(async (workoutDay: string, exerciseName: string, sets: { reps: number; weight: number }[], loggedDate?: string) => {
    if (!user || !activePlan) return;

    const totalSets = sets.length;
    const totalReps = sets.reduce((sum, s) => sum + s.reps, 0);
    const maxWeight = Math.max(...sets.map(s => s.weight), 0);

    // Use provided date (for past logging) or today.
    const logDateISO = loggedDate || new Date().toISOString();
    const logDate = logDateISO.split('T')[0];

    const { data: existing } = await supabase
      .from('workout_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_id', activePlan.id)
      .eq('workout_day', workoutDay)
      .eq('exercise_name', exerciseName)
      .gte('logged_at', logDate)
      .lt('logged_at', new Date(new Date(logDate).getTime() + 86400000).toISOString().split('T')[0])
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
          logged_at: logDateISO,
        });
    }

    setExerciseLogs(prev => ({ ...prev, [`${workoutDay}:${exerciseName}`]: sets }));
    toast.success(`Logged ${exerciseName}`);
  }, [user, activePlan]);

  const getExerciseLogSets = useCallback((workoutDay: string, exerciseName: string) => {
    return exerciseLogs[`${workoutDay}:${exerciseName}`];
  }, [exerciseLogs]);

  // Stable draft key per user/plan/day/exercise/date — autosaves in-progress inputs.
  const buildDraftKey = useCallback((workoutDay: string, exerciseName: string) => {
    if (!user || !activePlan) return undefined;
    const today = new Date().toISOString().split('T')[0];
    return `${user.id}:${activePlan.id}:${workoutDay}:${exerciseName}:${today}`;
  }, [user, activePlan]);

  // Build live workout context for the AI (today's plan + recent logs)
  const liveChatContext = (() => {
    if (!activePlan || workoutPlan.length === 0) return undefined;
    const todaySlot = displayedPlan.find(d => d.id === todayIndex);
    const ctx: any = {
      planName: activePlan.name,
      todayLabel: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][todayIndex - 1],
      todayName: todaySlot?.name || 'Rest',
      todayFocus: todaySlot?.focus,
      todayExercises: (todaySlot?.exercises || []).map(e => ({
        name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, notes: e.notes,
      })),
      recentLogs: Object.entries(exerciseLogs).slice(0, 20).flatMap(([key, sets]) => {
        const [day, ex] = key.split(':');
        const totalReps = sets.reduce((s, x) => s + x.reps, 0);
        const maxW = Math.max(...sets.map(s => s.weight), 0);
        return [{
          date: 'recent',
          exercise: `${ex} (${day})`,
          sets: sets.length,
          reps: totalReps,
          weight: maxW,
        }];
      }),
    };

    // Month summary: planned sessions vs completed vs substitutes vs missed
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const trainingDaysPerWeek = workoutPlan.filter(d => d.type === 'training' || d.type === 'conditioning').length;
    const weeksElapsed = Math.max(1, Math.ceil((now.getTime() - monthStart.getTime()) / (7 * 86400000)));
    const plannedSessions = trainingDaysPerWeek * weeksElapsed;

    // Count distinct (workout_day x date) completed real sessions this month from exerciseLogs (rough proxy)
    // Better: count substitutes from monthSubs and treat completed real sessions separately by day name occurrences.
    const completedSessions = new Set(
      Object.keys(exerciseLogs).map(k => k.split(':')[0])
    ).size;

    const intensityWeight: Record<string, number> = { light: 0.25, medium: 0.5, hard: 0.8 };
    const subs = monthSubs.filter(m => m.kind === 'substitute');
    const missed = monthSubs.filter(m => m.kind === 'missed');
    const subEffortPct = subs.length === 0 ? 0 :
      Math.round(
        (subs.reduce((sum, s) => sum + (intensityWeight[s.intensity] ?? 0.5) * Math.min(1, s.durationMin / 45), 0) / subs.length) * 100
      );

    ctx.monthSummary = {
      monthLabel: now.toLocaleDateString([], { month: 'long', year: 'numeric' }),
      plannedSessions,
      completedSessions,
      substitutes: subs.map(s => ({
        date: s.forDate, activity: s.activity, durationMin: s.durationMin,
        intensity: s.intensity, reason: s.reason, note: s.note,
      })),
      missedDays: missed.map(m => ({ date: m.forDate, reason: m.reason })),
      estimatedSubstituteEffortPct: subEffortPct,
      statedGoals: savedOnboardingData
        ? [savedOnboardingData.primaryGoal, ...(savedOnboardingData.secondaryGoals || [])].filter(Boolean)
        : undefined,
    };

    // Persistent coach memory: bodyweight trend + user's own notes.
    if (weightLog.length > 0) {
      const latest = weightLog[0];
      const earliest = weightLog[weightLog.length - 1];
      ctx.bodyweight = {
        current: latest.value,
        currentDate: latest.date,
        previous: weightLog[1]?.value,
        startOfRecord: earliest.value,
        changeSinceStart: +(latest.value - earliest.value).toFixed(1),
        history: weightLog.slice(0, 12).map(w => ({ date: w.date, value: w.value })),
      };
    }
    if (coachNotes.length > 0) {
      ctx.userNotes = coachNotes.slice(0, 15).map(n => ({ date: n.date, note: n.content }));
    }

    return ctx;
  })();

  const openMonthReview = () => {
    setThreadType('advice');
    setCurrentThreadId(null);
    setChatKey(prev => prev + 1);
    setOnboardingData(null);
    setChatTitle('Honest Month Review');
    setShowChat(true);
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
  if (needsOnboarding && !showChat && !revealData) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Personalized "gotcha" reveal between onboarding and the coach
  if (revealData) {
    return <PlanGenerationReveal data={revealData} onDone={handleRevealDone} />;
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
          onReview={openMonthReview}
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
              <button
                onClick={() => setActiveTab('photos')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                  activeTab === 'photos' ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                <Camera className="w-4 h-4" />
                Photos
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
                workoutPlan={displayedPlan}
              />
            )}

            {/* Workout Content */}
            <main className="mt-2 pb-20">
              {workoutPlan.length > 0 && (
                <div className="px-4">
                  <QuickCapture onChange={loadCoachMemory} />
                </div>
              )}
              {currentWorkout ? (
                <WorkoutView
                  day={currentWorkout}
                  getExerciseProgress={getExerciseProgress}
                  toggleExercise={toggleExercise}
                  markDayComplete={markDayComplete}
                  isToday={selectedDay === todayIndex}
                  todayIndex={todayIndex}
                  isDayComplete={isDayComplete(currentWorkout.id, currentWorkout.exercises?.length || 0)}
                  onLogExercise={(exerciseName, sets) => {
                    // If logging a past day, stamp logged_at to that day's date this week.
                    if (selectedDay !== todayIndex && selectedDay < todayIndex) {
                      const monday = new Date();
                      monday.setDate(monday.getDate() - monday.getDay() + 1);
                      const target = new Date(monday);
                      target.setDate(monday.getDate() + (selectedDay - 1));
                      handleLogExercise(currentWorkout.name, exerciseName, sets, target.toISOString());
                    } else {
                      handleLogExercise(currentWorkout.name, exerciseName, sets);
                    }
                  }}
                  getExerciseLogs={(exerciseName) => getExerciseLogSets(currentWorkout.name, exerciseName)}
                  buildDraftKey={(exerciseName) => buildDraftKey(currentWorkout.name, exerciseName)}
                  isPastDay={selectedDay < todayIndex}
                  headerSlot={
                    <DayActionsMenu
                      todaySlotId={selectedDay}
                      workoutPlan={workoutPlan}
                      onSwap={(otherSlotId) => swapDays(selectedDay, otherSlotId)}
                      onSkipToday={() => markSkipped(selectedDay)}
                      onRemindLater={remindLater}
                      onResetWeek={resetWeek}
                      hasOverrides={
                        Object.keys(overrides.swaps).length > 0 ||
                        overrides.skipped.length > 0 ||
                        !!overrides.laterAt
                      }
                    />
                  }
                  banner={
                    selectedDay === todayIndex && laterActive ? (
                      <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 text-sm">
                          <span className="font-semibold">Reminder set</span>{' '}
                          <span className="text-muted-foreground">for {laterLabel}</span>
                        </div>
                        <button
                          onClick={() => {
                            clearLater();
                            toast.success('Reminder cleared.');
                          }}
                          className="text-xs font-medium text-primary"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null
                  }
                  catchUpSlot={
                    <CatchUpInline
                      recent={monthSubs
                        .filter(m => m.kind === 'substitute')
                        .map(m => ({
                          activity: m.activity,
                          durationMin: m.durationMin,
                          intensity: m.intensity as any,
                          forDate: m.forDate,
                        }))}
                      onLogSubstitute={handleLogSubstitute}
                      onMarkSlacked={handleMarkSlacked}
                    />
                  }
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
        ) : activeTab === 'progress' ? (
          <main className="mt-2 pb-20">
            {activePlan && (
              <div className="px-4 mb-3">
                <button
                  onClick={openMonthReview}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-card border border-border text-left"
                >
                  <Flame className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold">Honest month review</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Ask the coach how planned vs actual lines up with your goals.
                    </p>
                  </div>
                </button>
              </div>
            )}
            <ProgressCharts planId={activePlan?.id || null} />
          </main>
        ) : (
          <main className="mt-2 pb-20">
            <ProgressPhotos />
          </main>
        )}
      </div>

      {/* Chat Overlay */}
      <div className={cn(
        "fixed inset-0 bg-background z-50 flex flex-col transition-transform duration-300 ease-out overscroll-none",
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

        <div className="flex-1 min-h-0">
          <ChatInterface 
            key={chatKey}
            onPlanCreated={handlePlanCreated} 
            initialContext={onboardingData || undefined}
            conversationId={currentThreadId}
            planId={activePlan?.id}
            threadType={threadType}
            onTitleChange={setChatTitle}
            liveContext={liveChatContext}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
