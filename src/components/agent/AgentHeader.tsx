import { Bot, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "./StatusIndicator";

interface AgentHeaderProps {
  agentStatus: 'idle' | 'running' | 'success' | 'error' | 'planning';
  taskCount: number;
}

export function AgentHeader({ agentStatus, taskCount }: AgentHeaderProps) {
  return (
    <header className="flex-shrink-0 border-b border-border bg-card/30 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary p-[1px]">
                <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
              </div>
              {agentStatus === 'running' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(180_100%_50%/0.8)]" />
              )}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-wider gradient-text">
                AUTOPILOT AI
              </h1>
              <p className="text-xs text-muted-foreground tracking-wide">
                Browser Automation Agent
              </p>
            </div>
          </div>

          {/* Status & Stats */}
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <StatusIndicator status={agentStatus} size="sm" />
                <span className="text-muted-foreground">AGENT STATUS</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">
                  <span className="text-foreground font-semibold">{taskCount}</span> TASKS
                </span>
              </div>
            </div>

            <Button variant="outline" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
