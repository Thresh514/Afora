"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit3, Clock, User, Calendar, Star, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MockTaskMainContent from "./MockTaskMainContent";

interface MockTaskPageProps {
    id: string;
    projId: string;
    stageId: string;
    taskId: string;
}

// Mock task data
const mockTaskData = {
    "task-1": {
        id: "task-1",
        title: "Define Project Requirements",
        description: "Gather and document all functional and non-functional requirements for the AI-powered collaboration platform. This includes user stories, acceptance criteria, technical specifications, and performance requirements.",
        assignee: "admin@afora.com",
        soft_deadline: "2024-01-25",
        hard_deadline: "2024-01-30",
        points: 8,
        isCompleted: true,
        progress: 100,
        order: 0
    },
    "task-2": {
        id: "task-2",
        title: "Create System Architecture",
        description: "Design the overall system architecture including database schema, API structure, and component hierarchy. Create detailed technical diagrams and documentation for the development team.",
        assignee: "member1@afora.com",
        soft_deadline: "2024-01-28",
        hard_deadline: "2024-02-02",
        points: 10,
        isCompleted: true,
        progress: 100,
        order: 1
    },
    "task-3": {
        id: "task-3",
        title: "UI/UX Design Mockups",
        description: "Create comprehensive UI/UX mockups for all major user interfaces and user flows. Include responsive designs for mobile and desktop platforms.",
        assignee: "member2@afora.com",
        soft_deadline: "2024-02-01",
        hard_deadline: "2024-02-05",
        points: 12,
        isCompleted: true,
        progress: 100,
        order: 2
    },
    "task-4": {
        id: "task-4",
        title: "Implement User Authentication",
        description: "Build secure user authentication system with role-based access control. Include features like password reset, email verification, and social login integration.",
        assignee: "admin@afora.com",
        soft_deadline: "2024-02-10",
        hard_deadline: "2024-02-15",
        points: 15,
        isCompleted: true,
        progress: 100,
        order: 0
    },
    "task-5": {
        id: "task-5",
        title: "Develop AI Task Assignment Engine",
        description: "Create the core AI algorithm for intelligent task assignment based on team member skills and workload. Implement machine learning models for optimal task distribution.",
        assignee: "member1@afora.com",
        soft_deadline: "2024-02-12",
        hard_deadline: "2024-02-18",
        points: 20,
        isCompleted: true,
        progress: 100,
        order: 1
    },
    "task-6": {
        id: "task-6",
        title: "Build Real-time Collaboration Features",
        description: "Implement real-time messaging, file sharing, and collaborative editing capabilities. Use WebSocket technology for instant updates and notifications.",
        assignee: "member2@afora.com",
        soft_deadline: "2024-02-15",
        hard_deadline: "2024-02-20",
        points: 18,
        isCompleted: false,
        progress: 65,
        order: 2
    },
    "task-7": {
        id: "task-7",
        title: "Create Project Management Dashboard",
        description: "Build comprehensive dashboard for project tracking, progress monitoring, and team analytics. Include charts, graphs, and real-time data visualization.",
        assignee: "member3@afora.com",
        soft_deadline: "2024-02-18",
        hard_deadline: "2024-02-25",
        points: 16,
        isCompleted: false,
        progress: 30,
        order: 3
    },
    "overdue-1": {
        id: "overdue-1",
        title: "Fix Critical Bug in Authentication",
        description: "Resolve authentication issues that prevent users from logging in properly. This is a high-priority bug affecting user experience and system security.",
        assignee: "admin@afora.com",
        soft_deadline: "2024-02-10",
        hard_deadline: "2024-02-12",
        points: 25,
        isCompleted: false,
        progress: 20,
        order: 0
    },
    "overdue-2": {
        id: "overdue-2",
        title: "Update API Documentation",
        description: "Complete and update all API documentation for external developers. Include code examples, error handling, and integration guides.",
        assignee: "member1@afora.com",
        soft_deadline: "2024-02-12",
        hard_deadline: "2024-02-15",
        points: 15,
        isCompleted: false,
        progress: 45,
        order: 1
    }
};

