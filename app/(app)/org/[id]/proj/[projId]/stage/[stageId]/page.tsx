"use client";

import { Button } from "@/components/ui/button";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import React from "react";
import Link from "next/link";
import { getOverdueTasks, assignTask, reassignTask, completeTaskWithProgress } from "@/actions/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useDocument } from "react-firebase-hooks/firestore";
import { db } from "@/firebase";
import { Stage, Task } from "@/types/types";
import { collection, doc, getDoc } from "firebase/firestore";

import {
    Edit3,
    DollarSign,
} from "lucide-react";
import BountyBoardButton from "@/components/BountyBoardButton";
import TaskManagement from "@/components/TaskManagement";
import { createTask, deleteTask } from "@/actions/actions";
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
import { toast } from "sonner";
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
import { Plus } from "lucide-react";
import { useAnimations } from "@/contexts/AnimationContext";


function StagePage() {
    const params = useParams();
    const id = params.id as string;
    const projId = params.projId as string;
    const stageId = params.stageId as string;
    
    const { isSignedIn, isLoaded } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const { triggerRocket, triggerConfetti } = useAnimations();
    const [swapTaskDialogOpen, setSwapTaskDialogOpen] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string>("");
    const [swapAssigneeEmail, setSwapAssigneeEmail] = useState("");

    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false); // State for Create Task dialog
    const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false); // State for Delete Task dialog
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.replace("/login");
        }
    }, [isLoaded, isSignedIn, router]);



    const [isPending, startTransition] = useTransition();
    const [stageData, stageLoading, stageError] = useDocument(
        doc(db, "projects", projId, "stages", stageId),
    );
    const [tasksData, tasksLoading, tasksError] = useCollection(
        collection(db, "projects", projId, "stages", stageId, "tasks"),
    );

    // console.log("\n\n\nTASKS DATA\n\n");
    // console.log(tasksData);

    const tasks: Task[] = useMemo(() => {
        return (
            tasksData?.docs
                .map((doc) => ({
                    ...(doc.data() as Task),
                }))
                .sort((a, b) => a.order - b.order) || []
        );
    }, [tasksData]);

    const [isEditing, setIsEditing] = useState(false);
    const [bountyBoardOpen, setBountyBoardOpen] = useState(false);

    // 恢复原有逻辑：存储从后端获取的过期任务
    const [backendOverdueTasks, setBackendOverdueTasks] = useState<Array<{
        id: string;
        title: string;
        description: string;
        stage_id: string;
        soft_deadline: string;
        points?: number;
    }>>([]);

    // fetch overdue tasks function 
    const fetchOverdueTasks = useCallback(async () => {
        try {
            const overdueResult = await getOverdueTasks(projId);
            if (overdueResult.success) {
                setBackendOverdueTasks(overdueResult.tasks || []);
            }
        } catch (error) {
            console.error("Failed to fetch overdue tasks:", error);
        }
    }, [projId]);

    // 页面进入时自动拉取一次 Bounty Board 数据
    useEffect(() => {
        fetchOverdueTasks();
    }, [fetchOverdueTasks]);

    // check if user is admin
    useEffect(() => {
        const checkAdmin = async () => {
            const projectDoc = await getDoc(doc(db, "projects", projId));
            if (projectDoc?.data()?.admins?.includes(user?.primaryEmailAddress?.emailAddress)) {
                setIsAdmin(true);
            }
        };
        checkAdmin();
    }, [user, projId]);

    // handle bounty board open function
    const handleBountyBoardOpen = useCallback(async () => {
        setBountyBoardOpen(true);
        // fetch overdue tasks when the bounty board is opened
        await fetchOverdueTasks();
    }, [fetchOverdueTasks]);

    if (!isSignedIn) return null;

    if (stageLoading || tasksLoading) {
        return <Skeleton className="w-full h-96" />;
    }

    if (stageError) {
        return <div>Error: {stageError.message}</div>;
    }

    if (tasksError) {
        return <div>Error: {tasksError.message}</div>;
    }

    const stage = (stageData?.data() as Stage);

    if (!stage) {
        return <div>Error: The stage has been deleted.</div>;
    }

    // Get overdue tasks for bounty board (恢复原有逻辑)
    const overdueTasks = backendOverdueTasks.filter((task) => task.stage_id === stageId);

    const handleNewTask = async () => {
        const title = (document.getElementById("task-title") as HTMLInputElement)?.value || "New Task";
        const description = (document.getElementById("task-description") as HTMLTextAreaElement)?.value || "Default task description";
        const softDeadline = (document.getElementById("soft-deadline") as HTMLInputElement)?.value || "";
        const hardDeadline = (document.getElementById("hard-deadline") as HTMLInputElement)?.value || "";
        const points = parseInt((document.getElementById("task-points") as HTMLInputElement)?.value || "1");

        try {
            await createTask(projId, stageId, title, description, softDeadline, hardDeadline, points);
            toast.success("Task created successfully!");
        } catch (error) {
            console.error("Error creating task:", error);
            toast.error("Failed to create task: " + (error as Error).message);
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        const result = await completeTaskWithProgress(projId, stageId, taskId, 100);
        if (result?.success) {
            triggerRocket();
        }
        toast.success("🎉 Task marked as complete!");
    }

    const handleDeleteTask = (taskId: string) => {
        startTransition(() => {
            deleteTask(projId, stageId, taskId)
                .then(() => {
                    toast.success("Task deleted successfully!");
                })
                .catch((error) => {
                    toast.error("Failed to delete task: " + error.message);
                })
                .finally(() => {
                    setIsDeleteTaskOpen(false); // Close Delete Task dialog
                    setIsEditing(false);
                });
        });
    };

    const handleAcceptTask = async (taskId: string) => {
        const userEmail = user?.primaryEmailAddress?.emailAddress;
        if (!userEmail) {
            toast.error("User email not found");
            return;
        }
        
        startTransition(async () => {
            const result = await assignTask(
                projId,
                stageId,
                taskId,
                userEmail
            );
            
            if (result.success) {
                triggerConfetti();
                toast.success("Task accepted successfully!");
            } else {
                toast.error(result.message || "Failed to accept task");
            }
        });
    };

    // const handleSwapTask = async (taskId: string) => {
    //     setCurrentTaskId(taskId);
    //     setSwapAssigneeEmail("");
    //     setSwapTaskDialogOpen(true);
    // };

    const handleSwapTaskConfirm = async () => {
        if (!swapAssigneeEmail.trim()) {
            toast.error("Please enter an email address");
            return;
        }

        toast.success("Task swapped successfully! (Mock mode)");
        setSwapTaskDialogOpen(false);
        setSwapAssigneeEmail("");
        setCurrentTaskId("");

        startTransition(async () => {
            const result = await reassignTask(
                projId, 
                stageId, 
                currentTaskId, 
                swapAssigneeEmail.trim()
            );
            
            if (result.success) {
                toast.success("Task swapped successfully!");
                setSwapTaskDialogOpen(false);
                setSwapAssigneeEmail("");
                setCurrentTaskId("");
            } else {
                toast.error(result.message || "Failed to swap task");
            }
        });
    };

    // const handleDropTask = async (taskId: string) => {
    //     startTransition(async () => {
    //         const result = await unassignTask(projId, stageId, taskId);
            
    //         if (result.success) {
    //             toast.success("Task dropped successfully!");
    //         } else {
    //             toast.error(result.message || "Failed to drop task");
    //         }
    //     });
    // };

    return (
        <div className="w-full h-full flex flex-col bg-gray-100">
            {/* Header Section - similar to the project page design */}
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
                                        <BountyBoardButton
                                            overdueTasks={overdueTasks.length}
                                            showBountyBoard={false}
                                            onClick={handleBountyBoardOpen}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-white hover:bg-white/20 transition-colors"
                                            onClick={() =>
                                                setIsEditing(!isEditing)
                                            }
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
                <Dialog
                    open={bountyBoardOpen}
                    onOpenChange={(open) => {
                        setBountyBoardOpen(open);
                        if (!open) {
                            fetchOverdueTasks();
                        }
                    }}
                >
                    <DialogContent className="max-w-7xl max-h-[85vh] flex flex-col overflow-hidden">
                        <DialogHeader className="flex-shrink-0">
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

                        <div className="py-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
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
                                                                {task.points || 10} Point{(task.points || 10) > 1 ? 's' : ''}
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
                                                            {new Date(
                                                                task.soft_deadline,
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <Link
                                                        href={`/org/${id}/proj/${projId}/stage/${stageId}/task/${task.id}`}
                                                    >
                                                        <Button
                                                            size="sm"
                                                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                                            onClick={() =>
                                                                setBountyBoardOpen(
                                                                    false,
                                                                )
                                                            }
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
                                                                    strokeWidth={
                                                                        2
                                                                    }
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
                                disabled={isPending || !swapAssigneeEmail.trim()}
                            >
                                {isPending ? "Swapping..." : "Swap Task"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Task Dialog */}
                <AlertDialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="default"
                            className="fixed bottom-4 right-4 z-50" // Added z-50 for higher Z-layer
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
                            <Button
                                onClick={async () => {
                                    const title = (document.getElementById("task-title") as HTMLInputElement)?.value || "New Task";
                                    const description = (document.getElementById("task-description") as HTMLTextAreaElement)?.value || "Default task description";
                                    const softDeadline = (document.getElementById("soft-deadline") as HTMLInputElement)?.value || "";
                                    const hardDeadline = (document.getElementById("hard-deadline") as HTMLInputElement)?.value || "";
                                    const points = parseInt((document.getElementById("task-points") as HTMLInputElement)?.value || "1");

                                    try {
                                        await createTask(projId, stageId, title, description, softDeadline, hardDeadline, points);
                                        toast.success("Task created successfully!");
                                    } catch (error) {
                                        console.error("Error creating task:", error);
                                        toast.error("Failed to create task.");
                                    } finally {
                                        setIsCreateTaskOpen(false); // Close Create Task dialog
                                    }
                                }}
                            >
                                Create Task
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Task Management Component */}
                <TaskManagement
                    tasks={tasks}
                    isEditing={isEditing}
                    handleNewTask={handleNewTask}
                    handleDeleteTask={handleDeleteTask}
                    handleAcceptTask={handleAcceptTask}
                    handleCompleteTask={handleCompleteTask}
                    isPending={isPending}
                    isOpen={isDeleteTaskOpen} // Pass Delete Task state
                    setIsOpen={setIsDeleteTaskOpen} // Pass Delete Task state setter
                    orgId={id}
                    projId={projId}
                    stageId={stageId}
                    currentUserEmail={user?.primaryEmailAddress?.emailAddress}
                    isAdmin={isAdmin}
                />
            </div>
        </div>
    );
}

export default StagePage;
