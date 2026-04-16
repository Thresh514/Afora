"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClerkAvatarMap } from "@/hooks/useClerkAvatarMap";
import { Task, TaskPoolStats } from "@/types/types";
import {
  Trophy,
  Calendar,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  UserMinus,
  Timer,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

interface TaskPoolProps {
  stageId: string;
  projId: string;
  tasks: Task[];
  isMockMode?: boolean;
  onTaskAssign?: (taskId: string, userId: string) => Promise<void>;
  onTaskUnassign?: (taskId: string) => Promise<void>;
  onTaskComplete?: (taskId: string) => Promise<void>;
}

const TaskPool: React.FC<TaskPoolProps> = ({
  stageId,
  tasks,
  isMockMode = false,
  onTaskAssign,
  onTaskUnassign,
  onTaskComplete,
}) => {
  const { user } = useUser();
  const [stats, setStats] = useState<TaskPoolStats | null>(null);
  const [loading, setLoading] = useState(false);

  const assigneeEmails = useMemo(
    () => [...new Set(tasks.map((t) => t.assignee).filter((e): e is string => Boolean(e)))],
    [tasks]
  );
  const { getUrl: assigneeClerkAvatarUrl } = useClerkAvatarMap(assigneeEmails);

  // Calculate task pool statistics
  useEffect(() => {
    const totalTasks = tasks.length;
    const availableTasks = tasks.filter((task) => task.status === "available").length;
    const assignedTasks = tasks.filter((task) => task.status === "assigned").length;
    const completedTasks = tasks.filter((task) => task.status === "completed").length;
    const overdueTasks = tasks.filter((task) => task.status === "overdue").length;

    setStats({
      stageId,
      totalTasks,
      availableTasks,
      assignedTasks,
      completedTasks,
      overdueTasks,
    });
  }, [tasks, stageId]);

  const isTaskOverdue = (task: Task): boolean => {
    const now = new Date();
    const softDeadline = new Date(task.soft_deadline);
    return now > softDeadline && task.status === "assigned";
  };

  const isUserAssigned = (task: Task): boolean => {
    return task.assignee === user?.primaryEmailAddress?.toString();
  };

  const handleAssignTask = async (taskId: string) => {
    if (!user?.primaryEmailAddress) {
      toast.error("Please sign in to assign tasks");
      return;
    }

    setLoading(true);
    try {
      if (isMockMode) {
        // Mock mode - just show success
        toast.success("Task assigned successfully! (Mock mode)");
      } else if (onTaskAssign) {
        await onTaskAssign(taskId, user.primaryEmailAddress.toString());
        toast.success("Task assigned successfully!");
      }
    } catch (error) {
      toast.error("Failed to assign task");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignTask = async (taskId: string) => {
    setLoading(true);
    try {
      if (isMockMode) {
        toast.success("Task unassigned successfully! (Mock mode)");
      } else if (onTaskUnassign) {
        await onTaskUnassign(taskId);
        toast.success("Task unassigned successfully!");
      }
    } catch (error) {
      toast.error("Failed to unassign task");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setLoading(true);
    try {
      if (isMockMode) {
        toast.success("Task completed! +1 point (Mock mode)");
      } else if (onTaskComplete) {
        await onTaskComplete(taskId);
        toast.success("Task completed! +1 point");
      }
    } catch (error) {
      toast.error("Failed to complete task");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskStatusBadge = (task: Task) => {
    switch (task.status) {
      case "available":
        return <Badge variant="secondary">Available</Badge>;
      case "assigned":
        return isTaskOverdue(task) ? (
          <Badge variant="destructive">Overdue</Badge>
        ) : (
          <Badge variant="default">Assigned</Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return null;
    }
  };

  const formatDeadline = (deadline: string) => {
    return new Date(deadline).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!stats) {
    return <div>Loading task pool...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Task Pool Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Task Pool Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalTasks}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.availableTasks}</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.assignedTasks}</div>
              <div className="text-sm text-muted-foreground">Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{stats.completedTasks}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </div>
          </div>

          {stats.totalTasks > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{Math.round((stats.completedTasks / stats.totalTasks) * 100)}%</span>
              </div>
              <Progress value={(stats.completedTasks / stats.totalTasks) * 100} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className="transition-shadow hover:shadow-md h-fit">
            <CardContent className="p-4">
              <div className="flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-base line-clamp-2">{task.title}</h3>
                    <div className="flex flex-wrap gap-1">
                      {getTaskStatusBadge(task)}
                      <Badge variant="outline" className="text-xs">
                        {task.points} pt
                        {task.points !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                    {task.description}
                  </p>

                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Soft: {formatDeadline(task.soft_deadline)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Timer className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Hard: {formatDeadline(task.hard_deadline)}</span>
                    </div>
                  </div>

                  {task.assignee && (
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage
                          src={assigneeClerkAvatarUrl(task.assignee) || undefined}
                          alt=""
                          className="object-cover"
                        />
                        <AvatarFallback className="text-xs">
                          {task.assignee.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground truncate">
                        {task.assignee}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
                  {task.status === "available" && (
                    <Button
                      size="sm"
                      onClick={() => handleAssignTask(task.id)}
                      disabled={loading}
                      className="flex items-center gap-1 w-full"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Assign to Me</span>
                      <span className="sm:hidden">Assign</span>
                    </Button>
                  )}

                  {task.status === "assigned" && isUserAssigned(task) && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={loading}
                        className="flex items-center gap-1 w-full"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Complete</span>
                        <span className="sm:hidden">Done</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnassignTask(task.id)}
                        disabled={loading}
                        className="flex items-center gap-1 w-full"
                      >
                        <UserMinus className="h-4 w-4" />
                        <span className="hidden sm:inline">Unassign</span>
                        <span className="sm:hidden">Remove</span>
                      </Button>
                    </div>
                  )}

                  {task.status === "assigned" && !isUserAssigned(task) && isTaskOverdue(task) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAssignTask(task.id)}
                      disabled={loading}
                      className="flex items-center gap-1 w-full"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span className="hidden sm:inline">Reassign</span>
                      <span className="sm:hidden">Take</span>
                    </Button>
                  )}

                  {task.status === "completed" && (
                    <div className="flex items-center justify-center gap-1 text-green-600 text-sm py-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>+{task.points} pts</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No tasks in pool</h3>
            <p className="text-muted-foreground">
              Tasks will appear here when they are added to this stage.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskPool;
