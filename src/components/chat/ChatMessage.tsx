import { Bot, User, CheckCircle2, XCircle, Loader2, Circle, Image } from 'lucide-react';
import { Message, ExecutionStep } from '@/stores/chatStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
}

function StepIndicator({ step }: { step: ExecutionStep }) {
  const [showScreenshot, setShowScreenshot] = useState(false);
  
  const statusIcon = {
    pending: <Circle className="w-3 h-3 text-muted-foreground" />,
    running: <Loader2 className="w-3 h-3 text-primary animate-spin" />,
    complete: <CheckCircle2 className="w-3 h-3 text-green-500" />,
    error: <XCircle className="w-3 h-3 text-red-500" />,
  };

  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2 text-sm">
        {statusIcon[step.status]}
        <span className="text-foreground flex-1">
          {step.description || `${step.action}: ${step.target || step.value || ''}`}
        </span>
        {step.screenshot && (
          <button 
            onClick={() => setShowScreenshot(!showScreenshot)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Image className="w-4 h-4" />
          </button>
        )}
      </div>
      {step.message && step.status === 'error' && (
        <div className="text-xs text-red-400 mt-1 ml-5">{step.message}</div>
      )}
      {showScreenshot && step.screenshot && (
        <div className="mt-2 ml-5">
          <img 
            src={`data:image/png;base64,${step.screenshot}`} 
            alt="Screenshot" 
            className="rounded-lg border border-border max-w-full"
          />
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const hasSteps = message.executionSteps && message.executionSteps.length > 0;

  return (
    <div className={cn('flex gap-3 py-4', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      {/* Message bubble */}
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3',
        isUser 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-secondary text-foreground'
      )}>
        {/* Loading indicator */}
        {message.isExecuting && !message.content && !hasSteps && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Planning automation...</span>
          </div>
        )}

        {/* Message text */}
        {message.content && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Execution steps */}
        {hasSteps && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {message.isExecuting ? 'Executing...' : 'Execution Steps:'}
            </div>
            {message.executionSteps!.map((step) => (
              <StepIndicator key={step.id} step={step} />
            ))}
          </div>
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
