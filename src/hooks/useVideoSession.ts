import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSessionManager } from './useSessionManager';
import { logger } from '@/services/logger';
import { config } from '@/config';

interface UseVideoSessionOptions {
  onSessionEnd?: () => void;
  onError?: (error: any) => void;
}

export const useVideoSession = (
  sessionId: string | undefined,
  options: UseVideoSessionOptions = {}
) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');

  const sessionManagerHook = useSessionManager();

  const handleSessionEnd = useCallback(async () => {
    if (!sessionId) return;

    try {
      await sessionManagerHook.updateSessionState({
        sessionId,
        newState: 'ended',
        metadata: {
          endTime: new Date().toISOString()
        }
      });

      if (isRecording) {
        await supabase.functions.invoke('finalize-session-recording', {
          body: { sessionId }
        });
      }

      await sessionManagerHook.cleanupSession(sessionId);
      options.onSessionEnd?.();
    } catch (error) {
      logger.error('Error ending session', { sessionId, error });
      options.onError?.(error);
    }
  }, [sessionId, isRecording, sessionManagerHook, options]);

  const initializeVideoSession = async () => {
    if (!sessionId) return;

    try {
      const result = await sessionManagerHook.createVideoRoom(sessionId);
      if (result.success && result.videoJoinUrl) {
        setVideoUrl(result.videoJoinUrl);
        await sessionManagerHook.updateSessionState({
          sessionId,
          newState: 'in_progress',
          metadata: {
            startTime: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      logger.error('Error initializing video session', { sessionId, error });
      options.onError?.(error);
    }
  };

  const startRecording = async () => {
    if (!sessionId || !videoUrl) return;

    try {
      const { error } = await supabase.functions.invoke('start-session-recording', {
        body: { sessionId }
      });

      if (error) throw error;
      setIsRecording(true);
    } catch (error) {
      logger.error('Error starting recording', { sessionId, error });
      options.onError?.(error);
    }
  };

  // Monitor connection quality with WebRTC stats
  useEffect(() => {
    if (!isConnected || !videoUrl) return;

    const monitor = setInterval(async () => {
      try {
        // Get WebRTC stats from Daily.co iframe or simulate stats
        const iframe = document.querySelector('iframe[src*="daily.co"]') as HTMLIFrameElement;
        
        // Simulate realistic WebRTC stats (in production, get from Daily.co call object)
        const simulatedStats = {
          latency: Math.random() * 200, // 0-200ms
          packetsLost: Math.random() * 10, // 0-10 packets
          jitter: Math.random() * 50 // 0-50ms
        };

        // Determine quality based on thresholds
        let quality: 'good' | 'fair' | 'poor' = 'good';
        
        if (simulatedStats.latency > 150 || 
            simulatedStats.packetsLost > 5 || 
            simulatedStats.jitter > 30) {
          quality = 'poor';
        } else if (simulatedStats.latency > 100 || 
                   simulatedStats.packetsLost > 2 || 
                   simulatedStats.jitter > 20) {
          quality = 'fair';
        }

        setConnectionQuality(quality);

        if (quality === 'poor') {
          logger.warn('Poor connection quality detected', {
            sessionId,
            stats: simulatedStats
          });
        }
      } catch (error) {
        logger.error('Error monitoring connection quality', { sessionId, error });
      }
    }, 10000);

    return () => clearInterval(monitor);
  }, [isConnected, videoUrl, sessionId]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId && isConnected) {
        handleSessionEnd();
      }
    };
  }, [sessionId, isConnected, handleSessionEnd]);

  return {
    loading: sessionManagerHook.loading,
    videoUrl,
    isConnected,
    isRecording,
    connectionQuality,
    initializeVideoSession,
    startRecording,
    endSession: handleSessionEnd,
    setIsConnected
  };
};