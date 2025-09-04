import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Goal, UserResponse, Question, PersonalityResponse } from "@/types/goals";
import { CoachListPage } from "./CoachListPage";
import { AppNavigation } from "@/components/AppNavigation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface AIAnalysis {
  analysis: string;
  recommendations: any[];
  totalRecommendations: number;
}

interface CoachesPageState {
  selectedGoal: Goal;
  responses: UserResponse[];
  questions: Question[];
  aiAnalysis?: AIAnalysis;
  sessionId: string;
  personalityResponses?: PersonalityResponse[];
}

export default function CoachesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<CoachesPageState | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Try to get state from navigation
    const navigationState = location.state as CoachesPageState;
    
    if (navigationState) {
      setState(navigationState);
      setAiAnalysis(navigationState.aiAnalysis || null);
      // Store in localStorage for persistence
      localStorage.setItem('coachesPageState', JSON.stringify(navigationState));
    } else {
      // Try to restore from localStorage
      const storedState = localStorage.getItem('coachesPageState');
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        setState(parsedState);
        setAiAnalysis(parsedState.aiAnalysis || null);
      } else {
        // No state available, redirect to questionnaire
        toast({
          title: "Session expired",
          description: "Please complete the questionnaire again.",
          variant: "destructive",
        });
        navigate('/');
      }
    }
  }, [location.state, navigate, toast]);

  const fetchCoachRecommendations = async () => {
    if (!state) return;
    
    try {
      setLoading(true);
      
      toast({
        title: "Finding Perfect Matches",
        description: "Analyzing your responses to find the best coaches for you.",
      });

      const requestData = {
        selectedGoal: state.selectedGoal,
        responses: state.responses.map(response => {
          const question = state.questions.find(q => q.id === response.questionId);
          return {
            question: question?.question || '',
            answer: response.answer,
            type: question?.type || 'open-ended'
          };
        }),
        sessionId: state.sessionId,
        personalityResponses: state.personalityResponses || []
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
      
      // Update stored state with AI analysis
      const updatedState = { ...state, aiAnalysis: data };
      setState(updatedState);
      localStorage.setItem('coachesPageState', JSON.stringify(updatedState));
      
    } catch (err) {
      console.error('Error fetching coach recommendations:', err);
      toast({
        title: "Error",
        description: "Failed to load coach recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCoachSelect = (coach: any) => {
    toast({
      title: "Coach Selected!",
      description: `You've selected ${coach.name}. Redirecting to booking...`,
    });
    // Navigate to confirmation or booking page
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your coaching matches...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppNavigation user={user} />
      <div className="pt-16 lg:pt-20">
        <CoachListPage
          selectedGoal={state.selectedGoal}
          responses={state.responses}
          questions={state.questions}
          aiAnalysis={aiAnalysis}
          loading={loading}
          onBack={handleBack}
          onCoachSelect={handleCoachSelect}
          onFetchRecommendations={fetchCoachRecommendations}
        />
      </div>
    </>
  );
}