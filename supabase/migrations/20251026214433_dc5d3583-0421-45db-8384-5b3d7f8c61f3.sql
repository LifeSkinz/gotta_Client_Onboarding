-- Phase 2A: Email Outbox Pattern
CREATE TABLE public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  last_error TEXT,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_email_outbox_status_scheduled 
ON public.email_outbox(status, scheduled_for) 
WHERE status IN ('pending', 'failed');

CREATE INDEX idx_email_outbox_dedup_key 
ON public.email_outbox(dedup_key);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage email outbox" ON public.email_outbox
FOR ALL USING (true);

-- Phase 2C: Coach Onboarding Flow
CREATE TABLE public.pending_coach_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  experience TEXT NOT NULL,
  specialties TEXT[] NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'invited')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pending_coach_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit coach applications" 
ON public.pending_coach_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all applications" 
ON public.pending_coach_applications FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can update applications" 
ON public.pending_coach_applications FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Add advisory lock functions
CREATE OR REPLACE FUNCTION public.pg_try_advisory_lock(lock_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN pg_try_advisory_lock(lock_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.pg_advisory_unlock(lock_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN pg_advisory_unlock(lock_id);
END;
$$;