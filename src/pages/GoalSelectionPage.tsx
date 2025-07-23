import { Goal, GOALS } from "@/types/goals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoalCard } from "@/components/GoalCard";
import { ProgressIndicator } from "@/components/ProgressIndicator";

interface GoalSelectionPageProps {
  selectedGoal: Goal | null;
  onGoalSelect: (goal: Goal) => void;
  onNext: () => void;
  onBack: () => void;
}

export const GoalSelectionPage = ({ selectedGoal, onGoalSelect, onNext, onBack }: GoalSelectionPageProps) => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full max-w-4xl mx-auto space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Choose Your Focus Area
          </h1>
          <p className="text-lg text-muted-foreground">
            Select the area where you'd like to make meaningful progress
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator currentStep={1} totalSteps={5} />

        {/* Goal Selection Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GOALS.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              selected={selectedGoal?.id === goal.id}
              onClick={() => onGoalSelect(goal)}
            />
          ))}
        </div>

        {/* Custom Goal Option */}
        <Card className="p-6 border-dashed border-2 border-border hover:border-primary/50 transition-colors">
          <div className="text-center space-y-3">
            <div className="text-3xl">✨</div>
            <h3 className="text-lg font-semibold text-foreground">Custom Goal</h3>
            <p className="text-muted-foreground text-sm">
              Have something specific in mind? We'll help you define it.
            </p>
            <Button variant="outline" className="mt-4">
              Create Custom Goal
            </Button>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            variant="gradient" 
            onClick={onNext}
            disabled={!selectedGoal}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};