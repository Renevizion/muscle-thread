import { useState, useEffect } from 'react';
import { Plus, MessageSquare, Calendar, HelpCircle, Trash2, X } from 'lucide-react';
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
  onSelectThread: (threadId: string | null) => void;
  onNewThread: (type: 'plan' | 'advice' | 'general') => void;
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
  onNewThread 
}: ChatThreadsSidebarProps) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && isOpen) {
      loadThreads();
    }
  }, [user, isOpen]);

  const loadThreads = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('plan_conversations')
      .select('id, title, type, updated_at, plan_id')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (!error && data) {
      setThreads(data.map(t => ({
        ...t,
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
      onSelectThread(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-background border-r border-border z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
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
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : threads.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No conversations yet.<br />Start a new chat above!
            </div>
          ) : (
            threads.map(thread => {
              const Icon = typeIcons[thread.type];
              return (
                <button
                  key={thread.id}
                  onClick={() => {
                    onSelectThread(thread.id);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors group",
                    currentThreadId === thread.id 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{thread.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[thread.type]} · {format(new Date(thread.updated_at), 'MMM d')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteThread(thread.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
