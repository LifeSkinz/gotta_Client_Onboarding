import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useDailyCo, DailyCoConfig, DailyCoEvents } from '@/hooks/useDailyCo';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff,
  Phone,
  PhoneOff,
  Users,
  Circle,
  MessageSquare
} from 'lucide-react';

interface DailyCoVideoCallProps {
  roomUrl: string;
  userName?: string;
  userData?: any;
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  onParticipantJoined?: (participant: any) => void;
  onParticipantLeft?: (participant: any) => void;
  enableControls?: boolean;
  autoJoin?: boolean;
}

export const DailyCoVideoCall: React.FC<DailyCoVideoCallProps> = ({
  roomUrl,
  userName = 'Anonymous',
  userData = {},
  onSessionStart,
  onSessionEnd,
  onParticipantJoined,
  onParticipantLeft,
  enableControls = true,
  autoJoin = false,
}) => {
  const { toast } = useToast();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const config: DailyCoConfig = {
    roomUrl,
    userName,
    userData,
    startVideoOff: !isVideoEnabled,
    startAudioOff: !isAudioEnabled,
    enableScreenShare: true,
    enableChat: true,
  };

  const events: DailyCoEvents = {
    onJoined: () => {
      toast({
        title: "Connected",
        description: "Successfully joined the video session",
      });
      onSessionStart?.();
    },
    onLeft: () => {
      toast({
        title: "Disconnected",
        description: "Left the video session",
      });
      onSessionEnd?.();
    },
    onParticipantJoined: (participant) => {
      toast({
        title: "Participant Joined",
        description: `${participant.user_name || 'Someone'} joined the session`,
      });
      onParticipantJoined?.(participant);
    },
    onParticipantLeft: (participant) => {
      toast({
        title: "Participant Left",
        description: `${participant.user_name || 'Someone'} left the session`,
      });
      onParticipantLeft?.(participant);
    },
    onRecordingStarted: () => {
      setIsRecording(true);
      toast({
        title: "Recording Started",
        description: "Session recording has begun",
      });
    },
    onRecordingStopped: () => {
      setIsRecording(false);
      toast({
        title: "Recording Stopped",
        description: "Session recording has ended",
      });
    },
    onTranscriptionStarted: () => {
      setIsTranscribing(true);
      toast({
        title: "Transcription Started",
        description: "Session transcription has begun",
      });
    },
    onTranscriptionStopped: () => {
      setIsTranscribing(false);
      toast({
        title: "Transcription Stopped",
        description: "Session transcription has ended",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred in the video session",
        variant: "destructive",
      });
    },
  };

  const {
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
    callObject,
  } = useDailyCo(config, events);

  // Auto-join if enabled
  useEffect(() => {
    if (autoJoin && roomUrl && !isJoined && !isLoading) {
      joinRoom();
    }
  }, [autoJoin, roomUrl, isJoined, isLoading, joinRoom]);

  // Set up the Daily.co iframe
  useEffect(() => {
    if (callObject && containerRef.current && isJoined) {
      // Create the iframe and append it to the container
      const iframe = callObject.iframe();
      if (iframe && containerRef.current) {
        containerRef.current.appendChild(iframe);
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
      }
    }
  }, [callObject, isJoined]);

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
    setIsScreenSharing(!isScreenSharing);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleToggleTranscription = async () => {
    if (isTranscribing) {
      await stopTranscription();
    } else {
      await startTranscription();
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="text-destructive mb-4">
            <Video className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Connection Error</h3>
            <p className="text-sm">{error}</p>
          </div>
          <Button onClick={joinRoom} disabled={isLoading}>
            {isLoading ? 'Retrying...' : 'Retry Connection'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isJoined) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Session
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Join</h3>
            <p className="text-muted-foreground">
              Click the button below to join your video session
            </p>
          </div>
          <Button onClick={joinRoom} disabled={isLoading} size="lg">
            {isLoading ? 'Joining...' : 'Join Session'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Session
            {isRecording && <Badge variant="destructive">Recording</Badge>}
            {isTranscribing && <Badge variant="secondary">Transcribing</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {Object.keys(participants).length + 1}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Video Container */}
        <div className="aspect-video bg-black rounded-lg mb-4 relative overflow-hidden">
          <div ref={containerRef} className="w-full h-full" />
          
          {/* Connection Status Overlay */}
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge 
              variant={isVideoEnabled ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              <Video className="h-3 w-3" />
              Video
            </Badge>
            <Badge 
              variant={isAudioEnabled ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
              <Mic className="h-3 w-3" />
              Audio
            </Badge>
          </div>
        </div>

        {/* Controls */}
        {enableControls && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant={isVideoEnabled ? "default" : "secondary"}
              size="sm"
              onClick={handleToggleVideo}
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            
            <Button
              variant={isAudioEnabled ? "default" : "secondary"}
              size="sm"
              onClick={handleToggleAudio}
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            
            <Button
              variant={isScreenSharing ? "default" : "secondary"}
              size="sm"
              onClick={handleToggleScreenShare}
            >
              {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>
            
            <Button
              variant={isRecording ? "destructive" : "secondary"}
              size="sm"
              onClick={handleToggleRecording}
            >
              <Circle className="h-4 w-4" fill={isRecording ? "currentColor" : "none"} />
            </Button>
            
            <Button
              variant={isTranscribing ? "default" : "secondary"}
              size="sm"
              onClick={handleToggleTranscription}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={leaveRoom}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
