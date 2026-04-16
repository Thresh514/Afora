"use client";

import { getUserIncompleteTasks } from "@/actions/actions";
import { UserTaskWithContext } from "@/types/types";
import { Search, Calendar, ExternalLink, ListTodo } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/LoadingSpinner";

function formatDeadline(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function MyTasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [tasks, setTasks] = useState<UserTaskWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = initialQuery.trim() || undefined;
    const result = await getUserIncompleteTasks(query);
    if (result.success && result.tasks) {
      setTasks(result.tasks);
    } else {
      setError(result.message || "Failed to load tasks");
      setTasks([]);
    }
    setLoading(false);
  }, [initialQuery]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    setSearchKeyword(initialQuery);
  }, [initialQuery]);

  const handleSearch = () => {
    const q = searchKeyword.trim();
    router.push(q ? `/my-tasks?q=${encodeURIComponent(q)}` : "/my-tasks");
  };

  return (
    <div className="min-h-screen w-full max-w-[90rem] mx-auto px-3 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="text-sm text-muted-foreground">Your incomplete tasks, sorted by deadline</p>
      </div>

      {/* Search bar - Nido Scout style */}
      <div className="mb-8 rounded-xl border border-border/70 bg-card/60 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks by keyword..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="border-border bg-background pl-10"
            />
          </div>
          <Button onClick={handleSearch} className="shrink-0">
            Search
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-4 py-16">
          <ListTodo className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold text-card-foreground">No incomplete tasks</h2>
          <p className="max-w-sm text-center text-muted-foreground">
            {searchKeyword.trim()
              ? "No tasks match your search. Try a different keyword."
              : "You're all caught up! No tasks assigned to you right now."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Link
              key={`${task.orgId}-${task.projId}-${task.stageId}-${task.id}`}
              href={`/org/${task.orgId}/proj/${task.projId}/stage/${task.stageId}/task/${task.id}`}
              className="block"
            >
              <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate font-semibold text-card-foreground">{task.title}</h3>
                    {task.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {task.projectTitle && (
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {task.projectTitle}
                        </span>
                      )}
                      {task.stageTitle && (
                        <span className="text-xs text-muted-foreground">{task.stageTitle}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDeadline(task.hard_deadline)}
                    </div>
                    <ExternalLink className="mt-2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyTasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16 min-h-[200px]">
          <LoadingSpinner />
        </div>
      }
    >
      <MyTasksContent />
    </Suspense>
  );
}
