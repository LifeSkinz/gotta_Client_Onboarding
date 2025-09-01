import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

export const PaymentCancelledPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl text-orange-600">
            Payment Cancelled
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Your payment was cancelled. No charges were made to your account.
          </p>

          <div className="space-y-3">
            <Button 
              onClick={() => navigate(-1)} 
              className="w-full"
              variant="default"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={() => navigate("/")} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};