import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Video, XCircle, Clock } from 'lucide-react';

interface SessionWaitingProps {
  sessionId: string;
  onSessionReady: (videoUrl: string) => void;
  onSessionDeclined?: () => void;
}

export function SessionWaiting({ sessionId, onSessionReady, onSessionDeclined }: SessionWaitingProps) {
  const [status, setStatus] = useState<'pending' | 'ready' | 'declined'>('pending');
  const [elapsedTime, setElapsedTime] = useState(0);
  const { user } = useAuth();

  // Fetch video URL when session becomes ready
  const fetchVideoUrl = useCallback(async () => {
    const { data: videoDetails } = await supabase
      .from('session_video_details')
      .select('video_join_url')
      .eq('session_id', sessionId)
      .single();
    
    if (videoDetails?.video_join_url) {
      setStatus('ready');
      onSessionReady(videoDetails.video_join_url);
    }
  }, [sessionId, onSessionReady]);

  useEffect(() => {
    if (!sessionId || !user) return;

    // Check initial session status
    const checkInitialStatus = async () => {
      const { data: session } = await supabase
        .from('sessions')
        .select('session_state')
        .eq('id', sessionId)
        .single();
      
      if (session?.session_state === 'ready') {
        await fetchVideoUrl();
      } else if (session?.session_state === 'declined') {
        setStatus('declined');
        onSessionDeclined?.();
      }
    };
    
    checkInitialStatus();

    // Subscribe to realtime updates for THIS session only (RLS enforced)
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        },
        async (payload) => {
          console.log('Session update received:', payload.new);
          const session = payload.new as { session_state: string };
          
          if (session.session_state === 'ready') {
            await fetchVideoUrl();
          } else if (session.session_state === 'declined') {
            setStatus('declined');
            onSessionDeclined?.();
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Timer to show elapsed waiting time
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [sessionId, user, fetchVideoUrl, onSessionDeclined]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'declined') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Session Declined</h2>
          <p className="text-muted-foreground mb-4">
            The coach was unable to accept this session. We'll help you find another coach.
          </p>
          <Button onClick={() => window.location.href = '/coaches'}>
            Find Another Coach
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === 'ready') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <Video className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold mb-2">Session Ready!</h2>
          <p className="text-muted-foreground">
            Connecting you to the video session...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-6 text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary/40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-2">Waiting for Coach</h2>
        <p className="text-muted-foreground mb-4">
          We've notified the coach. You'll be connected as soon as they accept.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Waiting: {formatTime(elapsedTime)}</span>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          This page updates automatically - no need to refresh
        </p>
      </CardContent>
    </Card>
  );
}
