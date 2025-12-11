-- Add unique constraint for session_participants upsert
ALTER TABLE session_participants 
ADD CONSTRAINT session_participants_session_user_unique 
UNIQUE (session_id, user_id);