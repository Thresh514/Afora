"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { collection } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "@/firebase";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubmissionCard from "@/components/SubmissionCard";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Edit3, Target, CheckCircle2, Loader2 } from "lucide-react";
import CommentBox from "@/components/CommentBox";
import { Comment, Task } from "@/types/types";
import CommentView from "@/components/CommentView";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { assignTask, completeTaskWithProgress } from "@/actions/actions";
import { useRouter } from "next/navigation";

interface TaskMainContentProps {
    projId: string;
    stageId: string;
    taskId: string;
    task: Task;
    taskLocked: boolean;
}

function TaskMainContent({
    projId,
    stageId,
    taskId,
    task,
    taskLocked,
}: TaskMainContentProps) {
    const params = useParams();
    const orgId = params.id as string;
    const { user } = useUser();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [completionPercentage, setCompletionPercentage] = useState([0]);
    const [tempCompletionPercentage, setTempCompletionPercentage] = useState([
        0,
    ]);
    const [isCompleted, setIsCompleted] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isModifying, setIsModifying] = useState(false);

    const [publicComments, publicCommentsLoading, publicCommentsError] =
        useCollection(collection(db, "organizations", orgId, "projects", projId, "stages", stageId, "tasks", taskId, "public"));

    const sortedPublicComments = useMemo(() => {
        if (!publicComments) return [];
        return publicComments.docs
            .map((doc) => ({
                id: doc.id,
                ...(doc.data() as Comment),
            }))
            .sort((a, b) => (a.time?.seconds || 0) - (b.time?.seconds || 0));
    }, [publicComments]);

    // Initialize temp completion percentage
    useEffect(() => {
        setTempCompletionPercentage(completionPercentage);
    }, [completionPercentage]);

    // Initialize completion data from task
    useEffect(() => {
        if (task) {
            const taskCompletion = task.completion_percentage || 0;
            setCompletionPercentage([taskCompletion]);
            setTempCompletionPercentage([taskCompletion]);
            setIsCompleted(task.isCompleted || taskCompletion === 100);
        }
    }, [task]);

    const handleProgressChange = (value: number[]) => {
        setTempCompletionPercentage(value);
        setHasUnsavedChanges(value[0] !== completionPercentage[0]);
    };

    const handleUpdateProgress = () => {
        if (!taskLocked) {
            completeTaskWithProgress(projId, stageId, taskId, tempCompletionPercentage[0], orgId)
            setCompletionPercentage(tempCompletionPercentage);
            if (tempCompletionPercentage[0] === 100 && !isCompleted) {
                setIsCompleted(true);
                toast.success("🎉 Task marked as complete!");
            } else if (tempCompletionPercentage[0] < 100 && isCompleted) {
                setIsCompleted(false);
                toast.success("Progress updated!");
            } else if (tempCompletionPercentage[0] === 100) {
                toast.success("Task confirmed as complete!");
            } else {
                toast.success("Progress updated!");
            }
            setHasUnsavedChanges(false);
            setIsModifying(false);
        } else {
            toast.info("This task is currently locked.");
        }
    };

    const handleCancelModify = () => {
        setTempCompletionPercentage(completionPercentage);
        setHasUnsavedChanges(false);
        setIsModifying(false);
    };

    if (publicCommentsLoading) return <Skeleton className="w-full h-96" />;
    if (publicCommentsError)
        return <div>Error loading comments: {publicCommentsError.message}</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-12 mb-8">
            {/* Left Side - Combined Progress + Proof of Completion */}
            <div className="lg:col-span-2">
                <Card>
                    {/* Progress Section */}
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Target className="h-5 w-5 text-[#6F61EF]" />
                            <span>Task Progress</span>

                            <div
                                className={`ml-auto flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                                    isCompleted
                                        ? "bg-green-100 text-green-700"
                                        : completionPercentage[0] > 50
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-100 text-gray-700"
                                }`}
                            >
                                {isCompleted && (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                <span>
                                    {isCompleted ? "Completed" : "In Progress"}
                                </span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-6 bg-gradient-to-b from-[#6F61EF] to-purple-600 rounded-full"></div>
                                <h3 className="text-xl font-semibold text-gray-800">
                                    Proof of Completion
                                </h3>
                            </div>
                            <SubmissionCard
                                projId={projId}
                                stageId={stageId}
                                taskId={taskId}
                                task={task}
                                taskLocked={taskLocked}
                            />
                            <Separator className="my-6" />
                        </div>
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-medium text-gray-700">
                                Completion
                            </Label>
                            <span className="text-lg font-bold text-[#6F61EF]">
                                {completionPercentage[0]}%
                            </span>
                        </div>

                        <Progress
                            value={completionPercentage[0]}
                            className="h-3"
                        />

                        {/* Progress controls - only for assigned user */}
                        {task?.assignee ===
                        user?.primaryEmailAddress?.emailAddress ? (
                            <>
                                {!isModifying ? (
                                    /* View Mode */
                                    <div className="space-y-4">
                                        <Button
                                            onClick={() => setIsModifying(true)}
                                            disabled={taskLocked}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            <Edit3 className="mr-2 h-4 w-4" />
                                            Modify Progress
                                        </Button>

                                        {isCompleted && (
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setIsCompleted(false);
                                                    setCompletionPercentage([
                                                        90,
                                                    ]);
                                                    setTempCompletionPercentage(
                                                        [90],
                                                    );
                                                    setHasUnsavedChanges(false);
                                                    toast.info(
                                                        "Task unmarked as complete",
                                                    );
                                                }}
                                                disabled={taskLocked}
                                                className="w-full"
                                            >
                                                Restart Task
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    /* Edit Mode */
                                    <div
                                        className={`space-y-3 p-4 rounded-lg border-2 ${
                                            tempCompletionPercentage[0] === 100
                                                ? "bg-green-50 border-green-200"
                                                : "bg-blue-50 border-blue-200"
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <Label
                                                className={`text-sm font-medium ${
                                                    tempCompletionPercentage[0] ===
                                                    100
                                                        ? "text-green-700"
                                                        : "text-blue-700"
                                                }`}
                                            >
                                                {tempCompletionPercentage[0] ===
                                                100
                                                    ? "Mark as complete"
                                                    : "Modify completion (0-100%)"}
                                            </Label>
                                            {hasUnsavedChanges && (
                                                <span
                                                    className={`text-sm font-bold ${
                                                        tempCompletionPercentage[0] ===
                                                        100
                                                            ? "text-green-600"
                                                            : "text-blue-600"
                                                    }`}
                                                >
                                                    {
                                                        tempCompletionPercentage[0]
                                                    }
                                                    %
                                                </span>
                                            )}
                                        </div>

                                        <Slider
                                            value={tempCompletionPercentage}
                                            onValueChange={handleProgressChange}
                                            max={100}
                                            step={5}
                                            disabled={taskLocked}
                                            className="w-full"
                                        />

                                        <div className="flex space-x-2">
                                            <Button
                                                onClick={handleCancelModify}
                                                disabled={taskLocked}
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleUpdateProgress}
                                                disabled={
                                                    taskLocked ||
                                                    !hasUnsavedChanges
                                                }
                                                size="sm"
                                                className={`flex-1 text-white ${
                                                    tempCompletionPercentage[0] ===
                                                    100
                                                        ? "bg-green-600 hover:bg-green-700"
                                                        : "bg-blue-600 hover:bg-blue-700"
                                                }`}
                                            >
                                                {tempCompletionPercentage[0] ===
                                                100 ? (
                                                    <>
                                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                                        Mark as Complete
                                                    </>
                                                ) : (
                                                    "Update Progress"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                            ) : !task?.assignee ? (
                              // 未分配，显示"接受任务"按钮
                              <div className="">
                                <Button
                                  onClick={() => {
                                    if (!user?.primaryEmailAddress?.emailAddress) {
                                      toast.error("Please login first");
                                      return;
                                    }
                                    startTransition(async () => {
                                      try {
                                        const result = await assignTask(
                                          projId,
                                          stageId,
                                          taskId,
                                          user.primaryEmailAddress?.emailAddress || "",
                                          orgId
                                        );
                                        if (result.success) {
                                          toast.success("Task accepted!");
                                          if (router.refresh) router.refresh();
                                        } else {
                                          toast.error(result.message || "Accept task failed");
                                        }
                                      } catch {
                                        toast.error("Accept task failed");
                                      }
                                    });
                                  }}
                                  disabled={taskLocked || isPending}
                                  variant="default"
                                  className="w-full"
                                >
                                  {isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Accepting...
                                    </>
                                  ) : (
                                    "Accept Task"
                                  )}
                                </Button>
                              </div>
                        ) : (
                            <div className="">
                              <Button
                                onClick={() => setIsModifying(true)}
                                disabled={true}
                                variant="outline"
                                className="w-full cursor-not-allowed"
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                  You can not modify progress
                              </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Side - Comments (1/2 width) */}
            <div className="lg:col-span-2">
                <Card className="bg-white h-full relative flex flex-col">
                    <CardHeader className="pb-4 flex-shrink-0">
                        <CardTitle className="text-xl font-semibold text-gray-800 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <MessageSquare className="h-5 w-5 text-[#6F61EF]" />
                                <span>Comments</span>
                                <span className="text-sm font-normal text-gray-500">
                                    ({sortedPublicComments.length})
                                </span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <Separator className="mx-6 flex-shrink-0" />

                    {/* Comments List - 可滚动区域 */}
                    <div className="flex-1 px-6 pt-6 pb-2 overflow-hidden">
                        <div className="space-y-4 h-full overflow-y-auto pr-2">
                            {sortedPublicComments.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p className="text-sm">
                                        No comments yet. Be the first to
                                        comment!
                                    </p>
                                </div>
                            ) : (
                                sortedPublicComments.map((comment) => (
                                    <div
                                        key={comment.id}
                                        className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0"
                                    >
                                        <CommentView comment={comment} />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Comment Input - 固定在底部 */}
                    <div className="flex-shrink-0 border-t bg-gray-50/50 px-6 py-4">
                        <CommentBox
                            isPublic={true}
                            projId={projId}
                            stageId={stageId}
                            taskId={taskId}
                            className="shadow-none border-0 bg-white"
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default TaskMainContent;
