import { Menu, Plus, Trash2 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function ChatSidebar() {
  const { chats, activeChatId, isSidebarOpen, createChat, deleteChat, setActiveChat, toggleSidebar } = useChatStore();

  // Group chats by time periods
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const todayChats = chats.filter((c) => new Date(c.updatedAt) >= today);
  const weekChats = chats.filter((c) => {
    const d = new Date(c.updatedAt);
    return d < today && d >= weekAgo;
  });
  const monthChats = chats.filter((c) => {
    const d = new Date(c.updatedAt);
    return d < weekAgo && d >= monthAgo;
  });
  const olderChats = chats.filter((c) => new Date(c.updatedAt) < monthAgo);

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
              'w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors group',
              chat.id === activeChatId
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
            )}
          >
            <span className="truncate flex-1 text-left">{chat.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(chat.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
          'fixed md:relative z-50 flex flex-col h-full w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-300',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <button onClick={toggleSidebar} className="p-2 hover:bg-secondary rounded-lg md:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold md:ml-0">BT4 AI</span>
          <Button
            onClick={() => createChat()}
            size="icon"
            variant="ghost"
            className="rounded-full"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          <ChatGroup title="Today" items={todayChats} />
          <ChatGroup title="7 Days" items={weekChats} />
          <ChatGroup title="30 Days" items={monthChats} />
          <ChatGroup title="Older" items={olderChats} />
          
          {chats.length === 0 && (
            <div className="px-3 py-8 text-center text-muted-foreground text-sm">
              No conversations yet
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
              U
            </div>
            <span className="text-sm text-muted-foreground">User</span>
          </div>
        </div>
      </aside>
    </>
  );
}
