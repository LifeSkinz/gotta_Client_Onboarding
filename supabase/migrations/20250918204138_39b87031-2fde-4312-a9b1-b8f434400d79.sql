-- Fix critical security vulnerability in guest_sessions table
-- Remove the public access condition that allows anyone to read all non-expired guest sessions

-- Drop the existing vulnerable SELECT policy
DROP POLICY IF EXISTS "Users can view guest sessions with valid session" ON public.guest_sessions;

-- Create a secure SELECT policy that only allows access with proper session header
CREATE POLICY "Users can view guest sessions with valid session header" 
ON public.guest_sessions 
FOR SELECT 
USING (
  (session_id)::text = current_setting('request.header.x-session-id'::text, true)
);

-- Also update the UPDATE policy to remove the public access condition
DROP POLICY IF EXISTS "Users can update their guest sessions" ON public.guest_sessions;

CREATE POLICY "Users can update their guest sessions with valid session header" 
ON public.guest_sessions 
FOR UPDATE 
USING (
  (session_id)::text = current_setting('request.header.x-session-id'::text, true)
);