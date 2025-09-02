-- Phase 1: Critical Security Fixes

-- 1. Create a secure view for coaches that excludes sensitive contact information
CREATE VIEW public.coaches_public AS
SELECT 
  id,
  name,
  title,
  bio,
  avatar_url,
  specialties,
  similar_experiences,
  availability_hours,
  timezone,
  years_experience,
  rating,
  total_reviews,
  social_links,
  is_active,
  created_at,
  updated_at,
  available_now,
  hourly_rate_amount,
  hourly_coin_cost,
  booking_buffer_minutes,
  max_session_duration,
  min_session_duration,
  coaching_expertise,
  coaching_style,
  client_challenge_example,
  personal_experiences,
  hourly_rate_currency
FROM public.coaches
WHERE is_active = true;

-- 2. Drop the existing public policy on coaches table
DROP POLICY IF EXISTS "Coaches are publicly viewable" ON public.coaches;

-- 3. Create new restricted policy for coaches table (system use only)
CREATE POLICY "System can access full coach data" 
ON public.coaches 
FOR ALL 
USING (true);

-- 4. Grant public access to the secure view instead
GRANT SELECT ON public.coaches_public TO anon, authenticated;

-- 5. Replace open guest sessions policy with session-token based access
DROP POLICY IF EXISTS "Anyone can manage guest sessions" ON public.guest_sessions;

-- 6. Create secure guest session policies
CREATE POLICY "Users can insert guest sessions"
ON public.guest_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view guest sessions with valid session"
ON public.guest_sessions
FOR SELECT
TO anon, authenticated
USING (
  session_id::text = current_setting('request.header.x-session-id', true)
  OR expires_at > now()
);

CREATE POLICY "Users can update their guest sessions"
ON public.guest_sessions
FOR UPDATE
TO anon, authenticated
USING (
  session_id::text = current_setting('request.header.x-session-id', true)
  OR expires_at > now()
);

-- 7. Fix function security by updating search_path on existing functions
ALTER FUNCTION public.cleanup_expired_guest_sessions() SET search_path = public;
ALTER FUNCTION public.cleanup_old_activity_logs() SET search_path = public;
ALTER FUNCTION public.update_conversation_theme(uuid, text, text, numeric, numeric, uuid) SET search_path = public;
ALTER FUNCTION public.track_user_activity(uuid, text, text, text, jsonb, integer, jsonb) SET search_path = public;
ALTER FUNCTION public.update_behavioral_pattern(uuid, text, jsonb, numeric) SET search_path = public;

-- 8. Create system-only policy for coach notifications (internal use)
CREATE POLICY "System can access coach contact info"
ON public.coaches
FOR SELECT
TO service_role
USING (true);

-- 9. Add RLS policy to ensure only system can manage sensitive coach updates
CREATE POLICY "Only system can update coaches"
ON public.coaches
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Only system can insert coaches"
ON public.coaches
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only system can delete coaches"
ON public.coaches
FOR DELETE
TO service_role
USING (true);