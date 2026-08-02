/**
 * Single source of truth for active-plan shape handling + caching.
 *
 * Root cause of the historical "plan disappears / onboarding loop / flapping" bugs:
 * several call sites each decided independently what "no plan" meant, and *any*
 * falsy/unrecognised response (network error, slow response, unexpected JSON shape,
 * a row whose plan_data didn't match the one shape we handled) was treated as
 * "user has no plan" -> cache wiped -> onboarding.
 *
 * The rules encoded here, and nowhere else:
 *  1. Only an explicit server response saying "there are zero active plan rows"
 *     may clear the cache or route to onboarding.
 *  2. Errors, timeouts, and unrecognised payload shapes are NEVER "no plan".
 *  3. Cached plans are rendered immediately so a slow network can't blank the UI.
 */

export interface ActivePlan {
  id: string;
  name: string;
  plan_data: any[];
  start_date: string | null;
  end_date: string | null;
  duration_weeks: number | null;
}

export const ACTIVE_PLAN_CACHE_KEY = 'active-plan-cache-v1';

/**
 * Accepts every shape the coach / DB has ever produced and returns the day array.
 * Returns [] only when there is genuinely nothing day-shaped inside.
 */
export function normalizePlanDays(raw: any): any[] {
  let value = raw;

  // Sometimes stored as a JSON string.
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || typeof value !== 'object') return [];

  // Common wrapper keys we've seen from the model or from older writes.
  for (const key of ['days', 'plan_data', 'plan', 'workout_plan', 'schedule', 'week']) {
    if (key in value) {
      const inner = normalizePlanDays(value[key]);
      if (inner.length > 0) return inner;
    }
  }

  // { weeks: [{ days: [...] }] } -> first week's days
  if (Array.isArray(value.weeks)) {
    for (const week of value.weeks) {
      const inner = normalizePlanDays(week);
      if (inner.length > 0) return inner;
    }
  }

  // { "1": {...}, "2": {...} } keyed-object form
  const numericKeys = Object.keys(value).filter(k => /^\d+$/.test(k));
  if (numericKeys.length > 0) {
    return numericKeys
      .sort((a, b) => Number(a) - Number(b))
      .map(k => value[k])
      .filter(Boolean);
  }

  return [];
}

/** A row is only usable as an active plan if it has an id and at least one day. */
export function rowToActivePlan(row: any): ActivePlan | null {
  if (!row || !row.id) return null;
  const days = normalizePlanDays(row.plan_data);
  if (days.length === 0) return null;
  return {
    id: row.id,
    name: row.name || 'My Workout Plan',
    plan_data: days,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    duration_weeks: row.duration_weeks ?? 4,
  };
}

export function readCachedActivePlan(userId: string): ActivePlan | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PLAN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId) return null;
    return rowToActivePlan(parsed?.plan ?? parsed);
  } catch {
    return null;
  }
}

export function writeCachedActivePlan(userId: string, plan: ActivePlan) {
  try {
    localStorage.setItem(ACTIVE_PLAN_CACHE_KEY, JSON.stringify({ userId, plan, at: Date.now() }));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function clearCachedActivePlan() {
  try {
    localStorage.removeItem(ACTIVE_PLAN_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export type PlanFetchResult =
  | { kind: 'plan'; plan: ActivePlan }
  /** Server answered successfully and there are no active plan rows. The only "go to onboarding" signal. */
  | { kind: 'none' }
  /** Server answered but the row was unusable (bad shape). Keep whatever we already had. */
  | { kind: 'unusable' }
  /** Network/auth/transient failure. Never means "no plan". */
  | { kind: 'error'; message: string };

/** Pure classifier so the decision logic is testable without React or the network. */
export function classifyPlanResponse(res: { data: any; error: any }): PlanFetchResult {
  if (res.error) return { kind: 'error', message: res.error.message || 'Request failed' };
  if (res.data == null) return { kind: 'none' };
  const plan = rowToActivePlan(res.data);
  if (plan) return { kind: 'plan', plan };
  return { kind: 'unusable' };
}
