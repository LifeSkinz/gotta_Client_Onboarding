import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalityInsightsCard } from "@/components/PersonalityInsightsCard";
import { CoachCompatibilityCard } from "@/components/CoachCompatibilityCard";
import { ResourceRecommendationsCard } from "@/components/ResourceRecommendationsCard";
import { useToast } from "@/hooks/use-toast";
import { useAIInsights } from "@/hooks/useAIInsights";
import { supabase } from "@/integrations/supabase/client";
import { Brain, ArrowLeft, RefreshCw, Users, BookOpen, Zap } from "lucide-react";

export const InsightsPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    personalityProfile,
    coachCompatibility,
    resourceRecommendations,
    loading,
    error,
    triggerUserAnalysis,
    getCoachCompatibility,
    getResourceRecommendations,
    clearError
  } = useAIInsights();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      
      // Auto-trigger analysis for authenticated users
      initializeInsights(user.id);
    });
  }, [navigate]);

  useEffect(() => {
    fetchCoaches();
  }, []);

  useEffect(() => {
    if (error) {
      toast({
        title: "Analysis Error",
        description: error,
        variant: "destructive",
      });
      clearError();
    }
  }, [error, toast, clearError]);

  const fetchCoaches = async () => {
    setLoadingCoaches(true);
    try {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .order('rating', { ascending: false });

      if (error) throw error;
      setCoaches(data || []);
    } catch (error) {
      console.error('Failed to fetch coaches:', error);
      toast({
        title: "Error",
        description: "Failed to load coaches",
        variant: "destructive",
      });
    } finally {
      setLoadingCoaches(false);
    }
  };

  const initializeInsights = async (userId: string) => {
    // Trigger comprehensive analysis
    await triggerUserAnalysis(userId);
    
    // Get coach compatibility if we have coaches
    if (coaches.length > 0) {
      const coachIds = coaches.slice(0, 10).map(c => c.id); // Analyze top 10 coaches
      await getCoachCompatibility(userId, coachIds);
    }
    
    // Get resource recommendations
    await getResourceRecommendations(userId, {
      type: 'general'
    });
  };

  const handleRefreshAnalysis = async () => {
    if (!user) return;
    
    toast({
      title: "Refreshing Analysis",
      description: "Generating updated insights based on your latest activity...",
    });

    await initializeInsights(user.id);
  };

  const handleCoachCompatibilityRefresh = async () => {
    if (!user || coaches.length === 0) return;
    
    const coachIds = coaches.slice(0, 10).map(c => c.id);
    await getCoachCompatibility(user.id, coachIds);
  };

  const handleResourceRefresh = async () => {
    if (!user) return;
    
    await getResourceRecommendations(user.id, {
      type: 'general'
    });
  };

  const handleSelectCoach = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    if (coach) {
      toast({
        title: "Coach Selected",
        description: `Redirecting to book a session with ${coach.name}...`,
      });
      // In a real app, this would navigate to booking flow
      navigate(`/coaches/${coachId}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            Please sign in to access your personalized insights
          </p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Brain className="h-8 w-8 text-primary" />
                AI Insights Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive analysis of your coaching journey and personality
              </p>
            </div>
          </div>
          <Button
            onClick={handleRefreshAnalysis}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="personality" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personality" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Personality
            </TabsTrigger>
            <TabsTrigger value="compatibility" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Coach Matching
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personality" className="space-y-6">
            <PersonalityInsightsCard
              personalityProfile={personalityProfile}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="compatibility" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Coach Compatibility Analysis</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCoachCompatibilityRefresh}
                disabled={loading || loadingCoaches}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Update Compatibility
              </Button>
            </div>
            <CoachCompatibilityCard
              compatibilityData={coachCompatibility}
              coaches={coaches}
              loading={loading || loadingCoaches}
              onSelectCoach={handleSelectCoach}
            />
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Personalized Resources</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResourceRefresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Recommendations
              </Button>
            </div>
            <ResourceRecommendationsCard
              recommendations={resourceRecommendations}
              loading={loading}
              onResourceClick={(resource) => {
                toast({
                  title: "Resource Saved",
                  description: `"${resource.title}" has been added to your library`,
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};