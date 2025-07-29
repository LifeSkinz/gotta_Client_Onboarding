import { useState } from "react";
import { Goal, UserResponse, Question, GOAL_QUESTIONS, PersonalityResponse } from "@/types/goals";
import { WelcomePage } from "./WelcomePage";
import { GoalSelectionPage } from "./GoalSelectionPage";
import { QuestionPage } from "./QuestionPage";
import { SummaryPage } from "./SummaryPage";
import { ConfirmationPage } from "./ConfirmationPage";
import { CoachListPage } from "./CoachListPage";
import { PersonalityScreeningDialog } from "@/components/PersonalityScreeningDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type PageType = 'welcome' | 'goal-selection' | 'questions' | 'summary' | 'coach-list' | 'confirmation';

interface AIAnalysis {
  analysis: string;
  recommendations: any[];
  totalRecommendations: number;
}

const Index = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('welcome');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [personalityResponses, setPersonalityResponses] = useState<PersonalityResponse[]>([]);
  const [showPersonalityDialog, setShowPersonalityDialog] = useState(false);
  const [hasCompletedPersonalityScreening, setHasCompletedPersonalityScreening] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingCoachRecommendations, setLoadingCoachRecommendations] = useState(false);
  const { toast } = useToast();

  const currentQuestions = selectedGoal ? GOAL_QUESTIONS[selectedGoal.id] || [] : [];

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

  const handleSubmit = () => {
    // Check if personality screening is needed
    if (!hasCompletedPersonalityScreening) {
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
    if (!aiAnalysis) {
      await fetchCoachRecommendations();
    }
    setCurrentPage('coach-list');
  };

  const fetchCoachRecommendations = async () => {
    if (!selectedGoal) return;
    
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
      toast({
        title: "Error",
        description: "Failed to load coach recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingCoachRecommendations(false);
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
  };

  const getCurrentResponse = () => {
    if (!currentQuestions[currentQuestionIndex]) return undefined;
    return responses.find(r => r.questionId === currentQuestions[currentQuestionIndex].id);
  };

  const canGoNext = () => {
    const currentResponse = getCurrentResponse();
    return currentResponse && currentResponse.answer.trim().length > 0;
  };

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
      {currentPageContent}
      <PersonalityScreeningDialog
        open={showPersonalityDialog}
        onComplete={handlePersonalityComplete}
      />
    </>
  );
};

export default Index;
