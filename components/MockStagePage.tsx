"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit3, DollarSign, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import MockTaskManagement from "./MockTaskManagement";

interface MockStagePageProps {
    id: string;
    projId: string;
    stageId: string;
}

// Mock data for stages
const mockStagesData = {
    "stage-1": {
        id: "stage-1",
        title: "Requirements Analysis & Design",
        order: 0,
        tasksCompleted: 8,
        totalTasks: 8,
        status: "completed"
    },
    "stage-2": {
        id: "stage-2",
        title: "Core Feature Development",
        order: 1,
        tasksCompleted: 6,
        totalTasks: 10,
        status: "in_progress"
    },
    "stage-3": {
        id: "stage-3",
        title: "Testing & Optimization",
        order: 2,
        tasksCompleted: 4,
        totalTasks: 6,
        status: "locked"
    }
};

// Mock data for tasks
const mockTasksData = {
    "stage-1": [
        {
            id: "task-1",
            title: "Define Project Requirements",
            description: "Gather and document all functional and non-functional requirements for the AI-powered collaboration platform",
            assignee: "admin@afora.com",
            soft_deadline: "2024-01-25",
            hard_deadline: "2024-01-30",
            points: 8,
            isCompleted: true,
            order: 0
        },
        {
            id: "task-2",
            title: "Create System Architecture",
            description: "Design the overall system architecture including database schema, API structure, and component hierarchy",
            assignee: "member1@afora.com",
            soft_deadline: "2024-01-28",
            hard_deadline: "2024-02-02",
            points: 10,
            isCompleted: true,
            order: 1
        },
        {
            id: "task-3",
            title: "UI/UX Design Mockups",
            description: "Create comprehensive UI/UX mockups for all major user interfaces and user flows",
            assignee: "member2@afora.com",
            soft_deadline: "2024-02-01",
            hard_deadline: "2024-02-05",
            points: 12,
            isCompleted: true,
            order: 2
        }
    ],
    "stage-2": [
        {
            id: "task-4",
            title: "Implement User Authentication",
            description: "Build secure user authentication system with role-based access control",
            assignee: "admin@afora.com",
            soft_deadline: "2024-02-10",
            hard_deadline: "2024-02-15",
            points: 15,
            isCompleted: true,
            order: 0
        },
        {
            id: "task-5",
            title: "Develop AI Task Assignment Engine",
            description: "Create the core AI algorithm for intelligent task assignment based on team member skills and workload",
            assignee: "member1@afora.com",
            soft_deadline: "2024-02-12",
            hard_deadline: "2024-02-18",
            points: 20,
            isCompleted: true,
            order: 1
        },
        {
            id: "task-6",
            title: "Build Real-time Collaboration Features",
            description: "Implement real-time messaging, file sharing, and collaborative editing capabilities",
            assignee: "member2@afora.com",
            soft_deadline: "2024-02-15",
            hard_deadline: "2024-02-20",
            points: 18,
            isCompleted: false,
            order: 2
        },
        {
            id: "task-7",
            title: "Create Project Management Dashboard",
            description: "Build comprehensive dashboard for project tracking, progress monitoring, and team analytics",
            assignee: "member3@afora.com",
            soft_deadline: "2024-02-18",
            hard_deadline: "2024-02-25",
            points: 16,
            isCompleted: false,
            order: 3
        }
    ],
    "stage-3": [
        {
            id: "task-8",
            title: "Unit Testing Implementation",
            description: "Write comprehensive unit tests for all core functionality and business logic",
            assignee: "member1@afora.com",
            soft_deadline: "2024-03-01",
            hard_deadline: "2024-03-05",
            points: 12,
            isCompleted: false,
            order: 0
        },
        {
            id: "task-9",
            title: "Integration Testing",
            description: "Perform end-to-end integration testing across all system components",
            assignee: "member2@afora.com",
            soft_deadline: "2024-03-03",
            hard_deadline: "2024-03-08",
            points: 14,
            isCompleted: false,
            order: 1
        },
        {
            id: "task-10",
            title: "Performance Optimization",
            description: "Optimize system performance, database queries, and frontend rendering",
            assignee: "admin@afora.com",
            soft_deadline: "2024-03-05",
            hard_deadline: "2024-03-10",
            points: 16,
            isCompleted: false,
            order: 2
        }
    ]
};

