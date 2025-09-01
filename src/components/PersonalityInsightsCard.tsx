import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, MessageCircle, Target, Zap } from "lucide-react";

interface PersonalityInsightsCardProps {
  personalityProfile: any;
  loading?: boolean;
}

export const PersonalityInsightsCard = ({ personalityProfile, loading }: PersonalityInsightsCardProps) => {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="h-5 w-5 text-primary" />
          <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-muted animate-pulse rounded w-20"></div>
              <div className="h-2 bg-muted animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!personalityProfile) {
    return (
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Personality Insights
          </CardTitle>
          <CardDescription>
            Complete your assessment to unlock detailed personality insights
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { personalityProfile: profile, cognitiveProfile, emotionalProfile, communicationProfile } = personalityProfile;

  const bigFiveTraits = profile?.bigFive || {};
  const coachingTraits = profile?.coachingTraits || {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Personality Insights
        </CardTitle>
        <CardDescription>
          AI-powered analysis of your personality traits and coaching compatibility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Big Five Traits */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Core Personality Traits
          </h4>
          <div className="grid gap-3">
            {Object.entries(bigFiveTraits).map(([trait, data]: [string, any]) => (
              <div key={trait} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">
                    {trait.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {data?.score || 0}%
                  </span>
                </div>
                <Progress value={data?.score || 0} className="h-2" />
                <Badge variant="secondary" className="text-xs">
                  {data?.confidence || 0}% confidence
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Coaching Traits */}
        {coachingTraits && Object.keys(coachingTraits).length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Coaching Readiness
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(coachingTraits).map(([trait, score]: [string, any]) => (
                <div key={trait} className="text-center">
                  <div className="text-sm font-medium capitalize mb-1">
                    {trait.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </div>
                  <div className="text-2xl font-bold text-primary">{score}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Communication Style */}
        {communicationProfile && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Communication Style
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Directness Level</span>
                <Progress value={communicationProfile.directnessLevel || 50} className="w-24 h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Feedback Style:</strong> {communicationProfile.feedbackStyle || 'Not determined'}
              </div>
              <div className="text-sm text-muted-foreground">
                <strong>Conflict Approach:</strong> {communicationProfile.conflictApproach || 'Not determined'}
              </div>
            </div>
          </div>
        )}

        {/* Learning Preferences */}
        {cognitiveProfile && (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Learning Preferences
            </h4>
            <div className="grid gap-2 text-sm">
              <div>
                <strong>Learning Style:</strong> {cognitiveProfile.learningStyle || 'Not determined'}
              </div>
              <div>
                <strong>Information Preference:</strong> {cognitiveProfile.informationPreference || 'Not determined'}
              </div>
              <div>
                <strong>Decision Making:</strong> {cognitiveProfile.decisionMakingStyle || 'Not determined'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};