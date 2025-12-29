import { AgentHeader } from "@/components/agent/AgentHeader";
import { TaskBuilder } from "@/components/agent/TaskBuilder";
import { TaskCard } from "@/components/agent/TaskCard";
import { ExecutionViewer } from "@/components/agent/ExecutionViewer";
import { useAgentStore } from "@/stores/agentStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ListTodo, Play, AlertTriangle } from "lucide-react";

const Index = () => {
  const {
    tasks,
    activeTaskId,
    logs,
    isCreatingTask,
    createAndPlanTask,
    runTask,
    removeTask,
    setActiveTask,
  } = useAgentStore();

  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;
  const agentStatus = tasks.some((t) => t.status === 'running') 
    ? 'running' 
    : tasks.some((t) => t.status === 'planning')
    ? 'planning'
    : 'idle';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AgentHeader agentStatus={agentStatus} taskCount={tasks.length} />

      <main className="flex-1 container mx-auto px-4 py-6 min-h-0">
        {/* Info Banner */}
        <div className="mb-6 p-4 rounded-lg border border-warning/30 bg-warning/5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-warning mb-1">Browser Automation Requires Server Infrastructure</p>
            <p className="text-muted-foreground text-xs">
              This UI demonstrates task planning with AI. For actual browser control (clicking, typing, navigation), 
              you'll need to deploy a Playwright service to a cloud provider like Railway or Fly.io. 
              The AI plans the steps here; the execution would happen on your server.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-240px)]">
          {/* Left Panel - Task Builder & List */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-0">
            <Tabs defaultValue="new" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
                <TabsTrigger value="new" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Task
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2">
                  <ListTodo className="h-4 w-4" />
                  Tasks ({tasks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="flex-1 mt-0 min-h-0">
                <ScrollArea className="h-full">
                  <TaskBuilder
                    onCreateTask={createAndPlanTask}
                    isLoading={isCreatingTask}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="tasks" className="flex-1 mt-0 min-h-0">
                <ScrollArea className="h-full">
                  {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Play className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">No tasks yet</p>
                      <p className="text-xs text-muted-foreground/70">
                        Create a new task to get started
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 pr-4">
                      {tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => setActiveTask(task.id)}
                          className="cursor-pointer"
                        >
                          <TaskCard
                            task={task}
                            onRun={runTask}
                            onDelete={removeTask}
                            isActive={task.id === activeTaskId}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Execution Viewer */}
          <div className="lg:col-span-7 xl:col-span-8 rounded-lg border border-border bg-card/20 overflow-hidden min-h-0">
            <ExecutionViewer task={activeTask} logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
