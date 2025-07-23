import { Question, UserResponse, MOTIVATIONAL_QUOTES } from "@/types/goals";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/QuestionCard";
import { ProgressIndicator } from "@/components/ProgressIndicator";

interface QuestionPageProps {
  question: Question;
  response?: UserResponse;
  currentQuestionIndex: number;
  totalQuestions: number;
  goalId: string;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  onBack: () => void;
  canGoNext: boolean;
}

export const QuestionPage = ({ 
  question, 
  response, 
  currentQuestionIndex, 
  totalQuestions, 
  goalId,
  onAnswer, 
  onNext, 
  onBack,
  canGoNext 
}: QuestionPageProps) => {
  const motivationalQuote = MOTIVATIONAL_QUOTES[goalId as keyof typeof MOTIVATIONAL_QUOTES] || 
    "Every great achievement begins with the decision to try.";

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full max-w-2xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">
            Tell Us More
          </h1>
          <p className="text-muted-foreground">
            Help us understand your specific needs and goals
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator 
          currentStep={currentQuestionIndex + 2} 
          totalSteps={totalQuestions + 3} 
        />

        {/* Question */}
        <QuestionCard
          question={question}
          response={response}
          onAnswer={onAnswer}
          motivationalQuote={motivationalQuote}
        />

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          {question.type === 'multiple-choice' && (
            <Button 
              variant="gradient" 
              onClick={onNext}
              disabled={!canGoNext}
            >
              {currentQuestionIndex === totalQuestions - 1 ? 'Review Answers' : 'Next Question'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};