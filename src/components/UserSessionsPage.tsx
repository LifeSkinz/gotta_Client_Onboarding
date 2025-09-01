import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Video, User, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore, addMinutes } from "date-fns";

interface Session {
  id: string;
  session_id: string;
  scheduled_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  duration_minutes: number;
  status: string;
  video_join_url?: string;
  price_amount: number;
  coin_cost: number;
  coaches: {
    name: string;
    avatar_url?: string;
    title: string;
  };
}

export const UserSessionsPage = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          coaches (
            name,
            avatar_url,
            title
          )
        `)
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load your sessions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'in_progress': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      case 'no_show': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const canJoinSession = (session: Session) => {
    const scheduledTime = new Date(session.scheduled_time);
    const now = new Date();
    const joinWindow = addMinutes(scheduledTime, -5); // Can join 5 minutes early
    const endWindow = addMinutes(scheduledTime, session.duration_minutes + 15); // 15 minutes grace period
    
    return isAfter(now, joinWindow) && isBefore(now, endWindow) && session.status === 'scheduled';
  };

  const handleJoinSession = (sessionId: string) => {
    // Navigate to the video session page instead of opening external link
    window.location.href = `/session/${sessionId}`;
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="text-center">Loading your sessions...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Sessions</h1>
        <p className="text-muted-foreground mt-2">
          Manage your coaching sessions and join video calls
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No sessions yet</h3>
            <p className="text-muted-foreground">
              Book your first coaching session to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={session.coaches.avatar_url} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{session.coaches.name}</CardTitle>
                      <CardDescription>{session.coaches.title}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getStatusColor(session.status)}>
                    {session.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(session.scheduled_time), 'PPP')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(session.scheduled_time), 'p')} 
                        ({session.duration_minutes} min)
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Cost: </span>
                      ${session.price_amount} ({session.coin_cost} coins)
                    </div>
                    
                    {canJoinSession(session) && session.video_join_url && (
                      <Button 
                        onClick={() => handleJoinSession(session.id)}
                        className="w-full"
                        variant="default"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Join Session
                      </Button>
                    )}
                    
                    {session.status === 'scheduled' && !canJoinSession(session) && (
                      <div className="text-sm text-muted-foreground">
                        Session starts {format(new Date(session.scheduled_time), 'p')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};