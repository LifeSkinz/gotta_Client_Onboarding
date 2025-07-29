import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckSquare, MessageCircle, Clock, ArrowLeft, ExternalLink } from "lucide-react";

const PreviewPage = () => {
  const navigate = useNavigate();

  const sampleSession = {
    coachName: "Sarah Chen",
    clientName: "Alex Thompson",
    sessionDate: "March 15, 2024",
    sessionTime: "2:00 PM - 3:00 PM EST",
    sessionDuration: "60 minutes",
    goals: ["Improve work-life balance", "Develop leadership skills"],
    keyTopics: ["Time management", "Team communication", "Setting boundaries"],
    actionItems: [
      {
        id: 1,
        task: "Implement 'no meeting Fridays' policy",
        deadline: "March 22, 2024",
        priority: "High"
      },
      {
        id: 2,
        task: "Schedule 1-on-1s with team members",
        deadline: "March 20, 2024",
        priority: "Medium"
      },
      {
        id: 3,
        task: "Read 'The First 90 Days' chapter 3",
        deadline: "March 18, 2024",
        priority: "Low"
      }
    ],
    transcriptId: "sess_2024_03_15_alex_sarah_001"
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Email Preview System
            </h1>
          </div>
          <Badge variant="secondary">Demo Mode</Badge>
        </div>

        {/* Client Email Preview */}
        <Card className="p-6 bg-gradient-card border-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Client Email - Session Summary</h2>
              <Badge className="bg-primary/10 text-primary">To: {sampleSession.clientName}</Badge>
            </div>
            
            <div className="border border-border rounded-lg p-4 bg-background/50">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground">Your Coaching Session Summary</h3>
                  <p className="text-sm text-muted-foreground">Session with {sampleSession.coachName} • {sampleSession.sessionDate}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Session Details
                    </h4>
                    <p className="text-sm text-muted-foreground">Duration: {sampleSession.sessionDuration}</p>
                    <p className="text-sm text-muted-foreground">Time: {sampleSession.sessionTime}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Key Topics Covered</h4>
                    <div className="flex flex-wrap gap-1">
                      {sampleSession.keyTopics.map((topic, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    Your Action Items
                  </h4>
                  {sampleSession.actionItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{item.task}</p>
                        <p className="text-xs text-muted-foreground">Due: {item.deadline}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={item.priority === 'High' ? 'destructive' : item.priority === 'Medium' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {item.priority}
                        </Badge>
                        <Button size="sm" variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          Add to Calendar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    View Transcript
                  </Button>
                  <Button variant="gradient" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Schedule Next Session
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Coach Email Preview */}
        <Card className="p-6 bg-gradient-card border-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Coach Email - Session Report</h2>
              <Badge className="bg-secondary/10 text-secondary-foreground">To: {sampleSession.coachName}</Badge>
            </div>
            
            <div className="border border-border rounded-lg p-4 bg-background/50">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground">Session Report - {sampleSession.clientName}</h3>
                  <p className="text-sm text-muted-foreground">{sampleSession.sessionDate} • {sampleSession.sessionTime}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Client Goals</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {sampleSession.goals.map((goal, index) => (
                        <li key={index}>• {goal}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Session Metrics</h4>
                    <p className="text-sm text-muted-foreground">Engagement Score: 8.5/10</p>
                    <p className="text-sm text-muted-foreground">Action Items Created: {sampleSession.actionItems.length}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Action Items Assigned</h4>
                  {sampleSession.actionItems.map((item) => (
                    <div key={item.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{item.task}</p>
                        <Badge variant="outline" className="text-xs">
                          {item.priority} Priority
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Deadline: {item.deadline}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button variant="outline" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    View Full Transcript
                  </Button>
                  <Button variant="secondary" className="flex items-center gap-2">
                    Client Progress Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Integration Preview */}
        <Card className="p-6 bg-gradient-card border-border">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Future Integration Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-border rounded-lg bg-background/30">
                <h3 className="font-medium text-foreground mb-2">AI Session Analysis</h3>
                <p className="text-sm text-muted-foreground">Automated insights and recommendations based on conversation patterns.</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-background/30">
                <h3 className="font-medium text-foreground mb-2">Calendar Integration</h3>
                <p className="text-sm text-muted-foreground">One-click action item scheduling to Google Calendar, Outlook, etc.</p>
              </div>
              <div className="p-4 border border-border rounded-lg bg-background/30">
                <h3 className="font-medium text-foreground mb-2">Progress Tracking</h3>
                <p className="text-sm text-muted-foreground">Long-term goal monitoring and achievement analytics.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PreviewPage;