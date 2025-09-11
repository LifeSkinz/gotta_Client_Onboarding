import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SessionFeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  coachId: string;
}

export const SessionFeedbackDialog = ({ isOpen, onClose, sessionId, coachId }: SessionFeedbackDialogProps) => {
  const [sessionSatisfaction, setSessionSatisfaction] = useState<number>(0);
  const [goalAchievement, setGoalAchievement] = useState<number>(0);
  const [coachEffectiveness, setCoachEffectiveness] = useState<number>(0);
  const [platformEase, setPlatformEase] = useState<"easy" | "difficult" | "">("easy");
  const [feelingAfter, setFeelingAfter] = useState<"positive" | "neutral" | "negative" | "">("positive");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [keyBreakthroughs, setKeyBreakthroughs] = useState("");
  const [challengesFaced, setChallengesFaced] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();

  const handleStarClick = (rating: number, setter: (value: number) => void) => {
    setter(rating);
  };

  const submitFeedback = async () => {
    if (!sessionSatisfaction || !goalAchievement || !coachEffectiveness) {
      toast({
        title: "Incomplete Feedback",
        description: "Please provide ratings for all categories.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Save session outcome
      await supabase
        .from('session_analytics')
        .insert({
          session_id: sessionId,
          user_id: user.user.id,
          coach_id: coachId,
          session_satisfaction_rating: sessionSatisfaction,
          goal_achievement_rating: goalAchievement,
          coach_effectiveness_rating: coachEffectiveness,
          key_breakthroughs: keyBreakthroughs ? [keyBreakthroughs] : [],
          challenges_faced: challengesFaced ? [challengesFaced] : [],
          follow_up_notes: feedbackNotes,
          follow_up_needed: goalAchievement < 7 || sessionSatisfaction < 7
        });

      // Trigger AI analysis of the session
      await supabase.functions.invoke('analyze-session-outcome', {
        body: {
          sessionId,
          userId: user.user.id,
          coachId,
          feedback: {
            sessionSatisfaction,
            goalAchievement,
            coachEffectiveness,
            platformEase,
            feelingAfter,
            notes: feedbackNotes,
            breakthroughs: keyBreakthroughs,
            challenges: challengesFaced
          }
        }
      });

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll use this to improve your experience.",
      });

      onClose();
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ 
    rating, 
    onRatingChange, 
    label 
  }: { 
    rating: number; 
    onRatingChange: (rating: number) => void; 
    label: string; 
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {rating}/10
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={!loading ? onClose : undefined}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session Feedback</DialogTitle>
          <DialogDescription>
            Help us improve your coaching experience by sharing your thoughts about this session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* Rating Section */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Session Ratings</h3>
              
              <StarRating
                rating={sessionSatisfaction}
                onRatingChange={setSessionSatisfaction}
                label="Overall Session Satisfaction"
              />
              
              <StarRating
                rating={goalAchievement}
                onRatingChange={setGoalAchievement}
                label="Goal Achievement Progress"
              />
              
              <StarRating
                rating={coachEffectiveness}
                onRatingChange={setCoachEffectiveness}
                label="Coach Effectiveness"
              />
            </CardContent>
          </Card>

          {/* Experience Questions */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Your Experience</h3>
              
              <div>
                <Label>How do you feel after this session?</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={feelingAfter === "positive" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeelingAfter("positive")}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Positive
                  </Button>
                  <Button
                    variant={feelingAfter === "neutral" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeelingAfter("neutral")}
                  >
                    Neutral
                  </Button>
                  <Button
                    variant={feelingAfter === "negative" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFeelingAfter("negative")}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Negative
                  </Button>
                </div>
              </div>

              <div>
                <Label>How easy was the platform to use?</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={platformEase === "easy" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlatformEase("easy")}
                  >
                    Very Easy
                  </Button>
                  <Button
                    variant={platformEase === "difficult" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlatformEase("difficult")}
                  >
                    Difficult
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Feedback */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="breakthroughs">Key Breakthroughs or Insights</Label>
              <Textarea
                id="breakthroughs"
                placeholder="What were the most valuable insights from this session?"
                value={keyBreakthroughs}
                onChange={(e) => setKeyBreakthroughs(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="challenges">Challenges Faced</Label>
              <Textarea
                id="challenges"
                placeholder="What challenges did you face during the session?"
                value={challengesFaced}
                onChange={(e) => setChallengesFaced(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="feedback-notes">Additional Comments</Label>
              <Textarea
                id="feedback-notes"
                placeholder="Any other feedback, suggestions, or comments?"
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Skip Feedback
            </Button>
            <Button onClick={submitFeedback} disabled={loading} className="flex-1">
              {loading ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};