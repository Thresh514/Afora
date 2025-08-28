"use client";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    GeneratedTasks,
    Project,
    projQuestions,
    teamCharterQuestions,
} from "@/types/types";
import { db } from "@/firebase";
import { useDocument } from "react-firebase-hooks/firestore";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import { generateTask } from "@/ai_scripts/generateTask";
import { Loader2 } from "lucide-react";
import { updateStagesTasks } from "@/actions/actions";
import LoadingOverlay from "./LoadingOverlay";
import ErrorDisplay, { ErrorInfo, showErrorToast } from "./ErrorDisplay";

const GenerateTasksButton = ({
    orgId,
    projId,
    teamCharterResponses,
}: {
    orgId: string;
    projId: string;
    teamCharterResponses: string[];
}) => {
    const [open, setOpen] = useState(false);
    const [proj, loading, error] = useDocument(doc(db, "organizations", orgId, "projects", projId));
    const [isPending, startTransition] = useTransition();
    const [generatedOutput, setGeneratedOutput] = useState<GeneratedTasks>();
    const [taskGenerationError, setTaskGenerationError] = useState<ErrorInfo | null>(null);

    if (loading) {
        return;
    }

    if (error) {
        console.log(error.message);
        return;
    }

    if (!proj) {
        console.log("No project found");
        return;
    }

    const handleAccept = async () => {
        if (!generatedOutput) {
            return;
        }

        startTransition(async () => {
            await updateStagesTasks(projId, generatedOutput, orgId)
                .then(() => {
                    toast.success("Tasks successfully updated!");
                    setOpen(false);
                })
                .catch((error: Error) => {
                    console.error("Error:", error);
                    toast.error(error.message);
                });
        });
    };
    const handleGenerateTasks = async () => {
        const projData = proj!.data()! as Project;

        if (!projData) {
            return;
        }

        // Validate team charter responses
        if (!teamCharterResponses || teamCharterResponses.length < 5) {
            const errorInfo: ErrorInfo = {
                type: "task_generation",
                message: "Please complete all team charter questions first",
                details: "Team charter must be completed before generating tasks. Please fill out all required questions in the Team Charter section.",
                timestamp: new Date(),
                canRetry: false,
                onDismiss: () => setTaskGenerationError(null)
            };
            setTaskGenerationError(errorInfo);
            showErrorToast(errorInfo);
            return;
        }

        try {
            // Get project members data
            const memberList = projData.members;
            
            // Check if project has team members
            if (!memberList || memberList.length === 0) {
                const errorInfo: ErrorInfo = {
                    type: "task_generation",
                    message: "No team members found in this project",
                    details: "Please add team members to the project before generating tasks. You can invite members through the project settings.",
                    timestamp: new Date(),
                    canRetry: false,
                    onDismiss: () => setTaskGenerationError(null)
                };
                setTaskGenerationError(errorInfo);
                showErrorToast(errorInfo);
                return;
            }
            const userDataPromise = memberList.map(async (user) => {
                const userOrg = await getDoc(doc(db, "users", user, "org", orgId));
                const userOrgData = userOrg.data();
                const surveyResponse = userOrgData?.projOnboardingSurveyResponse
                    ? userOrgData.projOnboardingSurveyResponse.join(",")
                    : "";
                return `{${user}:${surveyResponse}}`;
            });

            const userData = await Promise.all(userDataPromise);

            // Prepare team members data for generateTask
            const teamMembers = await Promise.all(
                memberList.map(async (user) => {
                    const userOrg = await getDoc(doc(db, "users", user, "org", orgId));
                    const userOrgData = userOrg.data();
                    return {
                        email: user,
                        skills: userOrgData?.projOnboardingSurveyResponse?.[0] || "",
                        interests: userOrgData?.projOnboardingSurveyResponse?.[1] || "",
                        careerGoals: userOrgData?.projOnboardingSurveyResponse?.[3] || "",
                    };
                })
            );

            // Create mock member capabilities if team analysis is not available
            const memberCapabilities = teamMembers.map((member) => ({
                member_email: member.email,
                strengths: member.skills ? [member.skills] : [],
                skills: member.skills ? [member.skills] : [],
                role_suggestion: "Team Member",
                compatibility_score: 80,
            }));

            setTaskGenerationError(null);
            startTransition(async () => {
                try {
                    const output = await generateTask(
                        projQuestions,
                        userData,
                        teamCharterQuestions,
                        teamCharterResponses,
                        teamMembers,
                        memberCapabilities
                    );
                    
                    console.log("API Response:", output);
                    const parsed: GeneratedTasks = JSON.parse(output);
                    setGeneratedOutput(parsed);
                    setTaskGenerationError(null);
                } catch (error) {
                    console.error("Task generation error:", error);
                    
                    let errorMessage = "Failed to generate tasks";
                    let errorDetails = String(error);
                    
                    if (error instanceof Error) {
                        errorMessage = error.message;
                        errorDetails = error.stack || error.message;
                    }
                    
                    // Parse specific error types
                    if (errorMessage.includes("Missing required project information")) {
                        errorMessage = "Please complete all required project information in the team charter";
                    } else if (errorMessage.includes("team charter is empty")) {
                        errorMessage = "Team charter must be completed before generating tasks";
                    } else if (errorMessage.includes("Team members information is required")) {
                        errorMessage = "Please ensure all team members have completed their surveys";
                    } else if (errorMessage.includes("API")) {
                        errorMessage = "AI service is temporarily unavailable. Please try again later.";
                    }
                    
                    const errorInfo: ErrorInfo = {
                        type: "task_generation",
                        message: errorMessage,
                        details: errorDetails,
                        timestamp: new Date(),
                        canRetry: true,
                        onRetry: handleGenerateTasks,
                        onDismiss: () => setTaskGenerationError(null)
                    };
                    
                    setTaskGenerationError(errorInfo);
                    showErrorToast(errorInfo);
                }
            });
        } catch (error) {
            console.error("Error preparing team data:", error);
            
            const errorInfo: ErrorInfo = {
                type: "task_generation",
                message: "Failed to prepare team data for task generation",
                details: error instanceof Error ? error.stack || error.message : String(error),
                timestamp: new Date(),
                canRetry: true,
                onRetry: handleGenerateTasks,
                onDismiss: () => setTaskGenerationError(null)
            };
            
            setTaskGenerationError(errorInfo);
            showErrorToast(errorInfo);
        }
    };
    return (
        <>
            <LoadingOverlay 
                isVisible={isPending && !generatedOutput}
                message="Generating Project Roadmap..."
                description="Analyzing team structure and project requirements, please wait..."
            />
            <Dialog open={open} onOpenChange={(newOpen) => {
                setOpen(newOpen);
                if (!newOpen) {
                    // 当对话框关闭时，清除错误信息和生成输出
                    setTaskGenerationError(null);
                    setGeneratedOutput(undefined);
                }
            }}>
                <DialogTrigger asChild>
                    <Button disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            "Generate Tasks"
                        )}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Generate Tasks</DialogTitle>
                        {generatedOutput ? (
                            <DialogDescription>
                                Confirm the tasks structure generated.
                            </DialogDescription>
                        ) : (
                            <DialogDescription>
                                Generate the stages and tasks roadmap in one
                                click!
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    
                    {/* Task Generation Error Display */}
                    {taskGenerationError && (
                        <ErrorDisplay 
                            error={taskGenerationError} 
                            className="mb-4"
                        />
                    )}

                    {generatedOutput && (
                        <Accordion type="single" collapsible className="w-full">
                            {generatedOutput.stages.map((stage, stageIndex) => (
                                <AccordionItem
                                    key={stageIndex}
                                    value={`stage-${stageIndex}`}
                                >
                                    <AccordionTrigger>{`Stage ${stageIndex + 1}: ${stage.stage_name}`}</AccordionTrigger>
                                    <AccordionContent>
                                        <Accordion
                                            type="single"
                                            collapsible
                                            className="w-full"
                                        >
                                            {stage.tasks.map(
                                                (task, taskIndex) => (
                                                    <AccordionItem
                                                        key={taskIndex}
                                                        value={`task-${taskIndex}`}
                                                    >
                                                        <AccordionTrigger>{`Task ${taskIndex + 1}: ${task.task_name}`}</AccordionTrigger>
                                                        <AccordionContent>
                                                            <div className="space-y-3">
                        
                                                                
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    <p className="text-sm">
                                                                        <strong className="text-blue-600">
                                                                            Soft Deadline:
                                                                        </strong>{" "}
                                                                        <span className="font-medium">
                                                                            {task.soft_deadline}
                                                                        </span>
                                                                    </p>
                                                                    <p className="text-sm">
                                                                        <strong className="text-red-600">
                                                                            Hard Deadline:
                                                                        </strong>{" "}
                                                                        <span className="font-medium">
                                                                            {task.hard_deadline}
                                                                        </span>
                                                                    </p>
                                                                </div>

                                                                
                                                                    <p className="text-sm mb-2">
                                                                        <span className="text-gray-600">
                                                                            Assignee: {task.assigned_member}
                                                                        </span>
                                                                    </p>
                                                                    
                                                                
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ),
                                            )}
                                        </Accordion>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}

                    <DialogFooter>
                        {generatedOutput ? (
                            <>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setGeneratedOutput(undefined);
                                        setTaskGenerationError(null);
                                        setOpen(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleAccept}
                                    disabled={isPending}
                                >
                                    {isPending ? "Saving..." : "Accept"}
                                    {isPending && (
                                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="submit"
                                disabled={isPending}
                                onClick={handleGenerateTasks}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating Roadmap...
                                    </>
                                ) : (
                                    "Generate"
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GenerateTasksButton;
