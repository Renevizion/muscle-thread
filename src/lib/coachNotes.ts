import { supabase } from '@/integrations/supabase/client';

/**
 * Coach note persistence with an offline-safe outbox.
 *
 * Notes are the coach's long-term memory, so a failed insert (flaky mobile
 * network, expired session, backgrounded Safari tab) must never silently drop
 * the thought. Failed writes land in a per-user localStorage outbox and are
 * replayed the next time the app loads or another note is saved.
 */

export interface PendingNote {
  kind: 'note' | 'weight';
  content?: string | null;
  value?: number | null;
  unit?: string | null;
  created_at: string;
}

const queueKey = (userId: string) => `coach-note-outbox:${userId}`;

export function readOutbox(userId: string): PendingNote[] {
  try {
    const raw = localStorage.getItem(queueKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(userId: string, items: PendingNote[]) {
  try {
    if (items.length === 0) localStorage.removeItem(queueKey(userId));
    else localStorage.setItem(queueKey(userId), JSON.stringify(items));
  } catch {
    /* storage full / private mode — nothing else we can do */
  }
}

function enqueue(userId: string, note: PendingNote) {
  writeOutbox(userId, [...readOutbox(userId), note]);
}

/** Replays any queued notes. Returns how many were successfully synced. */
export async function flushOutbox(userId: string): Promise<number> {
  const pending = readOutbox(userId);
  if (pending.length === 0) return 0;

  const stillPending: PendingNote[] = [];
  let synced = 0;

  for (const note of pending) {
    const { error } = await supabase.from('coach_notes').insert({
      user_id: userId,
      kind: note.kind,
      content: note.content ?? null,
      value: note.value ?? null,
      unit: note.unit ?? null,
      created_at: note.created_at,
    });
    if (error) stillPending.push(note);
    else synced++;
  }

  writeOutbox(userId, stillPending);
  return synced;
}

export interface SaveResult {
  ok: boolean;
  queued: boolean;
}

/** Saves a note to the cloud; queues it locally if the write fails. */
export async function saveCoachNote(
  userId: string,
  note: Omit<PendingNote, 'created_at'> & { created_at?: string },
): Promise<SaveResult> {
  const payload: PendingNote = { ...note, created_at: note.created_at ?? new Date().toISOString() };

  const { error } = await supabase.from('coach_notes').insert({
    user_id: userId,
    kind: payload.kind,
    content: payload.content ?? null,
    value: payload.value ?? null,
    unit: payload.unit ?? null,
  });

  if (error) {
    enqueue(userId, payload);
    return { ok: false, queued: true };
  }
  return { ok: true, queued: false };
}
