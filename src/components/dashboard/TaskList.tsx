import { TaskItem } from "./TaskItem";

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  due_date: string | null;
  priority: string;
}

interface TaskListProps {
  tasks: Task[];
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskList = ({ tasks, onUpdate, onDelete }: TaskListProps) => {
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
