"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleCheckBig, Clock7, Trash, User, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Task } from "@/types/types";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useClerkAvatarMap } from "@/hooks/useClerkAvatarMap";

interface TaskManagementProps {
  tasks: Task[];
  isEditing: boolean;
  handleNewTask: () => void;
  handleDeleteTask: (taskId: string) => void;
  handleAcceptTask?: (taskId: string) => void;
  handleCompleteTask?: (taskId: string) => void;
  isPending: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  orgId: string;
  projId: string;
  stageId: string;
  currentUserEmail?: string;
  isAdmin?: boolean;
}

const TaskManagement = ({
  tasks,
  isEditing,
  handleNewTask,
  handleDeleteTask,
  handleAcceptTask,
  isPending,
  isOpen,
  setIsOpen,
  orgId,
  projId,
  stageId,
  currentUserEmail,
  isAdmin: isCurrentUserAdmin,
}: TaskManagementProps) => {
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const assigneeEmails = useMemo(
    () => [...new Set(tasks.map((t) => t.assignee).filter((e): e is string => Boolean(e)))],
    [tasks]
  );
  const { getUrl: assigneeClerkAvatarUrl } = useClerkAvatarMap(assigneeEmails);
  // const tasksCompleted = tasks.filter((task) => task.isCompleted).length;

  // Function to check if a task is within one day of hard deadline (uses hard_deadline to match displayed "Due")
  const isNearDeadline = (task: Task) => {
    const now = new Date();
    const deadline = new Date(task.hard_deadline);
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= 1 && daysDiff >= 0 && !task.isCompleted;
  };

  // Function to check if a task is within one day of soft deadline
  const isNearSoftDeadline = (task: Task) => {
    const now = new Date();
    const softDeadline = new Date(task.soft_deadline);
    const timeDiff = softDeadline.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= 1 && daysDiff >= 0 && !task.isCompleted;
  };

  // Sort tasks according to requirements
  const sortedTasks = [...tasks].sort((a, b) => {
    // First, separate completed and incomplete tasks
    if (a.isCompleted && !b.isCompleted) return 1;
    if (!a.isCompleted && b.isCompleted) return -1;

    // If both are completed, maintain completion order (assuming tasks array is already in completion order)
    if (a.isCompleted && b.isCompleted) return 0;

    // For incomplete tasks:
    const aIsCurrentUser = a.assignee === currentUserEmail;
    const bIsCurrentUser = b.assignee === currentUserEmail;

    // Current user's tasks go to the top
    if (aIsCurrentUser && !bIsCurrentUser) return -1;
    if (!aIsCurrentUser && bIsCurrentUser) return 1;

    // If both are current user's tasks or both are other users' tasks,
    // sort by assignee name alphabetically
    const aAssignee = a.assignee || "Unassigned";
    const bAssignee = b.assignee || "Unassigned";
    return aAssignee.localeCompare(bAssignee);
  });

  return (
    <div className="overflow-hidden rounded-lg bg-gradient-to-br from-background to-muted/40">
      {/* Main Task List */}
      <div className="flex w-full flex-col rounded-lg bg-card shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Task Management</h2>
              <p className="text-xs opacity-90">Manage all tasks</p>
            </div>
          </div>

          {/* Stats Cards */}
          {/* <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                            <div className="text-2xl font-bold">
                                {sortedTasks.length}
                            </div>
                            <div className="text-xs opacity-90">
                                Total Tasks
                            </div>
                        </div>
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                            <div className="text-2xl font-bold">
                                {tasksCompleted}
                            </div>
                            <div className="text-xs opacity-90">Completed</div>
                        </div>
                    </div> */}
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task, index) => {
                const isAssignedToCurrentUser =
                  task.assignee === currentUserEmail || isCurrentUserAdmin;
                // 仅「分配给自己且未完成」时在列表中高亮（本页专属）
                const isMyPendingTask = task.assignee === currentUserEmail && !task.isCompleted;
                const isUnassigned = !task.assignee;
                const isDeadlineSoon = isNearDeadline(task);
                const isSoftDeadlineSoon = isNearSoftDeadline(task);

                return (
                  <Link
                    href={`/org/${orgId}/proj/${projId}/stage/${stageId}/task/${task.id}`}
                    key={task.id}
                  >
                    <Card
                      key={task.id}
                      className={`transition-all duration-200 hover:shadow-lg group relative border-2 ${
                        isDeadlineSoon
                          ? "border-red-500 animate-flash-red"
                          : isSoftDeadlineSoon
                            ? "border-orange-200"
                            : isMyPendingTask
                              ? "border-l-4 border-l-amber-400 bg-yellow-50 dark:bg-yellow-950/25"
                              : ""
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 container">
                            <div
                              className={`mt-1 ${task.isCompleted ? "text-green-500" : "text-yellow-500"}`}
                            >
                              {task.isCompleted ? (
                                <CircleCheckBig className="h-5 w-5" />
                              ) : (
                                <Clock7 className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-medium truncate">
                                {index + 1}. {task.title} (⭐{task.points || 10})
                              </CardTitle>
                            </div>
                          </div>

                          {/* Task Actions - 阻止点击冒泡到外层 Link，避免误导航 */}
                          {(currentUserEmail || isCurrentUserAdmin) && (
                            <div
                              className="flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                  <DropdownMenu.Content
                                    align="start"
                                    side="left"
                                    className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-100 bg-card p-1 shadow-md animate-in slide-in-from-right-2"
                                  >
                                    {isUnassigned && handleAcceptTask && (
                                      <DropdownMenu.Item
                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-blue-600 outline-none transition-colors hover:bg-accent/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                        onClick={() => handleAcceptTask(task.id)}
                                      >
                                        <User className="mr-2 h-4 w-4" />
                                        Accept Task
                                      </DropdownMenu.Item>
                                    )}
                                    {isAssignedToCurrentUser && (
                                      <>
                                        {/* {handleSwapTask && (
                                                                                    <DropdownMenu.Item
                                                                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-blue-600 outline-none transition-colors hover:bg-accent/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                                                                        onClick={() => handleSwapTask(task.id)}
                                                                                    >
                                                                                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                                                                                        Swap Task
                                                                                    </DropdownMenu.Item>
                                                                                )}
                                                                                {handleDropTask && (
                                                                                    <DropdownMenu.Item
                                                                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-yellow-600 outline-none transition-colors hover:bg-accent/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                                                                        onClick={() => handleDropTask(task.id)}
                                                                                    >
                                                                                        <XCircle className="mr-2 h-4 w-4" />
                                                                                        Drop Task
                                                                                    </DropdownMenu.Item>
                                                                                )} */}
                                        <DropdownMenu.Item
                                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-red-600 outline-none transition-colors hover:bg-accent/80 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                          onSelect={() => {
                                            setTaskToDelete(task.id);
                                            setIsOpen(true);
                                          }}
                                        >
                                          <Trash className="mr-2 h-4 w-4" />
                                          Delete Task
                                        </DropdownMenu.Item>
                                      </>
                                    )}
                                  </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                              </DropdownMenu.Root>
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 group-data-[state=open]:blur-sm transition-all">
                        {/* Assignee and Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.assignee && (
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={assigneeClerkAvatarUrl(task.assignee) || undefined}
                                  alt=""
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-[10px] text-white font-medium">
                                  {task.assignee.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span className="text-xs text-muted-foreground font-semibold">
                              {task.assignee || "Unassigned"}
                            </span>
                          </div>

                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              task.isCompleted
                                ? "bg-green-100 text-green-800"
                                : task.status === "overdue"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {task.isCompleted
                              ? "Completed"
                              : task.status === "overdue"
                                ? "Overdue"
                                : "In Progress"}
                          </span>
                        </div>

                        {/* Deadlines */}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Due: {new Date(task.hard_deadline).toLocaleDateString()}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <CircleCheckBig className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No tasks created yet</h3>
                <p className="text-muted-foreground">
                  Create your first task to get started with team management.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Task Dialog - 单一对话框，避免与 Link 冲突 */}
        <AlertDialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setTaskToDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the task.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (taskToDelete) {
                    handleDeleteTask(taskToDelete);
                    setTaskToDelete(null);
                  }
                  setIsOpen(false);
                }}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Actions - Create New Task */}
        {(isEditing || sortedTasks.length === 0) && (
          <div className="p-6 border-t border-border bg-muted/50">
            <Button className="w-full" size="lg" onClick={handleNewTask} disabled={isPending}>
              <CircleCheckBig className="h-4 w-4 mr-2" />
              {isPending ? "Creating..." : "Create New Task"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskManagement;
