import { useState } from 'react';
import { ChevronDown, Plus, Activity, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SubstituteIntensity = 'light' | 'medium' | 'hard';
export type CatchUpReason = 'busy' | 'tired' | 'sick' | 'travel' | 'lazy' | 'other';

export interface SubstituteEntry {
  activity: string;
  durationMin: number;
  intensity: SubstituteIntensity;
  reason?: CatchUpReason;
  forDate: string; // yyyy-mm-dd
  note?: string;
}

interface RecentSub {
  activity: string;
  durationMin: number;
  intensity: SubstituteIntensity;
  forDate: string;
}

interface Props {
  recent?: RecentSub[];
  onLogSubstitute: (entry: SubstituteEntry) => Promise<void> | void;
  onMarkSlacked: (date: string, reason: CatchUpReason) => Promise<void> | void;
}

const INTENSITIES: { id: SubstituteIntensity; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const REASONS: { id: CatchUpReason; label: string }[] = [
  { id: 'busy', label: 'Busy' },
  { id: 'tired', label: 'Tired' },
  { id: 'sick', label: 'Sick' },
  { id: 'travel', label: 'Travel' },
  { id: 'lazy', label: 'Lazy' },
  { id: 'other', label: 'Other' },
];

function lastNDays(n: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const value = d.toISOString().split('T')[0];
    const label =
      i === 0 ? 'Today' :
      i === 1 ? 'Yesterday' :
      d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    out.push({ value, label });
  }
  return out;
}

export function CatchUpInline({ recent = [], onLogSubstitute, onMarkSlacked }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'sub' | 'slack'>('sub');
  const [activity, setActivity] = useState('');
  const [durationMin, setDurationMin] = useState<number | ''>('');
  const [intensity, setIntensity] = useState<SubstituteIntensity>('medium');
  const [reason, setReason] = useState<CatchUpReason>('busy');
  const [forDate, setForDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const days = lastNDays(8);

  const reset = () => {
    setActivity('');
    setDurationMin('');
    setIntensity('medium');
    setReason('busy');
    setNote('');
    setForDate(new Date().toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (mode === 'sub') {
        if (!activity.trim() || !durationMin) return;
        await onLogSubstitute({
          activity: activity.trim(),
          durationMin: Number(durationMin),
          intensity,
          reason,
          forDate,
          note: note.trim() || undefined,
        });
      } else {
        await onMarkSlacked(forDate, reason);
      }
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Did something else? Log it.</p>
          <p className="text-xs text-muted-foreground truncate">
            {recent.length > 0
              ? `${recent.length} catch-up${recent.length > 1 ? 's' : ''} this month — pushups, walks, jump rope all count.`
              : 'Pushups, walks, jump rope, hike — counted toward your month.'}
          </p>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
          {/* Mode switch */}
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('sub')}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded-md',
                mode === 'sub' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              I did something
            </button>
            <button
              type="button"
              onClick={() => setMode('slack')}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded-md',
                mode === 'slack' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              )}
            >
              I missed it
            </button>
          </div>

          {/* Date */}
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">For day</p>
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
              {days.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForDate(d.value)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border',
                    forDate === d.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'sub' && (
            <>
              <input
                value={activity}
                onChange={e => setActivity(e.target.value)}
                placeholder="What did you do? (jump rope, pushups, hike…)"
                className="w-full bg-secondary rounded-lg px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary/40"
              />

              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={durationMin}
                  onChange={e => setDurationMin(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Minutes"
                  className="w-28 bg-secondary rounded-lg px-3 py-2 text-base outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="flex-1 flex gap-1 bg-secondary rounded-lg p-1">
                  {INTENSITIES.map(i => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setIntensity(i.id)}
                      className={cn(
                        'flex-1 py-1.5 text-xs font-medium rounded-md',
                        intensity === i.id ? 'bg-background shadow-sm' : 'text-muted-foreground'
                      )}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Reason */}
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
              {mode === 'sub' ? 'Why not the planned workout?' : 'Why did you miss it?'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border',
                    reason === r.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'sub' && (
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full bg-secondary rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (mode === 'sub' && (!activity.trim() || !durationMin))}
            className={cn(
              'w-full py-2.5 rounded-lg font-display font-semibold text-sm flex items-center justify-center gap-2',
              'bg-gradient-fire text-primary-foreground shadow-glow',
              'disabled:opacity-50 disabled:shadow-none'
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {mode === 'sub' ? 'Log activity' : 'Mark missed'}
          </button>

          {recent.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Recent catch-ups</p>
              <ul className="space-y-1.5">
                {recent.slice(0, 4).map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="font-medium truncate">{r.activity}</span>
                    <span className="text-muted-foreground">· {r.durationMin}m · {r.intensity}</span>
                    <span className="ml-auto text-muted-foreground">{r.forDate.slice(5)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
