import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';

export interface DailyCoConfig {
  roomUrl: string;
  userName?: string;
  userData?: any;
  startVideoOff?: boolean;
  startAudioOff?: boolean;
  enableScreenShare?: boolean;
  enableChat?: boolean;
  container?: HTMLDivElement | null;
}

export interface DailyCoEvents {
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (participant: any) => void;
  onJoined?: () => void;
  onLeft?: () => void;
  onError?: (error: any) => void;
  onRecordingStarted?: () => void;
  onRecordingStopped?: () => void;
  onTranscriptionStarted?: () => void;
  onTranscriptionStopped?: () => void;
}

export const useDailyCo = (config: DailyCoConfig, events?: DailyCoEvents) => {
  const callObjectRef = useRef<any>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCallObject = useCallback(() => {
    if (callObjectRef.current) {
      callObjectRef.current.destroy();
    }

    let callObject;
    
    // If container is provided, use iframe mode with prebuilt UI
    if (config.container) {
      callObject = DailyIframe.createFrame(config.container, {
        showLocalVideo: true,
        showParticipantsBar: true,
      });
    } else {
      // Otherwise create call object without UI
      callObject = DailyIframe.createCallObject();
    }

    callObjectRef.current = callObject;

    // Set up event listeners
    callObject
      .on('joined-meeting', () => {
        setIsJoined(true);
        setError(null);
        events?.onJoined?.();
      })
      .on('left-meeting', () => {
        setIsJoined(false);
        events?.onLeft?.();
      })
      .on('participant-joined', (participant: any) => {
        setParticipants(prev => ({
          ...prev,
          [participant.participant.user_id]: participant.participant
        }));
        events?.onParticipantJoined?.(participant.participant);
      })
      .on('participant-left', (participant: any) => {
        setParticipants(prev => {
          const newParticipants = { ...prev };
          delete newParticipants[participant.participant.user_id];
          return newParticipants;
        });
        events?.onParticipantLeft?.(participant.participant);
      })
      .on('recording-started', () => {
        events?.onRecordingStarted?.();
      })
      .on('recording-stopped', () => {
        events?.onRecordingStopped?.();
      })
      .on('transcription-started', () => {
        events?.onTranscriptionStarted?.();
      })
      .on('transcription-stopped', () => {
        events?.onTranscriptionStopped?.();
      })
      .on('error', (error: any) => {
        setError(error.message || 'An error occurred');
        events?.onError?.(error);
      });

    return callObject;
  }, [config, events]);

  const joinRoom = useCallback(async () => {
    if (!config.roomUrl) {
      setError('No room URL provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const callObject = createCallObject();
      await callObject.join({
        url: config.roomUrl,
        userName: config.userName || 'Anonymous',
        userData: config.userData || {},
      });
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      events?.onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [config, createCallObject, events]);

  const leaveRoom = useCallback(async () => {
    if (callObjectRef.current) {
      await callObjectRef.current.leave();
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (callObjectRef.current) {
      callObjectRef.current.setLocalVideo(!callObjectRef.current.localVideo());
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (callObjectRef.current) {
      callObjectRef.current.setLocalAudio(!callObjectRef.current.localAudio());
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    if (callObjectRef.current) {
      await callObjectRef.current.startScreenShare();
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (callObjectRef.current) {
      await callObjectRef.current.stopScreenShare();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (callObjectRef.current) {
      await callObjectRef.current.startRecording();
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (callObjectRef.current) {
      await callObjectRef.current.stopRecording();
    }
  }, []);

  const startTranscription = useCallback(async () => {
    if (callObjectRef.current) {
      await callObjectRef.current.startTranscription();
    }
  }, []);

  const stopTranscription = useCallback(async () => {
    if (callObjectRef.current) {
      await callObjectRef.current.stopTranscription();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
      }
    };
  }, []);

  return {
    isJoined,
    participants,
    isLoading,
    error,
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    startRecording,
    stopRecording,
    startTranscription,
    stopTranscription,
    callObject: callObjectRef.current,
  };
};
