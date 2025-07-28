-- Create currency settings table for exchange rates
CREATE TABLE public.currency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code TEXT NOT NULL UNIQUE,
  coins_per_unit INTEGER NOT NULL, -- How many coins equal 1 unit of this currency
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create coaches table
CREATE TABLE public.coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT NOT NULL,
  avatar_url TEXT,
  years_experience INTEGER NOT NULL,
  specialties TEXT[] NOT NULL,
  similar_experiences TEXT[] NOT NULL, -- Experiences they can relate to
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_reviews INTEGER DEFAULT 0,
  availability_hours TEXT, -- JSON string for available hours
  timezone TEXT DEFAULT 'UTC',
  social_links JSONB DEFAULT '{}', -- LinkedIn, website, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create coaching packages table
CREATE TABLE public.coaching_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_currency TEXT NOT NULL DEFAULT 'USD',
  price_amount DECIMAL(10,2) NOT NULL,
  coin_cost INTEGER NOT NULL, -- Equivalent cost in coins
  package_type TEXT NOT NULL CHECK (package_type IN ('basic', 'premium', 'vip')),
  features TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user wallets table for coin balance
CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  coin_balance INTEGER DEFAULT 0,
  total_coins_purchased INTEGER DEFAULT 0,
  total_coins_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table for payments and coin usage
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('coin_purchase', 'coach_payment', 'refund')),
  amount_currency TEXT,
  amount_fiat DECIMAL(10,2),
  coin_amount INTEGER NOT NULL,
  coach_id UUID REFERENCES public.coaches(id),
  package_id UUID REFERENCES public.coaching_packages(id),
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user responses table to store questionnaire answers
CREATE TABLE public.user_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  selected_goal JSONB NOT NULL,
  responses JSONB NOT NULL, -- Array of question-answer pairs
  ai_analysis JSONB, -- AI analysis results
  recommended_coaches UUID[], -- Array of recommended coach IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.currency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for currency_settings (public read)
CREATE POLICY "Currency settings are publicly viewable" 
ON public.currency_settings FOR SELECT USING (true);

-- Create RLS policies for coaches (public read)
CREATE POLICY "Coaches are publicly viewable" 
ON public.coaches FOR SELECT USING (is_active = true);

-- Create RLS policies for coaching_packages (public read)
CREATE POLICY "Coaching packages are publicly viewable" 
ON public.coaching_packages FOR SELECT USING (is_active = true);

-- Create RLS policies for user_wallets
CREATE POLICY "Users can view their own wallet" 
ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" 
ON public.user_wallets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallets" 
ON public.user_wallets FOR INSERT WITH CHECK (true);

-- Create RLS policies for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" 
ON public.transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update transactions" 
ON public.transactions FOR UPDATE USING (true);

-- Create RLS policies for user_responses
CREATE POLICY "Users can view their own responses" 
ON public.user_responses FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert responses" 
ON public.user_responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own responses" 
ON public.user_responses FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Insert default currency settings
INSERT INTO public.currency_settings (currency_code, coins_per_unit) VALUES
('USD', 10),
('EUR', 11),
('GBP', 13);

-- Insert sample coaches
INSERT INTO public.coaches (name, title, bio, years_experience, specialties, similar_experiences, rating, total_reviews) VALUES
('Sarah Chen', 'Executive Leadership Coach', 'Former Fortune 500 executive turned leadership coach with expertise in career transitions and executive presence.', 15, ARRAY['Leadership', 'Career Transition', 'Executive Presence'], ARRAY['Corporate burnout', 'Career pivoting', 'Team management'], 4.9, 127),
('Marcus Thompson', 'Tech Career Strategist', 'Software engineer turned coach specializing in tech career growth and engineering leadership.', 12, ARRAY['Tech Careers', 'Engineering Leadership', 'Skill Development'], ARRAY['Coding bootcamp graduate', 'Self-taught developer', 'Tech startup experience'], 4.8, 89),
('Dr. Elena Rodriguez', 'Life Transition Coach', 'Licensed therapist and certified coach helping professionals navigate major life and career changes.', 18, ARRAY['Life Transitions', 'Work-Life Balance', 'Personal Development'], ARRAY['Mid-life career change', 'Return to workforce', 'Starting over'], 4.9, 156),
('James Wright', 'Entrepreneurship Mentor', 'Serial entrepreneur and startup advisor with 3 successful exits, now coaching aspiring founders.', 20, ARRAY['Entrepreneurship', 'Business Strategy', 'Startup Growth'], ARRAY['First-time founder', 'Business failure recovery', 'Scaling challenges'], 4.7, 203),
('Amanda Foster', 'Personal Brand Coach', 'Marketing executive turned personal branding specialist helping professionals build their online presence and thought leadership.', 10, ARRAY['Personal Branding', 'Content Strategy', 'Professional Networking'], ARRAY['Introvert networking', 'Career rebranding', 'Social media anxiety'], 4.8, 94);

-- Insert coaching packages for each coach
INSERT INTO public.coaching_packages (coach_id, name, description, duration_minutes, price_currency, price_amount, coin_cost, package_type, features) 
SELECT 
  c.id,
  'Quick Strategy Session',
  'A focused 30-minute session to discuss your immediate challenges and get actionable insights.',
  30,
  'USD',
  75.00,
  750,
  'basic',
  ARRAY['30-minute video call', 'Session notes', 'Follow-up email']
FROM public.coaches c;

INSERT INTO public.coaching_packages (coach_id, name, description, duration_minutes, price_currency, price_amount, coin_cost, package_type, features)
SELECT 
  c.id,
  'Deep Dive Coaching',
  'Comprehensive 60-minute coaching session with detailed action plan and resources.',
  60,
  'USD',
  150.00,
  1500,
  'premium',
  ARRAY['60-minute video call', 'Detailed action plan', 'Resource recommendations', '1-week follow-up']
FROM public.coaches c;

INSERT INTO public.coaching_packages (coach_id, name, description, duration_minutes, price_currency, price_amount, coin_cost, package_type, features)
SELECT 
  c.id,
  'VIP Intensive Session',
  'Premium 90-minute intensive session with comprehensive strategy development and ongoing support.',
  90,
  'USD',
  300.00,
  3000,
  'vip',
  ARRAY['90-minute video call', 'Comprehensive strategy document', 'Resource library access', '2-week email support', 'Priority booking']
FROM public.coaches c;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_currency_settings_updated_at
  BEFORE UPDATE ON public.currency_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON public.coaches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_packages_updated_at
  BEFORE UPDATE ON public.coaching_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_responses_updated_at
  BEFORE UPDATE ON public.user_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();