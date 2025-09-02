import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Calendar, ArrowLeft } from "lucide-react";

export default function CoachResponseSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const action = searchParams.get('action');

  useEffect(() => {
    // Auto-redirect after 10 seconds if action is provided
    if (action) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [action, navigate]);

  const getContent = () => {
    switch (action) {
      case 'accept':
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-500" />,
          title: "Thank You for Accepting!",
          description: "Thank you for accepting this session request. You and the client will now receive an email with session details and portal access.",
          nextSteps: "Check your email for confirmation and the client will receive their session link shortly.",
          color: "text-green-600"
        };
      case 'decline':
        return {
          icon: <XCircle className="h-16 w-16 text-red-500" />,
          title: "Request Declined",
          description: "Your response has been submitted. The client will be notified and can explore other coaching options.",
          nextSteps: "You'll receive a confirmation email, and the client will be provided with alternative coach suggestions.",
          color: "text-red-600"
        };
      case 'reschedule':
        return {
          icon: <Calendar className="h-16 w-16 text-orange-500" />,
          title: "Reschedule Requested",
          description: "Your reschedule request has been submitted. The client will be notified and can respond with their availability.",
          nextSteps: "You'll receive a confirmation email, and the client will be asked to provide alternative times.",
          color: "text-orange-600"
        };
      default:
        return {
          icon: <CheckCircle className="h-16 w-16 text-primary" />,
          title: "Response Submitted",
          description: "Your response has been successfully submitted.",
          nextSteps: "All parties will be notified of the update.",
          color: "text-primary"
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            {content.icon}
          </div>
          
          <h1 className={`text-2xl font-bold mb-4 ${content.color}`}>
            {content.title}
          </h1>
          
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {content.description}
          </p>
          
          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-foreground">
              <strong>Next steps:</strong> {content.nextSteps}
            </p>
          </div>
          
          <div className="space-y-3">
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
            
            <p className="text-xs text-muted-foreground">
              This page will automatically redirect in a few seconds
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}