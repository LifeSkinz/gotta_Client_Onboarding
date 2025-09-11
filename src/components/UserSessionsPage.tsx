import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppNavigation } from "@/components/AppNavigation";
import { SessionDetailCard } from "@/components/SessionDetailCard";
import { useAuth } from "@/contexts/AuthContext";

interface Session {
  id: string;
  scheduled_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  duration_minutes: number;
  status: string;
  video_join_url?: string;
  price_amount: number;
  coin_cost: number;
  notes?: string;
  coaches: {
    name: string;
    avatar_url?: string;
    title: string;
  };
}

export const UserSessionsPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSessions();
    } else {
      setSessions([]);
      setLoading(false);
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          coaches (
            name,
            avatar_url,
            title
          )
        `)
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load your sessions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppNavigation user={user} />
        <div className="pt-20 lg:pt-24 container max-w-6xl mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your sessions...</p>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AppNavigation user={user} />
        <div className="pt-20 lg:pt-24 container max-w-6xl mx-auto py-8">
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Sign in required</h3>
              <p className="text-muted-foreground">
                Please sign in to view your coaching sessions.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppNavigation user={user} />
      <div className="pt-20 lg:pt-24 container max-w-6xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Sessions</h1>
          <p className="text-muted-foreground mt-2">
            Manage your coaching sessions, access session portals, and review session outcomes
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No sessions yet</h3>
              <p className="text-muted-foreground">
                Book your first coaching session to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => (
              <SessionDetailCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};