-- Create session_notes table for coach notes
CREATE TABLE IF NOT EXISTS session_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one set of notes per coach per session
  UNIQUE(session_id, coach_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_coach_id ON session_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_updated_at ON session_notes(updated_at);

-- Enable Row Level Security
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for session_notes
CREATE POLICY "Coaches can view and edit their own session notes" ON session_notes
  FOR ALL USING (
    coach_id = auth.uid() OR
    coach_id IN (
      SELECT id FROM coaches WHERE user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON session_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON session_notes TO service_role;
