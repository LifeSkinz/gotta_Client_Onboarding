import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
interface WelcomePageProps {
  onStart: () => void;
}
export const WelcomePage = ({
  onStart
}: WelcomePageProps) => {
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-6">
            <div className="text-6xl">🎯</div>
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

            <Button variant="gradient" size="lg" onClick={onStart} className="px-12">
              Get Started
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Takes only 3-5 minutes to complete
            </p>
          </div>
        </Card>
      </div>
    </div>;
};