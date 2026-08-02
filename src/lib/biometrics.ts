/**
 * Biometric Inference Pipeline.
 *
 * Converts unstructured casual activity ("jumped rope 15m, some pushups")
 * into a structured training-load score, detects multi-day deficits, and
 * classifies the reasons behind missed work (laziness vs fatigue vs health).
 *
 * These are pure functions — no I/O, no React — so they can run in the app,
 * in the edge function context builder, or in tests without change.
 */

export type Intensity = 'light' | 'medium' | 'hard';
export type CatchUpReason = 'busy' | 'tired' | 'sick' | 'travel' | 'lazy' | 'other';

export interface SubstituteInput {
  activity: string;
  durationMin: number;
  intensity: Intensity;
  reason?: string;
  forDate: string; // yyyy-mm-dd
}

export interface MissedInput {
  forDate: string;
  reason?: string;
}

/**
 * Base metabolic-equivalent weight per activity family (approx METs / 8,
 * normalized so a hard 45m session ≈ 1.0 "session-equivalent" of load).
 */
const ACTIVITY_MET: Array<{ match: RegExp; met: number }> = [
  { match: /run|sprint|jog/i, met: 9.0 },
  { match: /jump ?rope|skip/i, met: 11.0 },
  { match: /hik|climb/i, met: 7.0 },
  { match: /bike|cycl|spin/i, met: 7.5 },
  { match: /swim/i, met: 8.0 },
  { match: /pushup|push-up|pull ?up|dip|burpee|squat|lunge|plank|core|calisthenic/i, met: 6.0 },
  { match: /walk/i, met: 3.5 },
  { match: /yoga|stretch|mobility/i, met: 2.8 },
  { match: /lift|weight|gym|press|deadlift|bench/i, met: 6.0 },
];

const INTENSITY_MULT: Record<Intensity, number> = { light: 0.7, medium: 1.0, hard: 1.35 };

function baseMet(activity: string): number {
  const found = ACTIVITY_MET.find(a => a.match.test(activity));
  return found ? found.met : 5.0; // sane default for unknown movement
}

/**
 * Load score for a single substitute activity.
 * Roughly: (MET * intensity * hours), capped so a marathon entry can't
 * dwarf a whole month. 1.0 ≈ one solid planned session.
 */
export function substituteLoad(sub: SubstituteInput): number {
  const met = baseMet(sub.activity);
  const hours = Math.min(sub.durationMin, 120) / 60;
  const mult = INTENSITY_MULT[sub.intensity] ?? 1.0;
  const raw = (met * mult * hours) / 6.75; // 6.75 = hard 45m calisthenics baseline
  return +Math.min(raw, 2).toFixed(2);
}

export interface MonthLoad {
  substituteLoad: number;      // total session-equivalents from catch-ups
  plannedSessions: number;
  completedSessions: number;
  missedCount: number;
  /** Real training work delivered vs planned, 0-100. Counts substitutes partially. */
  executionScore: number;
  /** Blended monthly fitness score 0-100 including catch-up credit. */
  monthlyScore: number;
}

export function computeMonthLoad(args: {
  plannedSessions: number;
  completedSessions: number;
  substitutes: SubstituteInput[];
  missed: MissedInput[];
}): MonthLoad {
  const subLoad = args.substitutes.reduce((s, x) => s + substituteLoad(x), 0);
  const planned = Math.max(1, args.plannedSessions);
  const effectiveSessions = args.completedSessions + subLoad;
  const executionScore = Math.round(Math.min(100, (effectiveSessions / planned) * 100));
  // Monthly score gives full weight to completed, ~70% credit to substitute load.
  const blended = args.completedSessions + subLoad * 0.7;
  const monthlyScore = Math.round(Math.min(100, (blended / planned) * 100));
  return {
    substituteLoad: +subLoad.toFixed(2),
    plannedSessions: args.plannedSessions,
    completedSessions: args.completedSessions,
    missedCount: args.missed.length,
    executionScore,
    monthlyScore,
  };
}