const MockTaskPage = ({ id, projId, stageId, taskId }: MockTaskPageProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const task = mockTaskData[taskId as keyof typeof mockTaskData];

    if (!task) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Task not found</h1>
                    <Link href={`/mock/org/${id}/proj/${projId}/stage/${stageId}`}>
                        <Button>Back to Stage</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const handleSaveTaskEdits = () => {
        setIsPending(true);
        // Simulate API call
        setTimeout(() => {
            toast.success("Task updated successfully! (Mock mode)");
            setIsEditing(false);
            setIsPending(false);
        }, 1000);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-8xl">
            {/* Back Button */}
            <div className="mb-6">
                <Link href={`/mock/org/${id}/proj/${projId}/stage/${stageId}`}>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Stage
                    </Button>
                </Link>
            </div>

            {/* Header Section */}
            <div className="mb-8">
                <Card className="border-0 shadow-xl bg-gradient-to-r from-[#6F61EF] to-purple-600 text-white overflow-hidden">
                    <CardHeader className="pb-6">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-3xl font-bold mb-3">
                                    {task.title}
                                </CardTitle>
                                <p className="text-white/90 text-lg mb-4 leading-relaxed">
                                    {task.description}
                                </p>

                                {/* Task Meta Info */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                    <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                                        <User className="h-4 w-4" />
                                        <span className="font-medium">
                                            Assigned to:
                                        </span>
                                        <span>
                                            {task.assignee}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                                        <Calendar className="h-4 w-4" />
                                        <span className="font-medium">
                                            Soft Deadline:
                                        </span>
                                        <span>
                                            {task.soft_deadline}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                                        <Clock className="h-4 w-4" />
                                        <span className="font-medium">
                                            Hard Deadline:
                                        </span>
                                        <span>
                                            {task.hard_deadline}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                                        <Star className="h-4 w-4" />
                                        <span className="font-medium">
                                            Points:
                                        </span>
                                        <span>{task.points}</span>
                                    </div>
                                </div>
                            </div>

                            <Drawer open={isEditing}>
                                <DrawerTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <Edit3 className="mr-2 h-4 w-4" />
                                        Edit Task
                                    </Button>
                                </DrawerTrigger>
                                <DrawerContent className="p-6 w-full h-5/6">
                                    <DrawerTitle className="text-2xl font-bold mb-2">
                                        📝 Edit Task
                                    </DrawerTitle>
                                    <DrawerDescription className="text-gray-600 mb-6">
                                        Please edit the task information below
                                    </DrawerDescription>
                                    <div className="space-y-6">
                                        <div>
                                            <Label
                                                htmlFor="title"
                                                className="text-sm font-semibold text-gray-700 mb-2 block"
                                            >
                                                Task Title
                                            </Label>
                                            <Input
                                                type="text"
                                                id="title"
                                                name="title"
                                                defaultValue={task.title}
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <Label
                                                htmlFor="description"
                                                className="text-sm font-semibold text-gray-700 mb-2 block"
                                            >
                                                Task Description
                                            </Label>
                                            <Textarea
                                                id="description"
                                                name="description"
                                                defaultValue={task.description}
                                                rows={4}
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <Label
                                                htmlFor="assignee"
                                                className="text-sm font-semibold text-gray-700 mb-2 block"
                                            >
                                                Assignee
                                            </Label>
                                            <Input
                                                type="text"
                                                id="assignee"
                                                name="assignee"
                                                defaultValue={task.assignee}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <Label
                                                    htmlFor="soft_deadline"
                                                    className="text-sm font-semibold text-gray-700 mb-2 block"
                                                >
                                                    Soft Deadline
                                                </Label>
                                                <Input
                                                    type="date"
                                                    id="soft_deadline"
                                                    name="soft_deadline"
                                                    defaultValue={task.soft_deadline}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <Label
                                                    htmlFor="hard_deadline"
                                                    className="text-sm font-semibold text-gray-700 mb-2 block"
                                                >
                                                    Hard Deadline
                                                </Label>
                                                <Input
                                                    type="date"
                                                    id="hard_deadline"
                                                    name="hard_deadline"
                                                    defaultValue={task.hard_deadline}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <Label
                                                    htmlFor="points"
                                                    className="text-sm font-semibold text-gray-700 mb-2 block"
                                                >
                                                    Points
                                                </Label>
                                                <Input
                                                    type="number"
                                                    id="points"
                                                    name="points"
                                                    min="1"
                                                    max="10"
                                                    defaultValue={task.points}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <DrawerFooter className="flex flex-row justify-end space-x-4 pt-6">
                                        <DrawerClose asChild>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsEditing(false)}
                                            >
                                                Cancel
                                            </Button>
                                        </DrawerClose>
                                        <Button
                                            onClick={handleSaveTaskEdits}
                                            disabled={isPending}
                                        >
                                            {isPending ? "Saving..." : "Save"}
                                        </Button>
                                    </DrawerFooter>
                                </DrawerContent>
                            </Drawer>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            {/* Main Content */}
            <MockTaskMainContent
                projId={projId}
                stageId={stageId}
                taskId={taskId}
                task={task}
                taskLocked={false}
            />
        </div>
    );
};

export default MockTaskPage;

