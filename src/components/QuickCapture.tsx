import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Lightbulb, Scale, Check, TrendingUp, TrendingDown, Minus, CloudOff, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { saveCoachNote, flushOutbox, readOutbox, type PendingNote } from '@/lib/coachNotes';
import { NotesLibrary } from './NotesLibrary';


export interface CoachNote {
  id: string;
  kind: 'note' | 'weight';
  content: string | null;
  value: number | null;
  unit: string | null;
  created_at: string;
}

interface QuickCaptureProps {
  onChange?: () => void;
}

/**
 * Frictionless capture: jot an idea for the coach or log bodyweight in one tap.
 * Everything here becomes persistent memory the AI reads on every conversation,
 * so the coach reasons across time instead of replanning from scratch.
 */
export function QuickCapture({ onChange }: QuickCaptureProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'idle' | 'note' | 'weight'>('idle');
  const [noteText, setNoteText] = useState('');
  const [weightText, setWeightText] = useState('');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [weights, setWeights] = useState<CoachNote[]>([]);
  const [pending, setPending] = useState<PendingNote[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    // Replay anything that failed to reach the cloud earlier (offline phone, etc.)
    const synced = await flushOutbox(user.id);
    if (synced > 0) toast.success(`${synced} offline note${synced > 1 ? 's' : ''} synced`);
    setPending(readOutbox(user.id).filter(p => p.kind === 'note'));

    const { data } = await supabase
      .from('coach_notes')
      .select('id, kind, content, value, unit, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(40);
    if (!data) return;
    setNotes(data.filter(n => n.kind === 'note') as CoachNote[]);
    setWeights(data.filter(n => n.kind === 'weight') as CoachNote[]);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Retry the outbox whenever the device regains connectivity.
  useEffect(() => {
    const onOnline = () => { load(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [load]);

  const saveNote = async () => {
    const text = noteText.trim();
    if (!user || !text) return;
    setSaving(true);
    const res = await saveCoachNote(user.id, { kind: 'note', content: text });
    setSaving(false);
    setNoteText('');
    setMode('idle');
    toast[res.ok ? 'success' : 'message'](
      res.ok ? 'Saved for your coach' : 'Saved offline — will sync automatically',
    );
    await load();
    onChange?.();
  };

  const saveWeight = async () => {
    const num = parseFloat(weightText);
    if (!user || Number.isNaN(num) || num <= 0) { toast.error('Enter a valid weight'); return; }
    setSaving(true);
    const res = await saveCoachNote(user.id, { kind: 'weight', value: num, unit: 'lbs' });
    setSaving(false);
    setWeightText('');
    setMode('idle');
    toast[res.ok ? 'success' : 'message'](
      res.ok ? 'Bodyweight logged' : 'Saved offline — will sync automatically',
    );
    await load();
    onChange?.();
  };


  const latestWeight = weights[0]?.value ?? null;
  const prevWeight = weights[1]?.value ?? null;
  const delta = latestWeight != null && prevWeight != null ? +(latestWeight - prevWeight).toFixed(1) : null;
  const daysSinceWeight = weights[0]
    ? Math.floor((Date.now() - new Date(weights[0].created_at).getTime()) / 86400000)
    : null;

  return (
    <div className="mb-4 space-y-2">
      {/* Trigger pills */}
      {mode === 'idle' && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('note')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-card border border-border text-sm font-medium text-foreground active:scale-[0.98] transition-transform"
          >
            <Lightbulb className="w-4 h-4 text-primary" />
            Jot an idea
          </button>
          <button
            onClick={() => setMode('weight')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-card border border-border text-sm font-medium text-foreground active:scale-[0.98] transition-transform"
          >
            <Scale className="w-4 h-4 text-primary" />
            {latestWeight != null ? (
              <span className="flex items-center gap-1">
                {latestWeight} lbs
                {delta != null && delta !== 0 && (
                  <span className={cn('flex items-center', delta > 0 ? 'text-orange-400' : 'text-emerald-400')}>
                    {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(delta)}
                  </span>
                )}
                {delta === 0 && <Minus className="w-3 h-3 text-muted-foreground" />}
              </span>
            ) : 'Log weight'}
          </button>
        </div>
      )}

      {/* Note input */}
      {mode === 'note' && (
        <div className="p-3 rounded-xl bg-gradient-card border border-border">
          <textarea
            autoFocus
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="e.g. shoulders felt tweak on incline, want more back volume, sleep's been bad…"
            rows={3}
            className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground resize-none outline-none"
            style={{ fontSize: '16px' }}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => { setMode('idle'); setNoteText(''); }} className="flex-1 py-2 rounded-lg bg-secondary text-sm font-medium">Cancel</button>
            <button onClick={saveNote} disabled={saving || !noteText.trim()} className={cn('flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5', noteText.trim() ? 'bg-gradient-fire text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              <Check className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      )}

      {/* Weight input */}
      {mode === 'weight' && (
        <div className="p-3 rounded-xl bg-gradient-card border border-border">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              value={weightText}
              onChange={e => setWeightText(e.target.value)}
              placeholder={latestWeight != null ? `${latestWeight}` : 'Bodyweight'}
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
              style={{ fontSize: '16px' }}
            />
            <span className="text-sm text-muted-foreground">lbs</span>
          </div>
          {latestWeight != null && daysSinceWeight != null && (
            <p className="text-xs text-muted-foreground mt-1">
              Last: {latestWeight} lbs {daysSinceWeight === 0 ? 'today' : `${daysSinceWeight}d ago`}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <button onClick={() => { setMode('idle'); setWeightText(''); }} className="flex-1 py-2 rounded-lg bg-secondary text-sm font-medium">Cancel</button>
            <button onClick={saveWeight} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-gradient-fire text-primary-foreground flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      )}

      {/* Recent notes peek — tap any chip to read the full note */}
      {mode === 'idle' && (notes.length > 0 || pending.length > 0) && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {pending.length > 0 && (
            <button
              onClick={() => setLibraryOpen(true)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/15 text-xs text-orange-400"
            >
              <CloudOff className="w-3 h-3" /> {pending.length} unsynced
            </button>
          )}
          {notes.slice(0, 4).map(n => (
            <button
              key={n.id}
              onClick={() => setLibraryOpen(true)}
              className="shrink-0 max-w-[200px] px-2.5 py-1.5 rounded-lg bg-secondary/60 text-xs text-muted-foreground truncate active:scale-[0.97] transition-transform"
            >
              {n.content}
            </button>
          ))}
          <button
            onClick={() => setLibraryOpen(true)}
            className="shrink-0 flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-secondary/60 text-xs font-medium text-primary"
          >
            All {notes.length + pending.length} <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {libraryOpen && (
        <NotesLibrary
          notes={notes}
          pending={pending}
          onClose={() => setLibraryOpen(false)}
          onChanged={() => { load(); onChange?.(); }}
        />
      )}
    </div>

  );
}
