import { useState } from "react";
import { Goal, GOALS } from "@/types/goals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GoalCard } from "@/components/GoalCard";
import { ProgressIndicator } from "@/components/ProgressIndicator";

interface GoalSelectionPageProps {
  selectedGoal: Goal | null;
  onGoalSelect: (goal: Goal) => void;
  onNext: () => void;
  onBack: () => void;
}

export const GoalSelectionPage = ({ selectedGoal, onGoalSelect, onNext, onBack }: GoalSelectionPageProps) => {
  const [showCustomGoal, setShowCustomGoal] = useState(false);
  const [customGoalText, setCustomGoalText] = useState("");

  const handleCustomGoalSubmit = () => {
    if (customGoalText.trim().length < 10) return;
    
    const customGoal: Goal = {
      id: 'custom',
      title: 'Custom Goal',
      description: customGoalText.trim(),
      icon: '🎯',
      color: 'from-blue-400 to-purple-600'
    };
    
    onGoalSelect(customGoal);
  };
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
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="text-3xl">✨</div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">Custom Goal</h3>
                <p className="text-muted-foreground text-sm">
                  Have something specific in mind? Define your goal below.
                </p>
              </div>
            </div>
            
            {!showCustomGoal ? (
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomGoal(true)}
                  className="mt-2"
                >
                  Create Custom Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea
                  placeholder="Describe your goal in detail (minimum 10 characters)..."
                  value={customGoalText}
                  onChange={(e) => setCustomGoalText(e.target.value)}
                  className="min-h-[100px] resize-none"
                  autoFocus
                />
                <div className="flex space-x-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCustomGoal(false);
                      setCustomGoalText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="gradient"
                    onClick={handleCustomGoalSubmit}
                    disabled={customGoalText.trim().length < 10}
                  >
                    Set Custom Goal
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {customGoalText.length}/10 characters minimum
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
};