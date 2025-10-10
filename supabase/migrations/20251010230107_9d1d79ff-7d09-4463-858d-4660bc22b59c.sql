-- Add reminder_sent_at column to sessions table for tracking reminder emails
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS reminder_sent_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_sessions_reminder_status 
ON public.sessions(scheduled_time, status, reminder_sent_at) 
WHERE reminder_sent_at IS NULL;

-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule reminder function to run every 5 minutes
SELECT cron.schedule(
  'send-session-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://nqoysxjjimvihcvfpesr.supabase.co/functions/v1/send-session-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xb3lzeGpqaW12aWhjdmZwZXNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzMDUwMjYsImV4cCI6MjA2ODg4MTAyNn0.L0mv1_4rzGqJ82m52d5RUD_-a-2c2X2oYRpXupk6dh8"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);