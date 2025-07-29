-- Add four new columns to coaches table for detailed onboarding responses
ALTER TABLE public.coaches 
ADD COLUMN coaching_expertise TEXT,
ADD COLUMN coaching_style TEXT,
ADD COLUMN client_challenge_example TEXT,
ADD COLUMN personal_experiences TEXT;

-- Add indexes for better search and AI analysis performance
CREATE INDEX idx_coaches_coaching_expertise ON public.coaches USING gin(to_tsvector('english', coaching_expertise));
CREATE INDEX idx_coaches_coaching_style ON public.coaches USING gin(to_tsvector('english', coaching_style));
CREATE INDEX idx_coaches_client_challenge_example ON public.coaches USING gin(to_tsvector('english', client_challenge_example));
CREATE INDEX idx_coaches_personal_experiences ON public.coaches USING gin(to_tsvector('english', personal_experiences));