import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, ArrowRight } from "lucide-react";

export default function SessionPortalFallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to sessions list after 5 seconds
    const timer = setTimeout(() => {
      navigate('/sessions');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <AlertCircle className="h-12 w-12 mx-auto text-orange-500 mb-4" />
          <CardTitle className="text-xl">Session Portal Access</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            It looks like you're trying to access the session portal without a specific session ID.
          </p>
          
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Tip:</strong> Session portal links should include your specific session ID and are typically sent via email when a coach accepts your request.
            </p>
          </div>
          
          <div className="space-y-3 pt-4">
            <Button onClick={() => navigate('/sessions')} className="w-full">
              <Calendar className="h-4 w-4 mr-2" />
              View My Sessions
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/coaches')} 
              className="w-full"
            >
              Browse Coaches
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground pt-2">
            Redirecting to your sessions in 5 seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}