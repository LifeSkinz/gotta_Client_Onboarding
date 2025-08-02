-- Create profiles table trigger for auto-creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update user_responses table to ensure proper user linking
ALTER TABLE public.user_responses 
ALTER COLUMN user_id SET NOT NULL;

-- Create policy for authenticated user responses
DROP POLICY IF EXISTS "Anyone can insert responses" ON public.user_responses;
CREATE POLICY "Authenticated users can insert responses" 
ON public.user_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update connection_requests policies to be more restrictive
DROP POLICY IF EXISTS "System can manage requests" ON public.connection_requests;
CREATE POLICY "Users can insert their own requests" 
ON public.connection_requests 
FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "System can update requests" 
ON public.connection_requests 
FOR UPDATE 
USING (true);