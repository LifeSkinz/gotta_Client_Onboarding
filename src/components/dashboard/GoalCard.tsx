import { useState } from "react";
import { Edit, Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { TaskList } from "./TaskList";

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
  title: string;
  is_completed: boolean;
  due_date: string | null;
  priority: string;
}

interface GoalCardProps {
  goal: Goal;
  tasks: Task[];
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onAddTask: (goalId: string) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const GoalCard = ({
  goal,
  tasks,
  onEdit,
  onDelete,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: GoalCardProps) => {
  const [showTasks, setShowTasks] = useState(true);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      career: "bg-blue-500/20 text-blue-400",
      health: "bg-green-500/20 text-green-400",
      personal: "bg-purple-500/20 text-purple-400",
      financial: "bg-yellow-500/20 text-yellow-400",
      relationships: "bg-pink-500/20 text-pink-400",
      creativity: "bg-orange-500/20 text-orange-400",
    };
    return colors[category] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <Card className="p-6 bg-card border-border hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-foreground">{goal.title}</h3>
            <Badge className={getCategoryColor(goal.category)}>
              {goal.category}
            </Badge>
          </div>
          {goal.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {goal.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(goal)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(goal.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold text-foreground">
            {goal.progress_percentage}%
          </span>
        </div>
        <Progress value={goal.progress_percentage} className="h-2" />
        {goal.target_date && (
          <p className="text-sm text-muted-foreground">
            Target: {format(new Date(goal.target_date), "MMM dd, yyyy")}
          </p>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground flex items-center gap-2">
            Tasks ({tasks.length})
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddTask(goal.id)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
        {showTasks && tasks.length > 0 && (
          <TaskList
            tasks={tasks}
            onUpdate={onUpdateTask}
            onDelete={onDeleteTask}
          />
        )}
      </div>
    </Card>
  );
};
