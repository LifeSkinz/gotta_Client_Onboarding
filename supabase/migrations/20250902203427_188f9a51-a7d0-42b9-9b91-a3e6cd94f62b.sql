-- Fix security definer functions to use proper RLS enforcement
-- Remove SECURITY DEFINER from functions that don't need elevated privileges

-- Update cleanup_old_activity_logs to use SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete activity logs older than 30 days
  DELETE FROM public.user_activity_logs 
  WHERE created_at < now() - interval '30 days';
  
  -- Delete guest session data older than 7 days
  DELETE FROM public.guest_sessions 
  WHERE expires_at < now() - interval '7 days';
END;
$function$;

-- Update track_user_activity to use SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.track_user_activity(
  p_user_id uuid, 
  p_session_token text, 
  p_activity_type text, 
  p_page_url text, 
  p_action_details jsonb DEFAULT '{}'::jsonb, 
  p_duration_seconds integer DEFAULT NULL::integer, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update update_conversation_theme to use SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.update_conversation_theme(
  p_user_id uuid, 
  p_theme_name text, 
  p_theme_description text, 
  p_sentiment_score numeric DEFAULT 0.5, 
  p_importance_score numeric DEFAULT 0.5, 
  p_session_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Update update_behavioral_pattern to use SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.update_behavioral_pattern(
  p_user_id uuid, 
  p_pattern_type text, 
  p_pattern_data jsonb, 
  p_confidence_score numeric DEFAULT 0.8
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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
$function$;