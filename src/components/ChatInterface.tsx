import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Check } from 'lucide-react';
import { Message, streamChat, parseWorkoutPlan } from '@/lib/streamChat';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OnboardingData } from './onboarding/OnboardingFlow';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  onPlanCreated: (plan: any) => void;
  initialContext?: OnboardingData;
  conversationId?: string | null;
  planId?: string | null;
}

export function ChatInterface({ onPlanCreated, initialContext, conversationId, planId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const [pendingPlan, setPendingPlan] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const hasLoadedHistory = useRef(false);
  const hasGeneratedInitialMessage = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Load conversation history
  useEffect(() => {
    const loadHistory = async () => {
      if (!user || hasLoadedHistory.current) return;
      hasLoadedHistory.current = true;

      // If we have a specific conversation ID, load that
      if (conversationId) {
        const { data } = await supabase
          .from('plan_conversations')
          .select('messages')
          .eq('id', conversationId)
          .single();
        
        if (data?.messages) {
          setMessages(data.messages as Message[]);
          setCurrentConversationId(conversationId);
        }
        return;
      }

      // Otherwise load most recent conversation
      const { data } = await supabase
        .from('plan_conversations')
        .select('id, messages')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.messages && (data.messages as any[]).length > 0) {
        setMessages(data.messages as Message[]);
        setCurrentConversationId(data.id);
      }
    };

    loadHistory();
  }, [user, conversationId]);

  // Auto-generate initial message from onboarding context
  useEffect(() => {
    if (initialContext && !hasGeneratedInitialMessage.current && messages.length === 0) {
      hasGeneratedInitialMessage.current = true;
      
      const contextMessage = buildContextMessage(initialContext);
      sendMessageWithContent(contextMessage);
    }
  }, [initialContext, messages.length]);

  const buildContextMessage = (data: OnboardingData): string => {
    const goalMap: Record<string, string> = {
      'mass': 'building muscle mass',
      'strength': 'getting stronger',
      'fat-loss': 'losing fat while maintaining muscle',
      'athletic': 'improving athletic performance',
      'general': 'general fitness and health',
    };

    const equipmentMap: Record<string, string> = {
      'full-gym': 'a full commercial gym',
      'home-equipped': 'a home gym with dumbbells, barbell, bench, and pull-up bar',
      'minimal': 'minimal equipment (bodyweight and resistance bands)',
    };

    const focusLabels: Record<string, string> = {
      'chest': 'chest',
      'back': 'back',
      'shoulders': 'shoulders',
      'arms': 'arms (biceps/triceps)',
      'legs': 'legs (quads/hamstrings)',
      'glutes': 'glutes',
      'calves': 'calves',
      'traps': 'traps/upper back',
      'core': 'core/abs',
      'forearms': 'forearms/grip strength',
      'pull-ups': 'pull-ups/muscle-ups',
      'handstand': 'handstands',
      'pistol-squat': 'pistol squats',
      'l-sit': 'L-sits',
      'planche': 'planche/front lever progressions',
    };

    const constraintLabels: Record<string, string> = {
      'back-injury': 'back issues/injury history',
      'shoulder-injury': 'shoulder problems',
      'knee-injury': 'knee issues',
      'wrist-injury': 'wrist/elbow issues',
      'hip-injury': 'hip mobility limitations',
      'recovery': 'slower recovery needs',
      'beginner': 'new to lifting (need form focus)',
      'cardio-poor': 'poor cardiovascular conditioning',
      'time-limited': 'limited time some days',
      'travel': 'frequent travel',
    };

    let message = `I'm ${data.age} years old and my main goal is ${goalMap[data.primaryGoal] || data.primaryGoal}. `;
    
    if (data.secondaryGoals.length > 0) {
      message += `I'm also interested in ${data.secondaryGoals.join(', ')}. `;
    }

    message += `I have access to ${equipmentMap[data.equipment] || data.equipment}. `;
    message += `I can train ${data.daysPerWeek} days per week with ${data.sessionLength} minute sessions. `;

    if (data.focusAreas.length > 0) {
      const focuses = data.focusAreas.map(f => focusLabels[f] || f);
      message += `I want to especially focus on ${focuses.join(', ')}. `;
    }

    if (data.constraints.length > 0) {
      const constraints = data.constraints.map(c => constraintLabels[c] || c);
      message += `Please keep in mind I have: ${constraints.join(', ')}. `;
    }

    if (data.additionalNotes.trim()) {
      message += `Additional notes: ${data.additionalNotes}`;
    }

    message += '\n\nPlease create a personalized workout plan for me.';

    return message;
  };

  const saveConversation = async (newMessages: Message[]) => {
    if (!user) return;

    try {
      if (currentConversationId) {
        // Update existing conversation
        await supabase
          .from('plan_conversations')
          .update({ 
            messages: newMessages,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentConversationId);
      } else {
        // Create new conversation
        const { data, error } = await supabase
          .from('plan_conversations')
          .insert({
            user_id: user.id,
            plan_id: planId || null,
            messages: newMessages
          })
          .select('id')
          .single();

        if (data && !error) {
          setCurrentConversationId(data.id);
        }
      }
    } catch (e) {
      console.error('Failed to save conversation:', e);
    }
  };

  const sendMessageWithContent = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    await streamChat({
      messages: newMessages,
      onDelta: updateAssistant,
      onDone: async () => {
        setIsLoading(false);
        
        const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: assistantContent }];
        setMessages(finalMessages);
        await saveConversation(finalMessages);
        
        const plan = parseWorkoutPlan(assistantContent);
        if (plan) {
          setPendingPlan(plan);
        }
      },
      onError: (error) => {
        setIsLoading(false);
        toast.error(error);
      }
    });
  };

  const sendMessage = async () => {
    await sendMessageWithContent(input);
  };

  const handleApplyPlan = async () => {
    if (!pendingPlan || !user) return;

    try {
      // Deactivate existing plans
      await supabase
        .from('workout_plans')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Save new plan
      const { data, error } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          name: pendingPlan.name,
          description: pendingPlan.description,
          duration_weeks: pendingPlan.duration_weeks,
          plan_data: pendingPlan.days,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Link conversation to plan
      if (currentConversationId) {
        await supabase
          .from('plan_conversations')
          .update({ plan_id: data.id })
          .eq('id', currentConversationId);
      }

      toast.success('Workout plan activated!');
      setPendingPlan(null);
      onPlanCreated(pendingPlan);
    } catch (e) {
      console.error('Failed to save plan:', e);
      toast.error('Failed to save plan');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedPrompts = [
    "I want to build muscle and focus on my legs and traps",
    "Create a 4-day split for strength and hypertrophy",
    "I'm a beginner with access to a full gym"
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !initialContext ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-fire flex items-center justify-center mb-4 shadow-glow">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Build Your Plan</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Tell me about your fitness goals and I'll create a personalized workout program for you.
            </p>
            
            <div className="space-y-2 w-full max-w-xs">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="w-full text-left p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  msg.role === 'user' 
                    ? 'bg-gradient-fire text-primary-foreground' 
                    : 'bg-secondary text-foreground'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none text-sm [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-lg [&>h2]:text-base [&>h3]:text-sm [&>*:last-child]:mb-0">
                    <ReactMarkdown>{msg.content.replace(/```WORKOUT_PLAN_JSON[\s\S]*?```/g, '')}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Pending Plan Banner */}
      {pendingPlan && (
        <div className="px-4 py-3 border-t border-border bg-secondary/50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display font-semibold text-sm">Plan ready: {pendingPlan.name}</p>
              <p className="text-xs text-muted-foreground">Apply it to start your program</p>
            </div>
            <button
              onClick={handleApplyPlan}
              className="px-4 py-2 bg-gradient-fire text-primary-foreground rounded-xl font-display font-semibold text-sm flex items-center gap-2 shadow-glow"
            >
              <Check className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Input - fixed at bottom with proper safe area handling */}
      <div 
        className="sticky bottom-0 left-0 right-0 p-4 border-t border-border bg-background"
        style={{ 
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-end gap-2 bg-secondary rounded-2xl p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your fitness goals..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none px-2 py-2 max-h-[120px]"
            style={{ fontSize: '16px' }}
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
              input.trim() && !isLoading
                ? "bg-gradient-fire shadow-glow"
                : "bg-muted"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <Send className={cn(
                "w-5 h-5",
                input.trim() ? "text-primary-foreground" : "text-muted-foreground"
              )} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