// Mock overdue tasks for bounty board
const mockOverdueTasks = [
    {
        id: "overdue-1",
        title: "Fix Critical Bug in Authentication",
        description: "Resolve authentication issues that prevent users from logging in properly",
        stage_id: "stage-2",
        soft_deadline: "2024-02-10",
        points: 25
    },
    {
        id: "overdue-2",
        title: "Update API Documentation",
        description: "Complete and update all API documentation for external developers",
        stage_id: "stage-2",
        soft_deadline: "2024-02-12",
        points: 15
    }
];

const MockStagePage = ({ id, projId, stageId }: MockStagePageProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [bountyBoardOpen, setBountyBoardOpen] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
    const [swapTaskDialogOpen, setSwapTaskDialogOpen] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string>("");
    const [swapAssigneeEmail, setSwapAssigneeEmail] = useState("");

    const stage = mockStagesData[stageId as keyof typeof mockStagesData];
    const tasks = mockStagesData[stageId as keyof typeof mockStagesData] ? 
        mockTasksData[stageId as keyof typeof mockTasksData] || [] : [];
    const overdueTasks = mockOverdueTasks.filter(task => task.stage_id === stageId);

    if (!stage) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Stage not found</h1>
                    <Link href={`/mock/org/${id}/proj/${projId}`}>
                        <Button>Back to Project</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const handleNewTask = () => {
        toast.success("Task created successfully! (Mock mode)");
        setIsCreateTaskOpen(false);
    };

    const handleDeleteTask = (taskId: string) => {
        toast.success("Task deleted successfully! (Mock mode)");
        setIsDeleteTaskOpen(false);
        setIsEditing(false);
    };

    const handleAcceptTask = (taskId: string) => {
        toast.success("Task accepted successfully! (Mock mode)");
    };

    const handleSwapTask = (taskId: string) => {
        setCurrentTaskId(taskId);
        setSwapAssigneeEmail("");
        setSwapTaskDialogOpen(true);
    };

    const handleSwapTaskConfirm = () => {
        if (!swapAssigneeEmail.trim()) {
            toast.error("Please enter an email address");
            return;
        }
        toast.success("Task swapped successfully! (Mock mode)");
        setSwapTaskDialogOpen(false);
        setSwapAssigneeEmail("");
        setCurrentTaskId("");
    };

    const handleDropTask = (taskId: string) => {
        toast.success("Task dropped successfully! (Mock mode)");
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-100">
            {/* Header Section - Copying exact design from main StagePage */}
            <div className="relative">
                <div
                    className="bg-gradient-to-r from-[#6F61EF] to-purple-600 h-64 flex items-center justify-center bg-cover bg-center"
                    style={{
                        backgroundImage: `linear-gradient(135deg, #6F61EF 0%, #8B7ED8 50%, #B794F6 100%)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                >
                    {/* semi-transparent card - similar to the project page design */}
                    <div
                        className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-6 m-6 w-full max-w-8xl"
                        style={{
                            background: "rgba(255,255,255,0.15)",
                            WebkitBackdropFilter: "blur(10px)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid rgba(255,255,255,0.2)",
                        }}
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            {/* Stage information section */}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                                        {"Stage " + (stage.order + 1) + ": " + stage.title}
                                    </h1>
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-white hover:bg-white/20 transition-colors"
                                            onClick={() => setBountyBoardOpen(true)}
                                        >
                                            <DollarSign className="h-4 w-4 mr-2" />
                                            Bounty Board ({overdueTasks.length})
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-white hover:bg-white/20 transition-colors"
                                            onClick={() => setIsEditing(!isEditing)}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl md:text-2xl font-semibold text-white">
                                        Tasks List
                                    </h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-6">
                {/* Bounty Board Dialog */}
                <Dialog open={bountyBoardOpen} onOpenChange={setBountyBoardOpen}>
                    <DialogContent className="max-w-7xl h-3/4">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                                Bounty Board
                                <span className="text-base font-normal text-gray-500">
                                    ({overdueTasks.length} tasks)
                                </span>
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                                Claim overdue tasks to earn extra points and help the team stay on track.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            {overdueTasks.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {overdueTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-orange-300 transition-all duration-300 overflow-hidden"
                                        >
                                            {/* card header */}
                                            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                        <span className="text-white text-sm font-medium">
                                                            OVERDUE
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-white/20 px-3 py-1 rounded-full">
                                                            <span className="text-white text-sm font-bold">
                                                                {task.points} Point{task.points > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* card content */}
                                            <div className="p-6">
                                                <div className="mb-4">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                                                        {task.title}
                                                    </h3>
                                                    <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                                                        {task.description}
                                                    </p>
                                                </div>

                                                {/* bottom information */}
                                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                        <span className="text-xs font-medium">
                                                            {new Date(task.soft_deadline).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <Link
                                                        href={`/mock/org/${id}/proj/${projId}/stage/${stageId}/task/${task.id}`}
                                                    >
                                                        <Button
                                                            size="sm"
                                                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                                            onClick={() => setBountyBoardOpen(false)}
                                                        >
                                                            <svg
                                                                className="w-4 h-4 mr-2"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                                                />
                                                            </svg>
                                                            Claim Task
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500">
                                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                                        <DollarSign className="h-12 w-12 text-gray-400" />
                                    </div>
                                    <p className="text-xl font-semibold text-gray-700 mb-2">
                                        No overdue tasks available
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        All tasks are on track! 🎉
                                    </p>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Swap Task Dialog */}
                <Dialog open={swapTaskDialogOpen} onOpenChange={setSwapTaskDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Swap Task Assignment</DialogTitle>
                            <DialogDescription>
                                Enter the email address of the person you want to assign this task to.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="assignee-email" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="assignee-email"
                                    type="email"
                                    placeholder="user@example.com"
                                    value={swapAssigneeEmail}
                                    onChange={(e) => setSwapAssigneeEmail(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setSwapTaskDialogOpen(false);
                                    setSwapAssigneeEmail("");
                                    setCurrentTaskId("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSwapTaskConfirm}
                                disabled={!swapAssigneeEmail.trim()}
                            >
                                Swap Task
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Task Dialog */}
                <AlertDialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="default"
                            className="fixed bottom-4 right-4 z-50"
                            onClick={() => setIsCreateTaskOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Task
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-full max-w-md">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Create New Task</AlertDialogTitle>
                            <AlertDialogDescription>
                                Enter the details for the new task.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="p-4 space-y-4">
                            <div>
                                <Label htmlFor="task-title" className="text-sm font-medium text-gray-700">
                                    Task Title
                                </Label>
                                <Input
                                    id="task-title"
                                    type="text"
                                    placeholder="Enter task title"
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <Label htmlFor="task-description" className="text-sm font-medium text-gray-700">
                                    Task Description
                                </Label>
                                <Textarea
                                    id="task-description"
                                    placeholder="Enter task description"
                                    className="w-full"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="soft-deadline" className="text-sm font-medium text-gray-700">
                                        Soft Deadline
                                    </Label>
                                    <Input
                                        id="soft-deadline"
                                        type="date"
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="hard-deadline" className="text-sm font-medium text-gray-700">
                                        Hard Deadline
                                    </Label>
                                    <Input
                                        id="hard-deadline"
                                        type="date"
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="task-points" className="text-sm font-medium text-gray-700">
                                    Points
                                </Label>
                                <Input
                                    id="task-points"
                                    type="number"
                                    min="1"
                                    max="10"
                                    placeholder="Enter task points"
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <AlertDialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleNewTask}>
                                Create Task
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Task Management Component */}
                <MockTaskManagement
                    tasks={tasks}
                    isEditing={isEditing}
                    handleNewTask={handleNewTask}
                    handleDeleteTask={handleDeleteTask}
                    handleSwapTask={handleSwapTask}
                    handleDropTask={handleDropTask}
                    handleAcceptTask={handleAcceptTask}
                    isPending={false}
                    isOpen={isDeleteTaskOpen}
                    setIsOpen={setIsDeleteTaskOpen}
                    orgId={id}
                    projId={projId}
                    stageId={stageId}
                    currentUserEmail="admin@afora.com"
                />
            </div>
        </div>
    );
};

export default MockStagePage;

