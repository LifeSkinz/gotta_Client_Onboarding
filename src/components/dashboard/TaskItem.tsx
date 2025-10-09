import { useState } from "react";
import { Edit, Trash2, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  is_completed: boolean;
  due_date: string | null;
  priority: string;
}

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export const TaskItem = ({ task, onUpdate, onDelete }: TaskItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const handleToggleComplete = () => {
    onUpdate({
      ...task,
      is_completed: !task.is_completed,
    });
  };

  const handleSaveEdit = () => {
    if (editedTitle.trim()) {
      onUpdate({
        ...task,
        title: editedTitle,
      });
      setIsEditing(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    onUpdate({
      ...task,
      due_date: date ? date.toISOString() : null,
    });
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors group">
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={handleToggleComplete}
      />
      
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") {
                setEditedTitle(task.title);
                setIsEditing(false);
              }
            }}
            className="h-8"
            autoFocus
          />
        ) : (
          <p
            className={cn(
              "text-sm truncate",
              task.is_completed && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
        )}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Calendar className="h-4 w-4 mr-1" />
            {task.due_date && (
              <span className="text-xs">
                {format(new Date(task.due_date), "MMM dd")}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="single"
            selected={task.due_date ? new Date(task.due_date) : undefined}
            onSelect={handleDateSelect}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsEditing(true)}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
};
