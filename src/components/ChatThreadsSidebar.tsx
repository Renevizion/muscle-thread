import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Calendar, HelpCircle, Trash2, X, Pencil, Check, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ChatThread {
  id: string;
  title: string;
  type: 'plan' | 'advice' | 'general';
  updated_at: string;
  plan_id: string | null;
}

interface ChatThreadsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentThreadId: string | null;
  onSelectThread: (threadId: string | null, type: 'plan' | 'advice' | 'general') => void;
  onNewThread: (type: 'plan' | 'advice' | 'general') => void;
  activePlanId?: string | null;
}

const typeIcons = {
  plan: Calendar,
  advice: HelpCircle,
  general: MessageSquare,
};

const typeLabels = {
  plan: 'Plan Chat',
  advice: 'Advice',
  general: 'General',
};

export function ChatThreadsSidebar({ 
  isOpen, 
  onClose, 
  currentThreadId, 
  onSelectThread,
  onNewThread,
  activePlanId
}: ChatThreadsSidebarProps) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activePlanThreadId, setActivePlanThreadId] = useState<string | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      loadThreads();
    }
  }, [user, isOpen]);

  const loadThreads = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('plan_conversations')
      .select('id, title, type, updated_at, plan_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (!error && data) {
      setThreads(data.map(t => ({
        ...t,
        title: t.title || 'New Chat',
        type: (t.type as 'plan' | 'advice' | 'general') || 'general'
      })));
    }
    setLoading(false);
  };

  const deleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    
    await supabase
      .from('plan_conversations')
      .delete()
      .eq('id', threadId);
    
    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (currentThreadId === threadId) {
      onSelectThread(null, 'general');
    }
  };

  const startEditing = (thread: ChatThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(thread.id);
    setEditTitle(thread.title);
  };

  const saveTitle = async (threadId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editTitle.trim()) return;
    
    await supabase
      .from('plan_conversations')
      .update({ title: editTitle.trim() })
      .eq('id', threadId);
    
    setThreads(prev => prev.map(t => 
      t.id === threadId ? { ...t, title: editTitle.trim() } : t
    ));
    setEditingId(null);
  };

  const handleThreadClick = (thread: ChatThread) => {
    onSelectThread(thread.id, thread.type);
    onClose();
  };

  useEffect(() => {
    const resolveActivePlanThread = async () => {
      if (!user || !activePlanId) {
        setActivePlanThreadId(null);
        return;
      }

      const candidates = threads.filter(t => t.plan_id === activePlanId);
      if (candidates.length === 0) {
        setActivePlanThreadId(null);
        return;
      }

      if (candidates.length === 1) {
        setActivePlanThreadId(candidates[0].id);
        return;
      }

      // If multiple chats are linked to the active plan (historical bug), pick the one that
      // actually contains a generated plan, then auto-clear the others.
      const ids = candidates.map(c => c.id);
      const { data } = await supabase
        .from('plan_conversations')
        .select('id, messages, updated_at')
        .eq('user_id', user.id)
        .in('id', ids);

      if (!data || data.length === 0) return;

      const hasPlanJson = (messages: any) =>
        Array.isArray(messages) &&
        messages.some((m: any) => typeof m?.content === 'string' && m.content.includes('WORKOUT_PLAN_JSON'));

      const ranked = [...data].sort((a, b) => {
        const aScore = hasPlanJson(a.messages) ? 1 : 0;
        const bScore = hasPlanJson(b.messages) ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      const winner = ranked[0];
      if (!winner) return;

      setActivePlanThreadId(winner.id);

      await supabase
        .from('plan_conversations')
        .update({ plan_id: null })
        .eq('user_id', user.id)
        .eq('plan_id', activePlanId)
        .neq('id', winner.id);

      setThreads(prev =>
        prev.map(t =>
          t.plan_id === activePlanId && t.id !== winner.id
            ? { ...t, plan_id: null }
            : t
        )
      );
    };

    if (isOpen && threads.length) {
      resolveActivePlanThread();
    }
  }, [user, activePlanId, threads, isOpen]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] transition-opacity duration-200",
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-80 bg-background border-r border-border flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between safe-top">
          <h2 className="font-display font-bold text-lg">Conversations</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Buttons */}
        <div className="p-3 space-y-2 border-b border-border">
          <button
            onClick={() => onNewThread('plan')}
            className="w-full flex items-center gap-3 p-3 bg-gradient-fire text-primary-foreground rounded-xl font-display font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            New Plan Chat
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onNewThread('advice')}
              className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-sm transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Advice
            </button>
            <button
              onClick={() => onNewThread('general')}
              className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              General
            </button>
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-1">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : threads.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No conversations yet.<br />Start a new chat above!
            </div>
          ) : (
            threads.map(thread => {
              const Icon = typeIcons[thread.type];
              const isActivePlanThread = !!activePlanThreadId && thread.id === activePlanThreadId;

              return (
                <button
                  key={thread.id}
                  onClick={() => handleThreadClick(thread)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors group",
                    currentThreadId === thread.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-secondary"
                  )}
                >
                  <div className="relative shrink-0">
                    <Icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    {isActivePlanThread && (
                      <Crown className="w-3 h-3 text-warning absolute -top-1.5 -right-1.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === thread.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(thread.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full text-sm font-medium bg-secondary px-2 py-1 rounded border border-border focus:outline-none focus:border-primary"
                        autoFocus
                        style={{ fontSize: '16px' }}
                      />
                    ) : (
                      <>
                        <p className="text-sm font-medium truncate flex items-center gap-1.5">
                          {thread.title}
                          {isActivePlanThread && (
                            <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-semibold">
                              ACTIVE
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabels[thread.type]} · {format(new Date(thread.updated_at), 'MMM d')}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {editingId === thread.id ? (
                      <button
                        onClick={(e) => saveTitle(thread.id, e)}
                        className="p-1 hover:bg-primary/20 rounded"
                      >
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => startEditing(thread, e)}
                        className="p-1 hover:bg-secondary rounded"
                      >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      onClick={(e) => deleteThread(thread.id, e)}
                      className="p-1 hover:bg-destructive/20 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
