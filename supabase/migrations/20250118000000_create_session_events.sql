-- Create session_events table to track Daily.co webhook events
CREATE TABLE IF NOT EXISTS session_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for better performance
  CONSTRAINT session_events_event_type_check CHECK (
    event_type IN (
      'meeting_started',
      'meeting_ended', 
      'participant_joined',
      'participant_left',
      'recording_started',
      'recording_ready',
      'recording_error',
      'transcription_started',
      'transcription_ready',
      'transcription_error'
    )
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_created_at ON session_events(created_at);

-- Enable Row Level Security
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Create policies for session_events
CREATE POLICY "Users can view their own session events" ON session_events
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions 
      WHERE client_id = auth.uid() OR coach_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT ON session_events TO authenticated;
GRANT INSERT ON session_events TO service_role;
GRANT UPDATE ON session_events TO service_role;
