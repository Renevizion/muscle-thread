import { useState, useEffect } from 'react';
import { workoutPlan as defaultPlan, WorkoutDay } from '@/data/workoutPlan';
import { WeeklySchedule } from '@/components/WeeklySchedule';
import { WorkoutView } from '@/components/WorkoutView';
import { ChatInterface } from '@/components/ChatInterface';
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress';
import { supabase } from '@/integrations/supabase/client';
import { Flame, MessageSquarePlus, X, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

const Index = () => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [showChat, setShowChat] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutDay[]>(defaultPlan);
  const [planName, setPlanName] = useState('Mass Gain');
  const { toggleExercise, markDayComplete, getExerciseProgress, getDayProgress } = useWorkoutProgress();

  // Load active plan from database on mount
  useEffect(() => {
    const loadActivePlan = async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setPlanName(data.name);
        // Convert plan_data to WorkoutDay[] format
        const planData = data.plan_data as any[];
        if (planData && planData.length > 0) {
          setWorkoutPlan(planData);
        }
      }
    };

    loadActivePlan();
  }, []);

  // Auto-select today's workout on load
  useEffect(() => {
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 7 : today;
    setSelectedDay(dayIndex);
  }, []);

  const currentWorkout = workoutPlan.find(d => d.id === selectedDay) || workoutPlan[0];

  // Calculate week progress
  const weekProgress = workoutPlan.reduce((acc, day) => {
    const exerciseCount = day.exercises?.length || 1;
    return acc + getDayProgress(day.id, exerciseCount);
  }, 0) / workoutPlan.length;

  const handlePlanCreated = (plan: any) => {
    if (plan.days && plan.days.length > 0) {
      setWorkoutPlan(plan.days);
      setPlanName(plan.name);
      setShowChat(false);
    }
  };

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
                  {planName}
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
        <WeeklySchedule 
          currentDay={selectedDay}
          onSelectDay={setSelectedDay}
          getDayProgress={getDayProgress}
          workoutPlan={workoutPlan}
        />

        {/* Workout Content */}
        <main className="mt-2 pb-20">
          <WorkoutView
            day={currentWorkout}
            getExerciseProgress={getExerciseProgress}
            toggleExercise={toggleExercise}
            markDayComplete={markDayComplete}
          />
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
              <h2 className="font-display font-bold">Build New Plan</h2>
              <p className="text-xs text-muted-foreground">Chat with your AI coach</p>
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
          <ChatInterface onPlanCreated={handlePlanCreated} />
        </div>
      </div>
    </div>
  );
};

export default Index;
