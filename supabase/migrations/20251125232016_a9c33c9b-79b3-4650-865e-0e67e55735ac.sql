-- Drop duplicate foreign key constraint
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_coach_id_fkey;

-- Keep only fk_sessions_coach as the primary constraint
-- Verify the remaining constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_sessions_coach'
  ) THEN
    RAISE EXCEPTION 'Primary foreign key constraint fk_sessions_coach is missing!';
  END IF;
END $$;