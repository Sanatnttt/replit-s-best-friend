import { Task, TaskStep } from "./TaskCard";
import { StatusIndicator } from "./StatusIndicator";
import { TerminalOutput, TerminalLine } from "./TerminalOutput";
import { Check, ChevronRight, Clock, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionViewerProps {
  task: Task | null;
  logs: TerminalLine[];
}

export function ExecutionViewer({ task, logs }: ExecutionViewerProps) {
  if (!task) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
          <ChevronRight className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-display text-lg text-muted-foreground mb-2">
          No Task Selected
        </h3>
        <p className="text-sm text-muted-foreground/70 max-w-xs">
          Create a new task or select an existing one to view execution details
        </p>
      </div>
    );
  }

  const getStepIcon = (status: TaskStep['status']) => {
    switch (status) {
      case 'complete':
        return <Check className="h-3 w-3 text-success" />;
      case 'running':
        return <Loader2 className="h-3 w-3 text-primary animate-spin" />;
      case 'failed':
        return <X className="h-3 w-3 text-destructive" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Task Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIndicator status={task.status} size="lg" showLabel />
            <div>
              <h3 className="font-display text-sm font-semibold tracking-wide">
                {task.title}
              </h3>
              {task.targetUrl && (
                <p className="text-xs text-muted-foreground">{task.targetUrl}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      {task.steps.length > 0 && (
        <div className="flex-shrink-0 p-4 border-b border-border bg-card/20">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            EXECUTION STEPS
          </p>
          <div className="space-y-2">
            {task.steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md text-xs",
                  step.status === 'running' && 'bg-primary/10 border border-primary/20',
                  step.status === 'complete' && 'bg-success/5',
                  step.status === 'failed' && 'bg-destructive/5'
                )}
              >
                <span className="text-muted-foreground/50 w-5 text-right">
                  {index + 1}.
                </span>
                {getStepIcon(step.status)}
                <span className={cn(
                  "flex-1",
                  step.status === 'pending' && 'text-muted-foreground',
                  step.status === 'running' && 'text-primary',
                  step.status === 'complete' && 'text-foreground/80',
                  step.status === 'failed' && 'text-destructive'
                )}>
                  {step.action}
                  {step.target && <span className="text-muted-foreground/70"> → {step.target}</span>}
                  {step.value && <span className="text-primary/70"> "{step.value}"</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Terminal Output */}
      <div className="flex-1 p-4 min-h-0">
        <p className="text-xs font-medium text-muted-foreground mb-3">
          EXECUTION LOG
        </p>
        <TerminalOutput lines={logs} className="h-[calc(100%-2rem)]" />
      </div>
    </div>
  );
}
