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

  // Monitor connection quality
  useEffect(() => {
    if (!isConnected) return;

    const monitor = setInterval(() => {
      // This is a simplified example - implement actual connection quality monitoring
      const quality = Math.random() > 0.8 ? 'fair' : 'good';
      setConnectionQuality(quality);
    }, 10000);

    return () => clearInterval(monitor);
  }, [isConnected]);

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