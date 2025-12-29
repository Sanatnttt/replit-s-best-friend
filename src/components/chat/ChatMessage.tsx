import { Bot, User, CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { Message, ExecutionStep } from '@/stores/chatStore';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

function StepIndicator({ step }: { step: ExecutionStep }) {
  const statusIcon = {
    pending: <Circle className="w-4 h-4 text-muted-foreground" />,
    running: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
    complete: <CheckCircle2 className="w-4 h-4 text-success" />,
    error: <XCircle className="w-4 h-4 text-destructive" />,
  };

  const actionLabels: Record<string, string> = {
    navigate: 'Navigate to',
    click: 'Click',
    type: 'Type',
    wait: 'Wait',
    scroll: 'Scroll',
    screenshot: 'Screenshot',
  };

  return (
    <div className="flex items-start gap-3 py-2">
      {statusIcon[step.status]}
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className="font-medium">{actionLabels[step.action] || step.action}</span>
          {step.target && <span className="text-muted-foreground"> → {step.target}</span>}
          {step.value && <span className="text-muted-foreground"> "{step.value}"</span>}
        </div>
        {step.message && (
          <div className={cn(
            'text-xs mt-1',
            step.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {step.message}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const hasSteps = message.executionSteps && message.executionSteps.length > 0;

  return (
    <div className={cn(
      'flex gap-4 py-6 px-4 md:px-8 animate-fade-in',
      isAssistant ? 'bg-card/30' : ''
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isAssistant ? 'bg-primary text-primary-foreground' : 'bg-secondary'
      )}>
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Message text */}
        {message.content && (
          <div className="text-foreground whitespace-pre-wrap">
            {message.content}
          </div>
        )}

        {/* Loading indicator */}
        {message.isExecuting && !message.content && !hasSteps && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse-dot" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse-dot" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        {/* Execution steps */}
        {hasSteps && (
          <div className="border border-border rounded-lg p-4 bg-background/50">
            <div className="text-xs font-medium text-muted-foreground mb-2">EXECUTION STEPS</div>
            <div className="divide-y divide-border">
              {message.executionSteps!.map((step) => (
                <StepIndicator key={step.id} step={step} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
