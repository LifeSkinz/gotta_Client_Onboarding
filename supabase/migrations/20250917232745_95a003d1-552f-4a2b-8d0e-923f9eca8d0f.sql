-- Add secure join token to sessions table
ALTER TABLE public.sessions ADD COLUMN join_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid();

-- Create index for fast lookups
CREATE INDEX idx_sessions_join_token ON public.sessions(join_token);

-- Add comment for documentation
COMMENT ON COLUMN public.sessions.join_token IS 'Secure, unguessable token used for email join links to prevent unauthorized session access';