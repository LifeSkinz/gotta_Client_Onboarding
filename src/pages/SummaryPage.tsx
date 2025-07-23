import { Goal, UserResponse, Question } from "@/types/goals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/ProgressIndicator";

interface SummaryPageProps {
  selectedGoal: Goal;
  responses: UserResponse[];
  questions: Question[];
  onEdit: (questionIndex: number) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export const SummaryPage = ({ selectedGoal, responses, questions, onEdit, onSubmit, onBack }: SummaryPageProps) => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full max-w-3xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Review Your Goals
          </h1>
          <p className="text-lg text-muted-foreground">
            Take a moment to review your answers before we connect you with the perfect coach
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator currentStep={questions.length + 2} totalSteps={questions.length + 3} />

        {/* Selected Goal */}
        <Card className="p-6 bg-gradient-card border-primary/20">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">{selectedGoal.icon}</div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{selectedGoal.title}</h2>
              <p className="text-muted-foreground">{selectedGoal.description}</p>
            </div>
          </div>
        </Card>

        {/* Responses */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Your Responses</h3>
          {questions.map((question, index) => {
            const response = responses.find(r => r.questionId === question.id);
            return (
              <Card key={question.id} className="p-6 bg-card border-border">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-foreground pr-4">
                      {question.question}
                    </h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEdit(index)}
                    >
                      Edit
                    </Button>
                  </div>
                  <p className="text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                    {response?.answer || 'No response provided'}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button variant="gradient" size="lg" onClick={onSubmit}>
            Submit Goals
          </Button>
        </div>
      </div>
    </div>
  );
};