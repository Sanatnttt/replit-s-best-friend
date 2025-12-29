import { Menu, MoreHorizontal } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export function ChatSidebar() {
  const { chats, activeChatId, isSidebarOpen, deleteChat, setActiveChat, toggleSidebar } = useChatStore();
  const [userName, setUserName] = useState('User');
  const [userInitial, setUserInitial] = useState('U');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        const name = data.user.email.split('@')[0];
        setUserName(name);
        setUserInitial(name.charAt(0).toUpperCase());
      }
    });
  }, []);

  // Group chats by time periods
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const weekChats = chats.filter((c) => {
    const d = new Date(c.updatedAt);
    return d >= weekAgo;
  });
  const monthChats = chats.filter((c) => {
    const d = new Date(c.updatedAt);
    return d < weekAgo && d >= monthAgo;
  });

  const ChatGroup = ({ title, items }: { title: string; items: typeof chats }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">{title}</div>
        {items.map((chat) => (
          <button
            key={chat.id}
            onClick={() => setActiveChat(chat.id)}
            className={cn(
              'w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors',
              chat.id === activeChatId
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="truncate flex-1 text-left">{chat.title}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:relative z-50 flex flex-col h-full w-72 bg-background transition-transform duration-300',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Chat list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 pt-6">
          <ChatGroup title="7 Days" items={weekChats} />
          <ChatGroup title="30 Days" items={monthChats} />
          
          {chats.length === 0 && (
            <div className="px-3 py-8 text-center text-muted-foreground text-sm">
              No conversations yet
            </div>
          )}
        </div>

        {/* Footer with user */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium text-sm">
                {userInitial}
              </div>
              <span className="text-sm text-foreground">{userName}</span>
            </div>
            <button className="p-2 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
