import { useRef, useEffect } from 'react';
import { Menu, Plus, Bot } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui/button';

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
    <div className="flex-1 flex flex-col min-w-0 h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-secondary rounded-lg md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-medium">New chat</span>
        <Button
          onClick={() => createChat()}
          size="icon"
          variant="ghost"
          className="rounded-full"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      {/* Messages or empty state */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            {/* Logo/Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-semibold mb-2">Hi, I'm BT4 AI.</h1>
            <p className="text-muted-foreground text-center max-w-md">
              How can I help you today?
            </p>

            {/* Example prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 max-w-2xl w-full">
              {[
                'Go to github.com and sign up for a new account',
                'Navigate to twitter.com and post a tweet',
                'Fill out a contact form on example.com',
                'Search for "AI agents" on google.com',
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => useChatStore.getState().sendMessage(prompt)}
                  className="p-4 text-left text-sm bg-card border border-border rounded-xl hover:bg-secondary/50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
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
