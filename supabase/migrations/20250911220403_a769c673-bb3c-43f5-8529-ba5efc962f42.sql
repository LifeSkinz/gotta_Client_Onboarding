-- Schema Cleanup and Consolidation Migration
-- Phase 1: Critical ID Cleanup and Data Integrity

-- First, let's create the new session_video_details table
CREATE TABLE public.session_video_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  video_room_id TEXT,
  video_join_url TEXT,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

-- Enable RLS on session_video_details
ALTER TABLE public.session_video_details ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for session_video_details
CREATE POLICY "System can manage session video details" 
ON public.session_video_details 
FOR ALL 
USING (true);

CREATE POLICY "Users can view video details for their sessions" 
ON public.session_video_details 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.sessions 
  WHERE sessions.id = session_video_details.session_id 
  AND sessions.client_id = auth.uid()
));

-- Migrate existing video data from sessions to session_video_details
INSERT INTO public.session_video_details (session_id, video_room_id, video_join_url)
SELECT id, video_room_id, video_join_url 
FROM public.sessions 
WHERE video_room_id IS NOT NULL OR video_join_url IS NOT NULL;

-- Create consolidated session_analytics table
CREATE TABLE public.session_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  coach_id UUID,
  
  -- From session_outcomes
  session_satisfaction_rating INTEGER,
  goal_achievement_rating INTEGER,
  coach_effectiveness_rating INTEGER,
  follow_up_needed BOOLEAN DEFAULT false,
  key_breakthroughs TEXT[],
  challenges_faced TEXT[],
  action_items TEXT[],
  follow_up_notes TEXT,
  
  -- From session_goals_tracking
  goal_category TEXT,
  goal_description TEXT,
  initial_assessment INTEGER,
  final_assessment INTEGER,
  progress_notes TEXT,
  barriers_identified TEXT[],
  success_factors TEXT[],
  next_steps TEXT,
  
  -- From session_insights
  insight_data JSONB DEFAULT '{}',
  insight_type TEXT,
  confidence_score NUMERIC,
  ai_model_version TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

-- Enable RLS on session_analytics
ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for session_analytics
CREATE POLICY "System can manage session analytics" 
ON public.session_analytics 
FOR ALL 
USING (true);

CREATE POLICY "Users can view their own session analytics" 
ON public.session_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own session analytics" 
ON public.session_analytics 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Migrate data from existing analytics tables
INSERT INTO public.session_analytics (
  session_id, user_id, coach_id,
  session_satisfaction_rating, goal_achievement_rating, coach_effectiveness_rating,
  follow_up_needed, key_breakthroughs, challenges_faced, action_items, follow_up_notes,
  goal_category, goal_description, initial_assessment, final_assessment,
  progress_notes, barriers_identified, success_factors, next_steps,
  insight_data, insight_type, confidence_score, ai_model_version
)
SELECT 
  COALESCE(so.session_id, sgt.session_id, si.session_id) as session_id,
  COALESCE(so.user_id, sgt.user_id, s.client_id) as user_id,
  COALESCE(so.coach_id, s.coach_id) as coach_id,
  so.session_satisfaction_rating, so.goal_achievement_rating, so.coach_effectiveness_rating,
  so.follow_up_needed, so.key_breakthroughs, so.challenges_faced, so.action_items, so.follow_up_notes,
  sgt.goal_category, sgt.goal_description, sgt.initial_assessment, sgt.final_assessment,
  sgt.progress_notes, sgt.barriers_identified, sgt.success_factors, sgt.next_steps,
  si.insight_data, si.insight_type, si.confidence_score, si.ai_model_version
FROM public.sessions s
LEFT JOIN public.session_outcomes so ON s.id = so.session_id
LEFT JOIN public.session_goals_tracking sgt ON s.id = sgt.session_id  
LEFT JOIN public.session_insights si ON s.id = si.session_id
WHERE so.session_id IS NOT NULL OR sgt.session_id IS NOT NULL OR si.session_id IS NOT NULL;

-- Now clean up the sessions table by removing redundant fields
-- First, update any references that use the text session_id to use the UUID id instead
UPDATE public.video_sessions SET connection_request_id = (
  SELECT cr.id FROM public.connection_requests cr 
  JOIN public.sessions s ON s.session_id = video_sessions.session_id 
  WHERE cr.id IS NOT NULL 
  LIMIT 1
) WHERE connection_request_id IS NULL;

-- Remove redundant columns from sessions table
ALTER TABLE public.sessions DROP COLUMN IF EXISTS session_id;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS video_room_id;
ALTER TABLE public.sessions DROP COLUMN IF EXISTS video_join_url;

-- Fix nullable user_id columns where they should be NOT NULL
-- First, clean up any null user_ids by setting them to a system user or removing records
DELETE FROM public.user_activity_logs WHERE user_id IS NULL;
DELETE FROM public.conversation_themes WHERE user_id IS NULL;
DELETE FROM public.user_behavioral_patterns WHERE user_id IS NULL;

-- Now make user_id NOT NULL where appropriate
ALTER TABLE public.conversation_themes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_behavioral_patterns ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.session_analytics ALTER COLUMN user_id SET NOT NULL;

-- Update resource_interactions to ensure user_id is always set
UPDATE public.resource_interactions SET user_id = auth.uid() WHERE user_id IS NULL;
ALTER TABLE public.resource_interactions ALTER COLUMN user_id SET NOT NULL;

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_session_video_details_updated_at
  BEFORE UPDATE ON public.session_video_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_analytics_updated_at
  BEFORE UPDATE ON public.session_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Drop redundant tables (keeping data in new consolidated tables)
DROP TABLE IF EXISTS public.session_outcomes CASCADE;
DROP TABLE IF EXISTS public.session_goals_tracking CASCADE;
DROP TABLE IF EXISTS public.session_insights CASCADE;

-- Drop the coaches_public view since we can use RLS on coaches table instead
DROP VIEW IF EXISTS public.coaches_public CASCADE;

-- Create better RLS policy for coaches to replace the view
DROP POLICY IF EXISTS "System can access full coach data" ON public.coaches;
CREATE POLICY "Public can view active coach profiles" 
ON public.coaches 
FOR SELECT 
USING (is_active = true);

-- Update the get_public_coaches function to work with the main coaches table
DROP FUNCTION IF EXISTS public.get_public_coaches();
CREATE OR REPLACE FUNCTION public.get_public_coaches()
RETURNS SETOF public.coaches
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT * FROM public.coaches WHERE is_active = true;
$$;