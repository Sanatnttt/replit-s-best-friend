import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isExecuting?: boolean;
  executionSteps?: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;
  action: string;
  target?: string;
  value?: string;
  description?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  message?: string;
  screenshot?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  isLoading: boolean;
  isSidebarOpen: boolean;
  localServerUrl: string;
  isLocalServerConnected: boolean;

  // Actions
  createChat: () => string;
  deleteChat: (chatId: string) => void;
  setActiveChat: (chatId: string) => void;
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
  setLocalServerUrl: (url: string) => void;
  checkLocalServer: () => Promise<boolean>;

  // AI execution
  sendMessage: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  isLoading: false,
  isSidebarOpen: false,
  localServerUrl: 'http://localhost:3001',
  isLocalServerConnected: false,

  createChat: () => {
    const chatId = crypto.randomUUID();
    const newChat: Chat = {
      id: chatId,
      title: 'New chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({
      chats: [newChat, ...state.chats],
      activeChatId: chatId,
    }));
    return chatId;
  },

  deleteChat: (chatId) => {
    set((state) => {
      const newChats = state.chats.filter((c) => c.id !== chatId);
      const newActiveId = state.activeChatId === chatId 
        ? (newChats[0]?.id || null) 
        : state.activeChatId;
      return { chats: newChats, activeChatId: newActiveId };
    });
  },

  setActiveChat: (chatId) => {
    set({ activeChatId: chatId, isSidebarOpen: false });
  },

  addMessage: (chatId, message) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, newMessage],
              updatedAt: new Date(),
              title: chat.messages.length === 0 && message.role === 'user' 
                ? message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '')
                : chat.title,
            }
          : chat
      ),
    }));
  },

  updateMessage: (chatId, messageId, updates) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: chat.messages.map((msg) =>
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
            }
          : chat
      ),
    }));
  },

  updateChatTitle: (chatId, title) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, title } : chat
      ),
    }));
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setLocalServerUrl: (url) => {
    set({ localServerUrl: url });
  },

  checkLocalServer: async () => {
    const { localServerUrl } = get();
    try {
      const response = await fetch(localServerUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      const connected = response.ok;
      set({ isLocalServerConnected: connected });
      return connected;
    } catch {
      set({ isLocalServerConnected: false });
      return false;
    }
  },

  sendMessage: async (content) => {
    const { activeChatId, createChat, addMessage, updateMessage, setLoading, localServerUrl, checkLocalServer } = get();
    
    // Create chat if none exists
    let chatId = activeChatId;
    if (!chatId) {
      chatId = createChat();
    }

    // Add user message
    addMessage(chatId, { role: 'user', content });
    
    // Add placeholder assistant message
    const assistantMessageId = crypto.randomUUID();
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: assistantMessageId,
                  role: 'assistant' as const,
                  content: '',
                  timestamp: new Date(),
                  isExecuting: true,
                  executionSteps: [],
                },
              ],
            }
          : chat
      ),
    }));

    setLoading(true);

    try {
      // Check if local server is running
      const isConnected = await checkLocalServer();

      // Get chat history
      const currentChat = get().chats.find((c) => c.id === chatId);
      const history = currentChat?.messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      })) || [];

      // Call AI planner
      const { data: planData, error: planError } = await supabase.functions.invoke('agent-planner', {
        body: { 
          description: content,
          history,
        },
      });

      if (planError) throw planError;

      const steps: ExecutionStep[] = (planData.steps || []).map((step: any) => ({
        id: crypto.randomUUID(),
        action: step.action,
        target: step.target,
        value: step.value,
        description: step.description,
        status: 'pending' as const,
      }));

      // Update with planned steps
      updateMessage(chatId, assistantMessageId, {
        content: planData.thinking || 'I will help you with that task.',
        executionSteps: steps,
      });

      if (!isConnected) {
        updateMessage(chatId, assistantMessageId, {
          content: `${planData.thinking || 'Here is my plan.'}\n\n⚠️ **Local server not running!**\n\nTo execute these steps, start the local server:\n\`\`\`\ncd local-server\nnpm install\nnpm start\n\`\`\``,
          isExecuting: false,
        });
        return;
      }

      // Execute each step via local server
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        // Update step to running
        steps[i].status = 'running';
        updateMessage(chatId, assistantMessageId, { executionSteps: [...steps] });

        try {
          const response = await fetch(`${localServerUrl}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ step, sessionId: chatId }),
          });

          const result = await response.json();

          steps[i].status = result.success ? 'complete' : 'error';
          steps[i].message = result.message;
          steps[i].screenshot = result.screenshot;
        } catch (err: any) {
          steps[i].status = 'error';
          steps[i].message = err.message || 'Failed to connect to local server';
        }

        updateMessage(chatId, assistantMessageId, { executionSteps: [...steps] });
        
        // Small delay between steps for UI update
        await new Promise((r) => setTimeout(r, 100));
      }

      // Finalize message
      const allSuccessful = steps.every((s) => s.status === 'complete');
      const failedSteps = steps.filter((s) => s.status === 'error');
      
      let finalContent = planData.thinking || '';
      if (allSuccessful) {
        finalContent += '\n\n✅ All steps completed successfully!';
      } else if (failedSteps.length > 0) {
        finalContent += `\n\n⚠️ ${failedSteps.length} step(s) failed. Check the details above.`;
      }
      
      updateMessage(chatId, assistantMessageId, {
        isExecuting: false,
        content: finalContent,
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      updateMessage(chatId, assistantMessageId, {
        isExecuting: false,
        content: `❌ Error: ${error.message}`,
        executionSteps: [],
      });
    } finally {
      setLoading(false);
    }
  },
}));
