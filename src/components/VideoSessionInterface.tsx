import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Video, VideoOff, Mic, MicOff, Phone, Clock, Target, FileText, Save } from "lucide-react";
import { format, addMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SessionFeedbackDialog } from "./SessionFeedbackDialog";

interface VideoSessionInterfaceProps {
  sessionId: string;
  coachId: string;
  clientId: string;
  scheduledTime: string;
  duration: number;
  videoUrl: string;
  onSessionEnd: () => void;
}

interface SessionGoal {
  id: string;
  description: string;
  targetDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed";
}

export const VideoSessionInterface = ({
  sessionId,
  coachId,
  clientId,
  scheduledTime,
  duration,
  videoUrl,
  onSessionEnd
}: VideoSessionInterfaceProps) => {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Session goals
  const [goals, setGoals] = useState<SessionGoal[]>([]);
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalDate, setNewGoalDate] = useState("");
  const [newGoalPriority, setNewGoalPriority] = useState<"high" | "medium" | "low">("medium");
  
  // Session notes
  const [clientNotes, setClientNotes] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (sessionStarted && startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
        setTimeElapsed(elapsed);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionStarted, startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0 
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    try {
      const start = new Date();
      setStartTime(start);
      setSessionStarted(true);
      setIsRecording(true);

      // Update session status in database
      await supabase
        .from('sessions')
        .update({ 
          status: 'in_progress',
          actual_start_time: start.toISOString()
        })
        .eq('id', sessionId);

      // Start recording
      await supabase.functions.invoke('start-session-recording', {
        body: { sessionId, startTime: start.toISOString() }
      });

      toast({
        title: "Session Started",
        description: "Recording has begun. Welcome to your coaching session!",
      });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Error",
        description: "Failed to start session recording.",
        variant: "destructive",
      });
    }
  };

  const endSession = async () => {
    try {
      const endTime = new Date();
      setSessionEnded(true);
      setIsRecording(false);

      // Update session status
      await supabase
        .from('sessions')
        .update({ 
          status: 'completed',
          actual_end_time: endTime.toISOString(),
          duration_minutes: Math.floor(timeElapsed / 60)
        })
        .eq('id', sessionId);

      // Save session notes and goals
      await saveSessionData();

      // Process recording and transcript
      await supabase.functions.invoke('finalize-session-recording', {
        body: { 
          sessionId, 
          endTime: endTime.toISOString(),
          clientNotes,
          coachNotes,
          goals
        }
      });

      setShowFeedbackDialog(true);
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: "Error",
        description: "Failed to finalize session.",
        variant: "destructive",
      });
    }
  };

  const addGoal = () => {
    if (!newGoalDescription.trim()) return;

    const newGoal: SessionGoal = {
      id: Date.now().toString(),
      description: newGoalDescription,
      targetDate: newGoalDate,
      priority: newGoalPriority,
      status: "pending"
    };

    setGoals([...goals, newGoal]);
    setNewGoalDescription("");
    setNewGoalDate("");
    setNewGoalPriority("medium");
  };

  const updateGoalStatus = (goalId: string, status: SessionGoal['status']) => {
    setGoals(goals.map(goal => 
      goal.id === goalId ? { ...goal, status } : goal
    ));
  };

  const saveSessionData = async () => {
    try {
      // Save session goals
      for (const goal of goals) {
        await supabase
          .from('session_goals_tracking')
          .insert({
            user_id: clientId,
            session_id: sessionId,
            goal_category: goal.priority,
            goal_description: goal.description,
            initial_assessment: goal.status === 'completed' ? 10 : 5,
            final_assessment: goal.status === 'completed' ? 10 : 5,
            progress_notes: `Goal set during session with target date: ${goal.targetDate}`
          });
      }

      toast({
        title: "Session Data Saved",
        description: "Goals and notes have been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving session data:', error);
      toast({
        title: "Save Error",
        description: "Some session data may not have been saved.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Video Area - Main Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Coaching Session
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Scheduled: {format(new Date(scheduledTime), 'PPP p')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={isRecording ? 'bg-red-500' : 'bg-gray-500'}>
                  {isRecording ? '● REC' : 'Not Recording'}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(timeElapsed)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Video iframe */}
              <div className="aspect-video bg-black rounded-lg mb-4 flex items-center justify-center">
                <iframe
                  src={videoUrl}
                  className="w-full h-full rounded-lg"
                  allow="camera; microphone; fullscreen"
                  title="Video Session"
                />
              </div>
              
              {/* Session Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={audioEnabled ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={videoEnabled ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setVideoEnabled(!videoEnabled)}
                >
                  {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                
                {!sessionStarted ? (
                  <Button onClick={startSession} className="px-6">
                    Start Session
                  </Button>
                ) : !sessionEnded ? (
                  <Button onClick={endSession} variant="destructive" className="px-6">
                    <Phone className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Tools - Side Panel */}
        <div className="space-y-4">
          
          {/* Session Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Session Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Goal */}
              <div className="space-y-2">
                <Label htmlFor="goal-description">New Goal</Label>
                <Textarea
                  id="goal-description"
                  placeholder="Describe your goal..."
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="goal-date">Target Date</Label>
                    <Input
                      id="goal-date"
                      type="date"
                      value={newGoalDate}
                      onChange={(e) => setNewGoalDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="goal-priority">Priority</Label>
                    <select
                      id="goal-priority"
                      value={newGoalPriority}
                      onChange={(e) => setNewGoalPriority(e.target.value as "high" | "medium" | "low")}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <Button onClick={addGoal} size="sm" className="w-full">
                  Add Goal
                </Button>
              </div>

              <Separator />

              {/* Goals List */}
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm flex-1">{goal.description}</p>
                      <Badge className={getPriorityColor(goal.priority)}>
                        {goal.priority}
                      </Badge>
                    </div>
                    {goal.targetDate && (
                      <p className="text-xs text-muted-foreground">
                        Target: {format(new Date(goal.targetDate), 'PPP')}
                      </p>
                    )}
                    <div className="flex gap-1">
                      {(['pending', 'in_progress', 'completed'] as const).map((status) => (
                        <Button
                          key={status}
                          variant={goal.status === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateGoalStatus(goal.id, status)}
                          className="text-xs h-6"
                        >
                          {status.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {goals.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No goals set yet. Add your session goals above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Session Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="client-notes">Your Notes</Label>
                <Textarea
                  id="client-notes"
                  placeholder="Record your thoughts, insights, and key takeaways..."
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="coach-notes">Coach Notes</Label>
                <Textarea
                  id="coach-notes"
                  placeholder="Coach will add their notes and recommendations here..."
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={saveSessionData} size="sm" className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Notes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <SessionFeedbackDialog
        isOpen={showFeedbackDialog}
        onClose={() => {
          setShowFeedbackDialog(false);
          onSessionEnd();
        }}
        sessionId={sessionId}
        coachId={coachId}
      />
    </div>
  );
};