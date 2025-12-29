import { useRef, useEffect, useState } from 'react';
import { Menu, Plus, Settings, Wifi, WifiOff } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export function ChatArea() {
  const { chats, activeChatId, createChat, toggleSidebar, checkLocalServer, isLocalServerConnected, localServerUrl, setLocalServerUrl } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  // Check local server status periodically
  useEffect(() => {
    checkLocalServer();
    const interval = setInterval(checkLocalServer, 5000);
    return () => clearInterval(interval);
  }, [checkLocalServer]);

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
        
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">New chat</span>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isLocalServerConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {isLocalServerConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isLocalServerConnected ? 'Connected' : 'Local server offline'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-secondary rounded-full text-muted-foreground"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => createChat()}
            className="p-2 hover:bg-secondary rounded-full border border-border"
          >
            <Plus className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="mx-4 mb-4 p-4 bg-card rounded-lg border border-border">
          <h3 className="text-sm font-medium mb-2">Local Server URL</h3>
          <input
            type="text"
            value={localServerUrl}
            onChange={(e) => setLocalServerUrl(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            placeholder="http://localhost:3001"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Make sure the local Playwright server is running on your computer.
          </p>
        </div>
      )}

      {/* Messages or empty state */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            {/* Whale Logo */}
            <div className="mb-6">
              <svg 
                width="80" 
                height="80" 
                viewBox="0 0 100 100" 
                className="text-primary"
              >
                <ellipse cx="50" cy="55" rx="35" ry="25" fill="currentColor" />
                <path 
                  d="M15 55 Q 5 45, 15 35 Q 20 45, 15 55" 
                  fill="currentColor" 
                />
                <circle cx="65" cy="50" r="4" fill="hsl(var(--background))" />
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
            <p className="text-muted-foreground text-center mb-2">
              How can I help you today?
            </p>
            
            {!isLocalServerConnected && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg max-w-md text-center">
                <p className="text-sm text-yellow-400">
                  ⚠️ Local server not running. Start it to execute browser automation:
                </p>
                <code className="block mt-2 text-xs bg-background p-2 rounded">
                  cd local-server && npm install && npm start
                </code>
              </div>
            )}
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
