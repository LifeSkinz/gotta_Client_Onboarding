-- Create atomic financial operations to prevent race conditions
CREATE OR REPLACE FUNCTION public.process_coin_purchase(
  p_user_id uuid,
  p_coin_amount integer,
  p_stripe_session_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_record user_wallets%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Update transaction status first
  UPDATE transactions 
  SET status = 'completed'
  WHERE stripe_session_id = p_stripe_session_id 
    AND status = 'pending'
    AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or already processed';
  END IF;

  -- Atomic wallet operation - get or create wallet
  INSERT INTO user_wallets (user_id, coin_balance, total_coins_purchased)
  VALUES (p_user_id, p_coin_amount, p_coin_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    coin_balance = user_wallets.coin_balance + p_coin_amount,
    total_coins_purchased = user_wallets.total_coins_purchased + p_coin_amount,
    updated_at = now()
  RETURNING * INTO v_wallet_record;

  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'coin_amount', p_coin_amount,
    'new_balance', v_wallet_record.coin_balance
  );
  
  RETURN v_result;
END;
$$;

-- Create function to spend coins atomically
CREATE OR REPLACE FUNCTION public.spend_coins(
  p_user_id uuid,
  p_amount integer,
  p_session_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance integer;
BEGIN
  -- Check current balance and update atomically
  UPDATE user_wallets 
  SET 
    coin_balance = coin_balance - p_amount,
    total_coins_spent = total_coins_spent + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id 
    AND coin_balance >= p_amount
  RETURNING coin_balance + p_amount INTO v_current_balance;
  
  IF NOT FOUND THEN
    RETURN false; -- Insufficient balance or user not found
  END IF;
  
  -- Log the transaction if session provided
  IF p_session_id IS NOT NULL THEN
    INSERT INTO transactions (user_id, coin_amount, transaction_type, status)
    VALUES (p_user_id, -p_amount, 'session_payment', 'completed');
  END IF;
  
  RETURN true;
END;
$$;

-- Update RLS policies to be more restrictive
DROP POLICY IF EXISTS "System can insert transactions" ON transactions;
DROP POLICY IF EXISTS "System can update transactions" ON transactions;
DROP POLICY IF EXISTS "System can insert wallets" ON user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON user_wallets;

-- Transactions - only system functions can modify
CREATE POLICY "Authenticated users can view own transactions" 
ON transactions FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System functions can manage transactions" 
ON transactions FOR ALL 
TO service_role
USING (true);

-- User wallets - only atomic functions can modify
CREATE POLICY "Authenticated users can view own wallet" 
ON user_wallets FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System functions can manage wallets" 
ON user_wallets FOR ALL 
TO service_role
USING (true);

-- Sessions - fix overly permissive policies
DROP POLICY IF EXISTS "System can manage all sessions" ON sessions;

CREATE POLICY "Authenticated users can view own sessions" 
ON sessions FOR SELECT 
TO authenticated
USING (auth.uid() = client_id);

CREATE POLICY "Authenticated users can insert own sessions" 
ON sessions FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Authenticated users can update own sessions" 
ON sessions FOR UPDATE 
TO authenticated
USING (auth.uid() = client_id);

CREATE POLICY "System functions can manage all sessions" 
ON sessions FOR ALL 
TO service_role
USING (true);