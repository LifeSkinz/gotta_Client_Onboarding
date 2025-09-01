import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ExternalLink, Clock, Target, Star, TrendingUp } from "lucide-react";
import { useState } from "react";

interface ResourceRecommendationsCardProps {
  recommendations: any;
  loading?: boolean;
  onResourceClick?: (resource: any) => void;
}

export const ResourceRecommendationsCard = ({ 
  recommendations, 
  loading,
  onResourceClick 
}: ResourceRecommendationsCardProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <div className="h-4 bg-muted animate-pulse rounded w-40"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded w-48"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-32"></div>
              <div className="h-8 bg-muted animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!recommendations?.resourceRecommendations) {
    return (
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Resource Recommendations
          </CardTitle>
          <CardDescription>
            Personalized resources will be suggested based on your profile and goals
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const resources = recommendations.resourceRecommendations || [];
  const learningPath = recommendations.learningPath;
  const insights = recommendations.contextualInsights;

  // Get unique categories
  const categories = ['all', ...new Set(resources.map((r: any) => r.type as string))];

  // Filter resources by category
  const filteredResources = selectedCategory === 'all' 
    ? resources 
    : resources.filter((r: any) => r.type === selectedCategory);

  // Sort by relevance score
  const sortedResources = filteredResources.sort((a: any, b: any) => 
    (b.relevanceScore || 0) - (a.relevanceScore || 0)
  );

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'book': return '📚';
      case 'article': return '📄';
      case 'podcast': return '🎧';
      case 'video': return '🎥';
      case 'tool': return '🛠️';
      case 'exercise': return '💪';
      case 'app': return '📱';
      case 'course': return '🎓';
      default: return '📖';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return { variant: 'secondary' as const, text: 'Beginner' };
      case 'intermediate': return { variant: 'default' as const, text: 'Intermediate' };
      case 'advanced': return { variant: 'destructive' as const, text: 'Advanced' };
      default: return { variant: 'outline' as const, text: 'All Levels' };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Personalized Resource Recommendations
        </CardTitle>
        <CardDescription>
          AI-curated resources tailored to your learning style and goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category: string) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {category === 'all' ? 'All Resources' : category}
            </Button>
          ))}
        </div>

        {/* Learning Path Overview */}
        {learningPath && (
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recommended Learning Path
            </h4>
            <div className="text-sm">
              <div className="mb-2">
                <strong>Timeframe:</strong> {learningPath.timeframe || 'Flexible'}
              </div>
              {learningPath.sequence && learningPath.sequence.length > 0 && (
                <div>
                  <strong>Suggested Order:</strong>
                  <ol className="mt-1 space-y-1 ml-4">
                    {learningPath.sequence.slice(0, 3).map((step: string, idx: number) => (
                      <li key={idx} className="text-muted-foreground list-decimal">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resources List */}
        <div className="space-y-4">
          {sortedResources.map((resource: any, idx: number) => {
            const difficultyBadge = getDifficultyBadge(resource.difficulty);
            
            return (
              <div 
                key={resource.id || idx} 
                className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getResourceIcon(resource.type)}</span>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm leading-tight">
                          {resource.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">
                            {resource.type}
                          </Badge>
                          <Badge variant={difficultyBadge.variant} className="text-xs">
                            {difficultyBadge.text}
                          </Badge>
                          {resource.timeToComplete && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {resource.timeToComplete}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {resource.description}
                    </p>
                    
                    <div className="text-xs text-muted-foreground">
                      <strong>Why this helps:</strong> {resource.personalizedReason}
                    </div>
                    
                    {resource.expectedImpact && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Expected Impact:</strong> {resource.expectedImpact}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right space-y-2 ml-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-sm font-medium">{resource.relevanceScore || 0}%</span>
                    </div>
                    <div className={`text-xs font-medium capitalize ${getPriorityColor(resource.priority)}`}>
                      {resource.priority} Priority
                    </div>
                  </div>
                </div>

                <Progress value={resource.relevanceScore || 0} className="h-1" />

                {/* Tags */}
                {resource.tags && resource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.map((tag: string, tagIdx: number) => (
                      <Badge key={tagIdx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {resource.url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(resource.url, '_blank')}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Resource
                    </Button>
                  )}
                  {onResourceClick && (
                    <Button
                      size="sm"
                      onClick={() => onResourceClick(resource)}
                    >
                      Save to Library
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contextual Insights */}
        {insights && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Learning Insights
            </h4>
            
            {insights.learningGaps && insights.learningGaps.length > 0 && (
              <div className="text-sm">
                <strong>Focus Areas:</strong>
                <ul className="mt-1 space-y-1">
                  {insights.learningGaps.map((gap: string, idx: number) => (
                    <li key={idx} className="text-muted-foreground">• {gap}</li>
                  ))}
                </ul>
              </div>
            )}

            {insights.strengthsToLeverage && insights.strengthsToLeverage.length > 0 && (
              <div className="text-sm">
                <strong>Build on Strengths:</strong>
                <ul className="mt-1 space-y-1">
                  {insights.strengthsToLeverage.map((strength: string, idx: number) => (
                    <li key={idx} className="text-muted-foreground">• {strength}</li>
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