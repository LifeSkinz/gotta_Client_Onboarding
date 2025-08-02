-- Create guest_sessions table for temporary data storage
CREATE TABLE public.guest_sessions (
  session_id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  selected_goal JSONB NOT NULL,
  responses JSONB NOT NULL,
  ai_analysis JSONB,
  recommended_coaches JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- No RLS on guest_sessions since it's temporary public data
-- Add index for performance
CREATE INDEX idx_guest_sessions_expires_at ON public.guest_sessions(expires_at);

-- Create function to clean up expired guest sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_guest_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.guest_sessions WHERE expires_at < now();
END;
$$;

-- Update user_responses table to include session_id for migration tracking
ALTER TABLE public.user_responses 
ADD COLUMN IF NOT EXISTS guest_session_id UUID;

-- Update ai-coach-matching function to work with session_id instead of user_id
-- This will be handled in the edge function update