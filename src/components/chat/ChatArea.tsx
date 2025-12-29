import { useRef, useEffect } from 'react';
import { Menu, Plus } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export function ChatArea() {
  const { chats, activeChatId, createChat, toggleSidebar } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-secondary rounded-lg md:hidden text-muted-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-medium text-foreground">New chat</span>
        <button
          onClick={() => createChat()}
          className="p-2 hover:bg-secondary rounded-full border border-border"
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      {/* Messages or empty state */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            {/* Whale Logo - matching DeepSeek style */}
            <div className="mb-6">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 100 100" 
                className="text-primary"
              >
                {/* Whale body */}
                <ellipse cx="50" cy="55" rx="35" ry="25" fill="currentColor" />
                {/* Tail */}
                <path 
                  d="M15 55 Q 5 45, 15 35 Q 20 45, 15 55" 
                  fill="currentColor" 
                />
                {/* Eye */}
                <circle cx="65" cy="50" r="4" fill="hsl(var(--background))" />
                {/* Spout */}
                <path 
                  d="M70 35 Q 75 25, 80 30 M75 30 Q 80 20, 85 25" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  fill="none" 
                  strokeLinecap="round"
                />
              </svg>
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-semibold text-foreground mb-2">Hi, I'm BT4 AI.</h1>
            <p className="text-muted-foreground text-center">
              How can I help you today?
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput />
    </div>
  );
}
