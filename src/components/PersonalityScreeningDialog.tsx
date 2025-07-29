import { useState } from "react";
import { PersonalityQuestion, PersonalityResponse, PERSONALITY_QUESTIONS } from "@/types/goals";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PersonalityScreeningDialogProps {
  open: boolean;
  onComplete: (responses: PersonalityResponse[]) => void;
}

export const PersonalityScreeningDialog = ({ open, onComplete }: PersonalityScreeningDialogProps) => {
  const [responses, setResponses] = useState<PersonalityResponse[]>([]);

  const handleRatingSelect = (questionId: string, rating: number) => {
    const updatedResponses = responses.filter(r => r.questionId !== questionId);
    setResponses([...updatedResponses, { questionId, rating }]);
  };

  const getRatingForQuestion = (questionId: string): number | undefined => {
    return responses.find(r => r.questionId === questionId)?.rating;
  };

  const isComplete = responses.length === PERSONALITY_QUESTIONS.length;

  const handleSubmit = () => {
    if (isComplete) {
      onComplete(responses);
    }
  };

  const getRatingLabel = (rating: number): string => {
    const labels = {
      1: "Strongly Disagree",
      2: "Disagree", 
      3: "Neutral",
      4: "Agree",
      5: "Strongly Agree"
    };
    return labels[rating as keyof typeof labels];
  };

  const getRatingEmoji = (rating: number): string => {
    const emojis = {
      1: "😫",
      2: "😕", 
      3: "😐",
      4: "😊",
      5: "😍"
    };
    return emojis[rating as keyof typeof emojis];
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            🧠 Personality Profile
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Help us understand your learning style and preferences to match you with the perfect coach. 
            Please rate each statement from 1-5.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {PERSONALITY_QUESTIONS.map((question, index) => {
            const currentRating = getRatingForQuestion(question.id);
            
            return (
              <Card key={question.id} className="p-6 bg-gradient-card border-primary/20">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="flex-shrink-0 mt-1">
                      {index + 1}
                    </Badge>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground text-lg leading-relaxed">
                        {question.question}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {question.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-muted-foreground">Strongly Disagree</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant={currentRating === rating ? "default" : "outline"}
                          size="sm"
                          className={`w-12 h-12 rounded-full transition-all ${
                            currentRating === rating 
                              ? "bg-primary text-primary-foreground shadow-lg scale-110" 
                              : "hover:scale-105"
                          }`}
                          onClick={() => handleRatingSelect(question.id, rating)}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-xs">{getRatingEmoji(rating)}</span>
                            <span className="text-xs font-bold">{rating}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">Strongly Agree</span>
                  </div>

                  {currentRating && (
                    <div className="text-center">
                      <Badge variant="secondary" className="text-sm">
                        Your choice: {getRatingLabel(currentRating)} {getRatingEmoji(currentRating)}
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-4 pt-6 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Progress: {responses.length} of {PERSONALITY_QUESTIONS.length} questions completed
            </p>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(responses.length / PERSONALITY_QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>
          
          <Button
            variant="gradient"
            size="lg"
            onClick={handleSubmit}
            disabled={!isComplete}
            className="w-full max-w-md"
          >
            {isComplete ? "Complete Personality Profile" : `Answer ${PERSONALITY_QUESTIONS.length - responses.length} more questions`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};