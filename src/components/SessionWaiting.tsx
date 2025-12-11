import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Video, Loader2, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionWaitingProps {
  sessionId: string;
  onSessionReady: (videoUrl: string) => void;
  onSessionDeclined?: () => void;
}

export function SessionWaiting({ 
  sessionId, 
  onSessionReady, 
  onSessionDeclined 
}: SessionWaitingProps) {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch video URL immediately (Google Meet style - URL is created upfront)
  const fetchVideoUrl = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('session_video_details')
        .select('video_join_url')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching video URL:', error);
        return;
      }

      if (data?.video_join_url) {
        setVideoUrl(data.video_join_url);
        onSessionReady(data.video_join_url);
      }
    } catch (err) {
      console.error('Failed to fetch video URL:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, onSessionReady]);

  useEffect(() => {
    fetchVideoUrl();

    // Also subscribe to updates in case URL is added later
    const channel = supabase
      .channel(`session-video-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_video_details',
          filter: `session_id=eq.${sessionId}`
        },
        (payload: any) => {
          if (payload.new?.video_join_url) {
            setVideoUrl(payload.new.video_join_url);
            onSessionReady(payload.new.video_join_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onSessionReady, fetchVideoUrl]);

  const copyToClipboard = async () => {
    if (videoUrl) {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link with anyone who needs to join."
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const joinSession = () => {
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
          <h2 className="text-lg font-semibold mb-2">Setting up your session...</h2>
          <p className="text-muted-foreground">This will only take a moment</p>
        </CardContent>
      </Card>
    );
  }

  if (videoUrl) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Session Ready!</h2>
          <p className="text-muted-foreground mb-6">
            Your video session is ready. Click below to join.
          </p>
          
          <Button 
            onClick={joinSession}
            size="lg"
            className="w-full mb-4 gap-2"
          >
            <Video className="h-5 w-5" />
            Join Video Session
            <ExternalLink className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            onClick={copyToClipboard}
            className="w-full gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Link to Share'}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Share this link with your coach if needed. It works like Google Meet - anyone with the link can join.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Fallback - should rarely happen with new flow
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-8 text-center">
        <Loader2 className="h-12 w-12 mx-auto animate-spin text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Preparing Session</h2>
        <p className="text-muted-foreground">
          Your video room is being created...
        </p>
      </CardContent>
    </Card>
  );
}

export default SessionWaiting;
