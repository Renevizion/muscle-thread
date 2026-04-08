ALTER TABLE public.workout_logs 
ADD COLUMN IF NOT EXISTS reps_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight_used numeric DEFAULT 0;