import { supabase } from '@/integrations/supabase/client';

/**
 * Month-end prompt decisions.
 *
 * Previously local-only, so the prompt reappeared on any other device, after a
 * cache clear, or after localStorage was evicted — which read as "it keeps
 * coming back even though I already answered".
 *
 * Now: written to `coach_notes` (kind = 'month_decision') so the decision is
 * durable and account-wide, with localStorage kept purely as an offline mirror.
 */

export type MonthDecisionAction = 'new' | 'revise' | 'continue' | 'review' | 'later';

export interface MonthDecision {
  planId: string;
  endDate: string;
  action: MonthDecisionAction;
  at: number;
}

const LOCAL_KEY = 'monthly-prompt-decision-v3';
const SNOOZE_DAYS = 5;

function readLocal(): MonthDecision[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(list: MonthDecision[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-40)));
  } catch {
    /* ignore */
  }
}

export function mergeLocal(decision: MonthDecision) {
  const next = readLocal().filter(
    d => !(d.planId === decision.planId && d.endDate === decision.endDate),
  );
  next.push(decision);
  writeLocal(next);
}

/** True when this exact plan + end-date has already been answered (a bare dismiss only snoozes). */
export function isSilenced(list: MonthDecision[], planId: string, endDate: string): boolean {
  const d = list.find(x => x.planId === planId && x.endDate === endDate);
  if (!d) return false;
  if (d.action !== 'later') return true;
  return Date.now() - d.at < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}

/** Local mirror + server rows, deduped. Server wins on conflicts. */
export async function loadDecisions(userId: string | undefined): Promise<MonthDecision[]> {
  const local = readLocal();
  if (!userId) return local;

  const { data, error } = await supabase
    .from('coach_notes')
    .select('content, created_at')
    .eq('user_id', userId)
    .eq('kind', 'month_decision')
    .order('created_at', { ascending: false })
    .limit(60);

  if (error || !data) return local;

  const remote: MonthDecision[] = [];
  for (const row of data) {
    try {
      const parsed = JSON.parse(row.content || '{}');
      if (parsed?.planId && parsed?.endDate && parsed?.action) {
        remote.push({
          planId: parsed.planId,
          endDate: parsed.endDate,
          action: parsed.action,
          at: new Date(row.created_at).getTime(),
        });
      }
    } catch {
      /* skip malformed */
    }
  }

  const byKey = new Map<string, MonthDecision>();
  for (const d of [...local, ...remote]) {
    const key = `${d.planId}|${d.endDate}`;
    const existing = byKey.get(key);
    if (!existing || d.at > existing.at) byKey.set(key, d);
  }
  const merged = [...byKey.values()];
  writeLocal(merged);
  return merged;
}

export async function saveDecision(
  userId: string | undefined,
  planId: string,
  endDate: string,
  action: MonthDecisionAction,
): Promise<void> {
  const decision: MonthDecision = { planId, endDate, action, at: Date.now() };
  mergeLocal(decision);
  if (!userId) return;
  await supabase.from('coach_notes').insert({
    user_id: userId,
    kind: 'month_decision',
    content: JSON.stringify({ planId, endDate, action }),
  });
}
