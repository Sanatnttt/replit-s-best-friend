import { cn } from "@/lib/utils";
import { StatusIndicator } from "./StatusIndicator";
import { Clock, Globe, MousePointer, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Task {
  id: string;
  title: string;
  description: string;
  targetUrl?: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'planning';
  steps: TaskStep[];
  createdAt: Date;
}

export interface TaskStep {
  id: string;
  action: string;
  target?: string;
  value?: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
}

interface TaskCardProps {
  task: Task;
  onRun: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isActive?: boolean;
}

export function TaskCard({ task, onRun, onDelete, isActive }: TaskCardProps) {
  const completedSteps = task.steps.filter(s => s.status === 'complete').length;
  const totalSteps = task.steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-card/50 p-4 transition-all duration-300",
        "hover:border-primary/50 hover:bg-card/80",
        isActive && "border-primary shadow-[0_0_20px_hsl(180_100%_50%/0.2)]"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatusIndicator status={task.status} size="md" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground tracking-wide">
              {task.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {task.description}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onRun(task.id)}
            disabled={task.status === 'running' || task.status === 'planning'}
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(task.id)}
            disabled={task.status === 'running'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Target URL */}
      {task.targetUrl && (
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span className="truncate">{task.targetUrl}</span>
        </div>
      )}

      {/* Progress */}
      {totalSteps > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <MousePointer className="h-3 w-3" />
              {completedSteps}/{totalSteps} steps
            </span>
            <span className="text-primary font-mono">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500 rounded-full",
                task.status === 'error' ? 'bg-destructive' : 'bg-gradient-to-r from-primary to-secondary'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground/70">
        <Clock className="h-3 w-3" />
        <span>{task.createdAt.toLocaleString()}</span>
      </div>
    </div>
  );
}
