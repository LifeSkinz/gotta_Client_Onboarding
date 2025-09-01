-- Update coach pricing to correct coin economics (4 coins per hour instead of 100)
UPDATE public.coaches 
SET hourly_coin_cost = 4
WHERE hourly_coin_cost = 100;

-- Create coin packages table with realistic pricing (£8 per coin)
CREATE TABLE public.coin_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coin_amount INTEGER NOT NULL,
  price_amount NUMERIC(10,2) NOT NULL,
  price_currency TEXT NOT NULL DEFAULT 'GBP',
  bonus_coins INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_packages ENABLE ROW LEVEL SECURITY;

-- Create policy for public viewing of active packages
CREATE POLICY "Coin packages are publicly viewable" 
ON public.coin_packages 
FOR SELECT 
USING (is_active = true);

-- Insert realistic coin packages (£8 per coin)
INSERT INTO public.coin_packages (name, coin_amount, price_amount, bonus_coins, is_popular) VALUES
('Starter Pack', 5, 40.00, 0, false),
('Popular Pack', 10, 72.00, 1, true),
('Value Pack', 25, 160.00, 5, false),
('Premium Pack', 50, 280.00, 15, false);

-- Create trigger for updated_at
CREATE TRIGGER update_coin_packages_updated_at
  BEFORE UPDATE ON public.coin_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();