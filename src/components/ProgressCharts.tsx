import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Dumbbell, Calendar, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkoutLogRow {
  id: string;
  workout_day: string;
  exercise_name: string;
  completed: boolean;
  sets_completed: number;
  reps_completed: number;
  weight_used: number;
  logged_at: string;
}

type ViewMode = 'weekly' | 'exercises';

export function ProgressCharts({ planId }: { planId: string | null }) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WorkoutLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

  useEffect(() => {
    if (!user || !planId) {
      setLoading(false);
      return;
    }
    
    const load = async () => {
      const { data } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_id', planId)
        .order('logged_at', { ascending: true });

      if (data) setLogs(data as unknown as WorkoutLogRow[]);
      setLoading(false);
    };
    load();
  }, [user, planId]);

  const weeklyData = useMemo(() => {
    const weeks: Record<string, { completed: number; total: number; volume: number }> = {};
    
    logs.forEach(log => {
      const date = new Date(log.logged_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const key = weekStart.toISOString().split('T')[0];
      
      if (!weeks[key]) weeks[key] = { completed: 0, total: 0, volume: 0 };
      weeks[key].total++;
      if (log.completed) weeks[key].completed++;
      weeks[key].volume += (log.sets_completed || 0) * (log.reps_completed || 0) * (log.weight_used || 0);
    });

    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, data]) => ({
        week: new Date(week).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        completion: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        volume: Math.round(data.volume),
      }));
  }, [logs]);

  const exerciseData = useMemo(() => {
    const exercises: Record<string, { maxWeight: number; totalSets: number; sessions: number }> = {};
    
    logs.forEach(log => {
      if (!exercises[log.exercise_name]) {
        exercises[log.exercise_name] = { maxWeight: 0, totalSets: 0, sessions: 0 };
      }
      const e = exercises[log.exercise_name];
      if ((log.weight_used || 0) > e.maxWeight) e.maxWeight = log.weight_used || 0;
      e.totalSets += log.sets_completed || 0;
      e.sessions++;
    });

    return Object.entries(exercises)
      .sort(([, a], [, b]) => b.sessions - a.sessions)
      .slice(0, 8)
      .map(([name, data]) => ({
        name: name.length > 15 ? name.slice(0, 15) + '…' : name,
        fullName: name,
        maxWeight: data.maxWeight,
        totalSets: data.totalSets,
        sessions: data.sessions,
      }));
  }, [logs]);

  const stats = useMemo(() => {
    const totalWorkouts = new Set(logs.map(l => l.logged_at.split('T')[0] + l.workout_day)).size;
    const totalExercisesCompleted = logs.filter(l => l.completed).length;
    const totalVolume = logs.reduce((sum, l) => sum + (l.sets_completed || 0) * (l.reps_completed || 0) * (l.weight_used || 0), 0);
    const streak = calculateStreak(logs);
    
    return { totalWorkouts, totalExercisesCompleted, totalVolume, streak };
  }, [logs]);

  if (loading) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="animate-pulse text-muted-foreground">Loading progress...</div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-bold text-lg mb-1">No Data Yet</h3>
        <p className="text-sm text-muted-foreground">Log your first workout to see progress charts here.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 animate-slide-up">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Calendar className="w-5 h-5" />} label="Workouts" value={stats.totalWorkouts} />
        <StatCard icon={<Dumbbell className="w-5 h-5" />} label="Exercises Done" value={stats.totalExercisesCompleted} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Total Volume" value={formatVolume(stats.totalVolume)} />
        <StatCard icon={<Award className="w-5 h-5" />} label="Day Streak" value={stats.streak} />
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1">
        <button
          onClick={() => setViewMode('weekly')}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
            viewMode === 'weekly' ? "bg-background shadow-sm" : "text-muted-foreground"
          )}
        >
          Weekly
        </button>
        <button
          onClick={() => setViewMode('exercises')}
          className={cn(
            "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
            viewMode === 'exercises' ? "bg-background shadow-sm" : "text-muted-foreground"
          )}
        >
          Exercises
        </button>
      </div>

      {viewMode === 'weekly' ? (
        <>
          {/* Completion chart */}
          <div className="bg-gradient-card rounded-2xl p-4">
            <h3 className="font-display font-semibold text-sm mb-3">Weekly Completion %</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, 'Completion']}
                />
                <Bar dataKey="completion" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Volume chart */}
          <div className="bg-gradient-card rounded-2xl p-4">
            <h3 className="font-display font-semibold text-sm mb-3">Weekly Volume (lbs)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                  formatter={(v: number) => [formatVolume(v), 'Volume']}
                />
                <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="bg-gradient-card rounded-2xl p-4">
          <h3 className="font-display font-semibold text-sm mb-3">Top Exercises (Max Weight)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={exerciseData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                formatter={(v: number, _, item) => [`${v} lbs`, (item.payload as any).fullName]}
              />
              <Bar dataKey="maxWeight" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-gradient-card rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1 text-primary">{icon}</div>
      <p className="font-display font-bold text-xl">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function formatVolume(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return v.toString();
}

function calculateStreak(logs: WorkoutLogRow[]): number {
  if (logs.length === 0) return 0;
  
  const completedDates = [...new Set(
    logs.filter(l => l.completed).map(l => l.logged_at.split('T')[0])
  )].sort().reverse();
  
  if (completedDates.length === 0) return 0;
  
  let streak = 1;
  for (let i = 0; i < completedDates.length - 1; i++) {
    const curr = new Date(completedDates[i]);
    const prev = new Date(completedDates[i + 1]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 2) streak++;
    else break;
  }
  return streak;
}
