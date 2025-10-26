import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, User, Settings, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Coach {
  id: string;
  name: string;
  notification_email: string | null;
  specialties: string[];
  is_active: boolean;
}

interface Session {
  id: string;
  session_state: string;
  created_at: string;
  client_id: string;
  profiles: {
    full_name: string;
  };
}

export const CoachDashboardPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);
  const [coachData, setCoachData] = useState<Coach | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    checkCoachAccess();
  }, [user]);

  const checkCoachAccess = async () => {
    if (!user) {
      navigate('/auth?type=coach');
      return;
    }

    try {
      // Check if user has coach role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasCoachRole = roles?.some(r => r.role === 'coach');
      
      if (!hasCoachRole) {
        toast({
          title: 'Access Denied',
          description: 'You do not have coach access.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsCoach(true);

      // Fetch coach data
      const { data: coach } = await supabase
        .from('coaches')
        .select('id, name, notification_email, specialties, is_active')
        .eq('user_id', user.id)
        .single();

      if (coach) {
        setCoachData(coach);
        await fetchSessions(coach.id);
      }
    } catch (error) {
      console.error('Error checking coach access:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (coachId: string) => {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        session_state,
        created_at,
        client_id
      `)
      .eq('coach_id', coachId)
      .in('session_state', ['scheduled', 'ready', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching sessions:', error);
      return;
    }

    // Fetch client profiles separately
    const sessionsWithProfiles = await Promise.all(
      (data || []).map(async (session) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', session.client_id)
          .single();
        
        return {
          ...session,
          profiles: profile || { full_name: 'Unknown' }
        };
      })
    );

    setSessions(sessionsWithProfiles as Session[]);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getSessionBadge = (state: string) => {
    switch (state) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'ready':
        return <Badge variant="default">Ready</Badge>;
      case 'in_progress':
        return <Badge>In Progress</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isCoach || !coachData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome, {coachData.name}</h1>
            <p className="text-muted-foreground">Coach Dashboard</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{coachData.notification_email || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {coachData.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Specialties</p>
                  <div className="flex flex-wrap gap-1">
                    {coachData.specialties?.slice(0, 3).map((specialty, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sessions.length}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Sessions scheduled
              </p>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => navigate('/profile')}>
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>Your scheduled coaching sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming sessions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        {(session.profiles as any)?.full_name || 'Unknown Client'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {getSessionBadge(session.session_state)}
                      <Button
                        size="sm"
                        onClick={() => navigate(`/session/${session.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
