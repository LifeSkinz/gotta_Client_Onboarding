-- Phase 1 Critical Security Fixes

-- 1. Add fields to sessions table for security controls
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS token_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS join_attempts JSONB DEFAULT '[]'::jsonb;

-- 2. Update existing rows to set token_expires_at
UPDATE public.sessions
SET token_expires_at = scheduled_time + interval '4 hours'
WHERE token_expires_at IS NULL;

-- 3. Create security definer function to get session by join token
CREATE OR REPLACE FUNCTION public.get_session_by_join_token(_join_token UUID)
RETURNS TABLE(
  id UUID,
  client_id UUID,
  coach_id UUID,
  scheduled_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT,
  session_state TEXT,
  video_join_url TEXT,
  token_used_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    svd.video_join_url,
    s.token_used_at,
    s.token_expires_at
  FROM public.sessions s
  LEFT JOIN public.session_video_details svd ON svd.session_id = s.id
  WHERE s.join_token = _join_token;
END;
$$;

-- 4. Remove dangerous anonymous read policies
DROP POLICY IF EXISTS "Allow anonymous read by session ID" ON public.sessions;
DROP POLICY IF EXISTS "Allow anonymous read video details" ON public.session_video_details;

-- 5. Add policy for edge functions to access sessions by join token
CREATE POLICY "Service role can access all sessions"
ON public.sessions
FOR ALL
USING (auth.role() = 'service_role'::text);

CREATE POLICY "Service role can access all video details"
ON public.session_video_details
FOR ALL
USING (auth.role() = 'service_role'::text);

-- 6. Add index for join_token lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_sessions_join_token ON public.sessions(join_token);

-- 7. Add index for token expiration queries
CREATE INDEX IF NOT EXISTS idx_sessions_token_expiry ON public.sessions(token_expires_at) WHERE token_used_at IS NULL;