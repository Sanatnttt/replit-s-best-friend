import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isExecuting?: boolean;
  executionSteps?: ExecutionStep[];
  userData?: {
    fullName: string;
    email: string;
    username: string;
    password: string;
  };
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
                  content: '🧠 Analyzing with DeepSeek AI...',
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
      // Check local server
      const isConnected = await checkLocalServer();

      // Get chat history for context
      const currentChat = get().chats.find((c) => c.id === chatId);
      const history = currentChat?.messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      })) || [];

      // Call DeepSeek AI planner via edge function
      const { data: planData, error: planError } = await supabase.functions.invoke('agent-planner', {
        body: { 
          description: content,
          history,
        },
      });

      if (planError) throw planError;
      
      if (planData.error) {
        throw new Error(planData.error);
      }

      const steps: ExecutionStep[] = (planData.steps || []).map((step: any) => ({
        id: crypto.randomUUID(),
        action: step.action,
        target: step.target,
        value: step.value,
        description: step.description,
        status: 'pending' as const,
      }));

      // Update message with plan and user data
      updateMessage(chatId, assistantMessageId, {
        content: planData.thinking || 'Executing automation plan...',
        executionSteps: steps,
        userData: planData.userData,
      });

      // If local server not connected, show instructions
      if (!isConnected) {
        const credsInfo = planData.userData 
          ? `\n\n📋 **Generated credentials:**\n- Email: \`${planData.userData.email}\`\n- Username: \`${planData.userData.username}\`\n- Password: \`${planData.userData.password}\``
          : '';
          
        updateMessage(chatId, assistantMessageId, {
          content: `${planData.thinking || 'Plan ready.'}\n\n⚠️ **Local server not running!**\n\nStart the automation server:\n\`\`\`bash\ncd local-server\nnpm install\nnpm start\n\`\`\`${credsInfo}`,
          isExecuting: false,
        });
        return;
      }

      // Execute each step via local server (REAL EXECUTION)
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
          steps[i].message = err.message || 'Failed to execute step';
        }

        updateMessage(chatId, assistantMessageId, { executionSteps: [...steps] });
        
        // Small delay for UI update
        await new Promise((r) => setTimeout(r, 100));
      }

      // Final summary
      const successCount = steps.filter((s) => s.status === 'complete').length;
      const errorCount = steps.filter((s) => s.status === 'error').length;
      
      let finalContent = planData.thinking || '';
      
      if (planData.userData) {
        finalContent += `\n\n📋 **Credentials used:**\n- Email: \`${planData.userData.email}\`\n- Username: \`${planData.userData.username}\`\n- Password: \`${planData.userData.password}\``;
      }
      
      if (errorCount === 0) {
        finalContent += `\n\n✅ All ${successCount} steps completed successfully!`;
      } else {
        finalContent += `\n\n⚠️ ${successCount} succeeded, ${errorCount} failed.`;
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
