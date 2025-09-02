-- Fix remaining security issues

-- 1. Drop the existing coaches_public view and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.coaches_public;

-- 2. Create a simple view without SECURITY DEFINER (default is SECURITY INVOKER)
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

-- 3. Ensure proper permissions on the view
GRANT SELECT ON public.coaches_public TO anon, authenticated;

-- 4. Create a function to safely access coach data without security definer
CREATE OR REPLACE FUNCTION public.get_public_coaches()
RETURNS SETOF public.coaches_public
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.coaches_public;
$$;