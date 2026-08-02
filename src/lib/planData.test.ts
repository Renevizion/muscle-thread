import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizePlanDays,
  classifyPlanResponse,
  readCachedActivePlan,
  writeCachedActivePlan,
  rowToActivePlan,
} from './planData';

const day = { id: 1, name: 'Push', type: 'training', exercises: [] };

describe('normalizePlanDays', () => {
  it('accepts a plain array', () => {
    expect(normalizePlanDays([day])).toHaveLength(1);
  });
  it('accepts { days }', () => {
    expect(normalizePlanDays({ days: [day] })).toHaveLength(1);
  });
  it('accepts a JSON string', () => {
    expect(normalizePlanDays(JSON.stringify({ days: [day] }))).toHaveLength(1);
  });
  it('accepts nested { plan: { days } }', () => {
    expect(normalizePlanDays({ plan: { days: [day] } })).toHaveLength(1);
  });
  it('accepts { weeks: [{ days }] }', () => {
    expect(normalizePlanDays({ weeks: [{ days: [day] }] })).toHaveLength(1);
  });
  it('accepts numeric-keyed objects', () => {
    expect(normalizePlanDays({ '1': day, '2': day })).toHaveLength(2);
  });
  it('returns [] for genuinely empty input', () => {
    expect(normalizePlanDays(null)).toEqual([]);
    expect(normalizePlanDays({})).toEqual([]);
    expect(normalizePlanDays('not json')).toEqual([]);
  });
});

describe('classifyPlanResponse — the "no plan" decision', () => {
  it('a network error is NEVER "no plan"', () => {
    expect(classifyPlanResponse({ data: null, error: { message: 'Failed to fetch' } }))
      .toEqual({ kind: 'error', message: 'Failed to fetch' });
  });

  it('an empty successful response is the only "none"', () => {
    expect(classifyPlanResponse({ data: null, error: null })).toEqual({ kind: 'none' });
  });

  it('a row with an unrecognised plan_data shape is "unusable", not "none"', () => {
    const res = classifyPlanResponse({ data: { id: 'a', name: 'X', plan_data: { junk: true } }, error: null });
    expect(res.kind).toBe('unusable');
  });

  it('a good row yields the plan', () => {
    const res = classifyPlanResponse({
      data: { id: 'a', name: 'X', plan_data: { days: [day] }, start_date: null, end_date: null, duration_weeks: 4 },
      error: null,
    });
    expect(res.kind).toBe('plan');
    if (res.kind === 'plan') expect(res.plan.plan_data).toHaveLength(1);
  });
});

describe('cache', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips for the same user only', () => {
    const plan = rowToActivePlan({ id: 'a', name: 'X', plan_data: [day] })!;
    writeCachedActivePlan('user-1', plan);
    expect(readCachedActivePlan('user-1')?.id).toBe('a');
    expect(readCachedActivePlan('user-2')).toBeNull();
  });

  it('survives a simulated slow/failed fetch (cache is not touched by classify)', () => {
    const plan = rowToActivePlan({ id: 'a', name: 'X', plan_data: [day] })!;
    writeCachedActivePlan('user-1', plan);
    classifyPlanResponse({ data: null, error: { message: 'timeout' } });
    expect(readCachedActivePlan('user-1')?.id).toBe('a');
  });
});
