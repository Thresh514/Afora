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
    TeamCompatibilityAnalysis,
} from "@/types/types";
import { db } from "@/firebase";
import { useDocument } from "react-firebase-hooks/firestore";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import { generateTask } from "@/ai_scripts/generateTask";
import { Loader2 } from "lucide-react";
import { updateStagesTasks } from "@/actions/actions";

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
    const [proj, loading, error] = useDocument(doc(db, "projects", projId));
    const [isPending, startTransition] = useTransition();
    const [generatedOutput, setGeneratedOutput] = useState<GeneratedTasks>();
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
            await updateStagesTasks(projId, generatedOutput)
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
            toast.error("Please complete all team charter questions first");
            return;
        }

        try {
            // Get project members data
            const memberList = projData.members;
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

            startTransition(async () =>
                generateTask(
                    projQuestions,
                    userData,
                    teamCharterQuestions,
                    teamCharterResponses,
                    teamMembers,
                    memberCapabilities
                )
                    .then((output: string) => {
                        console.log("API Response:", output);
                        const parsed: GeneratedTasks = JSON.parse(output);
                        setGeneratedOutput(parsed);
                    })
                    .catch((error: Error) => {
                        console.error("Error:", error);
                        toast.error(error.message);
                    }),
            );
        } catch (error) {
            console.error("Error preparing team data:", error);
            toast.error("Failed to prepare team data for task generation");
        }
    };
    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button>Generate Tasks</Button>
                </DialogTrigger>
                <DialogContent>
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
                                {isPending ? "Generating..." : "Generate"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GenerateTasksButton;
