import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, TrendingUp, MessageSquare, Target, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface CoachCompatibilityCardProps {
  compatibilityData: any;
  coaches: any[];
  loading?: boolean;
  onSelectCoach?: (coachId: string) => void;
}

export const CoachCompatibilityCard = ({ 
  compatibilityData, 
  coaches, 
  loading,
  onSelectCoach 
}: CoachCompatibilityCardProps) => {
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Heart className="h-5 w-5 text-primary" />
          <div className="h-4 bg-muted animate-pulse rounded w-40"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
              <div className="h-2 bg-muted animate-pulse rounded"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-48"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!compatibilityData?.compatibilityResults) {
    return (
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Coach Compatibility
          </CardTitle>
          <CardDescription>
            AI analysis will determine your best coach matches
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sortedResults = compatibilityData.compatibilityResults.sort(
    (a: any, b: any) => b.overallScore - a.overallScore
  );

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getCompatibilityBadge = (score: number) => {
    if (score >= 80) return { variant: "default" as const, text: "Excellent Match" };
    if (score >= 60) return { variant: "secondary" as const, text: "Good Match" };
    return { variant: "destructive" as const, text: "Consider Alternatives" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Coach Compatibility Analysis
        </CardTitle>
        <CardDescription>
          AI-powered matching based on personality, communication style, and coaching approach
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {sortedResults.map((result: any) => {
            const coach = coaches.find(c => c.id === result.coachId);
            const expanded = selectedCoachId === result.coachId;
            const compatibility = getCompatibilityBadge(result.overallScore);

            return (
              <div 
                key={result.coachId} 
                className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-semibold">{coach?.name || 'Unknown Coach'}</h4>
                    <p className="text-sm text-muted-foreground">{coach?.title}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className={`text-2xl font-bold ${getCompatibilityColor(result.overallScore)}`}>
                      {result.overallScore}%
                    </div>
                    <Badge variant={compatibility.variant} className="text-xs">
                      {compatibility.text}
                    </Badge>
                  </div>
                </div>

                <Progress value={result.overallScore} className="h-2" />

                {/* Compatibility Factors */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Personality:</span>
                    <span>{result.compatibilityFactors?.personalityMatch || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Communication:</span>
                    <span>{result.compatibilityFactors?.communicationAlignment || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Learning Style:</span>
                    <span>{result.compatibilityFactors?.learningStyleFit || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Goal Achievement:</span>
                    <span>{result.compatibilityFactors?.goalAchievementPotential || 0}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCoachId(expanded ? null : result.coachId)}
                  >
                    {expanded ? 'Show Less' : 'Show Details'}
                  </Button>
                  {onSelectCoach && (
                    <Button
                      size="sm"
                      onClick={() => onSelectCoach(result.coachId)}
                    >
                      Select Coach
                    </Button>
                  )}
                </div>

                {expanded && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* Strengths */}
                    {result.strengths && result.strengths.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          Strengths
                        </h5>
                        <ul className="text-sm space-y-1">
                          {result.strengths.map((strength: string, idx: number) => (
                            <li key={idx} className="text-muted-foreground">• {strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Potential Challenges */}
                    {result.potentialChallenges && result.potentialChallenges.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          Areas to Consider
                        </h5>
                        <ul className="text-sm space-y-1">
                          {result.potentialChallenges.map((challenge: string, idx: number) => (
                            <li key={idx} className="text-muted-foreground">• {challenge}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {result.recommendations && (
                      <div className="space-y-2">
                        <h5 className="font-medium text-sm flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          Recommendations
                        </h5>
                        <div className="text-sm space-y-1">
                          {result.recommendations.sessionStructure && (
                            <div>
                              <strong>Session Structure:</strong> {result.recommendations.sessionStructure}
                            </div>
                          )}
                          {result.recommendations.communicationApproach && (
                            <div>
                              <strong>Communication:</strong> {result.recommendations.communicationApproach}
                            </div>
                          )}
                          {result.recommendations.focusAreas && result.recommendations.focusAreas.length > 0 && (
                            <div>
                              <strong>Focus Areas:</strong> {result.recommendations.focusAreas.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Matching Insights */}
        {compatibilityData.matchingInsights && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm">Matching Insights</h4>
            
            {compatibilityData.matchingInsights.bestMatches && (
              <div className="text-sm">
                <strong>Key Success Factors:</strong>
                <ul className="mt-1 space-y-1">
                  {compatibilityData.matchingInsights.bestMatches.map((factor: string, idx: number) => (
                    <li key={idx} className="text-muted-foreground">• {factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {compatibilityData.matchingInsights.optimizationSuggestions && (
              <div className="text-sm">
                <strong>Optimization Tips:</strong>
                <ul className="mt-1 space-y-1">
                  {compatibilityData.matchingInsights.optimizationSuggestions.map((tip: string, idx: number) => (
                    <li key={idx} className="text-muted-foreground">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};