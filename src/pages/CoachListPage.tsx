import { useState, useEffect } from "react";
import { Goal, UserResponse, Question } from "@/types/goals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Clock, DollarSign, Users, Eye, Coins } from "lucide-react";
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
  availability_status?: 'available' | 'busy' | 'away';
  pricing?: {
    min_price: number;
    max_price: number;
    currency: string;
  };
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

export const CoachListPage = ({ selectedGoal, responses, questions, onBack, onCoachSelect }: CoachListPageProps) => {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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

        const { data, error: functionError } = await supabase.functions.invoke('ai-coach-matching', {
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
          variant: "destructive",
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

  const getAvailabilityBadge = (status?: string) => {
    switch (status) {
      case 'available':
        return { text: 'Available Now', color: 'bg-green-500', textColor: 'text-white' };
      case 'busy':
        return { text: 'Available in an hour', color: 'bg-muted', textColor: 'text-muted-foreground' };
      case 'away':
        return { text: 'Available tomorrow', color: 'bg-muted', textColor: 'text-muted-foreground' };
      default:
        return { text: 'Available next week', color: 'bg-muted', textColor: 'text-muted-foreground' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="w-full max-w-4xl mx-auto space-y-8 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              Finding Your Perfect Coach Match
            </h1>
            <p className="text-lg text-muted-foreground">
              Our AI is analyzing your responses to recommend the best coaches for you...
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-4">
                  <Skeleton className="h-20 w-20 rounded-full mx-auto" />
                  <div className="space-y-2 text-center">
                    <Skeleton className="h-5 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-6 w-2/3 mx-auto" />
                  <Skeleton className="h-4 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
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
        {aiAnalysis?.analysis && (
          <Card className="p-6 bg-gradient-card border-primary/20">
            <h2 className="text-xl font-semibold mb-3 text-foreground">AI Analysis</h2>
            <p className="text-muted-foreground">{aiAnalysis.analysis}</p>
          </Card>
        )}

        {/* Coach Recommendations - Compact Baseball Cards */}
        <div className="space-y-4">
          {aiAnalysis?.recommendations?.map((recommendation, index) => {
            const availability = getAvailabilityBadge(recommendation.coach.availability_status);
            
            return (
              <div key={recommendation.coachId} className="space-y-3">
                {/* Baseball Card */}
                <Card className="relative group hover:shadow-lg transition-all duration-300 bg-card border-border">
                  {/* Match Score Badge - Top Left */}
                  <Badge 
                    className={`absolute top-3 left-3 z-10 ${getConfidenceColor(recommendation.confidenceScore)} text-white text-xs px-2 py-1`}
                  >
                    {getConfidenceLabel(recommendation.confidenceScore)}
                  </Badge>

                  {/* Availability Badge - Top Right */}
                  <Badge 
                    className={`absolute top-3 right-3 z-10 ${availability.color} ${availability.textColor} text-xs px-2 py-1`}
                  >
                    {availability.text}
                  </Badge>

                  <div className="p-4">
                    {/* Coach Avatar */}
                    <div className="flex justify-center mb-3">
                      <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                        <AvatarImage src={recommendation.coach.avatar_url} alt={recommendation.coach.name} />
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {recommendation.coach.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Coach Name & Title */}
                    <div className="text-center mb-3">
                      <h3 className="font-bold text-lg text-foreground leading-tight mb-1">
                        {recommendation.coach.name}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        {recommendation.coach.title}
                      </p>
                    </div>

                    {/* Brief Bio */}
                    <div className="text-center mb-3">
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {recommendation.coach.bio}
                      </p>
                    </div>

                    {/* Star Rating, Price, Years - Inline */}
                    <div className="flex items-center justify-center space-x-4 text-sm mb-4">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{recommendation.coach.rating}</span>
                        <span className="text-muted-foreground">({recommendation.coach.total_reviews})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-foreground">
                          ${recommendation.coach.pricing?.min_price || 75}-${recommendation.coach.pricing?.max_price || 150}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{recommendation.coach.years_experience}y</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs sm:text-sm"
                        onClick={() => {
                          // TODO: Implement view profile functionality
                          console.log('View profile for:', recommendation.coach.name);
                        }}
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">View Profile</span>
                        <span className="sm:hidden">View</span>
                      </Button>
                      
                      <Button 
                        variant={index === 0 ? "default" : "secondary"}
                        size="sm" 
                        className="flex-1 text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 text-white border-0"
                        onClick={() => onCoachSelect(recommendation.coach)}
                      >
                        <span className="font-bold mr-1">1</span>
                        <Coins className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Connect Now</span>
                        <span className="sm:hidden">Connect</span>
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* AI Justification Box - Modern Design */}
                <Card className="relative overflow-hidden bg-gradient-to-r from-purple-900/20 to-teal-900/20 border-purple-500/30 backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-teal-600/10"></div>
                  <div className="relative p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 flex items-center justify-center">
                          <Star className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-purple-300 mb-1">Why this coach is perfect for you</h4>
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          {recommendation.matchReason}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* No Recommendations Fallback */}
        {aiAnalysis?.recommendations?.length === 0 && (
          <Card className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">No matches found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find any coaches that match your specific criteria at the moment.
            </p>
            <Button onClick={onBack} variant="outline">
              Go Back and Try Again
            </Button>
          </Card>
        )}

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
    </div>
  );
};