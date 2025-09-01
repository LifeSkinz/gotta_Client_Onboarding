import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CoinPurchaseDialog } from "./CoinPurchaseDialog";
import { useToast } from "@/hooks/use-toast";

interface UserWalletProps {
  userId?: string;
  onBalanceChange?: (balance: number) => void;
}

export const UserWallet = ({ userId, onBalanceChange }: UserWalletProps) => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadBalance();
    }
  }, [userId]);

  const loadBalance = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("coin_balance")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const currentBalance = data?.coin_balance || 0;
      setBalance(currentBalance);
      onBalanceChange?.(currentBalance);
    } catch (error) {
      console.error("Error loading balance:", error);
      toast({
        title: "Error",
        description: "Failed to load coin balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseComplete = (coinAmount: number) => {
    // Refresh balance after purchase
    loadBalance();
    toast({
      title: "Purchase Successful",
      description: `${coinAmount} coins added to your wallet!`,
    });
  };

  return (
    <>
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            Coin Balance
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadBalance}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary mb-2">
            {loading ? "..." : balance}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Available coins for sessions
          </p>
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => setShowPurchaseDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Buy Coins
          </Button>
        </CardContent>
      </Card>

      <CoinPurchaseDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </>
  );
};