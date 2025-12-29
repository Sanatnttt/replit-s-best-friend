import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';

export default function Chat() {
  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar />
      <ChatArea />
    </div>
  );
}
