import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Coins, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [coinAmount, setCoinAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-coin-purchase", {
        body: { sessionId },
      });

      if (error) throw error;

      setVerified(true);
      setCoinAmount(data.coinAmount);
      
      toast({
        title: "Payment Successful!",
        description: `${data.coinAmount} coins have been added to your wallet.`,
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast({
        title: "Verification Error",
        description: "There was an issue verifying your payment. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            {verified ? "Payment Successful!" : "Payment Processing"}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          {verified ? (
            <>
              <div className="flex items-center justify-center gap-2 text-primary">
                <Coins className="h-6 w-6" />
                <span className="text-2xl font-bold">{coinAmount} coins</span>
              </div>
              <p className="text-muted-foreground">
                Your coins have been added to your wallet and are ready to use for coaching sessions.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              Your payment is being processed. This may take a few moments.
            </p>
          )}

          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/coaches")} 
              className="w-full"
              variant="default"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Browse Coaches
            </Button>
            
            <Button 
              onClick={() => navigate("/")} 
              variant="outline" 
              className="w-full"
            >
              Return Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};