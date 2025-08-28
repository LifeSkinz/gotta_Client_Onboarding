import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { Goal, UserResponse, Question, GOAL_QUESTIONS, PersonalityResponse } from "@/types/goals";
import { WelcomePage } from "./WelcomePage";
import { GoalSelectionPage } from "./GoalSelectionPage";
import { QuestionPage } from "./QuestionPage";
import { SummaryPage } from "./SummaryPage";
import { ConfirmationPage } from "./ConfirmationPage";
import { CoachListPage } from "./CoachListPage";
import { PersonalityScreeningDialog } from "@/components/PersonalityScreeningDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type PageType = 'welcome' | 'goal-selection' | 'questions' | 'summary' | 'coach-list' | 'confirmation';

interface AIAnalysis {
  analysis: string;
  recommendations: any[];
  totalRecommendations: number;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageType>('welcome');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [personalityResponses, setPersonalityResponses] = useState<PersonalityResponse[]>([]);
  const [showPersonalityDialog, setShowPersonalityDialog] = useState(false);
  const [hasCompletedPersonalityScreening, setHasCompletedPersonalityScreening] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingCoachRecommendations, setLoadingCoachRecommendations] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize session ID
  useEffect(() => {
    let storedSessionId = localStorage.getItem('guestSessionId');
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem('guestSessionId', storedSessionId);
    }
    setSessionId(storedSessionId);
  }, []);

  // Authentication check
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUser = session?.user ?? null;
        
        // If user just signed in and we have a guest session, migrate the data
        if (newUser && !user && sessionId) {
          setTimeout(() => {
            migrateGuestSessionData(newUser.id);
          }, 0);
        }
        
        setSession(session);
        setUser(newUser);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [sessionId, user]);

  const currentQuestions = selectedGoal ? GOAL_QUESTIONS[selectedGoal.id] || [] : [];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const handleStart = () => {
    setCurrentPage('goal-selection');
  };

  const handleGoalSelect = (goal: Goal) => {
    setSelectedGoal(goal);
    // Auto-advance to questions after brief delay
    setTimeout(() => {
      setCurrentPage('questions');
      setCurrentQuestionIndex(0);
      setResponses([]);
    }, 500);
  };

  const handleGoalNext = () => {
    if (!selectedGoal) return;
    setCurrentPage('questions');
    setCurrentQuestionIndex(0);
    setResponses([]);
  };

  const handleAnswer = (answer: string) => {
    if (!selectedGoal || !currentQuestions[currentQuestionIndex]) return;
    
    const question = currentQuestions[currentQuestionIndex];
    const newResponse: UserResponse = {
      questionId: question.id,
      answer
    };
    
    const updatedResponses = responses.filter(r => r.questionId !== question.id);
    setResponses([...updatedResponses, newResponse]);
    
    // Auto-advance for multiple choice questions
    if (question.type === 'multiple-choice') {
      setTimeout(() => {
        if (currentQuestionIndex < currentQuestions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          setCurrentPage('summary');
        }
      }, 500);
    } else {
      // For open-ended questions, advance immediately after answer
      if (currentQuestionIndex < currentQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setCurrentPage('summary');
      }
    }
  };

  const handleQuestionNext = () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setCurrentPage('summary');
    }
  };

  const handleQuestionBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      setCurrentPage('goal-selection');
    }
  };

  const handleEditResponse = (questionIndex: number) => {
    setCurrentQuestionIndex(questionIndex);
    setCurrentPage('questions');
  };

  const handleSubmit = async () => {
    // For non-authenticated users, show personality screening first
    if (!user && !hasCompletedPersonalityScreening) {
      setShowPersonalityDialog(true);
    } else {
      proceedToCoachList();
    }
  };

  const handlePersonalityComplete = (responses: PersonalityResponse[]) => {
    setPersonalityResponses(responses);
    setHasCompletedPersonalityScreening(true);
    setShowPersonalityDialog(false);
    proceedToCoachList();
  };

  const proceedToCoachList = async () => {
    // Navigate to dedicated coaches page with state
    navigate('/coaches', {
      state: {
        selectedGoal,
        responses,
        questions: currentQuestions,
        aiAnalysis,
        sessionId,
        personalityResponses
      }
    });
  };

  const fetchCoachRecommendations = async () => {
    if (!selectedGoal || !sessionId) return;
    
    try {
      setLoadingCoachRecommendations(true);
      
      toast({
        title: "Profile Complete!",
        description: "We're analyzing your responses to find the perfect coach match.",
      });

      // Prepare the data for the AI matching function
      const requestData = {
        selectedGoal,
        responses: responses.map(response => {
          const question = currentQuestions.find(q => q.id === response.questionId);
          return {
            question: question?.question || '',
            answer: response.answer,
            type: question?.type || 'open-ended'
          };
        }),
        sessionId,
        userId: user?.id || null
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
      toast({
        title: "Error",
        description: "Failed to load coach recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingCoachRecommendations(false);
    }
  };

  // Function to migrate guest session data on authentication
  const migrateGuestSessionData = async (userId: string) => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase.functions.invoke('migrate-guest-session', {
        body: {
          sessionId,
          userId
        }
      });

      if (error) {
        console.error('Error migrating guest session:', error);
      } else {
        console.log('Successfully migrated guest session data:', data);
      }
    } catch (error) {
      console.error('Error during guest session migration:', error);
    }
  };

  const handleCoachSelect = (coach: any) => {
    toast({
      title: "Coach Selected!",
      description: `You've selected ${coach.name}. Redirecting to booking...`,
    });
    setCurrentPage('confirmation');
  };

  const handleExploreResources = () => {
    toast({
      title: "Exploring Resources",
      description: "Access our curated library of tools and content...",
    });
    // In a real app, this would navigate to the resources page
  };

  const handleStartOver = () => {
    setCurrentPage('welcome');
    setSelectedGoal(null);
    setCurrentQuestionIndex(0);
    setResponses([]);
    setPersonalityResponses([]);
    setHasCompletedPersonalityScreening(false);
    setShowPersonalityDialog(false);
    setAiAnalysis(null);
    
    // Generate new session ID for fresh start
    const newSessionId = crypto.randomUUID();
    localStorage.setItem('guestSessionId', newSessionId);
    setSessionId(newSessionId);
  };

  const getCurrentResponse = () => {
    if (!currentQuestions[currentQuestionIndex]) return undefined;
    return responses.find(r => r.questionId === currentQuestions[currentQuestionIndex].id);
  };

  const canGoNext = () => {
    const currentResponse = getCurrentResponse();
    return currentResponse && currentResponse.answer.trim().length > 0;
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Render current page
  const currentPageContent = (() => {
    switch (currentPage) {
      case 'welcome':
        return <WelcomePage onStart={handleStart} />;
        
      case 'goal-selection':
        return (
          <GoalSelectionPage
            selectedGoal={selectedGoal}
            onGoalSelect={handleGoalSelect}
            onNext={handleGoalNext}
            onBack={() => setCurrentPage('welcome')}
          />
        );
        
      case 'questions':
        if (!selectedGoal || !currentQuestions[currentQuestionIndex]) {
          return <div>Loading...</div>;
        }
        return (
          <QuestionPage
            question={currentQuestions[currentQuestionIndex]}
            response={getCurrentResponse()}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={currentQuestions.length}
            goalId={selectedGoal.id}
            onAnswer={handleAnswer}
            onNext={handleQuestionNext}
            onBack={handleQuestionBack}
            canGoNext={canGoNext()}
          />
        );
        
      case 'summary':
        if (!selectedGoal) return <div>Loading...</div>;
        return (
          <SummaryPage
            selectedGoal={selectedGoal}
            responses={responses}
            questions={currentQuestions}
            onEdit={handleEditResponse}
            onSubmit={handleSubmit}
            onBack={() => setCurrentPage('questions')}
          />
        );
        
      case 'coach-list':
        if (!selectedGoal) return <div>Loading...</div>;
        return (
          <CoachListPage
            selectedGoal={selectedGoal}
            responses={responses}
            questions={currentQuestions}
            aiAnalysis={aiAnalysis}
            loading={loadingCoachRecommendations}
            onBack={() => setCurrentPage('summary')}
            onCoachSelect={handleCoachSelect}
            onFetchRecommendations={fetchCoachRecommendations}
          />
        );
        
      case 'confirmation':
        if (!selectedGoal) return <div>Loading...</div>;
        return (
          <ConfirmationPage
            selectedGoal={selectedGoal}
            onConnectCoach={() => setCurrentPage('coach-list')}
            onExploreResources={handleExploreResources}
            onStartOver={handleStartOver}
          />
        );
        
      default:
        return <WelcomePage onStart={handleStart} />;
    }
  })();

  return (
    <>
      {/* Authentication Header */}
      {user && (
        <div className="fixed top-0 right-0 z-50 p-4">
          <Card className="flex items-center gap-3 px-4 py-2 bg-card/95 backdrop-blur-sm border-border/50">
            <div className="text-sm">
              <p className="font-medium">{user.user_metadata?.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </Card>
        </div>
      )}
      
      {/* Not authenticated CTA */}
      {!user && currentPage !== 'welcome' && (
        <div className="fixed top-0 right-0 z-50 p-4">
          <Card className="px-4 py-2 bg-card/95 backdrop-blur-sm border-border/50">
            <div className="text-sm text-center">
              <p className="text-muted-foreground mb-2">Sign in to save progress</p>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            </div>
          </Card>
        </div>
      )}

      {currentPageContent}
      <PersonalityScreeningDialog
        open={showPersonalityDialog}
        onComplete={handlePersonalityComplete}
      />
    </>
  );
};

export default Index;
