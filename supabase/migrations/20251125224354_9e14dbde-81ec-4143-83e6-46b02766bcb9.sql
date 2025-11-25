-- Add RLS policy for coaches to view their sessions
CREATE POLICY "Coaches can view their sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (auth.uid() IN (
  SELECT user_id 
  FROM coaches 
  WHERE id = sessions.coach_id
));