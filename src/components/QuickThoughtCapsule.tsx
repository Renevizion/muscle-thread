import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Zap, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { saveCoachNote } from '@/lib/coachNotes';


/**
 * Floating Quick-Thought Capsule.
 *
 * A persistent, zero-friction overlay resting at the viewport edge. Tap it,
 * dump a fleeting training thought, and it streams straight into the coach's
 * core memory (coach_notes) before you forget it mid-workout. The generation
 * loop ingests these notes recursively on the next plan.
 */
export function QuickThoughtCapsule({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const save = async () => {
    const content = text.trim();
    if (!content) return;
    setSaving(true);
    const { error } = await supabase.from('coach_notes').insert({
      user_id: user.id, kind: 'note', content,
    });
    setSaving(false);
    if (error) { toast.error('Could not save'); return; }
    setText('');
    setOpen(false);
    toast.success('Saved to your coach');
    onSaved?.();
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Capture a quick thought for your coach"
          onClick={() => setOpen(true)}
          className="fixed z-50 right-4 bg-gradient-fire text-primary-foreground shadow-glow rounded-full w-13 h-13 flex items-center justify-center active:scale-95 transition-transform"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)', width: '3.25rem', height: '3.25rem' }}
        >
          <Zap className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-card border border-border p-4 shadow-2xl"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-semibold">Quick thought for your coach</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. left knee tweaked on squats, skip a bit… want more arm volume…"
              rows={3}
              className="w-full bg-secondary rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-primary/40"
              style={{ fontSize: '16px' }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !text.trim()}
              className={cn(
                'mt-3 w-full py-2.5 rounded-lg font-display font-semibold text-sm flex items-center justify-center gap-2',
                'bg-gradient-fire text-primary-foreground shadow-glow disabled:opacity-50 disabled:shadow-none',
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save to memory
            </button>
          </div>
        </div>
      )}
    </>
  );
}
