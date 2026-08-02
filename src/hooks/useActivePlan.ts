import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ActivePlan,
  classifyPlanResponse,
  clearCachedActivePlan,
  readCachedActivePlan,
  writeCachedActivePlan,
} from '@/lib/planData';

/**
 * `loading` – we genuinely don't know yet and have nothing cached.
 * `ready`   – we have a plan to render (from cache and/or server).
 * `empty`   – server confirmed there is no active plan. ONLY this may show onboarding.
 * `error`   – we couldn't reach the server and have no cache. Show a retry, never onboarding.
 */
export type PlanStatus = 'loading' | 'ready' | 'empty' | 'error';

const MAX_ATTEMPTS = 3;

export function useActivePlan(userId: string | undefined) {
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [status, setStatus] = useState<PlanStatus>('loading');
  const [stale, setStale] = useState(false);
  const loadedForUser = useRef<string | null>(null);

  const fetchOnce = useCallback(async (uid: string) => {
    const res = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', uid)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return classifyPlanResponse(res);
  }, []);

  const load = useCallback(async (uid: string) => {
    const cached = readCachedActivePlan(uid);
    if (cached) {
      setPlan(cached);
      setStatus('ready');
      setStale(true);
    } else {
      setStatus('loading');
    }

    let last = null as Awaited<ReturnType<typeof fetchOnce>> | null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      last = await fetchOnce(uid);
      if (last.kind !== 'error') break;
      await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)));
    }

    if (!last) return;

    if (last.kind === 'plan') {
      setPlan(last.plan);
      setStatus('ready');
      setStale(false);
      writeCachedActivePlan(uid, last.plan);
      return;
    }

    if (last.kind === 'none') {
      // The one and only path that may declare "no plan".
      clearCachedActivePlan();
      setPlan(null);
      setStatus('empty');
      setStale(false);
      return;
    }

    // 'unusable' or 'error': keep whatever we already had; never blank the UI.
    if (cached) {
      setStatus('ready');
      setStale(true);
    } else {
      setStatus(last.kind === 'error' ? 'error' : 'empty');
    }
  }, [fetchOnce]);

  useEffect(() => {
    if (!userId) return;
    if (loadedForUser.current === userId) return;
    loadedForUser.current = userId;
    load(userId);
  }, [userId, load]);

  /** Optimistic local apply (e.g. right after the coach creates a plan). */
  const applyPlan = useCallback((next: ActivePlan) => {
    setPlan(next);
    setStatus('ready');
    setStale(false);
    if (userId) writeCachedActivePlan(userId, next);
  }, [userId]);

  const retry = useCallback(() => {
    if (userId) load(userId);
  }, [userId, load]);

  /** Explicit user action ("start over"), never inferred from a failed fetch. */
  const forgetPlan = useCallback(() => {
    clearCachedActivePlan();
    setPlan(null);
    setStatus('empty');
  }, []);

  return { plan, status, stale, applyPlan, retry, forgetPlan };
}
