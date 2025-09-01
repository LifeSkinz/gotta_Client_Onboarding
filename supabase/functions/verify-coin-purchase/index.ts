import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-COIN-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Create Supabase client using service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    logStep("Session ID received", { sessionId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Stripe session retrieved", { status: session.payment_status, userId: session.metadata?.user_id });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const userId = session.metadata?.user_id;
    const coinAmount = parseInt(session.metadata?.coin_amount || "0");
    
    if (!userId || !coinAmount) {
      throw new Error("Invalid session metadata");
    }

    // Update transaction status
    const { error: transactionError } = await supabaseService
      .from("transactions")
      .update({ status: "completed" })
      .eq("stripe_session_id", sessionId)
      .eq("status", "pending");

    if (transactionError) {
      logStep("Transaction update error", transactionError);
      throw new Error("Failed to update transaction");
    }

    // Get or create user wallet
    let { data: wallet, error: walletError } = await supabaseService
      .from("user_wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (walletError && walletError.code !== "PGRST116") {
      throw new Error("Failed to fetch wallet");
    }

    if (!wallet) {
      // Create new wallet
      const { data: newWallet, error: createError } = await supabaseService
        .from("user_wallets")
        .insert({
          user_id: userId,
          coin_balance: coinAmount,
          total_coins_purchased: coinAmount,
        })
        .select()
        .single();

      if (createError) {
        throw new Error("Failed to create wallet");
      }
      wallet = newWallet;
    } else {
      // Update existing wallet
      const { error: updateError } = await supabaseService
        .from("user_wallets")
        .update({
          coin_balance: wallet.coin_balance + coinAmount,
          total_coins_purchased: wallet.total_coins_purchased + coinAmount,
        })
        .eq("user_id", userId);

      if (updateError) {
        throw new Error("Failed to update wallet");
      }
    }

    logStep("Wallet updated successfully", { coinAmount, newBalance: wallet.coin_balance + coinAmount });

    return new Response(JSON.stringify({ 
      success: true, 
      coinAmount,
      newBalance: wallet.coin_balance + coinAmount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-coin-purchase", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});