import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useBehavioralInsights } from "@/hooks/useBehavioralInsights";
import { AppNavigation } from "@/components/AppNavigation";
import { supabase } from "@/integrations/supabase/client";

type PageType = 'welcome' | 'goal-selection' | 'questions' | 'summary' | 'coach-list' | 'confirmation';

interface AIAnalysis {
  analysis: string;
  recommendations: any[];
  totalRecommendations: number;
}

const Index = () => {
  const { user, session, loading, signOut } = useAuth();
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
  const location = useLocation();
  
  // Activity tracking and behavioral insights
  const { 
    trackPageView, 
    trackGoalSelection, 
    trackQuestionAnswer, 
    trackCoachSelection,
    trackInteraction 
  } = useActivityTracker();
  
  const { 
    updateBehavioralPattern, 
    analyzeUserPersonality 
  } = useBehavioralInsights();

  const currentQuestions = selectedGoal ? GOAL_QUESTIONS[selectedGoal.id] || [] : [];

  // Auto-trigger AI analysis for authenticated users after completing journey
  useEffect(() => {
    if (user && selectedGoal && responses.length > 0 && currentPage === 'summary') {
      // Trigger behavioral analysis
      const triggerAnalysis = async () => {
        try {
          const analysis = await analyzeUserPersonality(
            user.id,
            responses.map(r => ({
              ...r,
              question: currentQuestions.find(q => q.id === r.questionId)?.question
            })),
            [],
            true
          );
          
          if (analysis) {
            console.log('User analysis completed:', analysis);
          }
        } catch (error) {
          console.error('Failed to analyze user:', error);
        }
      };

      triggerAnalysis();
    }
  }, [user, selectedGoal, responses, currentPage, analyzeUserPersonality, currentQuestions]);

  // Initialize session ID and check for restart parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const shouldRestart = urlParams.get('restart') === 'true';
    
    if (shouldRestart) {
      handleStartOver();
      // Clean URL
      navigate('/', { replace: true });
    }
    
    let storedSessionId = localStorage.getItem('guestSessionId');
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem('guestSessionId', storedSessionId);
    }
    setSessionId(storedSessionId);
  }, [location.search]);

  // Track page views
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    trackPageView(currentPath);
  }, [location, trackPageView]);

  // Migration check for guest sessions
  useEffect(() => {
    // If user just signed in and we have a guest session, migrate the data
    if (user && sessionId) {
      setTimeout(() => {
        migrateGuestSessionData(user.id);
      }, 0);
    }
  }, [sessionId, user]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const handleStart = () => {
    trackInteraction('start_journey');
    setCurrentPage('goal-selection');
  };

  const handleGoalSelect = (goal: Goal) => {
    trackGoalSelection(goal);
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
    
    // Track question answer
    trackQuestionAnswer(question.id, answer);
    
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
      <AppNavigation user={user} />
      <div className={user ? "pt-16 lg:pt-20" : ""}>
        {currentPageContent}
      </div>
      <PersonalityScreeningDialog
        open={showPersonalityDialog}
        onComplete={handlePersonalityComplete}
      />
    </>
  );
};

export default Index;
