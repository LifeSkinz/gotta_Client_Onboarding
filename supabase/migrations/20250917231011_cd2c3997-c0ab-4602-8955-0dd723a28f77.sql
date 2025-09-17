-- Add transcription privacy columns to session_recordings table
ALTER TABLE public.session_recordings 
ADD COLUMN transcription_status text DEFAULT 'inactive' CHECK (transcription_status IN ('inactive', 'active', 'paused', 'completed')),
ADD COLUMN transcription_paused_segments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN privacy_settings jsonb DEFAULT '{
  "auto_redact_pauses": true,
  "retain_original": false,
  "redaction_method": "silence"
}'::jsonb;

-- Add index for efficient transcription status queries
CREATE INDEX idx_session_recordings_transcription_status 
ON public.session_recordings(transcription_status);

-- Add comment for documentation
COMMENT ON COLUMN public.session_recordings.transcription_status IS 'Current status of transcription: inactive, active, paused, completed';
COMMENT ON COLUMN public.session_recordings.transcription_paused_segments IS 'Array of time ranges when transcription was paused: [{"start": timestamp, "end": timestamp}]';
COMMENT ON COLUMN public.session_recordings.privacy_settings IS 'User privacy preferences for transcription processing';