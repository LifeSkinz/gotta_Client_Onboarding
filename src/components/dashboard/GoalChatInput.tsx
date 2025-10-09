import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const GoalChatInput = () => {
  const [goalText, setGoalText] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!goalText.trim()) {
      toast({
        title: "Please enter a goal",
        description: "Tell us what you'd like to work on",
        variant: "destructive",
      });
      return;
    }

    // Store the goal text in session storage to pre-fill the goal selection
    sessionStorage.setItem("dashboardGoalInput", goalText);
    
    // Navigate to goal selection page
    navigate("/goal-selection");
  };

  return (
    <div className="mb-8">
      <div className="bg-card rounded-lg p-6 border border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Tell us your goal
        </h3>
        <div className="flex gap-3">
          <Textarea
            placeholder="What would you like to work on? (e.g., 'I want to improve my public speaking skills')"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            className="flex-1 min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            size="lg"
            className="self-end"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
