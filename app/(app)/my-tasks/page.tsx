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
                <h1 className="text-2xl font-bold text-gray-900 mb-2">My Tasks</h1>
                <p className="text-gray-600 text-sm">
                    Your incomplete tasks, sorted by deadline
                </p>
            </div>

            {/* Search bar - Nido Scout style */}
            <div className="bg-purple-50 rounded-xl p-4 mb-8 border border-purple-100">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search tasks by keyword..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSearch();
                            }}
                            className="pl-10 bg-white border-gray-200"
                        />
                    </div>
                    <Button
                        onClick={handleSearch}
                        className="bg-gray-900 hover:bg-gray-800 text-white shrink-0"
                    >
                        Search
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-xl border border-gray-100">
                    <ListTodo className="h-12 w-12 text-gray-300 mb-4" />
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">
                        No incomplete tasks
                    </h2>
                    <p className="text-gray-600 text-center max-w-sm">
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
                            <div className="bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {task.title}
                                        </h3>
                                        {task.description && (
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {task.projectTitle && (
                                                <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    {task.projectTitle}
                                                </span>
                                            )}
                                            {task.stageTitle && (
                                                <span className="text-xs text-gray-500">
                                                    {task.stageTitle}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                            <Calendar className="h-4 w-4" />
                                            {formatDeadline(task.hard_deadline)}
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-gray-400 mt-2" />
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
        <Suspense fallback={
            <div className="flex justify-center py-16 min-h-[200px]">
                <LoadingSpinner />
            </div>
        }>
            <MyTasksContent />
        </Suspense>
    );
}
