import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface WelcomePageProps {
  onStart: () => void;
}

export const WelcomePage = ({ onStart }: WelcomePageProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-xl max-w-2xl w-full">
        <CardHeader className="space-y-4 text-center pb-8">
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            Welcome to Your Journey
          </CardTitle>
          <CardDescription className="text-lg">
            Discover personalized coaching tailored to your unique goals and aspirations
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          <div className="grid gap-6">
            <div className="flex gap-4 items-start p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
              <div className="text-primary text-2xl">🎯</div>
              <div>
                <h3 className="font-semibold mb-1">Personalized Matching</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with coaches who understand your specific needs and challenges
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
              <div className="text-primary text-2xl">💡</div>
              <div>
                <h3 className="font-semibold mb-1">Expert Guidance</h3>
                <p className="text-sm text-muted-foreground">
                  Work with experienced coaches who are passionate about your growth
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start p-4 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
              <div className="text-primary text-2xl">🚀</div>
              <div>
                <h3 className="font-semibold mb-1">Achieve Your Goals</h3>
                <p className="text-sm text-muted-foreground">
                  Transform your aspirations into actionable plans and measurable results
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => navigate('/auth?type=client')}
                variant="outline"
              >
                Client Login
              </Button>
              <Button 
                onClick={() => navigate('/auth?type=coach')}
                variant="outline"
              >
                Coach Login
              </Button>
            </div>
            <Button 
              onClick={onStart}
              size="lg"
              className="w-full text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Get Started as Client
            </Button>
            <Button 
              onClick={() => navigate('/coach-signup-request')}
              variant="secondary"
              className="w-full"
            >
              Become a Coach
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
