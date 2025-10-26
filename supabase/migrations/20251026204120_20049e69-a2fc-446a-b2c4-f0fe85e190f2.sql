-- Step 0: Create missing profiles for any client_ids in sessions
INSERT INTO public.profiles (user_id, full_name, email_verified)
SELECT DISTINCT s.client_id, 'User', false
FROM public.sessions s
WHERE s.client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = s.client_id
  );

-- Step 1A: Clean duplicate session_video_details rows (keep first by ctid)
DELETE FROM public.session_video_details
WHERE ctid NOT IN (
  SELECT MIN(ctid) 
  FROM public.session_video_details 
  GROUP BY session_id
);

-- Step 1B: Add UNIQUE constraint on session_id
ALTER TABLE public.session_video_details
  ADD CONSTRAINT unique_session_video_details_session_id 
  UNIQUE (session_id);

-- Step 1C: Add missing foreign keys
ALTER TABLE public.sessions 
  ADD CONSTRAINT fk_sessions_coach 
  FOREIGN KEY (coach_id) 
  REFERENCES public.coaches(id) 
  ON DELETE SET NULL;

ALTER TABLE public.sessions 
  ADD CONSTRAINT fk_sessions_client 
  FOREIGN KEY (client_id) 
  REFERENCES public.profiles(user_id) 
  ON DELETE CASCADE;

-- Step 4: Add RLS policies for anonymous coach access via email links
CREATE POLICY "Allow anonymous read by session ID" 
ON public.sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow anonymous read coaches" 
ON public.coaches 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Allow anonymous read video details" 
ON public.session_video_details 
FOR SELECT 
USING (true);