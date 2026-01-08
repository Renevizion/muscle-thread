-- Add date fields to workout_plans for monthly lifecycle
ALTER TABLE public.workout_plans 
ADD COLUMN start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month')::DATE;

-- Add type and title to plan_conversations for thread categorization
ALTER TABLE public.plan_conversations 
ADD COLUMN title TEXT DEFAULT 'New Chat',
ADD COLUMN type TEXT DEFAULT 'general' CHECK (type IN ('plan', 'advice', 'general'));

-- Create workout_logs table for granular progress tracking
CREATE TABLE public.workout_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  workout_day TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  sets_completed INTEGER DEFAULT 0,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on workout_logs
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for workout_logs
CREATE POLICY "Users can view their own workout logs"
ON public.workout_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout logs"
ON public.workout_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs"
ON public.workout_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs"
ON public.workout_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_workout_logs_user_plan ON public.workout_logs(user_id, plan_id);
CREATE INDEX idx_workout_logs_logged_at ON public.workout_logs(logged_at);
CREATE INDEX idx_plan_conversations_user_type ON public.plan_conversations(user_id, type);