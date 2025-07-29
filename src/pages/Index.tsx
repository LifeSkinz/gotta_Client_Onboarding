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

type PageType = 'welcome' | 'goal-selection' | 'questions' | 'summary' | 'coach-list' | 'confirmation';

const Index = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('welcome');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [personalityResponses, setPersonalityResponses] = useState<PersonalityResponse[]>([]);
  const [showPersonalityDialog, setShowPersonalityDialog] = useState(false);
  const [hasCompletedPersonalityScreening, setHasCompletedPersonalityScreening] = useState(false);
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

  const proceedToCoachList = () => {
    toast({
      title: "Profile Complete!",
      description: "We're analyzing your responses to find the perfect coach match.",
    });
    setCurrentPage('coach-list');
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
            onBack={() => setCurrentPage('summary')}
            onCoachSelect={handleCoachSelect}
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
