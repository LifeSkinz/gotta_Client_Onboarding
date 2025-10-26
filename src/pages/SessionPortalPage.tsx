import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VideoSessionInterface } from "@/components/VideoSessionInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Clock, Video, Users, Target, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isAfter, isBefore, addMinutes, differenceInMinutes } from "date-fns";

interface Session {
  id: string;
  client_id: string;
  coach_id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  video_join_url?: string;
  video_room_id?: string;
  session_video_details?: {
    video_join_url?: string;
    video_room_id?: string;
  };
  coaches: {
    name: string;
    title: string;
    avatar_url?: string;
  };
}

interface SessionGoal {
  id: string;
  goal_description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}

export default function SessionPortalPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [goals, setGoals] = useState<SessionGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [inSession, setInSession] = useState(false);
  const [timeToSession, setTimeToSession] = useState<string>("");
  const [preparationNotes, setPreparationNotes] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const { toast } = useToast();

  // Handle missing sessionId
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Invalid Session Link</h2>
            <p className="text-muted-foreground mb-4">
              The session link is missing or invalid. Please check your email for the correct link.
            </p>
            <Button onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      checkJoinAvailability();
      const interval = setInterval(checkJoinAvailability, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchSessionData = async () => {
    try {
      // Use secure edge function instead of direct query
      const { data, error } = await supabase.functions.invoke('get-session-by-token', {
        body: { token: sessionId }
      });

      if (error || !data) {
        console.error('Error fetching session:', error);
        setSession(null);
        setLoading(false);
        return;
      }

      // Fetch coach details separately (public data)
      const { data: coachData } = await supabase
        .from('coaches')
        .select('name, title, avatar_url')
        .eq('id', data.coach_id)
        .single();

      setSession({
        ...data,
        coaches: coachData || { name: 'Coach', title: '', avatar_url: null }
      } as Session);

      if (error) throw error;
      setSession(data);

      // Fetch session goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('session_analytics')
        .select('id, goal_description, initial_assessment, final_assessment')
        .eq('session_id', sessionId);

      if (goalsData) {
        setGoals(goalsData.map((g: any) => ({
          id: g.id,
          goal_description: g.goal_description,
          priority: 'medium' as const,
          status: 'pending' as const
        })));
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
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
                       (session.status === 'scheduled' || session.status === 'ready');

    setCanJoin(canJoinNow);

    // Calculate time to session
    const minutesToSession = differenceInMinutes(scheduledTime, now);
    if (minutesToSession > 0) {
      if (minutesToSession > 60) {
        const hours = Math.floor(minutesToSession / 60);
        const minutes = minutesToSession % 60;
        setTimeToSession(`${hours}h ${minutes}m`);
      } else {
        setTimeToSession(`${minutesToSession}m`);
      }
    } else if (minutesToSession > -session.duration_minutes) {
      setTimeToSession("Session in progress");
    } else {
      setTimeToSession("Session ended");
    }
  };

  const createVideoRoom = async () => {
    if (!session) return;

    setCreatingRoom(true);
    try {
      // First try the Daily.co room creation
      const { data: dailyData, error: dailyError } = await supabase.functions.invoke('create-daily-room', {
        body: { 
          sessionId: session.id,
          retryOnFailure: true
        }
      });

      if (dailyError || !dailyData?.room_url) {
        // If Daily.co fails, try fallback to VideoSDK
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('generate-video-link', {
          body: { 
            sessionId: session.id,
            justInTime: true,
            useFallback: true
          }
        });

        if (fallbackError) throw fallbackError;
        if (!fallbackData?.videoLink) throw new Error('Failed to create video room with both providers');

        // Update local session state with fallback video link
        setSession(prev => prev ? { ...prev, video_join_url: fallbackData.videoLink } : null);
        console.log('Fallback video link:', fallbackData.videoLink);
      } else {
        // Update local session state with Daily.co room
        setSession(prev => prev ? { ...prev, video_join_url: dailyData.room_url } : null);
        console.log('Daily.co video link:', dailyData.room_url);
      }

      toast({
        title: "Video Room Ready",
        description: "Your session room has been created. Joining now...",
      });
      
      setInSession(true);
    } catch (error) {
      console.error('Error creating video room:', error);
      toast({
        title: "Error",
        description: "Failed to create video room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleJoinSession = async () => {
    try {
      setCreatingRoom(true);
      
      // Check if video URL already exists - extract from nested structure
      const existingVideoUrl = session?.session_video_details?.video_join_url || session?.video_join_url;
      
      if (existingVideoUrl) {
        console.log('Using existing video room', { sessionId, videoUrl: existingVideoUrl });
        setSession(prev => prev ? { ...prev, video_join_url: existingVideoUrl } : null);
        setInSession(true);
        return;
      }
      
      // Only create new room if no URL exists
      console.log('Creating new video room', { sessionId });
      await createVideoRoom();
    } catch (error) {
      console.error('Failed to join session', { error, sessionId });
      toast({
        title: "Error",
        description: "Failed to join session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleSessionEnd = () => {
    toast({
      title: "Session Completed",
      description: "Thank you for your session! Analysis is being processed.",
    });
    navigate('/sessions');
  };

  const savePreparationNotes = async () => {
    if (!session || !preparationNotes.trim()) return;

    try {
      await supabase
        .from('sessions')
        .update({ notes: preparationNotes })
        .eq('id', session.id);

      toast({
        title: "Notes Saved",
        description: "Your preparation notes have been saved.",
      });
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading session portal...</p>
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

  // If user is in session, show video interface
  // Extract video URL from nested structure or direct property
  const videoUrl = session?.session_video_details?.video_join_url || session?.video_join_url;
  
  if (inSession && videoUrl) {
    return (
      <VideoSessionInterface
        sessionId={session.id}
        coachId={session.coach_id}
        clientId={session.client_id}
        scheduledTime={session.scheduled_time}
        duration={session.duration_minutes}
        videoUrl={videoUrl}
        onSessionEnd={handleSessionEnd}
      />
    );
  }

  const scheduledTime = new Date(session.scheduled_time);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/sessions')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sessions
            </Button>
            <Badge variant={canJoin ? "default" : "secondary"}>
              {timeToSession}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {session.coaches.avatar_url && (
                  <img 
                    src={session.coaches.avatar_url} 
                    alt={session.coaches.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{session.coaches.name}</h3>
                  <p className="text-sm text-muted-foreground">{session.coaches.title}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{format(scheduledTime, 'PPP p')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4" />
                  <span>{session.duration_minutes} minutes</span>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleJoinSession}
                  disabled={!canJoin || creatingRoom}
                  className="w-full"
                  size="lg"
                >
                  {creatingRoom ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating Room...
                    </>
                  ) : canJoin ? (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Join Session
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Wait for Session Time
                    </>
                  )}
                </Button>
              </div>

              {!canJoin && (
                <p className="text-xs text-muted-foreground text-center">
                  You can join 5 minutes before the scheduled time
                </p>
              )}
            </CardContent>
          </Card>

          {/* Session Preparation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Session Preparation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="preparation-notes">Preparation Notes</Label>
                <Textarea
                  id="preparation-notes"
                  placeholder="What do you want to focus on in this session? Any specific questions or concerns?"
                  value={preparationNotes}
                  onChange={(e) => setPreparationNotes(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={savePreparationNotes}
                  className="mt-2"
                  disabled={!preparationNotes.trim()}
                >
                  Save Notes
                </Button>
              </div>

              {goals.length > 0 && (
                <div>
                  <Label>Session Goals</Label>
                  <div className="mt-2 space-y-2">
                    {goals.map((goal) => (
                      <div key={goal.id} className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{goal.goal_description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">
                            {goal.priority}
                          </Badge>
                          <Badge variant="secondary">
                            {goal.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Pre-Session Checklist</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Test your camera and microphone</li>
                  <li>• Ensure stable internet connection</li>
                  <li>• Find a quiet, well-lit space</li>
                  <li>• Have water and note-taking materials ready</li>
                  <li>• Review your goals and questions</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}