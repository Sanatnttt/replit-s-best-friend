import { useState, useRef, useEffect } from 'react';
import { Send, Plus, Globe, Zap } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/lib/utils';

export function ChatInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoading } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Input container */}
        <div className="relative bg-card border border-border rounded-2xl overflow-hidden">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message BT4 AI"
            disabled={isLoading}
            rows={1}
            className={cn(
              'w-full px-4 py-3 pr-12 bg-transparent text-foreground placeholder:text-muted-foreground',
              'resize-none outline-none',
              'disabled:opacity-50'
            )}
          />

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              'absolute right-2 bottom-2 p-2 rounded-full transition-colors',
              input.trim() && !isLoading
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 mt-3">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors">
            <Zap className="w-4 h-4" />
            <span>AutoPilot</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors">
            <Globe className="w-4 h-4" />
            <span>Browse</span>
          </button>
          <div className="flex-1" />
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
