import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CoinPackage {
  id: string;
  name: string;
  coin_amount: number;
  price_amount: number;
  price_currency: string;
  bonus_coins: number;
  is_popular: boolean;
}

interface CoinPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: (coinAmount: number) => void;
}

export const CoinPurchaseDialog = ({ open, onOpenChange, onPurchaseComplete }: CoinPurchaseDialogProps) => {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();

  // Load packages when dialog opens
  useEffect(() => {
    if (open) {
      loadPackages();
    }
  }, [open]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coin_packages")
        .select("*")
        .eq("is_active", true)
        .order("price_amount");

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error("Error loading packages:", error);
      toast({
        title: "Error",
        description: "Failed to load coin packages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const { data, error } = await supabase.functions.invoke("create-coin-purchase", {
        body: { packageId },
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      if (data?.url) {
        window.open(data.url, '_blank');
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error creating purchase:", error);
      toast({
        title: "Error",
        description: "Failed to create purchase session",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getPackageIcon = (isPopular: boolean, coinAmount: number) => {
    if (isPopular) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (coinAmount >= 25) return <Sparkles className="h-5 w-5 text-purple-500" />;
    return <Coins className="h-5 w-5 text-blue-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Purchase Coins
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={`relative transition-all duration-200 hover:shadow-lg ${
                  pkg.is_popular ? 'ring-2 ring-primary shadow-primary/20' : ''
                }`}
              >
                {pkg.is_popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2">
                    {getPackageIcon(pkg.is_popular, pkg.coin_amount)}
                  </div>
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <CardDescription className="text-2xl font-bold text-primary">
                    {formatPrice(pkg.price_amount, pkg.price_currency)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-foreground mb-1">
                      {pkg.coin_amount}
                    </div>
                    <div className="text-sm text-muted-foreground">Base Coins</div>
                    
                    {pkg.bonus_coins > 0 && (
                      <div className="mt-2">
                        <div className="text-lg font-semibold text-green-600">
                          +{pkg.bonus_coins}
                        </div>
                        <div className="text-xs text-green-600">Bonus Coins</div>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground mb-4">
                    Total: {pkg.coin_amount + (pkg.bonus_coins || 0)} coins
                  </div>

                  <Button
                    className="w-full"
                    variant={pkg.is_popular ? "default" : "outline"}
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing === pkg.id}
                  >
                    {purchasing === pkg.id ? "Processing..." : "Purchase"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mt-4">
          <p>💡 1 coin = 15 minutes of coaching session</p>
          <p>Secure payment powered by Stripe</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};