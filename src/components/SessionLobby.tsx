import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Mic, MicOff, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

interface SessionLobbyProps {
  sessionId: string;
  scheduledTime: string;
  coachName: string;
  duration: number;
  onJoinSession: () => void;
  canJoin: boolean;
}

export const SessionLobby = ({
  sessionId,
  scheduledTime,
  coachName,
  duration,
  onJoinSession,
  canJoin
}: SessionLobbyProps) => {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [deviceChecked, setDeviceChecked] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState<number>(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [deviceErrors, setDeviceErrors] = useState<string[]>([]);

  useEffect(() => {
    const scheduledDate = new Date(scheduledTime);
    const updateTimer = () => {
      const now = new Date();
      const minutesUntil = differenceInMinutes(scheduledDate, now);
      setTimeUntilStart(minutesUntil);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [scheduledTime]);

  useEffect(() => {
    checkDevices();
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkDevices = async () => {
    const errors: string[] = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setMediaStream(stream);
      setDeviceChecked(true);
      
      // Check if devices are actually working
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      if (videoTracks.length === 0) {
        errors.push("No camera detected");
        setVideoEnabled(false);
      }
      
      if (audioTracks.length === 0) {
        errors.push("No microphone detected");
        setAudioEnabled(false);
      }
      
    } catch (error) {
      console.error('Media device error:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errors.push("Camera/microphone permission denied");
        } else if (error.name === 'NotFoundError') {
          errors.push("No camera or microphone found");
        } else {
          errors.push("Unable to access camera/microphone");
        }
      }
      setDeviceChecked(true);
    }
    
    setDeviceErrors(errors);
  };

  const getStatusMessage = () => {
    if (timeUntilStart > 5) {
      return `Session starts in ${timeUntilStart} minutes`;
    } else if (timeUntilStart > 0) {
      return `Session starting soon - ${timeUntilStart} minutes`;
    } else if (timeUntilStart >= -5) {
      return "You can join the session now";
    } else {
      return "Session has started";
    }
  };

  const getStatusColor = () => {
    if (timeUntilStart > 5) return "secondary";
    if (timeUntilStart > 0) return "default";
    if (timeUntilStart >= -5) return "default";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Session Info Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Video className="h-5 w-5" />
              Session Lobby
            </CardTitle>
            <div className="space-y-2">
              <p className="text-lg font-semibold">Coaching Session with {coachName}</p>
              <p className="text-muted-foreground">
                {format(new Date(scheduledTime), 'PPP p')} • {duration} minutes
              </p>
              <Badge variant={getStatusColor()}>
                <Clock className="h-3 w-3 mr-1" />
                {getStatusMessage()}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Device Check Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {deviceChecked && deviceErrors.length === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Device Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!deviceChecked ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
                <span>Checking your devices...</span>
              </div>
            ) : (
              <>
                {deviceErrors.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      Device Issues Detected:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                      {deviceErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Device Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {videoEnabled ? (
                        <Video className="h-4 w-4 text-green-500" />
                      ) : (
                        <VideoOff className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Camera</span>
                    </div>
                    <Badge variant={videoEnabled ? "default" : "secondary"}>
                      {videoEnabled ? "Ready" : "Off"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {audioEnabled ? (
                        <Mic className="h-4 w-4 text-green-500" />
                      ) : (
                        <MicOff className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Microphone</span>
                    </div>
                    <Badge variant={audioEnabled ? "default" : "secondary"}>
                      {audioEnabled ? "Ready" : "Off"}
                    </Badge>
                  </div>
                </div>

                {/* Test Devices Button */}
                <Button 
                  onClick={checkDevices} 
                  variant="outline" 
                  className="w-full"
                >
                  Test Devices Again
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Session Preparation */}
        <Card>
          <CardHeader>
            <CardTitle>Session Preparation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">✅ Before joining:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Find a quiet, well-lit space</li>
                  <li>• Have water and notepad ready</li>
                  <li>• Close unnecessary browser tabs</li>
                  <li>• Prepare any questions or topics</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📝 Session goals:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Set clear objectives</li>
                  <li>• Be open and honest</li>
                  <li>• Take notes during the session</li>
                  <li>• Ask for specific action items</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Join Button */}
        <div className="text-center">
          <Button 
            onClick={onJoinSession}
            disabled={!canJoin || !deviceChecked}
            size="lg"
            className="px-8 py-3 text-lg"
          >
            {!canJoin ? (
              timeUntilStart > 5 ? 
                `Join Available in ${timeUntilStart} minutes` : 
                "Waiting for session window..."
            ) : !deviceChecked ? (
              "Checking devices..."
            ) : (
              "Join Session"
            )}
          </Button>
          
          {canJoin && deviceErrors.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              You can join even with device issues - they can be resolved in the session
            </p>
          )}
        </div>
      </div>
    </div>
  );
};