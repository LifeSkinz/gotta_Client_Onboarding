import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-COIN-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Create Supabase client using service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Create client for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { packageId } = await req.json();
    if (!packageId) throw new Error("Package ID is required");
    logStep("Package ID received", { packageId });

    // Get coin package details
    const { data: coinPackage, error: packageError } = await supabaseService
      .from("coin_packages")
      .select("*")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();

    if (packageError || !coinPackage) {
      throw new Error("Coin package not found or inactive");
    }
    logStep("Coin package found", coinPackage);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup complete", { customerId });

    // Calculate total coins (base + bonus)
    const totalCoins = coinPackage.coin_amount + (coinPackage.bonus_coins || 0);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: coinPackage.price_currency.toLowerCase(),
            product_data: { 
              name: coinPackage.name,
              description: `${coinPackage.coin_amount} coins${coinPackage.bonus_coins ? ` + ${coinPackage.bonus_coins} bonus coins` : ''}`
            },
            unit_amount: Math.round(coinPackage.price_amount * 100), // Convert to pence/cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        coin_amount: totalCoins.toString(),
      },
    });
    logStep("Stripe session created", { sessionId: session.id, url: session.url });

    // Create transaction record
    await supabaseService.from("transactions").insert({
      user_id: user.id,
      transaction_type: "coin_purchase",
      coin_amount: totalCoins,
      amount_fiat: coinPackage.price_amount,
      amount_currency: coinPackage.price_currency,
      stripe_session_id: session.id,
      package_id: packageId,
      status: "pending",
    });
    logStep("Transaction record created");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-coin-purchase", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});