import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: 'idle' | 'running' | 'success' | 'error' | 'planning';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig = {
  idle: {
    color: 'bg-muted-foreground',
    glow: '',
    label: 'IDLE',
  },
  running: {
    color: 'bg-primary',
    glow: 'shadow-[0_0_12px_hsl(180_100%_50%/0.8)]',
    label: 'RUNNING',
  },
  planning: {
    color: 'bg-warning',
    glow: 'shadow-[0_0_12px_hsl(45_100%_55%/0.8)]',
    label: 'PLANNING',
  },
  success: {
    color: 'bg-success',
    glow: 'shadow-[0_0_12px_hsl(150_80%_45%/0.8)]',
    label: 'COMPLETE',
  },
  error: {
    color: 'bg-destructive',
    glow: 'shadow-[0_0_12px_hsl(0_85%_55%/0.8)]',
    label: 'ERROR',
  },
};

const sizeConfig = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function StatusIndicator({ status, size = 'md', showLabel = false }: StatusIndicatorProps) {
  const config = statusConfig[status];
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div
          className={cn(
            "rounded-full transition-all duration-300",
            sizeConfig[size],
            config.color,
            config.glow,
            (status === 'running' || status === 'planning') && 'animate-pulse'
          )}
        />
        {(status === 'running' || status === 'planning') && (
          <div
            className={cn(
              "absolute inset-0 rounded-full animate-ping opacity-75",
              config.color
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className={cn(
          "text-xs font-mono tracking-widest",
          status === 'idle' && 'text-muted-foreground',
          status === 'running' && 'text-primary',
          status === 'planning' && 'text-warning',
          status === 'success' && 'text-success',
          status === 'error' && 'text-destructive',
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
}
