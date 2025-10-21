import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Clock, 
  User, 
  Target, 
  FileText, 
  Video, 
  CheckCircle, 
  AlertCircle,
  Users,
  MessageSquare,
  BookOpen,
  Zap
} from 'lucide-react';
import { format, addMinutes } from 'date-fns';

interface SessionData {
  id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  session_state: string;
  client_id: string;
  coach_id: string;
  price_amount: number;
  price_currency: string;
  coin_cost: number;
  clients: {
    id: string;
    full_name: string;
    email: string;
  };
  coaches: {
    id: string;
    name: string;
    specialties: string[];
    notification_email: string;
  };
  session_video_details: Array<{
    video_join_url: string;
    video_room_id: string;
  }>;
}

export default function CoachSessionLandingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [clientResponses, setClientResponses] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      
      // Fetch session with related data
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          *,
          clients:client_id (
            id,
            full_name,
            email
          ),
          coaches:coach_id (
            id,
            name,
            specialties,
            notification_email
          ),
          session_video_details (*)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      setSession(sessionData);

      // Fetch client profile for additional context
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', sessionData.client_id)
        .single();

      setClientProfile(profileData);

      // Fetch client responses if available
      const { data: responsesData } = await supabase
        .from('user_responses')
        .select('*')
        .eq('user_id', sessionData.client_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setClientResponses(responsesData);

    } catch (err: any) {
      console.error('Error fetching session data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSessionNotes = async () => {
    if (!sessionId || !sessionNotes.trim()) return;

    try {
      setSavingNotes(true);
      
      const { error } = await supabase
        .from('session_notes')
        .upsert({
          session_id: sessionId,
          coach_id: session?.coach_id,
          notes: sessionNotes.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'session_id,coach_id'
        });

      if (error) throw error;

      toast({
        title: "Notes Saved",
        description: "Your session notes have been saved successfully.",
      });

    } catch (err: any) {
      console.error('Error saving notes:', err);
      toast({
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const startSession = () => {
    if (session?.session_video_details?.[0]?.video_join_url) {
      // Update session state to in_progress
      supabase
        .from('sessions')
        .update({
          session_state: 'in_progress',
          status: 'in_progress',
          actual_start_time: new Date().toISOString()
        })
        .eq('id', sessionId);

      // Navigate to video session
      window.open(session.session_video_details[0].video_join_url, '_blank');
    } else {
      toast({
        title: "Session Not Ready",
        description: "The video session link is not available yet. Please wait a moment and try again.",
        variant: "destructive",
      });
    }
  };

  const getSessionStatusBadge = (status: string, sessionState: string) => {
    const combinedStatus = `${status}-${sessionState}`;
    
    switch (combinedStatus) {
      case 'scheduled-ready':
        return <Badge className="bg-blue-500">Ready to Start</Badge>;
      case 'in_progress-in_progress':
        return <Badge className="bg-green-500">In Progress</Badge>;
      case 'completed-completed':
        return <Badge className="bg-gray-500">Completed</Badge>;
      case 'cancelled-cancelled':
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canStartSession = () => {
    if (!session) return false;
    const now = new Date();
    const sessionTime = new Date(session.scheduled_time);
    const fiveMinutesBefore = new Date(sessionTime.getTime() - 5 * 60 * 1000);
    
    return now >= fiveMinutesBefore && 
           session.status === 'scheduled' && 
           session.session_state === 'ready' &&
           session.session_video_details?.[0]?.video_join_url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'The requested session could not be found.'}
            </p>
            <Button onClick={() => navigate('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scheduledTime = new Date(session.scheduled_time);
  const endTime = addMinutes(scheduledTime, session.duration_minutes);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Coach Session Dashboard</h1>
            <p className="text-muted-foreground">
              Session with {session.clients?.full_name || 'Client'}
            </p>
          </div>
          {getSessionStatusBadge(session.status, session.session_state)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Session Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Session Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Session Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scheduled Time</label>
                    <p className="text-lg">{format(scheduledTime, 'PPP p')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <p className="text-lg">{session.duration_minutes} minutes</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">End Time</label>
                    <p className="text-lg">{format(endTime, 'PPP p')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Price</label>
                    <p className="text-lg">
                      {session.price_currency} {session.price_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg">{session.clients?.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-lg">{session.clients?.email || 'Not provided'}</p>
                </div>
                
                {clientProfile?.bio && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bio</label>
                    <p className="text-sm bg-muted p-3 rounded-md">{clientProfile.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Goals & Responses */}
            {clientResponses && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Client Goals & Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clientResponses.selected_goal && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Selected Goal</label>
                      <div className="bg-muted p-3 rounded-md">
                        <h4 className="font-medium">{clientResponses.selected_goal.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {clientResponses.selected_goal.description}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {clientResponses.responses && Object.keys(clientResponses.responses).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Assessment Responses</label>
                      <div className="space-y-2">
                        {Object.entries(clientResponses.responses).map(([key, value]: [string, any]) => (
                          <div key={key} className="bg-muted p-3 rounded-md">
                            <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Session Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Session Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Add your notes about this session, client goals, preparation thoughts, or follow-up actions..."
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="min-h-32"
                />
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={saveSessionNotes}
                    disabled={savingNotes || !sessionNotes.trim()}
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {sessionNotes.length} characters
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Session Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Session Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canStartSession() ? (
                  <Button 
                    onClick={startSession}
                    className="w-full"
                    size="lg"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Start Video Session
                  </Button>
                ) : (
                  <div className="text-center p-4 bg-muted rounded-md">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Session starts at {format(scheduledTime, 'p')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You can join 5 minutes before the scheduled time
                    </p>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message to Client
                  </Button>
                  <Button variant="outline" className="w-full">
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Session History
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Session Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>Review client goals and assessment responses above</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>Ensure you have a quiet, professional environment</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>Test your camera and microphone before starting</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>Have backup discussion topics ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
