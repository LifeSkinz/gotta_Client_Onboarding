-- Phase 1: Emergency Cleanup and Data Retention
-- Truncate the activity logs to free up 1.1GB immediately
TRUNCATE TABLE public.user_activity_logs;

-- Add data retention policy function
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Delete activity logs older than 30 days
  DELETE FROM public.user_activity_logs 
  WHERE created_at < now() - interval '30 days';
  
  -- Delete guest session data older than 7 days
  DELETE FROM public.guest_sessions 
  WHERE expires_at < now() - interval '7 days';
END;
$function$;

-- Phase 3: Database Optimization - Add composite indexes for better query performance
-- Index for user activity queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_time 
ON public.user_activity_logs(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Index for session-based activity queries
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_session_time 
ON public.user_activity_logs(session_token, created_at DESC) 
WHERE session_token IS NOT NULL;

-- Index for activity type filtering
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_type_time 
ON public.user_activity_logs(activity_type, created_at DESC);

-- Index for page URL analysis
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_page_time 
ON public.user_activity_logs(page_url, created_at DESC) 
WHERE page_url IS NOT NULL;

-- Optimize other frequently queried tables
CREATE INDEX IF NOT EXISTS idx_sessions_client_status 
ON public.sessions(client_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_responses_user_created 
ON public.user_responses(user_id, created_at DESC);

-- Schedule automatic cleanup to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-activity-logs',
  '0 2 * * *', -- daily at 2 AM
  $$
  SELECT public.cleanup_old_activity_logs();
  $$
);