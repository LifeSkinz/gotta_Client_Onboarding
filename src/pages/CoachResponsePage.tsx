import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  User, 
  AlertCircle,
  Loader2,
  ArrowRight,
  Video,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

interface SessionData {
  id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  session_state: string;
  client_id: string;
  coach_id: string;
  notes?: string;
  client_profile?: {
    user_id: string;
    full_name: string | null;
  };
  coaches?: {
    id: string;
    name: string;
    specialties: string[];
  };
  session_video_details?: Array<{
    video_join_url: string | null;
    video_room_id: string | null;
  }>;
}

type ResponseAction = 'accept' | 'accept_5min' | 'accept_10min' | 'decline' | 'reschedule';

export default function CoachResponsePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sessionId = searchParams.get('sessionId');
  const action = searchParams.get('action') as ResponseAction;

  useEffect(() => {
    if (sessionId && action) {
      fetchSessionData();
    } else {
      setError('Missing session ID or action');
      setLoading(false);
    }
  }, [sessionId, action]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      
      // Fetch base session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Fetch coach data separately
      const { data: coachData } = await supabase
        .from('coaches')
        .select('id, name, specialties')
        .eq('id', sessionData.coach_id)
        .maybeSingle();

      // Fetch session video details separately
      const { data: videoData } = await supabase
        .from('session_video_details')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      // Fetch client profile separately
      const { data: clientProfileData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('user_id', sessionData.client_id)
        .maybeSingle();

      setSession({
        ...sessionData,
        coaches: coachData || undefined,
        client_profile: clientProfileData || undefined,
        session_video_details: videoData ? [videoData] : []
      } as SessionData);

    } catch (err: any) {
      console.error('Error fetching session data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCoachResponse = async () => {
    if (!sessionId || !action) return;

    try {
      setProcessing(true);
      
      // Call the coach response handler function
      const { data, error } = await supabase.functions.invoke('handle-coach-response', {
        body: {
          sessionId,
          action
        }
      });

      if (error) throw error;

      // Show success message
      toast({
        title: "Response Recorded",
        description: getSuccessMessage(action),
      });

      // Redirect to coach session landing page after a short delay
      setTimeout(() => {
        if (action.startsWith('accept')) {
          navigate(`/coach-session/${sessionId}`);
        } else {
          navigate('/');
        }
      }, 2000);

    } catch (err: any) {
      console.error('Error processing coach response:', err);
      toast({
        title: "Error",
        description: "Failed to process your response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getActionIcon = (action: ResponseAction) => {
    switch (action) {
      case 'accept':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'accept_5min':
      case 'accept_10min':
        return <Clock className="h-8 w-8 text-yellow-500" />;
      case 'decline':
        return <XCircle className="h-8 w-8 text-red-500" />;
      case 'reschedule':
        return <Calendar className="h-8 w-8 text-blue-500" />;
      default:
        return <AlertCircle className="h-8 w-8 text-gray-500" />;
    }
  };

  const getActionTitle = (action: ResponseAction) => {
    switch (action) {
      case 'accept':
        return 'Accept Session';
      case 'accept_5min':
        return 'Accept - Ready in 5 Minutes';
      case 'accept_10min':
        return 'Accept - Ready in 10 Minutes';
      case 'decline':
        return 'Decline Session';
      case 'reschedule':
        return 'Request Reschedule';
      default:
        return 'Respond to Session';
    }
  };

  const getActionDescription = (action: ResponseAction) => {
    switch (action) {
      case 'accept':
        return 'You are accepting this session and indicating you are ready to start immediately.';
      case 'accept_5min':
        return 'You are accepting this session and will be ready to start in 5 minutes.';
      case 'accept_10min':
        return 'You are accepting this session and will be ready to start in 10 minutes.';
      case 'decline':
        return 'You are declining this session request. The client will be notified and can book with another coach.';
      case 'reschedule':
        return 'You are requesting to reschedule this session. The client will be notified to choose a new time.';
      default:
        return 'Please confirm your response to this session request.';
    }
  };

  const getSuccessMessage = (action: ResponseAction) => {
    switch (action) {
      case 'accept':
        return 'Session accepted! You will be redirected to your session dashboard.';
      case 'accept_5min':
        return 'Session accepted! You indicated you will be ready in 5 minutes.';
      case 'accept_10min':
        return 'Session accepted! You indicated you will be ready in 10 minutes.';
      case 'decline':
        return 'Session declined. The client has been notified.';
      case 'reschedule':
        return 'Reschedule requested. The client will be notified to choose a new time.';
      default:
        return 'Your response has been recorded.';
    }
  };

  const getActionButtonText = (action: ResponseAction) => {
    switch (action) {
      case 'accept':
        return 'Accept & Start Session';
      case 'accept_5min':
        return 'Accept - Ready in 5 min';
      case 'accept_10min':
        return 'Accept - Ready in 10 min';
      case 'decline':
        return 'Confirm Decline';
      case 'reschedule':
        return 'Request Reschedule';
      default:
        return 'Confirm Response';
    }
  };

  const getActionButtonVariant = (action: ResponseAction) => {
    if (action.startsWith('accept')) return 'default';
    if (action === 'decline') return 'destructive';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
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
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'Session not found'}
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getActionIcon(action)}
          </div>
          <CardTitle className="text-2xl">{getActionTitle(action)}</CardTitle>
          <p className="text-muted-foreground">
            {getActionDescription(action)}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          
          {/* Session Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Client:</span>
              <span>{session.client_profile?.full_name || 'Unknown'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Scheduled:</span>
              <span>{format(scheduledTime, 'PPP p')}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Duration:</span>
              <span>{session.duration_minutes} minutes</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={session.status === 'scheduled' ? 'default' : 'secondary'}>
                {session.status}
              </Badge>
            </div>
          </div>

          {/* Client Information */}
          {session.client_profile && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Client Information</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p><strong>Name:</strong> {session.client_profile.full_name}</p>
              </div>
            </div>
          )}

          {/* Confirmation Message */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Please confirm your response
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  {action.startsWith('accept') 
                    ? 'Once you accept, the client will be notified and you will be taken to your session dashboard.'
                    : 'Your response will be sent to the client immediately.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleCoachResponse}
              disabled={processing}
              variant={getActionButtonVariant(action)}
              size="lg"
              className="min-w-40"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {getActionButtonText(action)}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Additional Actions for Accepted Sessions */}
          {action.startsWith('accept') && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground text-center mb-3">
                After accepting, you'll have access to:
              </p>
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span>Video Session</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>Session Notes</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
