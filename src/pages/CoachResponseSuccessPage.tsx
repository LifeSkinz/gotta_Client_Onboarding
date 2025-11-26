import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Calendar, ArrowLeft } from "lucide-react";

interface ContentSection {
  title: string;
  items?: string[];
  description?: string;
}

interface PageContent {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  sections: ContentSection[];
}

export default function CoachResponseSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const action = searchParams.get('action');

  useEffect(() => {
    // Immediately redirect to main app (no coaching/session-id in URL)
    if (action) {
      window.location.href = 'https://gotta-goal-forge.lovable.app/';
    }
  }, [action]);

  const getContent = (): PageContent => {
    switch (action) {
      case 'accept':
      case 'accept_5min':
      case 'accept_10min':
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-500" />,
          title: "Thank You for Accepting!",
          subtitle: "Session Request Accepted ✓",
          description: "Thank you for accepting this session request. You and the client will now receive email confirmations with session details and portal access.",
          color: "text-green-600",
          sections: [
            {
              title: "📋 Rules of Engagement",
              items: [
                "Be punctual - join the session 5 minutes early to ensure connectivity",
                "Maintain a professional demeanor and respectful communication",
                "Keep all client information confidential",
                "Provide actionable insights tailored to the client's goals",
                "Document key discussion points for follow-up"
              ]
            },
            {
              title: "🎯 What to Expect",
              description: "The client will join the video call at the scheduled time. They've prepared responses about their situation and goals. Review these before the session to tailor your coaching approach."
            },
            {
              title: "📧 Important Timing",
              items: [
                "You'll receive a reminder email 10 minutes before the session",
                "The client will also receive a reminder to prepare",
                "Access the video session portal via the link in your confirmation email",
                "All sessions are recorded for quality assurance (with consent)"
              ]
            }
          ]
        };
      case 'decline':
        return {
          icon: <XCircle className="h-16 w-16 text-red-500" />,
          title: "Request Declined",
          subtitle: "Session Request Declined ✗",
          description: "Your response has been submitted. The client will be notified and can explore other coaching options.",
          color: "text-red-600",
          sections: [
            {
              title: "📨 What Happens Next",
              items: [
                "You'll receive a confirmation email of your response",
                "The client will be notified of your decision within the hour",
                "The client will be provided with alternative coach suggestions",
                "No further action is required from you"
              ]
            },
            {
              title: "💬 Your Feedback",
              description: "If you'd like to share why you couldn't accept this session, our team values your feedback. It helps us match clients with the right coaches and improve our platform."
            }
          ]
        };
      case 'reschedule':
        return {
          icon: <Calendar className="h-16 w-16 text-orange-500" />,
          title: "Reschedule Requested",
          subtitle: "Rescheduling in Progress...",
          description: "Your reschedule request has been submitted. The client will be notified and can respond with their availability.",
          color: "text-orange-600",
          sections: [
            {
              title: "📅 Rescheduling Process",
              items: [
                "You'll receive a confirmation email of your reschedule request",
                "The client will be notified and asked to provide alternative times",
                "They typically respond within 24-48 hours",
                "You'll receive an email once they suggest new times"
              ]
            },
            {
              title: "🔄 Next Steps",
              description: "Review the client's availability suggestions. Once both parties confirm the new time, final session details will be sent to both of you. The session will proceed as scheduled with the new time."
            }
          ]
        };
      default:
        return {
          icon: <CheckCircle className="h-16 w-16 text-primary" />,
          title: "Response Submitted",
          subtitle: "Status Updated",
          description: "Your response has been successfully submitted.",
          color: "text-primary",
          sections: []
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              {content.icon}
            </div>
            
            <h1 className={`text-3xl font-bold mb-2 ${content.color}`}>
              {content.title}
            </h1>
            
            <p className="text-sm font-medium text-muted-foreground mb-4">
              {content.subtitle}
            </p>
            
            <p className="text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
              {content.description}
            </p>
          </div>
          
          {/* Detailed Sections */}
          {content.sections && content.sections.length > 0 && (
            <div className="space-y-4 mb-8">
              {content.sections.map((section, idx) => (
                <div key={idx} className="bg-muted rounded-lg p-4 border border-border/50">
                  <h3 className="font-semibold text-foreground mb-3">
                    {section.title}
                  </h3>
                  {section.items ? (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-3">
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              This page will automatically redirect in a few seconds
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
