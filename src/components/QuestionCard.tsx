import { Question, UserResponse } from "@/types/goals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface QuestionCardProps {
  question: Question;
  response?: UserResponse;
  onAnswer: (answer: string) => void;
  motivationalQuote: string;
}

export const QuestionCard = ({ question, response, onAnswer, motivationalQuote }: QuestionCardProps) => {
  const [openEndedAnswer, setOpenEndedAnswer] = useState(response?.answer || '');

  const handleMultipleChoiceSelect = (option: string) => {
    onAnswer(option);
  };

  const handleOpenEndedSubmit = () => {
    if (openEndedAnswer.trim()) {
      onAnswer(openEndedAnswer.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Motivational Quote */}
      <Card className="p-6 bg-gradient-card border-primary/20">
        <p className="text-accent italic text-center text-lg">
          "{motivationalQuote}"
        </p>
      </Card>

      {/* Question Card */}
      <Card className="p-8 bg-gradient-card border-border">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground leading-relaxed">
            {question.question}
          </h2>

          {question.type === 'multiple-choice' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <Button
                  key={index}
                  variant={response?.answer === option ? "gradient" : "outline"}
                  className="w-full text-left justify-start h-auto p-4 whitespace-normal"
                  onClick={() => handleMultipleChoiceSelect(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}

          {question.type === 'open-ended' && (
            <div className="space-y-4">
              <Textarea
                placeholder={question.placeholder}
                value={openEndedAnswer}
                onChange={(e) => setOpenEndedAnswer(e.target.value)}
                className="min-h-32 bg-background/50 border-border focus:border-primary resize-none"
              />
              <Button
                variant="gradient"
                onClick={handleOpenEndedSubmit}
                disabled={!openEndedAnswer.trim()}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};