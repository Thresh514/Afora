"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
    User, 
    Calendar, 
    Clock, 
    Star, 
    Edit3, 
    Trash2, 
    CheckCircle2, 
    MoreVertical,
    ArrowUpDown,
    UserPlus,
    UserMinus
} from "lucide-react";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Task {
    id: string;
    title: string;
    description: string;
    assignee: string;
    soft_deadline: string;
    hard_deadline: string;
    points: number;
    isCompleted: boolean;
    order: number;
}

interface MockTaskManagementProps {
    tasks: Task[];
    isEditing: boolean;
    handleNewTask: () => void;
    handleDeleteTask: (taskId: string) => void;
    handleSwapTask: (taskId: string) => void;
    handleDropTask: (taskId: string) => void;
    handleAcceptTask: (taskId: string) => void;
    isPending: boolean;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    orgId: string;
    projId: string;
    stageId: string;
    currentUserEmail?: string;
}

const MockTaskManagement = ({
    tasks,
    isEditing,
    handleNewTask,
    handleDeleteTask,
    handleSwapTask,
    handleDropTask,
    handleAcceptTask,
    isPending,
    isOpen,
    setIsOpen,
    orgId,
    projId,
    stageId,
    currentUserEmail,
}: MockTaskManagementProps) => {
    const tasksCompleted = tasks.filter((task) => task.isCompleted).length;

    const getStatusColor = (isCompleted: boolean) => {
        return isCompleted 
            ? "bg-green-100 text-green-800 border-green-200" 
            : "bg-blue-100 text-blue-800 border-blue-200";
    };

    const getStatusText = (isCompleted: boolean) => {
        return isCompleted ? "Completed" : "In Progress";
    };

    const getAssigneeInitials = (email: string) => {
        return email.split('@')[0].substring(0, 2).toUpperCase();
    };

    return (
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg overflow-hidden">
            {/* Main Task List */}
            <div className="w-full bg-white flex flex-col shadow-lg rounded-lg">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">
                                Task Management
                            </h2>
                            <p className="text-xs opacity-90">
                                Manage all tasks
                            </p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-2xl font-bold">{tasks.length}</div>
                            <div className="text-xs opacity-90">Total Tasks</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-2xl font-bold">{tasksCompleted}</div>
                            <div className="text-xs opacity-90">Completed</div>
                        </div>
                    </div>
                </div>

                {/* Task List */}
                <div className="p-6">
                    {tasks.length > 0 ? (
                        <div className="space-y-4">
                            {tasks.map((task, index) => (
                                <Card key={task.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {task.title}
                                                    </h3>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={getStatusColor(task.isCompleted)}
                                                    >
                                                        {getStatusText(task.isCompleted)}
                                                    </Badge>
                                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                                        {task.points} pts
                                                    </Badge>
                                                </div>
                                                
                                                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                                    {task.description}
                                                </p>

                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-4 w-4" />
                                                        <span>{task.assignee}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>Soft: {task.soft_deadline}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        <span>Hard: {task.hard_deadline}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 ml-4">
                                                {isEditing ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/mock/org/${orgId}/proj/${projId}/stage/${stageId}/task/${task.id}`}>
                                                                    <div className="flex items-center w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-sm">
                                                                        <Edit3 className="h-4 w-4 mr-2" />
                                                                        View Details
                                                                    </div>
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleSwapTask(task.id)}
                                                                className="flex items-center"
                                                            >
                                                                <ArrowUpDown className="h-4 w-4 mr-2" />
                                                                Swap Task
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteTask(task.id)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete Task
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {!task.isCompleted && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleAcceptTask(task.id)}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                <UserPlus className="h-4 w-4 mr-1" />
                                                                Accept
                                                            </Button>
                                                        )}
                                                        {task.assignee === currentUserEmail && !task.isCompleted && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleDropTask(task.id)}
                                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                                            >
                                                                <UserMinus className="h-4 w-4 mr-1" />
                                                                Drop
                                                            </Button>
                                                        )}
                                                        <Link href={`/mock/org/${orgId}/proj/${projId}/stage/${stageId}/task/${task.id}`}>
                                                            <Button size="sm" variant="outline">
                                                                View
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <User className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
                            <p className="text-gray-500 mb-4">Create your first task to get started</p>
                            {isEditing && (
                                <Button onClick={handleNewTask}>
                                    Create Task
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Task Alert Dialog */}
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this task? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => handleDeleteTask("")}
                            disabled={isPending}
                        >
                            {isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MockTaskManagement;

