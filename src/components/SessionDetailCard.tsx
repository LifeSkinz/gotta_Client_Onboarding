import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  Clock, 
  Video, 
  User, 
  ChevronDown, 
  ChevronUp,
  Target,
  FileText,
  Brain,
  Play,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { format, isAfter, isBefore, addMinutes } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SessionDetailCardProps {
  session: {
    id: string;
    scheduled_time: string;
    actual_start_time?: string;
    actual_end_time?: string;
    duration_minutes: number;
    status: string;
    video_join_url?: string;
    price_amount: number;
    coin_cost: number;
    notes?: string;
    coaches: {
      name: string;
      avatar_url?: string;
      title: string;
    };
  };
}

interface SessionExtendedData {
  goalTitle?: string;
  aiAnalysis?: any;
  transcript?: string;
  actionItems?: string[];
  insights?: any;
  sessionOutcome?: any;
}

export const SessionDetailCard = ({ session }: SessionDetailCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [extendedData, setExtendedData] = useState<SessionExtendedData>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isExpanded && !extendedData.goalTitle) {
      fetchExtendedData();
    }
  }, [isExpanded]);

  const fetchExtendedData = async () => {
    setLoading(true);
    try {
      // Fetch user responses and goal data
      const { data: responseData } = await supabase
        .from('user_responses')
        .select('selected_goal, ai_analysis, responses')
        .eq('session_id', session.id)
        .single();

      // Fetch session recording data
      const { data: recordingData } = await supabase
        .from('session_recordings')
        .select('transcript, ai_summary, key_topics, personality_insights')
        .eq('session_id', session.id)
        .single();

      // Fetch session analytics data (replaces session_outcomes after schema cleanup)
      const { data: analyticsData } = await supabase
        .from('session_analytics')
        .select('*')
        .eq('session_id', session.id)
        .single();

      setExtendedData({
        goalTitle: responseData?.selected_goal && typeof responseData.selected_goal === 'object' 
          ? (responseData.selected_goal as any)?.title 
          : 'Coaching Session',
        aiAnalysis: responseData?.ai_analysis,
        transcript: recordingData?.transcript,
        actionItems: analyticsData?.action_items || [],
        insights: {
          summary: recordingData?.ai_summary,
          keyTopics: recordingData?.key_topics || [],
          personalityInsights: recordingData?.personality_insights
        },
        sessionOutcome: analyticsData
      });
    } catch (error) {
      console.error('Error fetching extended session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'in_progress': return 'bg-green-500 animate-pulse';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      case 'no_show': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': 
      case 'no_show': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const canJoinSession = () => {
    const scheduledTime = new Date(session.scheduled_time);
    const now = new Date();
    const joinWindow = addMinutes(scheduledTime, -5);
    const endWindow = addMinutes(scheduledTime, session.duration_minutes + 15);
    
    return isAfter(now, joinWindow) && isBefore(now, endWindow) && session.status === 'scheduled';
  };

  const handlePortalAccess = () => {
    // Always allow portal access for better UX
    window.location.href = `/session/${session.id}`;
  };

  const getSessionTitle = () => {
    const goalTitle = extendedData.goalTitle || "Coaching Session";
    return `${goalTitle} with ${session.coaches.name}`;
  };

  const getPortalButtonText = () => {
    if (session.status === 'in_progress') return "Join Live Session";
    if (session.status === 'completed') return "View Session Portal";
    if (canJoinSession()) return "Join Session Now";
    return "Enter Session Portal";
  };

  const getPortalButtonVariant = () => {
    if (session.status === 'in_progress' || canJoinSession()) return "default";
    return "outline";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={session.coaches.avatar_url} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{getSessionTitle()}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                {session.coaches.title}
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs">Session #{session.id.slice(-8)}</span>
              </CardDescription>
            </div>
          </div>
          <Badge className={`${getStatusColor(session.status)} flex items-center gap-1`}>
            {getStatusIcon(session.status)}
            {session.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(session.scheduled_time), 'PPP')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(session.scheduled_time), 'p')} 
                ({session.duration_minutes} min)
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Cost: </span>
              ${session.price_amount} ({session.coin_cost} coins)
            </div>
            {session.status === 'scheduled' && !canJoinSession() && (
              <div className="text-sm text-muted-foreground">
                Session starts {format(new Date(session.scheduled_time), 'p')}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handlePortalAccess}
              className="w-full"
              variant={getPortalButtonVariant()}
            >
              <Video className="h-4 w-4 mr-2" />
              {getPortalButtonText()}
            </Button>
            
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      View Details
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-4 space-y-4">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Loading session details...</p>
                  </div>
                ) : (
                  <>
                    {/* Session Goal */}
                    {extendedData.goalTitle && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <Target className="h-4 w-4" />
                          Session Focus
                        </div>
                        <p className="text-sm pl-6">{extendedData.goalTitle}</p>
                      </div>
                    )}

                    {/* Action Items */}
                    {extendedData.actionItems && extendedData.actionItems.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <CheckCircle className="h-4 w-4" />
                          Action Items
                        </div>
                        <ul className="text-sm pl-6 space-y-1">
                          {extendedData.actionItems.map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key Topics */}
                    {extendedData.insights?.keyTopics && extendedData.insights.keyTopics.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <Brain className="h-4 w-4" />
                          Key Topics Discussed
                        </div>
                        <div className="pl-6 flex flex-wrap gap-2">
                          {extendedData.insights.keyTopics.map((topic: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Summary */}
                    {extendedData.insights?.summary && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <FileText className="h-4 w-4" />
                          Session Summary
                        </div>
                        <p className="text-sm pl-6 text-muted-foreground">
                          {extendedData.insights.summary}
                        </p>
                      </div>
                    )}

                    {/* Session Rating */}
                    {extendedData.sessionOutcome && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          {extendedData.sessionOutcome.session_satisfaction_rating && (
                            <div>
                              <div className="text-lg font-bold text-primary">
                                {extendedData.sessionOutcome.session_satisfaction_rating}/5
                              </div>
                              <div className="text-xs text-muted-foreground">Satisfaction</div>
                            </div>
                          )}
                          {extendedData.sessionOutcome.goal_achievement_rating && (
                            <div>
                              <div className="text-lg font-bold text-primary">
                                {extendedData.sessionOutcome.goal_achievement_rating}/5
                              </div>
                              <div className="text-xs text-muted-foreground">Goal Progress</div>
                            </div>
                          )}
                          {extendedData.sessionOutcome.coach_effectiveness_rating && (
                            <div>
                              <div className="text-lg font-bold text-primary">
                                {extendedData.sessionOutcome.coach_effectiveness_rating}/5
                              </div>
                              <div className="text-xs text-muted-foreground">Coach Rating</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Transcript Access */}
                    {extendedData.transcript && (
                      <div className="pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            toast({
                              title: "Transcript Available",
                              description: "Full session transcript can be viewed in the session portal.",
                            });
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Full Transcript
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};