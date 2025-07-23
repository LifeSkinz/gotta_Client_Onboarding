import { Goal } from "@/types/goals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressIndicator } from "@/components/ProgressIndicator";

interface ConfirmationPageProps {
  selectedGoal: Goal;
  onConnectCoach: () => void;
  onExploreResources: () => void;
  onStartOver: () => void;
}

export const ConfirmationPage = ({ selectedGoal, onConnectCoach, onExploreResources, onStartOver }: ConfirmationPageProps) => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full max-w-2xl mx-auto space-y-8 py-8">
        {/* Progress Indicator */}
        <ProgressIndicator currentStep={5} totalSteps={5} />

        {/* Success Animation */}
        <div className="text-center space-y-6">
          <div className="text-8xl animate-bounce">🎉</div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Your Goal is Ready!
          </h1>
          <p className="text-xl text-muted-foreground">
            Congratulations on taking the first step towards achieving your goals.
          </p>
        </div>

        {/* Goal Summary */}
        <Card className="p-8 bg-gradient-card border-primary/20 shadow-card">
          <div className="text-center space-y-4">
            <div className="text-5xl">{selectedGoal.icon}</div>
            <h2 className="text-2xl font-semibold text-foreground">{selectedGoal.title}</h2>
            <p className="text-muted-foreground">{selectedGoal.description}</p>
            <div className="w-full h-1 bg-gradient-primary rounded-full mt-6" />
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-xl font-semibold text-foreground mb-4">What's Next?</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">🎯</div>
              <div>
                <h4 className="font-medium text-foreground">Goal Analysis</h4>
                <p className="text-sm text-muted-foreground">Our AI will analyze your responses to create a personalized action plan</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-2xl">👨‍💼</div>
              <div>
                <h4 className="font-medium text-foreground">Coach Matching</h4>
                <p className="text-sm text-muted-foreground">We'll connect you with coaches who specialize in your focus area</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-2xl">📚</div>
              <div>
                <h4 className="font-medium text-foreground">Resource Library</h4>
                <p className="text-sm text-muted-foreground">Access curated content and tools to support your journey</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button 
            variant="gradient" 
            size="lg" 
            onClick={onConnectCoach}
            className="w-full"
          >
            Connect with a Coach
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={onExploreResources}
            className="w-full"
          >
            Explore Resources
          </Button>
          <Button 
            variant="ghost" 
            onClick={onStartOver}
            className="w-full text-muted-foreground"
          >
            Start Over
          </Button>
        </div>
      </div>
    </div>
  );
};