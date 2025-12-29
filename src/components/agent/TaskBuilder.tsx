import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Bot, Globe, Loader2, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskBuilderProps {
  onCreateTask: (title: string, description: string, targetUrl: string) => Promise<void>;
  isLoading?: boolean;
}

export function TaskBuilder({ onCreateTask, isLoading }: TaskBuilderProps) {
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    
    // Generate title from first line or first 50 chars
    const title = description.split('\n')[0].slice(0, 50);
    await onCreateTask(title, description, targetUrl);
    setDescription('');
    setTargetUrl('');
  };

  const exampleTasks = [
    { 
      desc: "Go to replit.com and create a new account with email test@example.com", 
      url: "https://replit.com" 
    },
    { 
      desc: "Navigate to GitHub, search for 'react', and star the first repository", 
      url: "https://github.com" 
    },
    { 
      desc: "Open Twitter, compose a new tweet saying 'Hello World!'", 
      url: "https://twitter.com" 
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-card/30 p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-wide">
            New Automation Task
          </h2>
          <p className="text-xs text-muted-foreground">
            Describe what you want the AI to do
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Target URL */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Globe className="h-3 w-3" />
            TARGET URL (optional)
          </label>
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
            className="bg-background/50 border-border/50 focus:border-primary/50"
          />
        </div>

        {/* Task Description */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            TASK DESCRIPTION
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the task in natural language. For example: 'Go to replit.com, click on Sign Up, fill in the registration form with...'"
            className="min-h-[120px] bg-background/50 border-border/50 focus:border-primary/50 resize-none"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="cyber"
          size="lg"
          className="w-full"
          disabled={!description.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              ANALYZING TASK...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              CREATE TASK
            </>
          )}
        </Button>
      </form>

      {/* Example Tasks */}
      <div className="mt-6 pt-6 border-t border-border/50">
        <p className="text-xs text-muted-foreground mb-3">QUICK EXAMPLES</p>
        <div className="grid gap-2">
          {exampleTasks.map((example, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDescription(example.desc);
                setTargetUrl(example.url);
              }}
              className={cn(
                "text-left text-xs p-3 rounded-md border border-border/30 bg-muted/20",
                "hover:border-primary/30 hover:bg-muted/40 transition-all",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              {example.desc}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
