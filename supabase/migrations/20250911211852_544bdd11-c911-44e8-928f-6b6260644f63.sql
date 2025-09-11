-- Fix security warnings for function search path
CREATE OR REPLACE FUNCTION public.update_session_state(
  p_session_id uuid,
  p_new_state text,
  p_locked_by text,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Fix security warnings for function search path
CREATE OR REPLACE FUNCTION public.cleanup_expired_session_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM public.session_locks WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Fix security warnings for function search path
CREATE OR REPLACE FUNCTION public.update_system_capacity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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