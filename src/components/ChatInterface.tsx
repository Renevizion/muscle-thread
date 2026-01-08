import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Message, streamChat, parseWorkoutPlan } from '@/lib/streamChat';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatInterfaceProps {
  onPlanCreated: (plan: any) => void;
}

export function ChatInterface({ onPlanCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
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
      messages: [...messages, userMsg],
      onDelta: updateAssistant,
      onDone: async () => {
        setIsLoading(false);
        
        // Check if the response contains a complete workout plan
        const plan = parseWorkoutPlan(assistantContent);
        if (plan) {
          try {
            // Save to database
            const { data, error } = await supabase
              .from('workout_plans')
              .insert({
                name: plan.name,
                description: plan.description,
                duration_weeks: plan.duration_weeks,
                plan_data: plan.days,
                is_active: true
              })
              .select()
              .single();

            if (error) throw error;

            // Save conversation
            await supabase
              .from('plan_conversations')
              .insert({
                plan_id: data.id,
                messages: [...messages, userMsg, { role: 'assistant', content: assistantContent }]
              });

            toast.success('Workout plan saved! Switching to your new plan.');
            onPlanCreated(plan);
          } catch (e) {
            console.error('Failed to save plan:', e);
            toast.error('Failed to save plan. You can still use it.');
          }
        }
      },
      onError: (error) => {
        setIsLoading(false);
        toast.error(error);
      }
    });
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
        {messages.length === 0 ? (
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
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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

      {/* Input */}
      <div className="p-4 border-t border-border safe-bottom">
        <div className="flex items-end gap-2 bg-secondary rounded-2xl p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your fitness goals..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none px-2 py-2 max-h-[120px]"
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
