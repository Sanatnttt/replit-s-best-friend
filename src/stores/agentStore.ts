import { create } from 'zustand';
import { Task, TaskStep } from '@/components/agent/TaskCard';
import { TerminalLine } from '@/components/agent/TerminalOutput';
import { supabase } from '@/integrations/supabase/client';

interface AgentState {
  tasks: Task[];
  activeTaskId: string | null;
  logs: TerminalLine[];
  isCreatingTask: boolean;
  
  // Actions
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateTaskStep: (taskId: string, stepId: string, updates: Partial<TaskStep>) => void;
  setActiveTask: (taskId: string | null) => void;
  addLog: (log: Omit<TerminalLine, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  setCreatingTask: (loading: boolean) => void;
  
  // Task execution
  createAndPlanTask: (title: string, description: string, targetUrl: string) => Promise<void>;
  runTask: (taskId: string) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  tasks: [],
  activeTaskId: null,
  logs: [],
  isCreatingTask: false,

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  
  removeTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== taskId),
    activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
  })),
  
  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
  })),
  
  updateTaskStep: (taskId, stepId, updates) => set((state) => ({
    tasks: state.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            steps: t.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
          }
        : t
    ),
  })),
  
  setActiveTask: (taskId) => set({ activeTaskId: taskId }),
  
  addLog: (log) => set((state) => ({
    logs: [
      ...state.logs,
      { ...log, id: crypto.randomUUID(), timestamp: new Date() },
    ],
  })),
  
  clearLogs: () => set({ logs: [] }),
  
  setCreatingTask: (loading) => set({ isCreatingTask: loading }),

  createAndPlanTask: async (title, description, targetUrl) => {
    const { addTask, setActiveTask, addLog, setCreatingTask, updateTask } = get();
    
    setCreatingTask(true);
    
    // Create initial task
    const taskId = crypto.randomUUID();
    const newTask: Task = {
      id: taskId,
      title,
      description,
      targetUrl: targetUrl || undefined,
      status: 'planning',
      steps: [],
      createdAt: new Date(),
    };
    
    addTask(newTask);
    setActiveTask(taskId);
    addLog({ type: 'system', content: `Task created: ${title}` });
    addLog({ type: 'thinking', content: 'AI is analyzing the task and planning steps...' });

    try {
      // Call AI to plan the task
      const { data, error } = await supabase.functions.invoke('agent-planner', {
        body: { description, targetUrl },
      });

      if (error) throw error;

      const steps: TaskStep[] = (data.steps || []).map((step: any, index: number) => ({
        id: crypto.randomUUID(),
        action: step.action,
        target: step.target,
        value: step.value,
        status: 'pending' as const,
      }));

      updateTask(taskId, { 
        status: 'idle', 
        steps,
      });

      addLog({ type: 'success', content: `Planned ${steps.length} steps for execution` });
      steps.forEach((step, i) => {
        addLog({ 
          type: 'info', 
          content: `Step ${i + 1}: ${step.action}${step.target ? ` on "${step.target}"` : ''}${step.value ? ` with "${step.value}"` : ''}` 
        });
      });

    } catch (error: any) {
      console.error('Planning error:', error);
      updateTask(taskId, { status: 'error' });
      addLog({ type: 'error', content: `Planning failed: ${error.message}` });
    } finally {
      setCreatingTask(false);
    }
  },

  runTask: async (taskId) => {
    const { updateTask, updateTaskStep, addLog, tasks } = get();
    const task = tasks.find((t) => t.id === taskId);
    
    if (!task) return;

    updateTask(taskId, { status: 'running' });
    addLog({ type: 'system', content: `Starting execution: ${task.title}` });

    try {
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        
        updateTaskStep(taskId, step.id, { status: 'running' });
        addLog({ type: 'action', content: `Executing: ${step.action}${step.target ? ` on "${step.target}"` : ''}` });

        // Call the browser control API
        const { data, error } = await supabase.functions.invoke('agent-execute', {
          body: { 
            step,
            taskId,
            targetUrl: task.targetUrl,
          },
        });

        if (error) throw error;

        if (data.success) {
          updateTaskStep(taskId, step.id, { status: 'complete' });
          addLog({ type: 'success', content: data.message || `Step completed successfully` });
        } else {
          throw new Error(data.error || 'Step execution failed');
        }

        // Small delay between steps
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      updateTask(taskId, { status: 'success' });
      addLog({ type: 'success', content: 'Task completed successfully!' });

    } catch (error: any) {
      console.error('Execution error:', error);
      updateTask(taskId, { status: 'error' });
      addLog({ type: 'error', content: `Execution failed: ${error.message}` });
    }
  },
}));
