import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TerminalLine {
  id: string;
  type: 'info' | 'success' | 'error' | 'action' | 'thinking' | 'system';
  content: string;
  timestamp: Date;
}

interface TerminalOutputProps {
  lines: TerminalLine[];
  className?: string;
}

const typeStyles = {
  info: 'text-foreground/80',
  success: 'text-success',
  error: 'text-destructive',
  action: 'text-primary',
  thinking: 'text-secondary',
  system: 'text-muted-foreground',
};

const typePrefix = {
  info: '[INFO]',
  success: '[SUCCESS]',
  error: '[ERROR]',
  action: '[ACTION]',
  thinking: '[THINKING]',
  system: '[SYSTEM]',
};

export function TerminalOutput({ lines, className }: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-background/50 rounded-lg border border-border p-4 font-mono text-sm overflow-y-auto",
        "scrollbar-thin scrollbar-track-muted scrollbar-thumb-primary/30",
        className
      )}
    >
      {lines.length === 0 ? (
        <div className="text-muted-foreground flex items-center gap-2">
          <span className="text-primary">$</span>
          <span className="cursor-blink">Awaiting commands...</span>
        </div>
      ) : (
        <div className="space-y-1">
          {lines.map((line, index) => (
            <div
              key={line.id}
              className={cn(
                "flex gap-3 animate-fade-in",
                typeStyles[line.type]
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-muted-foreground/50 flex-shrink-0">
                {formatTime(line.timestamp)}
              </span>
              <span className={cn(
                "flex-shrink-0 font-bold",
                typeStyles[line.type]
              )}>
                {typePrefix[line.type]}
              </span>
              <span className="break-all">{line.content}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-primary mt-2">
            <span>$</span>
            <span className="cursor-blink opacity-50"></span>
          </div>
        </div>
      )}
    </div>
  );
}
