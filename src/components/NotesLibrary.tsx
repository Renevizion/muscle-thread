import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Trash2, Copy, Check, CloudOff, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import type { CoachNote } from './QuickCapture';
import type { PendingNote } from '@/lib/coachNotes';

interface NotesLibraryProps {
  notes: CoachNote[];
  pending: PendingNote[];
  onClose: () => void;
  onChanged: () => void;
}

function fmt(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Full-text note library. Chips in QuickCapture truncate, so this is where a
 * jotted thought can actually be read back, copied into chat, or deleted.
 */
export function NotesLibrary({ notes, pending, onClose, onChanged }: NotesLibraryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('coach_notes').delete().eq('id', id);
    if (error) { toast.error('Could not delete'); return; }
    toast.success('Note deleted');
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md max-h-[85dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold text-base">Your notes</h2>
            <span className="text-xs text-muted-foreground">{notes.length + pending.length}</span>
          </div>
          <button onClick={onClose} aria-label="Close notes" className="p-1 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-2 min-h-0">
          {pending.map((p, i) => (
            <div key={`pending-${i}`} className="p-3 rounded-xl bg-secondary/40 border border-dashed border-border">
              <div className="flex items-center gap-1.5 text-[11px] text-orange-400 mb-1">
                <CloudOff className="w-3 h-3" /> Waiting to sync
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{p.content}</p>
            </div>
          ))}

          {notes.map(n => (
            <div key={n.id} className="p-3 rounded-xl bg-secondary/60 border border-border">
              <p className="text-[11px] text-muted-foreground mb-1">{fmt(n.created_at)}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{n.content}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => copy(n.id, n.content || '')}
                  className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md bg-background/50"
                >
                  {copiedId === n.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedId === n.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => remove(n.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md bg-background/50"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}

          {notes.length === 0 && pending.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No notes yet. Jot anything — your coach reads them all.</p>
          )}
        </div>
      </div>
    </div>
  );
}
