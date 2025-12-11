-- Add unique constraint on session_id in session_recordings table for upsert operations
ALTER TABLE public.session_recordings 
ADD CONSTRAINT session_recordings_session_id_unique UNIQUE (session_id);