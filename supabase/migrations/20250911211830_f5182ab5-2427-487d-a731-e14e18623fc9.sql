-- Phase 1: Core Infrastructure & Security Foundation

-- Add session state management and locking
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS session_state text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS state_locked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS state_locked_by uuid,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error text,
ADD COLUMN IF NOT EXISTS connection_quality jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS participant_status jsonb DEFAULT '{}';

-- Add session capacity and resource tracking
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS resource_usage jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS estimated_end_time timestamp with time zone;

-- Create session state logs table for audit trail
CREATE TABLE IF NOT EXISTS public.session_state_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  from_state text,
  to_state text NOT NULL,
  changed_by uuid,
  change_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create session locks table for distributed locking
CREATE TABLE IF NOT EXISTS public.session_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL UNIQUE,
  locked_by text NOT NULL, -- edge function instance id
  locked_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  operation_type text NOT NULL,
  metadata jsonb DEFAULT '{}'
);

-- Create session capacity tracking
CREATE TABLE IF NOT EXISTS public.system_capacity (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  active_sessions_count integer NOT NULL DEFAULT 0,
  max_sessions_limit integer NOT NULL DEFAULT 50,
  db_connections_used integer NOT NULL DEFAULT 0,
  max_db_connections integer NOT NULL DEFAULT 15,
  last_updated timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert initial capacity record
INSERT INTO public.system_capacity (active_sessions_count, max_sessions_limit, db_connections_used, max_db_connections)
VALUES (0, 50, 0, 15)
ON CONFLICT DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.session_state_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_capacity ENABLE ROW LEVEL SECURITY;

-- Create policies for session state logs
CREATE POLICY "Users can view logs for their sessions" 
ON public.session_state_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM sessions 
  WHERE sessions.id = session_state_logs.session_id 
  AND sessions.client_id = auth.uid()
));

CREATE POLICY "System can manage session state logs" 
ON public.session_state_logs 
FOR ALL 
USING (true);

-- Create policies for session locks
CREATE POLICY "System can manage session locks" 
ON public.session_locks 
FOR ALL 
USING (true);

-- Create policies for system capacity
CREATE POLICY "System can manage capacity" 
ON public.system_capacity 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_state ON public.sessions(session_state);
CREATE INDEX IF NOT EXISTS idx_sessions_client_status ON public.sessions(client_id, session_state);
CREATE INDEX IF NOT EXISTS idx_session_state_logs_session ON public.session_state_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_locks_expires ON public.session_locks(expires_at);

-- Create function to update session state with locking
CREATE OR REPLACE FUNCTION public.update_session_state(
  p_session_id uuid,
  p_new_state text,
  p_locked_by text,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_state text;
  v_success boolean := false;
BEGIN
  -- Try to acquire lock
  INSERT INTO public.session_locks (session_id, locked_by, operation_type, metadata)
  VALUES (p_session_id, p_locked_by, 'state_update', p_metadata)
  ON CONFLICT (session_id) DO NOTHING;
  
  -- Check if we got the lock
  IF NOT FOUND THEN
    -- Lock already exists, check if it's expired
    DELETE FROM public.session_locks 
    WHERE session_id = p_session_id AND expires_at < now();
    
    -- Try again
    INSERT INTO public.session_locks (session_id, locked_by, operation_type, metadata)
    VALUES (p_session_id, p_locked_by, 'state_update', p_metadata)
    ON CONFLICT (session_id) DO NOTHING;
    
    IF NOT FOUND THEN
      RETURN false; -- Could not acquire lock
    END IF;
  END IF;
  
  -- Update session state
  UPDATE public.sessions 
  SET 
    session_state = p_new_state,
    state_locked_at = now(),
    state_locked_by = (SELECT auth.uid()),
    updated_at = now()
  WHERE id = p_session_id
  RETURNING session_state INTO v_current_state;
  
  IF FOUND THEN
    -- Log the state change
    INSERT INTO public.session_state_logs (session_id, from_state, to_state, changed_by, change_reason, metadata)
    VALUES (p_session_id, v_current_state, p_new_state, (SELECT auth.uid()), p_reason, p_metadata);
    
    v_success := true;
  END IF;
  
  -- Release lock
  DELETE FROM public.session_locks WHERE session_id = p_session_id AND locked_by = p_locked_by;
  
  RETURN v_success;
END;
$$;

-- Create function to clean up expired locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_session_locks()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM public.session_locks WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Create function to update system capacity
CREATE OR REPLACE FUNCTION public.update_system_capacity()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_sessions integer;
BEGIN
  -- Count active sessions
  SELECT COUNT(*) INTO v_active_sessions
  FROM public.sessions 
  WHERE session_state IN ('scheduled', 'ready', 'in_progress');
  
  -- Update capacity table
  UPDATE public.system_capacity 
  SET 
    active_sessions_count = v_active_sessions,
    last_updated = now()
  WHERE id = (SELECT id FROM public.system_capacity LIMIT 1);
END;
$$;