-- Fix function search path security warnings

-- Update track_user_activity function with proper search path
CREATE OR REPLACE FUNCTION public.track_user_activity(
  p_user_id UUID,
  p_session_token TEXT,
  p_activity_type TEXT,
  p_page_url TEXT,
  p_action_details JSONB DEFAULT '{}',
  p_duration_seconds INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.user_activity_logs (
    user_id,
    session_token,
    activity_type,
    page_url,
    action_details,
    duration_seconds,
    metadata
  ) VALUES (
    p_user_id,
    p_session_token,
    p_activity_type,
    p_page_url,
    p_action_details,
    p_duration_seconds,
    p_metadata
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update update_behavioral_pattern function with proper search path
CREATE OR REPLACE FUNCTION public.update_behavioral_pattern(
  p_user_id UUID,
  p_pattern_type TEXT,
  p_pattern_data JSONB,
  p_confidence_score NUMERIC DEFAULT 0.8
)
RETURNS UUID AS $$
DECLARE
  pattern_id UUID;
BEGIN
  -- Try to update existing pattern
  UPDATE public.user_behavioral_patterns 
  SET 
    pattern_data = p_pattern_data,
    confidence_score = p_confidence_score,
    last_reinforced_at = now(),
    occurrence_count = occurrence_count + 1
  WHERE user_id = p_user_id AND pattern_type = p_pattern_type
  RETURNING id INTO pattern_id;
  
  -- If no existing pattern, create new one
  IF pattern_id IS NULL THEN
    INSERT INTO public.user_behavioral_patterns (
      user_id,
      pattern_type,
      pattern_data,
      confidence_score
    ) VALUES (
      p_user_id,
      p_pattern_type,
      p_pattern_data,
      p_confidence_score
    ) RETURNING id INTO pattern_id;
  END IF;
  
  RETURN pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update update_conversation_theme function with proper search path
CREATE OR REPLACE FUNCTION public.update_conversation_theme(
  p_user_id UUID,
  p_theme_name TEXT,
  p_theme_description TEXT,
  p_sentiment_score NUMERIC DEFAULT 0.5,
  p_importance_score NUMERIC DEFAULT 0.5,
  p_session_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  theme_id UUID;
  current_sentiment JSONB;
BEGIN
  -- Try to update existing theme
  SELECT id, sentiment_trend INTO theme_id, current_sentiment
  FROM public.conversation_themes 
  WHERE user_id = p_user_id AND theme_name = p_theme_name;
  
  IF theme_id IS NOT NULL THEN
    -- Update existing theme
    UPDATE public.conversation_themes 
    SET 
      theme_description = p_theme_description,
      last_mentioned_at = now(),
      mention_count = mention_count + 1,
      sentiment_trend = (current_sentiment::jsonb || jsonb_build_array(jsonb_build_object('score', p_sentiment_score, 'timestamp', now()))),
      importance_score = GREATEST(importance_score, p_importance_score),
      session_ids = CASE 
        WHEN p_session_id IS NOT NULL AND NOT (session_ids @> ARRAY[p_session_id]) 
        THEN array_append(session_ids, p_session_id)
        ELSE session_ids
      END
    WHERE id = theme_id;
  ELSE
    -- Create new theme
    INSERT INTO public.conversation_themes (
      user_id,
      theme_name,
      theme_description,
      sentiment_trend,
      importance_score,
      session_ids
    ) VALUES (
      p_user_id,
      p_theme_name,
      p_theme_description,
      jsonb_build_array(jsonb_build_object('score', p_sentiment_score, 'timestamp', now())),
      p_importance_score,
      CASE WHEN p_session_id IS NOT NULL THEN ARRAY[p_session_id] ELSE ARRAY[]::UUID[] END
    ) RETURNING id INTO theme_id;
  END IF;
  
  RETURN theme_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS on guest_sessions table (this was the ERROR 7)
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for guest sessions
CREATE POLICY "Anyone can manage guest sessions" ON public.guest_sessions
  FOR ALL USING (true);