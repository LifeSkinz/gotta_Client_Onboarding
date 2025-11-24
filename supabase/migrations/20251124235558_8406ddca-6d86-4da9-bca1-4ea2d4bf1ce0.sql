-- Fix Phase 1 & 2: Token expiration and video URL retrieval

-- Step 1: Update existing sessions to have token_expires_at (24 hours from scheduled_time)
UPDATE sessions 
SET token_expires_at = scheduled_time + interval '24 hours'
WHERE token_expires_at IS NULL;

-- Step 2: Verify get_session_by_join_token function is correctly joining session_video_details
-- This function already exists and is correct, but we'll recreate it to ensure it's up to date
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
    COALESCE(svd.video_join_url, s.video_join_url) as video_join_url, -- Use video_join_url from session_video_details first, fallback to sessions table
    s.token_used_at,
    s.token_expires_at
  FROM public.sessions s
  LEFT JOIN public.session_video_details svd ON svd.session_id = s.id
  WHERE s.join_token = _join_token;
END;
$$;