import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, Trash2, BarChart3, CheckCircle2, XCircle } from "lucide-react";

interface TranscriptionConsentDialogProps {
  isOpen: boolean;
  onConsent: (consentLevel: 'full' | 'basic' | 'none') => void;
}

export const TranscriptionConsentDialog = ({ isOpen, onConsent }: TranscriptionConsentDialogProps) => {
  const [selectedOption, setSelectedOption] = useState<'full' | 'basic' | 'none' | null>(null);

  const handleContinue = () => {
    if (selectedOption) {
      onConsent(selectedOption);
    }
  };

  const options = [
    {
      id: 'full' as const,
      title: 'Full Transcription & Analysis',
      description: 'Record, transcribe, and analyze our conversation for maximum insights',
      benefits: ['Real-time transcription', 'AI coaching insights', 'Progress tracking', 'Session summaries'],
      icon: <BarChart3 className="h-5 w-5 text-green-500" />,
      badge: 'Recommended',
      badgeVariant: 'default' as const
    },
    {
      id: 'basic' as const,
      title: 'Basic Recording Only',
      description: 'Record session without transcription or AI analysis',
      benefits: ['Video recording', 'Manual notes', 'Basic session history'],
      icon: <Eye className="h-5 w-5 text-blue-500" />,
      badge: 'Limited insights',
      badgeVariant: 'secondary' as const
    },
    {
      id: 'none' as const,
      title: 'No Recording',
      description: 'Session will not be recorded or transcribed',
      benefits: ['Complete privacy', 'Manual notes only', 'No data storage'],
      icon: <Shield className="h-5 w-5 text-purple-500" />,
      badge: 'Maximum privacy',
      badgeVariant: 'outline' as const
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Transcription Settings
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like your session to be recorded and analyzed. You can change these settings anytime from your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {options.map((option) => (
            <Card 
              key={option.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedOption === option.id ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => setSelectedOption(option.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {option.icon}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{option.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={option.badgeVariant}>{option.badge}</Badge>
                        {selectedOption === option.id && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                    
                    <div className="space-y-1">
                      {option.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Data Management Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Data Control</p>
                  <p className="text-muted-foreground">
                    You maintain full control over your data. Visit your dashboard at any time to view, download, or permanently delete your transcribed data and session recordings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleContinue} 
            disabled={!selectedOption}
            className="w-full sm:w-auto"
          >
            Continue to Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};