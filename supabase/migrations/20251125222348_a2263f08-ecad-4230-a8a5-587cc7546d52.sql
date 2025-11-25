-- Fix get_session_by_join_token to only use video_join_url from session_video_details
-- The sessions table does NOT have a video_join_url column

CREATE OR REPLACE FUNCTION public.get_session_by_join_token(_join_token uuid)
RETURNS TABLE(
  id uuid,
  client_id uuid,
  coach_id uuid,
  scheduled_time timestamp with time zone,
  duration_minutes integer,
  status text,
  session_state text,
  video_join_url text,
  token_used_at timestamp with time zone,
  token_expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.client_id,
    s.coach_id,
    s.scheduled_time,
    s.duration_minutes,
    s.status,
    s.session_state,
    svd.video_join_url, -- Only use from session_video_details (no fallback to non-existent column)
    s.token_used_at,
    s.token_expires_at
  FROM public.sessions s
  LEFT JOIN public.session_video_details svd ON svd.session_id = s.id
  WHERE s.join_token = _join_token;
END;
$$;