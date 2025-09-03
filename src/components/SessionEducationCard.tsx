import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, MessageSquare, Target, FileText, Clock, Users } from "lucide-react";

export const SessionEducationCard = () => {
  const features = [
    {
      icon: <Video className="h-4 w-4" />,
      title: "HD Video & Audio",
      description: "Professional quality video calls with automatic quality adjustment"
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      title: "Real-time Notes",
      description: "Take notes together with your coach during the session"
    },
    {
      icon: <Target className="h-4 w-4" />,
      title: "Goal Tracking",
      description: "Set and track progress on specific goals throughout the session"
    },
    {
      icon: <FileText className="h-4 w-4" />,
      title: "Session Transcripts",
      description: "Get AI-powered transcripts and insights after each session"
    },
    {
      icon: <Clock className="h-4 w-4" />,
      title: "Smart Timing",
      description: "Built-in session timer with grace periods and extension options"
    },
    {
      icon: <Users className="h-4 w-4" />,
      title: "Coach Dashboard",
      description: "Your coach has access to specialized tools to enhance your experience"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Session Portal Features
          <Badge variant="secondary" className="ml-auto">Interactive Tour</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-shrink-0 mt-0.5 text-primary">
                {feature.icon}
              </div>
              <div>
                <h4 className="font-medium text-sm">{feature.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-sm text-primary font-medium mb-1">
            💡 Pro Tip: First time using our platform?
          </p>
          <p className="text-xs text-muted-foreground">
            Once you join the session, take a moment to explore the interface. Your coach will be happy to walk you through any features during the first few minutes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};