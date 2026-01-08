-- Add user_id to workout_plans
ALTER TABLE public.workout_plans 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to plan_conversations  
ALTER TABLE public.plan_conversations
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow public access to workout plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Allow public access to conversations" ON public.plan_conversations;

-- Create user-specific policies for workout_plans
CREATE POLICY "Users can view their own workout plans" 
ON public.workout_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout plans" 
ON public.workout_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout plans" 
ON public.workout_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout plans" 
ON public.workout_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create user-specific policies for plan_conversations
CREATE POLICY "Users can view their own conversations" 
ON public.plan_conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" 
ON public.plan_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.plan_conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
ON public.plan_conversations 
FOR DELETE 
USING (auth.uid() = user_id);