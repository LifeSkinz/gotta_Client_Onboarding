-- Create user profiles table for additional user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  bio TEXT,
  phone TEXT,
  notification_method TEXT DEFAULT 'email' CHECK (notification_method IN ('email', 'whatsapp', 'both')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create connection requests table
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  client_goal JSONB,
  client_bio TEXT,
  request_type TEXT DEFAULT 'instant' CHECK (request_type IN ('instant', 'scheduled')),
  scheduled_time TIMESTAMP WITH TIME ZONE,
  video_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for connection requests
CREATE POLICY "Users can view their own requests" 
ON public.connection_requests 
FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "System can manage requests" 
ON public.connection_requests 
FOR ALL 
USING (true);

-- Create video sessions table
CREATE TABLE IF NOT EXISTS public.video_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_request_id UUID NOT NULL REFERENCES public.connection_requests(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  duration_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  recording_url TEXT,
  transcript TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for video sessions
CREATE POLICY "Users can view sessions for their requests" 
ON public.video_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.connection_requests 
  WHERE id = connection_request_id AND client_id = auth.uid()
));

-- Add availability fields to coaches table
ALTER TABLE public.coaches 
ADD COLUMN IF NOT EXISTS available_now BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS calendar_link TEXT,
ADD COLUMN IF NOT EXISTS notification_email TEXT,
ADD COLUMN IF NOT EXISTS notification_phone TEXT;

-- Create coach availability table
CREATE TABLE IF NOT EXISTS public.coach_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coach_id, day_of_week, start_time, end_time)
);

-- Enable RLS
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for coach availability
CREATE POLICY "Availability is publicly viewable" 
ON public.coach_availability 
FOR SELECT 
USING (is_active = true);

-- Add trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for automatic timestamp updates on connection_requests
CREATE TRIGGER update_connection_requests_updated_at
BEFORE UPDATE ON public.connection_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for automatic timestamp updates on video_sessions
CREATE TRIGGER update_video_sessions_updated_at
BEFORE UPDATE ON public.video_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for automatic timestamp updates on coach_availability
CREATE TRIGGER update_coach_availability_updated_at
BEFORE UPDATE ON public.coach_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();