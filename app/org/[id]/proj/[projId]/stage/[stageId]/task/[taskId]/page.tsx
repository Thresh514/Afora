"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/firebase";
import { useAuth, useUser } from "@clerk/nextjs";
import { doc } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { useDocument } from "react-firebase-hooks/firestore";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit3, Clock, User, Calendar, Star } from "lucide-react";
import { Task } from "@/types/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerTitle, DrawerTrigger} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTransition } from "react";
import {getStageLockStatus, updateTask} from "@/actions/actions";
import { toast } from "sonner";
import { RootState } from "@/lib/store/store";
import { useDispatch, useSelector } from "react-redux";
import { updateStatus } from "@/lib/store/features/stageStatus/stageStatusSlice";
import TaskMainContent from "@/components/TaskMainContent";

function TaskPage() {
    const params = useParams();
    const projId = params.projId as string;
    const stageId = params.stageId as string;
    const taskId = params.taskId as string;
    
    const { isSignedIn, isLoaded } = useAuth();
    const { user } = useUser();
    const router = useRouter();

    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    const stageStatus: boolean[] = useSelector(
        (state: RootState) => state.stageStatus.status,
    );
    const [taskLocked, setTaskLocked] = useState(false);
    const [stageData, stageLoading, stageError] = useDocument(
        doc(db, "projects", projId, "stages", stageId),
    );
    const dispatch = useDispatch();


    useEffect(() => {
        // check to make sure update lock status at least once
        // in case user jumps directly to this page without going through project page
        const fetchStageLockStatus = async () => {
            const status: boolean[] = await getStageLockStatus(projId);
            dispatch(updateStatus(status));
        };
        fetchStageLockStatus();
    }, [projId, dispatch]);

    useEffect(() => {
        if (stageData) {
            const stage = stageData.data();
            if (stage) {
                console.log("setting status");
                setTaskLocked(stageStatus[stage.order]);
            }
        }
    }, [stageData, stageLoading, stageError, stageStatus]);

    useEffect(() => {
        if (taskLocked) {
            toast.info(
                "This task is currently locked. Try helping others with their tasks first!",
            );
        }
    }, [taskLocked]);

    const handleSaveTaskEdits = () => {
        const title = (document.getElementById("title") as HTMLInputElement)
            .value;
        const description = (
            document.getElementById("description") as HTMLTextAreaElement
        ).value;
        const softDeadline = (
            document.getElementById("soft_deadline") as HTMLInputElement
        ).value;
        const hardDeadline = (
            document.getElementById("hard_deadline") as HTMLInputElement
        ).value;
        const points = parseInt(
            (document.getElementById("points") as HTMLInputElement)?.value ||
                "1",
        );

        const validateDate = (date: string) => {
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            return regex.test(date);
        };

        if (!validateDate(softDeadline) || !validateDate(hardDeadline)) {
            toast.error(
                "Please enter valid dates in the format of yyyy-mm-dd for both deadlines.",
            );
            return;
        }
        startTransition(async () => {
            await updateTask(
                projId,
                stageId,
                taskId,
                title,
                description,
                softDeadline,
                hardDeadline,
                points,
                0
            )
                .then(() => {
                    toast.success("Task updated successfully!");
                    setIsEditing(false);
                })
                .catch((error) => {
                    toast.error(`Failed to update task: ${error.message}`);
                });
        });
    };



    const [taskData, taskLoading, taskError] = useDocument(
        doc(db, "projects", projId, "stages", stageId, "tasks", taskId),
    );
    const task = taskData?.data() as Task;

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.replace("/");
        }
    }, [isLoaded, isSignedIn, projId, stageId, router]);

    if (!user || taskLoading) return <Skeleton className="w-full h-96" />;
    if (taskError) return <div>Error: {taskError.message}</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            {isSignedIn && (
                <div className="container mx-auto px-4 py-8 max-w-8xl">
                    {/* Header Section */}
                    <div className="mb-8">
                        <Card className="border-0 shadow-xl bg-gradient-to-r from-[#6F61EF] to-purple-600 text-white overflow-hidden">
                            <CardHeader className="pb-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-3xl font-bold mb-3">
                                            {task?.title || "Task Title"}
                                        </CardTitle>
                                        <p className="text-white/90 text-lg mb-4 leading-relaxed">
                                            {task?.description ||
                                                "No description available"}
                                        </p>

                                        {/* Task Meta Info */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                                                <User className="h-4 w-4" />
                                                <span className="font-medium">
                                                    Assigned to:
                                                </span>
                                                <span>
                                                    {task?.assignee ||
                                                        "Unassigned"}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                                                <Calendar className="h-4 w-4" />
                                                <span className="font-medium">
                                                    Soft Deadline:
                                                </span>
                                                <span>
                                                    {task?.soft_deadline ||
                                                        "None"}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                                                <Clock className="h-4 w-4" />
                                                <span className="font-medium">
                                                    Hard Deadline:
                                                </span>
                                                <span>
                                                    {task?.hard_deadline ||
                                                        "None"}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                                                <Star className="h-4 w-4" />
                                                <span className="font-medium">
                                                    Points:
                                                </span>
                                                <span>{task?.points || 10}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Drawer open={isEditing}>
                                        <DrawerTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-white hover:bg-white/20 transition-all duration-200 backdrop-blur-sm border border-white/20"
                                                onClick={() =>
                                                    setIsEditing(true)
                                                }
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
                                                Please edit the task information
                                                below
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
                                                        defaultValue={
                                                            task?.title
                                                        }
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
                                                        defaultValue={
                                                            task?.description
                                                        }
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
                                                        defaultValue={
                                                            task?.assignee ||
                                                            "Unassigned"
                                                        }
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
                                                            defaultValue={
                                                                task?.soft_deadline ||
                                                                ""
                                                            }
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
                                                            defaultValue={
                                                                task?.hard_deadline ||
                                                                ""
                                                            }
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
                                                            defaultValue={
                                                                task?.points ||
                                                                1
                                                            }
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <DrawerFooter className="flex flex-row justify-end space-x-4 pt-6">
                                                <DrawerClose asChild>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() =>
                                                            setIsEditing(false)
                                                        }
                                                    >
                                                        Cancel
                                                    </Button>
                                                </DrawerClose>
                                                <Button
                                                    onClick={
                                                        handleSaveTaskEdits
                                                    }
                                                    disabled={isPending}
                                                >
                                                    {isPending
                                                        ? "Saving..."
                                                        : "Save"}
                                                </Button>
                                            </DrawerFooter>
                                        </DrawerContent>
                                    </Drawer>
                                </div>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Main Content */}
                    <TaskMainContent
                        projId={projId}
                        stageId={stageId}
                        taskId={taskId}
                        task={task}
                        taskLocked={taskLocked}
                    />
                </div>
            )}
        </div>
    );
}

export default TaskPage;
