import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Coins, Clock, Video, Calendar, User, Star, CheckCircle } from 'lucide-react';

interface Coach {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar_url?: string;
  rating: number;
  available_now?: boolean;
  specialties: string[];
  calendar_link?: string;
}

interface ConnectConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  coach: Coach | null;
  userGoal?: any;
}

const ConnectConfirmDialog: React.FC<ConnectConfirmDialogProps> = ({
  isOpen,
  onClose,
  coach,
  userGoal
}) => {
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setUser(session?.user || null);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleConnectNow = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in or create an account to connect with coaches.",
        variant: "destructive",
      });
      // Store that user was trying to connect so we can redirect back after auth
      localStorage.setItem('connectAfterAuth', JSON.stringify({ 
        coachId: coach?.id, 
        action: 'connect' 
      }));
      window.location.href = '/auth';
      return;
    }

    if (!coach) return;

    setLoading(true);

    try {
      // Get user profile for bio
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Create connection request
      const { data: requestData, error } = await supabase
        .from('connection_requests')
        .insert({
          client_id: user.id,
          coach_id: coach.id,
          client_goal: userGoal,
          client_bio: profile?.bio || 'No bio provided',
          request_type: 'instant'
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to coach via edge function
      const { error: notificationError } = await supabase.functions.invoke(
        'send-connection-notification',
        {
          body: { connectionRequestId: requestData.id }
        }
      );

      if (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't throw error - request was created successfully
      }
      
      toast({
        title: "Connection Request Sent!",
        description: `We've notified ${coach.name}. You'll receive an update shortly.`,
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCall = () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in or create an account to schedule calls.",
        variant: "destructive",
      });
      // Store that user was trying to schedule so we can redirect back after auth
      localStorage.setItem('connectAfterAuth', JSON.stringify({ 
        coachId: coach?.id, 
        action: 'schedule' 
      }));
      window.location.href = '/auth';
      return;
    }

    if (coach?.calendar_link) {
      window.open(coach.calendar_link, '_blank');
    } else {
      // For Cal.com integration - will be implemented with proper Cal.com embed
      toast({
        title: "Opening scheduler...",
        description: "Redirecting to booking calendar",
      });
    }
  };

  if (!coach) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-background to-accent/5 border-border/50">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Connect with {coach.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Coach Info */}
          <div className="flex items-center space-x-4 p-4 bg-card/50 rounded-lg border border-border/50">
            <Avatar className="h-16 w-16">
              <AvatarImage src={coach.avatar_url} alt={coach.name} />
              <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-white">
                {coach.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">{coach.name}</h3>
              <p className="text-sm text-muted-foreground">{coach.title}</p>
              <div className="flex items-center mt-1">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span className="text-sm font-medium">{coach.rating}</span>
              </div>
            </div>
          </div>

          {/* Connection Options */}
          <div className="space-y-4">
            {/* Instant Connect */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Video className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Connect Now</span>
                  {coach.available_now && (
                    <Badge variant="default" className="bg-green-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-bold">1</span>
                  <Coins className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                Send an instant message to {coach.name}. If available, they'll receive your profile and goal, and can accept to start a video call immediately.
              </p>
              
              <div className="flex items-center text-xs text-muted-foreground space-x-4">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  15 min session
                </div>
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  1-on-1 private call
                </div>
              </div>

              <Button
                onClick={handleConnectNow}
                disabled={loading || !coach.available_now}
                className="w-full mt-3 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                {loading ? 'Sending Request...' : 'Connect Now'}
              </Button>
            </div>

            {/* Schedule Option */}
            <div className="p-4 bg-card/50 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">Schedule a Call</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-bold">1</span>
                  <Coins className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                Book a time that works for both you and {coach.name}. You'll both receive a calendar invite with the video link.
              </p>

              <Button
                onClick={handleScheduleCall}
                variant="outline"
                className="w-full"
              >
                View Available Times
              </Button>
            </div>
          </div>

          {/* Process Explanation */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">What happens next?</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• {coach.name} receives your profile and goal</li>
              <li>• If they accept, you both get a private video link</li>
              <li>• 15-minute timer starts when the call begins</li>
              <li>• Call can continue beyond 15 minutes if needed</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Force module refresh
export default ConnectConfirmDialog;