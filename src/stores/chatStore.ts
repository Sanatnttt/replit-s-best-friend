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
  status: 'pending' | 'running' | 'complete' | 'error';
  message?: string;
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

  // Actions
  createChat: () => string;
  deleteChat: (chatId: string) => void;
  setActiveChat: (chatId: string) => void;
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;

  // AI execution
  sendMessage: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  isLoading: false,
  isSidebarOpen: false,

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

  sendMessage: async (content) => {
    const { activeChatId, createChat, addMessage, updateMessage, setLoading, chats } = get();
    
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
        status: 'pending' as const,
      }));

      // Update with planned steps
      updateMessage(chatId, assistantMessageId, {
        content: planData.thinking || 'I will help you with that task.',
        executionSteps: steps,
      });

      // Execute each step
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        // Update step to running
        steps[i].status = 'running';
        updateMessage(chatId, assistantMessageId, { executionSteps: [...steps] });

        try {
          const { data: execData, error: execError } = await supabase.functions.invoke('agent-execute', {
            body: { step, chatId },
          });

          if (execError) throw execError;

          steps[i].status = execData.success ? 'complete' : 'error';
          steps[i].message = execData.message || execData.error;
        } catch (err: any) {
          steps[i].status = 'error';
          steps[i].message = err.message;
        }

        updateMessage(chatId, assistantMessageId, { executionSteps: [...steps] });
        
        // Small delay between steps
        await new Promise((r) => setTimeout(r, 300));
      }

      // Finalize message
      const allSuccessful = steps.every((s) => s.status === 'complete');
      updateMessage(chatId, assistantMessageId, {
        isExecuting: false,
        content: allSuccessful 
          ? (planData.thinking || 'Task completed successfully!')
          : 'Some steps failed. Please check the execution details.',
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      updateMessage(chatId, assistantMessageId, {
        isExecuting: false,
        content: `Error: ${error.message}`,
        executionSteps: [],
      });
    } finally {
      setLoading(false);
    }
  },
}));