export type DeficitState = 'aligned' | 'minor' | 'catchup';

export interface DeficitReport {
  state: DeficitState;
  consecutiveMissed: number;
  /** Suggested volume dampening 0 (none) .. 0.3 (30% down) for re-entry safety. */
  loadDampening: number;
  needsReEntry: boolean;
  message: string;
}

/**
 * Active volume self-correction. Detects a run of missed/idle days and
 * recommends a protected re-entry ramp instead of full peak volume.
 */
export function assessDeficit(args: {
  lastActivityDate: string | null; // yyyy-mm-dd of last completed/substitute
  missed: MissedInput[];
  today?: string;
}): DeficitReport {
  const today = args.today ?? new Date().toISOString().split('T')[0];
  // No activity on record yet (brand-new plan / fresh account) is NOT a deficit.
  // Defaulting to a huge number here made the coach claim "you've been off 99 days".
  if (!args.lastActivityDate) {
    return {
      state: args.missed.length >= 4 ? 'catchup' : args.missed.length >= 2 ? 'minor' : 'aligned',
      consecutiveMissed: args.missed.length,
      loadDampening: args.missed.length >= 4 ? 0.3 : args.missed.length >= 2 ? 0.1 : 0,
      needsReEntry: args.missed.length >= 4,
      message:
        args.missed.length === 0
          ? 'No sessions logged yet — nothing to catch up on.'
          : `${args.missed.length} missed day(s) logged and no completed work yet.`,
    };
  }
  const daysSince = Math.floor(
    (new Date(today).getTime() - new Date(args.lastActivityDate).getTime()) / 86400000,
  );
  const consecutiveMissed = Math.max(daysSince, args.missed.length);

  if (consecutiveMissed >= 4) {
    return {
      state: 'catchup',
      consecutiveMissed,
      loadDampening: 0.3,
      needsReEntry: true,
      message:
        `You've been off for ${consecutiveMissed} days. Starting back at full volume risks strain — ` +
        `next session runs at 70% load to protect joints, then ramps up.`,
    };
  }
  if (consecutiveMissed >= 2) {
    return {
      state: 'minor',
      consecutiveMissed,
      loadDampening: 0.1,
      needsReEntry: false,
      message: `Short gap (${consecutiveMissed} days). Ease in — slightly lighter first set.`,
    };
  }
  return {
    state: 'aligned',
    consecutiveMissed,
    loadDampening: 0,
    needsReEntry: false,
    message: 'On schedule.',
  };
}

/**
 * Laziness-vs-fatigue classification. Reads missed/substitute reasons over
 * time and flags systemic overtraining vs motivation dips.
 */
export function classifyReasons(reasons: (string | undefined)[]): {
  dominant: CatchUpReason | null;
  overtrainingRisk: boolean;
  summary: string;
} {
  const counts: Record<string, number> = {};
  for (const r of reasons) {
    if (!r) continue;
    counts[r] = (counts[r] ?? 0) + 1;
  }
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominant = (entries[0]?.[0] as CatchUpReason) ?? null;
  const health = (counts['sick'] ?? 0) + (counts['tired'] ?? 0);
  const overtrainingRisk = health >= 3;

  let summary = 'No clear pattern yet.';
  if (overtrainingRisk) {
    summary = 'Repeated tired/sick flags — systemic fatigue risk. An active-recovery day is warranted.';
  } else if (dominant === 'lazy') {
    summary = 'Mostly motivation dips — accountability nudges help more than rest.';
  } else if (dominant === 'busy' || dominant === 'travel') {
    summary = 'Life/schedule friction — shorter, flexible sessions fit better.';
  } else if (dominant) {
    summary = `Most misses tagged "${dominant}".`;
  }
  return { dominant, overtrainingRisk, summary };
}
