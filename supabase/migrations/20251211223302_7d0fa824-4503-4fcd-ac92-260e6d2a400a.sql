-- Add session_participants table for tracking who joins
CREATE TABLE IF NOT EXISTS public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID,
  role TEXT NOT NULL CHECK (role IN ('coach', 'client', 'guest')),
  display_name TEXT NOT NULL,
  daily_user_id TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  meeting_token_issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for lookups
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);

-- Enable RLS
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view participants of their sessions"
ON session_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.id = session_participants.session_id 
    AND (sessions.client_id = auth.uid() OR sessions.coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    ))
  )
);

CREATE POLICY "System can manage session participants"
ON session_participants FOR ALL
USING (true);

-- Add daily_room_name to session_video_details if not exists
ALTER TABLE session_video_details 
ADD COLUMN IF NOT EXISTS daily_room_name TEXT,
ADD COLUMN IF NOT EXISTS room_created_at TIMESTAMP WITH TIME ZONE DEFAULT now();