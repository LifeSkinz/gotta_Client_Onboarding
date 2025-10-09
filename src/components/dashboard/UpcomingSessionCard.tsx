import { format, isBefore, addMinutes } from "date-fns";
import { Calendar, Video, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

interface Session {
  id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  session_state: string;
  video_join_url: string | null;
  coach: {
    name: string;
    avatar_url: string | null;
    title: string;
  };
}

interface UpcomingSessionCardProps {
  session: Session;
}

export const UpcomingSessionCard = ({ session }: UpcomingSessionCardProps) => {
  const navigate = useNavigate();
  const scheduledTime = new Date(session.scheduled_time);
  const canJoin = session.session_state === 'ready' || 
                  isBefore(scheduledTime, addMinutes(new Date(), 5));

  const handleJoinSession = () => {
    if (session.video_join_url) {
      navigate(`/video-session/${session.id}`);
    }
  };

  return (
    <Card className="p-4 bg-card border-border hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={session.coach.avatar_url || undefined} />
          <AvatarFallback>
            {session.coach.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">
            {session.coach.name}
          </h4>
          <p className="text-xs text-muted-foreground truncate mb-2">
            {session.coach.title}
          </p>
          
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(scheduledTime, "MMM dd, yyyy")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{format(scheduledTime, "h:mm a")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {canJoin && session.video_join_url && (
          <Button
            size="sm"
            className="flex-1"
            onClick={handleJoinSession}
          >
            <Video className="h-3 w-3 mr-1" />
            Join
          </Button>
        )}
      </div>
    </Card>
  );
};
