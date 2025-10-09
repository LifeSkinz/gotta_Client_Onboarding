import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppNavigation } from "@/components/AppNavigation";
import { DashboardStatsCards } from "@/components/dashboard/DashboardStatsCards";
import { GoalChatInput } from "@/components/dashboard/GoalChatInput";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { UpcomingSessionCard } from "@/components/dashboard/UpcomingSessionCard";
import { GoalDialog } from "@/components/dashboard/GoalDialog";
import { TaskDialog } from "@/components/dashboard/TaskDialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { startOfMonth } from "date-fns";

interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  progress_percentage: number;
  target_date: string | null;
  status: string;
}

interface Task {
  id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  priority: string;
}

interface Session {
  id: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  session_state: string;
  video_join_url: string | null;
  coaches: {
    name: string;
    avatar_url: string | null;
    title: string;
  } | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>();
  const [selectedGoalIdForTask, setSelectedGoalIdForTask] = useState<string>("");

  // Stats
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress_percentage, 0) / goals.length)
    : 0;
  const completedTasks = tasks.filter(t => t.is_completed).length;
  const [sessionsThisMonth, setSessionsThisMonth] = useState(0);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;
      setGoals(goalsData || []);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch upcoming sessions with video details
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select(`
          id,
          scheduled_time,
          duration_minutes,
          status,
          session_state,
          coaches (
            name,
            avatar_url,
            title
          ),
          session_video_details (
            video_join_url
          )
        `)
        .eq('client_id', user.id)
        .gte('scheduled_time', new Date().toISOString())
        .order('scheduled_time', { ascending: true })
        .limit(5);

      if (sessionsError) throw sessionsError;
      
      // Map the data to include video_join_url at top level
      const mappedSessions = (sessionsData || []).map((s: any) => ({
        ...s,
        video_join_url: s.session_video_details?.[0]?.video_join_url || null
      }));
      
      setSessions(mappedSessions);

      // Calculate sessions this month
      const monthStart = startOfMonth(new Date()).toISOString();
      const { data: monthSessions, error: monthError } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', user.id)
        .gte('scheduled_time', monthStart);

      if (!monthError) {
        setSessionsThisMonth(monthSessions?.length || 0);
      }

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async (goalData: Partial<Goal>) => {
    if (!user) return;

    try {
      if (selectedGoal) {
        // Update existing goal
        const { error } = await supabase
          .from('user_goals')
          .update(goalData as any)
          .eq('id', selectedGoal.id);

        if (error) throw error;

        toast({ title: "Goal updated successfully" });
      } else {
        // Create new goal - ensure required fields
        const newGoal = {
          title: goalData.title || '',
          category: goalData.category || 'personal',
          description: goalData.description || null,
          progress_percentage: goalData.progress_percentage || 0,
          target_date: goalData.target_date || null,
          status: goalData.status || 'active',
          user_id: user.id
        };
        
        const { error } = await supabase
          .from('user_goals')
          .insert([newGoal]);

        if (error) throw error;

        toast({ title: "Goal created successfully" });
      }

      fetchDashboardData();
      setSelectedGoal(undefined);
    } catch (error: any) {
      toast({
        title: "Error saving goal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('user_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast({ title: "Goal deleted successfully" });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error deleting goal",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveTask = async (taskData: Partial<Task> & { goal_id: string }) => {
    if (!user) return;

    try {
      const newTask = {
        title: taskData.title || '',
        description: taskData.description || null,
        goal_id: taskData.goal_id,
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || null,
        is_completed: false,
        user_id: user.id
      };
      
      const { error } = await supabase
        .from('user_tasks')
        .insert([newTask]);

      if (error) throw error;

      toast({ title: "Task created successfully" });
      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTask = async (task: Task) => {
    try {
      const updateData: any = {
        title: task.title,
        is_completed: task.is_completed,
        due_date: task.due_date,
      };

      if (task.is_completed && !tasks.find(t => t.id === task.id)?.is_completed) {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('user_tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;

      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('user_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {greeting()}, {user?.email?.split('@')[0] || 'there'}
        </h1>
        <p className="text-muted-foreground mb-8">
          Here's your coaching progress overview
        </p>

        <DashboardStatsCards
          activeGoals={activeGoals}
          avgProgress={avgProgress}
          sessionsThisMonth={sessionsThisMonth}
          completedTasks={completedTasks}
        />

        <GoalChatInput />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Goals & Progress</h2>
              <Button onClick={() => {
                setSelectedGoal(undefined);
                setGoalDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </div>

            <div className="space-y-4">
              {goals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No goals yet. Start by adding your first goal!</p>
                </div>
              ) : (
                goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    tasks={tasks.filter((t) => t.goal_id === goal.id)}
                    onEdit={(g) => {
                      setSelectedGoal(g);
                      setGoalDialogOpen(true);
                    }}
                    onDelete={handleDeleteGoal}
                    onAddTask={(goalId) => {
                      setSelectedGoalIdForTask(goalId);
                      setTaskDialogOpen(true);
                    }}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Upcoming Sessions</h2>
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No upcoming sessions</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <UpcomingSessionCard
                    key={session.id}
                    session={{
                      ...session,
                      coach: {
                        name: session.coaches?.name || "Coach",
                        avatar_url: session.coaches?.avatar_url || null,
                        title: session.coaches?.title || "Life Coach",
                      },
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <GoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        goal={selectedGoal}
        onSave={handleSaveGoal}
      />

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        goalId={selectedGoalIdForTask}
        onSave={handleSaveTask}
      />
    </div>
  );
}
