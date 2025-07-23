import { Goal } from "@/types/goals";
import { Card } from "@/components/ui/card";

interface GoalCardProps {
  goal: Goal;
  selected: boolean;
  onClick: () => void;
}

export const GoalCard = ({ goal, selected, onClick }: GoalCardProps) => {
  return (
    <Card 
      className={`
        p-6 cursor-pointer transition-all duration-300 hover:scale-105 border-2
        ${selected 
          ? 'border-primary bg-gradient-card shadow-glow' 
          : 'border-border hover:border-primary/50 bg-card'
        }
      `}
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="text-4xl mb-2">{goal.icon}</div>
        <h3 className="text-xl font-semibold text-foreground">{goal.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {goal.description}
        </p>
        {selected && (
          <div className="w-full h-1 bg-gradient-primary rounded-full mt-4" />
        )}
      </div>
    </Card>
  );
};