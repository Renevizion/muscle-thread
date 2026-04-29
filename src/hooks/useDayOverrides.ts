import { useCallback, useEffect, useState } from 'react';

/**
 * Per-week, client-side day overrides:
 *  - swaps:    map of dayId -> dayId (swap today's planned workout with another day this week)
 *  - skipped:  set of dayIds the user explicitly chose to skip / treat as rest
 *  - laterAt:  ISO timestamp for a "remind me later today" nudge
 *
 * Resets automatically every Monday (matches useWorkoutProgress weekly reset).
 */

interface WeekOverrides {
  swaps: Record<number, number>;
  skipped: number[];
  laterAt?: string | null;
}

const STORAGE_KEY = 'workout-day-overrides-v1';
const WEEK_KEY = 'workout-day-overrides-week';

function getWeekStart(): string {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  return monday.toISOString().split('T')[0];
}

const empty: WeekOverrides = { swaps: {}, skipped: [], laterAt: null };

export function useDayOverrides() {
  const [overrides, setOverrides] = useState<WeekOverrides>(empty);

  useEffect(() => {
    try {
      const storedWeek = localStorage.getItem(WEEK_KEY);
      const currentWeek = getWeekStart();
      if (storedWeek !== currentWeek) {
        localStorage.setItem(WEEK_KEY, currentWeek);
        localStorage.removeItem(STORAGE_KEY);
        setOverrides(empty);
        return;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOverrides({ ...empty, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: WeekOverrides) => {
    setOverrides(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  /** Swap two day ids' planned workouts for this week. */
  const swapDays = useCallback((a: number, b: number) => {
    setOverrides(prev => {
      const swaps = { ...prev.swaps };
      // Resolve current targets
      const aTarget = swaps[a] ?? a;
      const bTarget = swaps[b] ?? b;
      swaps[a] = bTarget;
      swaps[b] = aTarget;
      // Clean up identity mappings
      Object.keys(swaps).forEach(k => {
        const key = Number(k);
        if (swaps[key] === key) delete swaps[key];
      });
      const next = { ...prev, swaps };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const markSkipped = useCallback((dayId: number) => {
    setOverrides(prev => {
      if (prev.skipped.includes(dayId)) return prev;
      const next = { ...prev, skipped: [...prev.skipped, dayId] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const remindLater = useCallback((minutes: number) => {
    const when = new Date(Date.now() + minutes * 60_000).toISOString();
    setOverrides(prev => {
      const next = { ...prev, laterAt: when };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    return when;
  }, []);

  const clearLater = useCallback(() => {
    setOverrides(prev => {
      const next = { ...prev, laterAt: null };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const resetWeek = useCallback(() => {
    persist(empty);
  }, []);

  /** Resolve "what plan-day should be shown for slot X this week". */
  const resolveDayId = useCallback(
    (slotId: number) => overrides.swaps[slotId] ?? slotId,
    [overrides.swaps]
  );

  const isSkipped = useCallback(
    (slotId: number) => overrides.skipped.includes(slotId),
    [overrides.skipped]
  );

  return {
    overrides,
    swapDays,
    markSkipped,
    remindLater,
    clearLater,
    resetWeek,
    resolveDayId,
    isSkipped,
  };
}
