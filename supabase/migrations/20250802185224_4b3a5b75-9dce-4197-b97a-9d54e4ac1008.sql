-- Create sessions table for video coaching sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  video_room_id TEXT,
  video_join_url TEXT,
  price_amount NUMERIC(10,2),
  price_currency TEXT DEFAULT 'USD',
  coin_cost INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_recordings table
CREATE TABLE public.session_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  recording_url TEXT,
  transcript TEXT,
  ai_summary TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add availability and pricing columns to coaches table
ALTER TABLE public.coaches 
ADD COLUMN hourly_rate_amount NUMERIC(10,2) DEFAULT 100.00,
ADD COLUMN hourly_rate_currency TEXT DEFAULT 'USD',
ADD COLUMN hourly_coin_cost INTEGER DEFAULT 100,
ADD COLUMN booking_buffer_minutes INTEGER DEFAULT 15,
ADD COLUMN max_session_duration INTEGER DEFAULT 60,
ADD COLUMN min_session_duration INTEGER DEFAULT 30;

-- Enable RLS on new tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions
CREATE POLICY "Users can view their own sessions" 
ON public.sessions 
FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "Users can insert their own sessions" 
ON public.sessions 
FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their own sessions" 
ON public.sessions 
FOR UPDATE 
USING (auth.uid() = client_id);

CREATE POLICY "System can manage all sessions" 
ON public.sessions 
FOR ALL 
USING (true);

-- RLS policies for session_recordings
CREATE POLICY "Users can view recordings of their sessions" 
ON public.session_recordings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.sessions 
  WHERE sessions.id = session_recordings.session_id 
  AND sessions.client_id = auth.uid()
));

CREATE POLICY "System can manage all recordings" 
ON public.session_recordings 
FOR ALL 
USING (true);

-- Create trigger for updating updated_at
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_recordings_updated_at
  BEFORE UPDATE ON public.session_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX idx_sessions_coach_id ON public.sessions(coach_id);
CREATE INDEX idx_sessions_scheduled_time ON public.sessions(scheduled_time);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_session_recordings_session_id ON public.session_recordings(session_id);