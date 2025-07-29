import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
interface WelcomePageProps {
  onStart: () => void;
}
export const WelcomePage = ({
  onStart
}: WelcomePageProps) => {
  const navigate = useNavigate();

  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Header with Client Login */}
      <div className="absolute top-4 right-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/auth')}
          className="bg-gradient-card border-primary/20 text-foreground hover:bg-primary/10"
        >
          Client Login
        </Button>
      </div>
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <img src="/lovable-uploads/9f5437ec-fa52-4ad6-bccb-b92e0df1c312.png" alt="Gotta Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">Connecting AI-power with people</h1>
          <p className="text-xl text-muted-foreground">AI-power whatever you GOTTA DO!</p>
        </div>

        {/* Main Content */}
        <Card className="p-8 bg-gradient-card border-border shadow-card">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-semibold text-foreground">Now lets set a Goal to begin! </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">Setting clear goals helps you achieve what matters most, and we will find you the perfect coaching support...... For Free!!</p>
            
            <div className="grid md:grid-cols-3 gap-4 my-8">
              <div className="text-center p-4">
                <div className="text-3xl mb-2">📝</div>
                <h3 className="font-semibold text-foreground">Personalized</h3>
                <p className="text-sm text-muted-foreground">Tailored questions based on your goals</p>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-semibold text-foreground">Focused</h3>
                <p className="text-sm text-muted-foreground">Clear, actionable goal setting</p>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl mb-2">🚀</div>
                <h3 className="font-semibold text-foreground">Results</h3>
                <p className="text-sm text-muted-foreground">Connect with your ideal coach</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Button variant="gradient" size="lg" onClick={onStart} className="px-12">
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => navigate('/preview')} 
                className="px-8"
              >
                View Email Preview
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Takes only 3-5 minutes to complete
            </p>
          </div>
        </Card>
      </div>
    </div>;
};