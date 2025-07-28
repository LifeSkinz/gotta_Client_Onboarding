import { useState, useEffect } from "react";
import { Goal, UserResponse, Question } from "@/types/goals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Clock, DollarSign, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
interface Coach {
  id: string;
  name: string;
  title: string;
  bio: string;
  years_experience: number;
  specialties: string[];
  similar_experiences: string[];
  rating: number;
  total_reviews: number;
  avatar_url?: string;
  timezone?: string;
  availability_hours?: string;
}
interface CoachRecommendation {
  coachId: string;
  coachName: string;
  matchReason: string;
  keyAlignments: string[];
  confidenceScore: number;
  coach: Coach;
}
interface AIAnalysis {
  analysis: string;
  recommendations: CoachRecommendation[];
  totalRecommendations: number;
}
interface CoachListPageProps {
  selectedGoal: Goal;
  responses: UserResponse[];
  questions: Question[];
  onBack: () => void;
  onCoachSelect: (coach: Coach) => void;
}
export const CoachListPage = ({
  selectedGoal,
  responses,
  questions,
  onBack,
  onCoachSelect
}: CoachListPageProps) => {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    const fetchCoachRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Prepare the data for the AI matching function
        const requestData = {
          selectedGoal,
          responses: responses.map(response => {
            const question = questions.find(q => q.id === response.questionId);
            return {
              question: question?.question || '',
              answer: response.answer,
              type: question?.type || 'open-ended'
            };
          }),
          userId: null // For now, we're not using authentication
        };
        const {
          data,
          error: functionError
        } = await supabase.functions.invoke('ai-coach-matching', {
          body: requestData
        });
        if (functionError) {
          throw new Error(`Failed to get coach recommendations: ${functionError.message}`);
        }
        if (data.error) {
          throw new Error(data.error);
        }
        setAiAnalysis(data);
      } catch (err) {
        console.error('Error fetching coach recommendations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load coach recommendations');
        toast({
          title: "Error",
          description: "Failed to load coach recommendations. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCoachRecommendations();
  }, [selectedGoal, responses, questions, toast]);
  const getConfidenceColor = (score: number) => {
    if (score >= 8) return "bg-emerald-500";
    if (score >= 6) return "bg-yellow-500";
    return "bg-orange-500";
  };
  const getConfidenceLabel = (score: number) => {
    if (score >= 8) return "Excellent Match";
    if (score >= 6) return "Good Match";
    return "Potential Match";
  };
  if (loading) {
    return <div className="min-h-screen bg-background p-4">
        <div className="w-full max-w-4xl mx-auto space-y-8 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              Finding Your Perfect Coach Match
            </h1>
            <p className="text-lg text-muted-foreground">
              Our AI is analyzing your responses to recommend the best coaches for you...
            </p>
          </div>
          
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Card key={i} className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </Card>)}
          </div>
        </div>
      </div>;
  }
  if (error) {
    return <div className="min-h-screen bg-background p-4">
        <div className="w-full max-w-4xl mx-auto space-y-8 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="text-lg text-muted-foreground">
              {error}
            </p>
            <div className="flex justify-center space-x-4">
              <Button onClick={onBack} variant="outline">
                Go Back
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background p-4">
      <div className="w-full max-w-4xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Your Recommended Coaches
          </h1>
          <p className="text-lg text-muted-foreground">
            Based on your {selectedGoal.title.toLowerCase()} goals, here are your top coach matches
          </p>
        </div>

        {/* AI Analysis Summary */}
        {aiAnalysis?.analysis && <Card className="p-6 bg-gradient-card border-primary/20">
            <h2 className="text-xl font-semibold mb-3 text-foreground">AI Analysis</h2>
            <p className="text-muted-foreground">{aiAnalysis.analysis}</p>
          </Card>}

        {/* Coach Recommendations */}
        <div className="space-y-6">
          {aiAnalysis?.recommendations?.map((recommendation, index) => <Card key={recommendation.coachId} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-6">
                {/* Coach Avatar */}
                <Avatar className="h-20 w-20">
                  <AvatarImage src={recommendation.coach.avatar_url} alt={recommendation.coach.name} />
                  <AvatarFallback className="text-lg">
                    {recommendation.coach.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                {/* Coach Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-semibold text-foreground">
                          {recommendation.coach.name}
                        </h3>
                        <Badge className={`${getConfidenceColor(recommendation.confidenceScore)} text-white`}>
                          {getConfidenceLabel(recommendation.confidenceScore)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground font-medium">
                        {recommendation.coach.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{recommendation.coach.rating}</span>
                        <span className="text-muted-foreground">
                          ({recommendation.coach.total_reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Match Reason */}
                  <div className="bg-secondary/50 p-4 rounded-lg my-[38px] py-[3px] mx-px px-[4px]">
                    <h4 className="font-medium text-foreground mb-2">Why this coach is perfect for you:</h4>
                    <p className="text-muted-foreground">{recommendation.matchReason}</p>
                  </div>

                  {/* Key Alignments */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Key Alignments:</h4>
                    <div className="flex flex-wrap gap-2">
                      {recommendation.keyAlignments.map((alignment, idx) => <Badge key={idx} variant="secondary">
                          {alignment}
                        </Badge>)}
                    </div>
                  </div>

                  {/* Coach Details */}
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{recommendation.coach.years_experience} years experience</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{recommendation.coach.specialties.length} specialties</span>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Specialties:</h4>
                    <div className="flex flex-wrap gap-2">
                      {recommendation.coach.specialties.slice(0, 4).map((specialty, idx) => <Badge key={idx} variant="outline">
                          {specialty}
                        </Badge>)}
                      {recommendation.coach.specialties.length > 4 && <Badge variant="outline">
                          +{recommendation.coach.specialties.length - 4} more
                        </Badge>}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <Button onClick={() => onCoachSelect(recommendation.coach)} className="w-full sm:w-auto" variant={index === 0 ? "default" : "outline"}>
                      View Profile & Connect
                    </Button>
                  </div>
                </div>
              </div>
            </Card>)}
        </div>

        {/* No Recommendations Fallback */}
        {aiAnalysis?.recommendations?.length === 0 && <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">No matches found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find any coaches that match your specific criteria at the moment.
            </p>
            <Button onClick={onBack} variant="outline">
              Go Back and Try Again
            </Button>
          </Card>}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack}>
            Back to Summary
          </Button>
          <Button variant="secondary">
            Browse All Coaches
          </Button>
        </div>
      </div>
    </div>;
};