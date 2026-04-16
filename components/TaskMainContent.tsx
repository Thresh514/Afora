"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { collection } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "@/firebase";
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
import { assignTask, completeTaskWithProgress, restartTaskProgress } from "@/actions/actions";
import { useRouter } from "next/navigation";
import { useAnimations } from "@/contexts/AnimationContext";

interface TaskMainContentProps {
  projId: string;
  stageId: string;
  taskId: string;
  task: Task;
  taskLocked: boolean;
}

function TaskMainContent({ projId, stageId, taskId, task, taskLocked }: TaskMainContentProps) {
  const { user } = useUser();
  const router = useRouter();
  const { triggerRocket, triggerConfetti } = useAnimations();
  const [isPending, startTransition] = useTransition();

  const [completionPercentage, setCompletionPercentage] = useState([0]);
  const [tempCompletionPercentage, setTempCompletionPercentage] = useState([0]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const [publicComments, publicCommentsLoading, publicCommentsError] = useCollection(
    collection(db, "projects", projId, "stages", stageId, "tasks", taskId, "public")
  );

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

  const handleUpdateProgress = async () => {
    if (!taskLocked) {
      try {
        const result = await completeTaskWithProgress(
          projId,
          stageId,
          taskId,
          tempCompletionPercentage[0]
        );
        setCompletionPercentage(tempCompletionPercentage);
        if (tempCompletionPercentage[0] === 100 && !isCompleted && result?.success) {
          setIsCompleted(true);
          triggerRocket();
          toast.success("🎉 Task marked as complete!");
        } else if (tempCompletionPercentage[0] === 100 && !isCompleted && !result?.success) {
          toast.error("Failed to update progress");
        } else if (tempCompletionPercentage[0] === 100 && isCompleted) {
          toast.success("Task confirmed as complete!");
        } else if (tempCompletionPercentage[0] < 100 && isCompleted) {
          setIsCompleted(false);
          toast.success("Progress updated!");
        } else {
          toast.success("Progress updated!");
        }
      } catch {
        toast.error("Failed to update progress");
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
  if (publicCommentsError) return <div>Error loading comments: {publicCommentsError.message}</div>;

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
                className={`ml-auto flex items-center space-x-2 rounded-full px-3 py-1 text-sm font-medium ${
                  isCompleted
                    ? "bg-green-500/15 text-green-300"
                    : completionPercentage[0] > 50
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-foreground"
                }`}
              >
                {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                <span>{isCompleted ? "Completed" : "In Progress"}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-6 bg-gradient-to-b from-[#6F61EF] to-purple-600 rounded-full"></div>
                <h3 className="text-xl font-semibold text-foreground">Proof of Completion</h3>
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
              <Label className="text-sm font-medium text-foreground">Completion</Label>
              <span className="text-lg font-bold text-[#6F61EF]">{completionPercentage[0]}%</span>
            </div>

            <Progress value={completionPercentage[0]} className="h-3" />

            {/* Progress controls - only for assigned user */}
            {task?.assignee === user?.primaryEmailAddress?.emailAddress ? (
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
                          if (taskLocked) return;
                          setIsRestarting(true);
                          void (async () => {
                            try {
                              const result = await restartTaskProgress(projId, stageId, taskId);
                              if (result.success) {
                                setIsCompleted(false);
                                setCompletionPercentage([0]);
                                setTempCompletionPercentage([0]);
                                setHasUnsavedChanges(false);
                                toast.success("Task restarted — progress reset to 0%.");
                                router.refresh();
                              } else {
                                toast.error(result.message || "Failed to restart task");
                              }
                            } catch {
                              toast.error("Failed to restart task");
                            } finally {
                              setIsRestarting(false);
                            }
                          })();
                        }}
                        disabled={taskLocked || isRestarting}
                        className="w-full"
                      >
                        {isRestarting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Restarting…
                          </>
                        ) : (
                          "Restart Task"
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  /* Edit Mode */
                  <div
                    className={`space-y-3 rounded-lg border-2 p-4 ${
                      tempCompletionPercentage[0] === 100
                        ? "border-green-300/40 bg-green-500/12"
                        : "border-primary/35 bg-primary/12"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <Label
                        className={`text-sm font-medium ${
                          tempCompletionPercentage[0] === 100 ? "text-green-300" : "text-primary"
                        }`}
                      >
                        {tempCompletionPercentage[0] === 100
                          ? "Mark as complete"
                          : "Modify completion (0-100%)"}
                      </Label>
                      {hasUnsavedChanges && (
                        <span
                          className={`text-sm font-bold ${
                            tempCompletionPercentage[0] === 100 ? "text-green-300" : "text-primary"
                          }`}
                        >
                          {tempCompletionPercentage[0]}%
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
                        disabled={taskLocked || !hasUnsavedChanges}
                        size="sm"
                        className={`flex-1 ${
                          tempCompletionPercentage[0] === 100
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {tempCompletionPercentage[0] === 100 ? (
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
                          user.primaryEmailAddress?.emailAddress || ""
                        );
                        if (result.success) {
                          triggerConfetti();
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
        <Card className="relative flex h-full flex-col bg-card">
          <CardHeader className="pb-4 flex-shrink-0">
            <CardTitle className="text-xl font-semibold text-foreground flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-[#6F61EF]" />
                <span>Comments</span>
                <span className="text-sm font-normal text-muted-foreground">
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
                <div className="py-8 text-center text-muted-foreground">
                  <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-sm">No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                sortedPublicComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border-b border-border/70 last:border-b-0 pb-4 last:pb-0"
                  >
                    <CommentView comment={comment} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comment Input - 固定在底部 */}
          <div className="flex-shrink-0 border-t border-border bg-muted/40 px-6 py-4">
            <CommentBox
              isPublic={true}
              projId={projId}
              stageId={stageId}
              taskId={taskId}
              className="border-0 bg-transparent shadow-none"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default TaskMainContent;
