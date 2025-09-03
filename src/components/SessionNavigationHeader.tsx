import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Settings, User, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SessionNavigationHeaderProps {
  sessionId: string;
  coachName: string;
  sessionStatus: 'waiting' | 'active' | 'completed';
  timeRemaining?: string;
}

export const SessionNavigationHeader = ({ 
  sessionId, 
  coachName, 
  sessionStatus,
  timeRemaining 
}: SessionNavigationHeaderProps) => {
  const navigate = useNavigate();

  const getStatusColor = () => {
    switch (sessionStatus) {
      case 'waiting': return 'secondary';
      case 'active': return 'default';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusText = () => {
    switch (sessionStatus) {
      case 'waiting': return 'Waiting';
      case 'active': return 'Live';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  return (
    <Card className="mb-6 border-l-4 border-l-primary">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/sessions')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Sessions
            </Button>
            
            <div className="hidden sm:block w-px h-6 bg-border" />
            
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium text-sm">Session with {coachName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getStatusColor()} className="text-xs">
                    {getStatusText()}
                  </Badge>
                  {timeRemaining && sessionStatus === 'active' && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {timeRemaining}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/sessions')}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/profile')}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};