import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VideoSessionInterface } from "@/components/VideoSessionInterface";
import { SessionLobby } from "@/components/SessionLobby";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore, addMinutes } from "date-fns";
import { SessionManager } from "@/services/SessionManager";
import { SecurityService } from "@/services/SecurityService";
import { logger } from "@/services/logger";
import { config } from "@/config";

interface Session {
  id: string;
  client_id: string;
  coach_id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  video_join_url?: string;
  coaches: {
    name: string;
    title: string;
  };
}

export default function VideoSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [inSession, setInSession] = useState(false);
  const { toast } = useToast();

  // Initialize services
  const sessionManager = new SessionManager(supabase);
  const securityService = new SecurityService(
    supabase,
    config.security.jwtSecret,
    config.security.encryptionKey
  );

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      checkJoinAvailability();
    }
  }, [session]);

  const fetchSession = async () => {
    try {
      const data = await sessionManager.initializeSession(sessionId!);
      setSession(data);

      // Validate session security
      const isValid = await securityService.validateSession(
        securityService.generateSessionToken(sessionId!, data.client_id)
      );

      if (!isValid) {
        throw new Error('Invalid or expired session');
      }

      logger.info('Session fetched successfully', { sessionId });
    } catch (error) {
      logger.error('Error fetching session:', { sessionId, error });
      toast({
        title: "Error",
        description: "Failed to load session details.",
        variant: "destructive",
      });
      navigate('/sessions');
    } finally {
      setLoading(false);
    }
  };

  const checkJoinAvailability = () => {
    if (!session) return;

    const scheduledTime = new Date(session.scheduled_time);
    const now = new Date();
    const joinWindow = addMinutes(scheduledTime, -5); // Can join 5 minutes early
    const endWindow = addMinutes(scheduledTime, session.duration_minutes + 15); // 15 minutes grace

    const canJoinNow = isAfter(now, joinWindow) && 
                       isBefore(now, endWindow) && 
                       session.status === 'scheduled';

    setCanJoin(canJoinNow);
  };

  const handleJoinSession = async () => {
    try {
      // Transition session state
      await sessionManager.transitionState(sessionId!, 'in_progress', {
        joinTime: new Date().toISOString()
      });

      logger.info('Joining session', { sessionId });
      setInSession(true);
    } catch (error) {
      logger.error('Error joining session', { sessionId, error });
      toast({
        title: "Error",
        description: "Failed to join session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSessionEnd = () => {
    toast({
      title: "Session Completed",
      description: "Thank you for your feedback! Session analysis is being processed.",
    });
    navigate('/sessions');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The session you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/sessions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If session hasn't started yet or is outside join window
  if (!canJoin && session.status === 'scheduled') {
    const scheduledTime = new Date(session.scheduled_time);
    const now = new Date();
    const joinWindow = addMinutes(scheduledTime, -5);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Clock className="h-12 w-12 mx-auto text-primary mb-4" />
            <h2 className="text-lg font-semibold">Session Not Ready</h2>
            
            {isBefore(now, joinWindow) ? (
              <>
                <p className="text-muted-foreground">
                  Your session with <strong>{session.coaches.name}</strong> is scheduled for:
                </p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium">{format(scheduledTime, 'PPP')}</p>
                  <p className="text-sm text-muted-foreground">{format(scheduledTime, 'p')}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can join 5 minutes before the scheduled time.
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  This session has ended or the join window has expired.
                </p>
                <p className="text-sm text-muted-foreground">
                  Session was scheduled for {format(scheduledTime, 'PPP p')}
                </p>
              </>
            )}
            
            <Button onClick={() => navigate('/sessions')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session is ready to join or in progress
  if (!session.video_join_url) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Video Link Unavailable</h2>
            <p className="text-muted-foreground mb-4">
              The video link for this session is not available. Please contact support.
            </p>
            <Button onClick={() => navigate('/sessions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show lobby first, then session interface after joining
  if (!inSession) {
    return (
      <SessionLobby
        sessionId={session.id}
        scheduledTime={session.scheduled_time}
        coachName={session.coaches.name}
        duration={session.duration_minutes}
        onJoinSession={handleJoinSession}
        canJoin={canJoin}
        isPostBooking={window.location.search.includes('from=booking')}
      />
    );
  }

  return (
    <VideoSessionInterface
      sessionId={session.id}
      coachId={session.coach_id}
      clientId={session.client_id}
      scheduledTime={session.scheduled_time}
      duration={session.duration_minutes}
      videoUrl={session.video_join_url}
      onSessionEnd={handleSessionEnd}
    />
  );
}