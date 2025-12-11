-- Add secure one-time accept token columns to sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS accept_token uuid DEFAULT gen_random_uuid();
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS accept_token_used_at timestamptz;

-- Create index for fast token lookups (only unused tokens)
CREATE INDEX IF NOT EXISTS idx_sessions_accept_token ON public.sessions(accept_token) WHERE accept_token_used_at IS NULL;

-- Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;