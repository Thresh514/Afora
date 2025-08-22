"use client";

import { db } from "@/firebase";
import { useAuth, useUser } from "@clerk/nextjs";
import { collection, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, useCallback } from "react";
import { useCollection, useDocument } from "react-firebase-hooks/firestore";

import { Project, Stage, teamCharterQuestions, TeamCompatibilityAnalysis } from "@/types/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CircleCheck, PencilLine, Save, Trophy, Target, BarChart3, Loader2, LockKeyhole, NotepadText, Trash2, UsersIcon, EditIcon, Plus } from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { toast } from "sonner";
import GenerateTasksButton from "@/components/GenerateTasksButton";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-label";
import { setTeamCharter, updateProjectTitle, updateStages, getProjectStats, getTeamAnalysis } from "@/actions/actions";
import { HoverCard, HoverCardTrigger } from "@radix-ui/react-hover-card";
import { HoverCardContent } from "@/components/ui/hover-card";
import { ReorderIcon } from "@/components/ReorderIcon";
import { useDispatch } from "react-redux";
import { updateStatus } from "@/lib/store/features/stageStatus/stageStatusSlice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import ErrorDisplay, { ErrorInfo, showErrorToast } from "./ErrorDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TeamScoreCard from "@/components/TeamScoreCard";
import ProjOnboarding from "./ProjOnboarding";

interface ProjectStats {
    totalTasks: number;
    completedTasks: number;
    assignedTasks: number;
    availableTasks: number;
    overdueTasks: number;
    completionRate: number;
    stageCount?: number;
}

const ProjectPage = ({id, projId}: {id: string, projId: string}) => {
    const { isSignedIn, isLoaded } = useAuth();
    const { user } = useUser();
    const [responses, setResponses] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isTeamCharterOpen, setIsTeamCharterOpen] = useState(false);
    const [charterSaveError, setCharterSaveError] = useState<ErrorInfo | null>(null);
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    const [reorderedStages, setReorderedStages] = useState<Stage[]>([]);
    const dragControl = useDragControls();
    const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState<{analysis: TeamCompatibilityAnalysis, timestamp: Date} | null>(null);

    const [projData, projLoading, projError] = useDocument(
        doc(db, "projects", projId),
    );
    const proj = projData?.data() as Project;
    const [projTitle, setProjTitle] = useState(proj?.title || "");

    // Define the 'newStageTitle' state
    const [newStageTitle, setNewStageTitle] = useState("");

    // check if user is team member (admin or regular member can create stages)
    useEffect(() => {
        if (user?.primaryEmailAddress?.emailAddress && projData) {
            const userEmail = user.primaryEmailAddress.emailAddress;
            const admins = projData.data()?.admins || [];
            const members = projData.data()?.members || [];
            const isTeamMember = admins.includes(userEmail) || members.includes(userEmail);
            setIsAdmin(isTeamMember); // Use isAdmin variable to represent team member permissions
        }
    }, [user, projData]);

    useEffect(() => {
        // Redirect to login if the user is not authenticated
        if (isLoaded && !isSignedIn) {
            router.replace("/"); // Redirect to the login page
        }
    }, [isLoaded, isSignedIn, router]);

    // load project stats
    const loadProjectStats = useCallback(async () => {
        try {
            // load project stats
            const statsResult = await getProjectStats(projId);
            if (statsResult.success && statsResult.data) {
                setProjectStats(statsResult.data);
            }
        } catch (error) {
            console.error("Error loading project stats:", error);
        }
    }, [projId]);

    // load data
    useEffect(() => {
        if (projId) {
            loadProjectStats();
        }
    }, [projId, loadProjectStats]);

    // load team analysis report
    useEffect(() => {
        const loadTeamAnalysis = async () => {
            if (projId) {
                try {
                    setAnalysisLoading(true);
                    const projectDoc = await getDoc(doc(db, "projects", projId));
                    const projectData = projectDoc.data();
                    
                    if (projectData?.lastTeamAnalysis?.filePath) {
                        // if there is existing analysis, load it
                        const result = await getTeamAnalysis(projId);
                        if (result.success && result.data) {
                            setAnalysisData({
                                analysis: result.data.analysis,
                                timestamp: new Date(result.data.timestamp)
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error checking team analysis:", error);
                } finally {
                    setAnalysisLoading(false);
                }
            }
        };
        loadTeamAnalysis();
    }, [projId]);

    useEffect(() => {
        if (!isEditing) {
            setProjTitle(proj?.title || "");
        }
    }, [proj, isEditing]);

    const [stagesData, stagesLoading, stagesError] = useCollection(
        collection(db, "projects", projId, "stages"),
    );
    const [teamCharterData, loading, error] = useDocument(
        doc(db, "projects", projId),
    );

    // 当teamCharterData加载完成后，设置responses的初始值
    useEffect(() => {
        if (teamCharterData && !loading && !error) {
            const savedResponses = teamCharterData.data()?.teamCharterResponse || [];
            if (savedResponses.length > 0) {
                setResponses(savedResponses);
            }
        }
    }, [teamCharterData, loading, error]);

    const stages: Stage[] = useMemo(() => {
        return (
            stagesData?.docs
                .map((doc) => ({
                    ...(doc.data() as Stage),
                }))
                .sort((a, b) => a.order - b.order) || []
        );
    }, [stagesData]);

    // Update reorderedStages when stages change
    useEffect(() => {
        if (!isEditing) {
            setReorderedStages(stages.map((stage) => ({ ...stage })));
        }
    }, [stages, isEditing]);

    // 0 = locked, 1 = in progress, 2 = completed
    const [stageStatus, setStageStatus] = useState<number[]>([]);
    const dispatch = useDispatch();
    useEffect(() => {
        const newStageStatus = new Array(stages.length).fill(0);
        stages.forEach((stage, i) => {
            newStageStatus[i] =
                i > 0 && newStageStatus[i - 1] !== 2
                    ? 0
                    : stage.tasksCompleted == stage.totalTasks
                    ? 2
                    : 1;
        });
        dispatch(updateStatus(newStageStatus.map((status) => status === 0)));
        setStageStatus(newStageStatus);
    }, [stages, dispatch]);

    
        if (stagesLoading || projLoading) {
            return <Skeleton className="w-full h-96" />;
        }
        if (stagesError) {
            return <div>Error: {stagesError.message}</div>;
        }
        if (projError) {
            return <div>Error: {projError.message}</div>;
        }

    const handleTeamCharterSave = () => {
        setCharterSaveError(null);
        startTransition(async () => {
            try {
                if (!teamCharterData || loading || error) {
                    const errorInfo: ErrorInfo = {
                        type: "team_charter",
                        message: "Unable to load team charter data. Please refresh the page and try again.",
                        canRetry: true,
                        onRetry: handleTeamCharterSave,
                        onDismiss: () => setCharterSaveError(null)
                    };
                    setCharterSaveError(errorInfo);
                    showErrorToast(errorInfo);
                    return;
                }

                // Validate responses
                const emptyResponses = responses.filter((response) => 
                    !response || response.trim().length === 0
                );
                
                if (emptyResponses.length > 0) {
                    const errorInfo: ErrorInfo = {
                        type: "team_charter",
                        message: `Please complete all ${teamCharterQuestions.length} questions before saving. ${emptyResponses.length} questions are still empty.`,
                        details: `Missing responses for questions: ${emptyResponses.map((_, index) => index + 1).join(", ")}`,
                        canRetry: false,
                        onDismiss: () => setCharterSaveError(null)
                    };
                    setCharterSaveError(errorInfo);
                    showErrorToast(errorInfo);
                    return;
                }

                const result = await setTeamCharter(projId, responses);
                
                if (result.success) {
                    toast.success("Team Charter saved successfully!");
                    setIsOpen(false);
                    setCharterSaveError(null);
                } else {
                    const errorInfo: ErrorInfo = {
                        type: "team_charter",
                        message: result.message || "Failed to save team charter",
                        timestamp: new Date(),
                        canRetry: true,
                        onRetry: handleTeamCharterSave,
                        onDismiss: () => setCharterSaveError(null)
                    };
                    setCharterSaveError(errorInfo);
                    showErrorToast(errorInfo);
                }
            } catch (e) {
                console.error("Team charter save error:", e);
                
                let errorMessage = "Failed to save Team Charter";
                let errorDetails = String(e);
                
                if (e instanceof Error) {
                    errorMessage = e.message;
                    errorDetails = e.stack || e.message;
                }
                
                if (errorMessage.includes("Unauthorized")) {
                    errorMessage = "You don't have permission to save this team charter. Please contact an admin.";
                } else if (errorMessage.includes("network")) {
                    errorMessage = "Network error. Please check your connection and try again.";
                }
                
                const errorInfo: ErrorInfo = {
                    type: "team_charter",
                    message: errorMessage,
                    details: errorDetails,
                    timestamp: new Date(),
                    canRetry: true,
                    onRetry: handleTeamCharterSave,
                    onDismiss: () => setCharterSaveError(null)
                };
                
                setCharterSaveError(errorInfo);
                showErrorToast(errorInfo);
            }
        });
    };

    const handleEditSave = () => {
        try {
            const stageUpdates: Stage[] = [];
            reorderedStages.forEach((stage, _index) => {
                const originalStage = stages.find((s) => s.id === stage.id);
                // id = -1 for adding a new stage
                // push change for new stages
                if (!originalStage) {
                    stageUpdates.push({ ...stage, order: _index });
                } else if (
                    stage.order !== _index ||
                    (originalStage && stage.title !== originalStage.title)
                ) {
                    // only commit changes on order change and renaming
                    stageUpdates.push({
                        ...stage,
                        order: _index,
                        title: stage.title,
                    });
                }
            });
            const stagesToDelete = stages.filter(
                (stage) =>
                    !reorderedStages.some(
                        (reorderedStage) => reorderedStage.id === stage.id,
                    ),
            );
            const stagesToDeleteIds = stagesToDelete.map((stage) => stage.id);
            updateStages(projId, stageUpdates, stagesToDeleteIds);

            if (proj && projTitle !== proj.title) {
                updateProjectTitle(projId, projTitle);
            }
            toast.success("Roadmap & Stages updated successfully!");
        } catch (error) {
            console.error("Error updating Roadmap & Stages:", error);
            toast.error("Failed to update Roadmap & Stages");
        }
    };

    // Get project members (including both members and admins)
    const projectMembers = [
        ...(proj?.members || []),
        ...(proj?.admins || [])
    ];

    return (
        <div className="flex flex-col w-full h-full bg-gray-100">
            {/* ProjOnboarding Survey Check */}
            <ProjOnboarding 
                orgId={id} 
                projId={projId}
                onDismiss={() => {
                    // Survey dismissed, continue with normal page
                }}
            />
            
            {/* Header Section - similar to organization page background image style */}
            <div className="relative">
                <div
                    className="bg-gradient-to-r from-[#6F61EF] to-purple-600 h-64 flex items-center justify-center bg-cover bg-center"
                    style={{
                        backgroundImage: `linear-gradient(135deg, #6F61EF 0%, #8B7ED8 50%, #B794F6 100%)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                >
                    {/* semi-transparent card - similar to organization page design */}
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
                            {/* project information section */}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={projTitle}
                                                onChange={(e) =>
                                                    setProjTitle(e.target.value)
                                                }
                                                className="bg-transparent border-b-2 border-white text-white placeholder-gray-200 focus:outline-none focus:border-gray-200"
                                                style={{
                                                    width: `${Math.max(projTitle.length, 10)}ch`,
                                                }}
                                            />
                                        ) : (
                                            projTitle
                                        )}
                                    </h1>
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={`/org/${id}/proj/${projId}/leaderboard`}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-white hover:bg-white/20 transition-colors"
                                            >
                                                <Trophy className="h-4 w-4 mr-1" />
                                                Leaderboard
                                            </Button>
                                        </Link>
                                        <Button
                                            variant={
                                                isEditing
                                                    ? "secondary"
                                                    : "ghost"
                                            }
                                            size="sm"
                                            className={
                                                isEditing
                                                    ? "bg-white text-[#6F61EF] hover:bg-gray-100"
                                                    : "text-white hover:bg-white/20 transition-colors"
                                            }
                                            onClick={() => {
                                                if (isEditing) {
                                                    handleEditSave();
                                                }
                                                setIsEditing(!isEditing);
                                            }}
                                        >
                                            {isEditing ? "Save" : "Edit"}
                                            {isEditing ? (
                                                <Save className="ml-1 h-4 w-4" />
                                            ) : (
                                                <PencilLine className="ml-1 h-4 w-4" />
                                            )}
                                        </Button>
                                        {isEditing && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-white hover:bg-white/20 transition-colors"
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setReorderedStages(
                                                        stages.map((stage) => ({
                                                            ...stage,
                                                        })),
                                                    );
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl md:text-2xl font-semibold text-white">
                                        Team Overview
                                    </h2>
                                    {stages && stages.length > 0 && (
                                        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-3 inline-flex items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-white text-sm font-medium">
                                                    Progress:
                                                </span>
                                                <div className="bg-white bg-opacity-30 rounded-full h-2 w-48 overflow-hidden">
                                                    <div
                                                        className="h-full bg-white rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${(stages.reduce((acc, stage) => acc + stage.tasksCompleted, 0) / stages.reduce((acc, stage) => acc + stage.totalTasks, 0)) * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="font-bold text-white text-lg min-w-[3rem]">
                                                    {Math.round((stages.reduce((acc, stage) => acc + stage.tasksCompleted, 0) / stages.reduce((acc, stage) => acc + stage.totalTasks, 0)) * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section with Tabs */}
            <div className="flex-1 p-6">
                <Tabs defaultValue="roadmap" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger
                            value="roadmap"
                            className="flex items-center gap-2"
                        >
                            <Target className="h-4 w-4" />
                            Team Roadmap
                        </TabsTrigger>
                        <TabsTrigger
                            value="team-analytics"
                            className="flex items-center gap-2"
                        >
                            <BarChart3 className="h-4 w-4" />
                            Team Informations
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="roadmap" className="space-y-4">
                        {/* project stats card */}
                        {projectStats && (
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-blue-600" />
                                        Team Statistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-6 gap-4">
                                        <div className="text-center flex flex-row items-center gap-2">
                                            
                                            <div className="text-sm text-gray-500">
                                                Total Tasks:
                                            </div>
                                            <div className="text-xl font-bold text-blue-600">
                                                {projectStats.totalTasks}
                                            </div>
                                        </div>
                                        <div className="text-center flex flex-row items-center gap-2">
                                            <div className="text-sm text-gray-500">
                                                Completed:
                                            </div>
                                            <div className="text-xl font-bold text-green-600">
                                                {projectStats.completedTasks}
                                            </div>
                                            
                                        </div>
                                        <div className="text-center flex flex-row items-center gap-2">
                                            <div className="text-sm text-gray-500">
                                                Assigned:
                                            </div>
                                            <div className="text-xl font-bold text-yellow-600">
                                                {projectStats.assignedTasks}
                                            </div>
                                        </div>
                                        <div className="text-center flex flex-row items-center gap-2">
                                            <div className="text-sm text-gray-500">
                                                Available:
                                            </div>
                                            <div className="text-xl font-bold text-gray-600">
                                                {projectStats.availableTasks}
                                            </div>
                                        </div>
                                        <div className="text-center flex flex-row items-center gap-2">
                                            <div className="text-sm text-gray-500">
                                                Overdue:
                                            </div>
                                            <div className="text-xl font-bold text-red-600">
                                                {projectStats.overdueTasks}
                                            </div>
                                        </div>
                                        <div className="text-center flex flex-row items-center gap-2">
                                            <div className="text-sm text-gray-500">
                                                Completion Rate:
                                            </div>
                                            <div className="text-xl font-bold text-purple-600">
                                                {projectStats.completionRate.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-6">
                            {stages.length === 0 ? (
                                <div className="bg-white rounded-lg shadow-sm border p-8 text-center space-y-6">
                                    <div className="text-gray-500">
                                        <h3 className="text-lg font-medium mb-2">
                                            No stages yet
                                        </h3>
                                        <p>
                                                {isAdmin ? (
                                                    "Try generating stages and tasks to start your team."
                                                ) : (
                                                    "Please wait for the admin to create team stages."
                                                )}
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex justify-center gap-4">
                                            <GenerateTasksButton
                                                orgId={id}
                                                projId={projId}
                                                teamCharterResponses={
                                                    teamCharterData?.data()?.teamCharterResponse || []
                                                }
                                            />
                                            <AlertDialog
                                                open={isTeamCharterOpen}
                                                onOpenChange={setIsTeamCharterOpen}
                                            >
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        onClick={() => setIsTeamCharterOpen(true)}
                                                        variant="outline"
                                                    >
                                                        <EditIcon className="mr-2 h-4 w-4" /> Team Charter
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="w-full max-w-4xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Team Charter</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Fill out this charter to kick off your team! 🚀
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    
                                                    {/* Team Charter Error Display */}
                                                    {charterSaveError && (
                                                        <ErrorDisplay 
                                                            error={charterSaveError} 
                                                            className="mb-4"
                                                        />
                                                    )}
                                                    
                                                    {/* TEST BUTTON - Remove after testing */}
                                                    {process.env.NODE_ENV === "development" && (
                                                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                            <p className="text-xs text-yellow-700 mb-2 font-medium">🧪 Dev Test:</p>
                                                            <button
                                                                onClick={() => {
                                                                    const errorInfo: ErrorInfo = {
                                                                        type: "team_charter",
                                                                        message: "Test Team Charter Error - Missing required fields",
                                                                        details: "Questions 1, 3, and 7 are still empty. Please complete all questions.",
                                                                        timestamp: new Date(),
                                                                        canRetry: true,
                                                                        onRetry: () => setCharterSaveError(null),
                                                                        onDismiss: () => setCharterSaveError(null)
                                                                    };
                                                                    setCharterSaveError(errorInfo);
                                                                }}
                                                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                            >
                                                                Test Team Charter Error
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="overflow-y-auto max-h-96">
                                                        <form className="space-y-8 p-2">
                                                            {/* Group questions by section */}
                                                            <div className="space-y-6">
                                                                {/* Project Basic Information */}
                                                                <div className="space-y-4">
                                                                    {teamCharterQuestions.map((question, index) => (
                                                                        <div key={index} className="space-y-2">
                                                                            <Label
                                                                                htmlFor={`question-${index}`}
                                                                                className="text-sm font-medium text-gray-700"
                                                                            >
                                                                                {question}
                                                                            </Label>
                                                                            <Textarea
                                                                                id={`question-${index}`}
                                                                                name={`question-${index}`}
                                                                                value={responses[index] || ""}
                                                                                onChange={(e) => {
                                                                                    const newResponses = [...responses];
                                                                                    newResponses[index] = e.target.value;
                                                                                    setResponses(newResponses);
                                                                                }}
                                                                                placeholder="Enter your response here..."
                                                                                className="min-h-[100px]"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </form>
                                                    </div>
                                                    <AlertDialogFooter>
                                                        <Button
                                                            onClick={() =>
                                                                setIsTeamCharterOpen(false)
                                                            }
                                                            variant="outline"
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={
                                                                handleTeamCharterSave
                                                            }
                                                            disabled={isPending}
                                                        >
                                                            {isPending ? (
                                                                <>
                                                                    <Loader2 className="animate-spin mr-2 h-4 w-4" />{" "}
                                                                    Loading
                                                                </>
                                                            ) : (
                                                                "Save"
                                                            )}
                                                        </Button>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {isEditing ? (
                                        <div className="bg-white rounded-lg shadow-sm border p-6">
                                            <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                                Edit Stages
                                            </h3>
                                            <Reorder.Group
                                                axis="y"
                                                values={reorderedStages}
                                                onReorder={setReorderedStages}
                                                className="w-full space-y-3"
                                            >
                                                {reorderedStages
                                                    .filter(
                                                        (stage) =>
                                                            stage.id !== "-2",
                                                    )
                                                    .map((stage, index) => (
                                                        <Reorder.Item
                                                            key={stage.id}
                                                            value={stage}
                                                            className="w-full touch-none"
                                                        >
                                                            <div className="w-full flex items-center gap-4">
                                                                <ReorderIcon
                                                                    dragControls={
                                                                        dragControl
                                                                    }
                                                                />
                                                                <div
                                                                    className={`w-full block flex-1 p-4 bg-gray-50 rounded-lg border hover:shadow-md transition-all duration-300 cursor-grab`}
                                                                >
                                                                    <div className="flex w-full justify-between items-center">
                                                                        <span className="w-full text-lg font-semibold">
                                                                            {isEditing ? (
                                                                                <div className="flex flex-row items-center">
                                                                                    <span>{index + 1}. </span>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={stage.title}
                                                                                        onChange={(e) => {
                                                                                            const newStages = [...reorderedStages];
                                                                                            newStages[index].title = e.target.value;
                                                                                            setReorderedStages(newStages);
                                                                                        }}
                                                                                        className="w-full focus:outline-none ml-2 underline"
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                stage.title
                                                                            )}
                                                                        </span>
                                                                        <span className="flex items-center text-sm text-gray-500">
                                                                            {stageStatus[
                                                                                index
                                                                            ] ===
                                                                                0 && (
                                                                                <HoverCard>
                                                                                    <HoverCardTrigger>
                                                                                        <LockKeyhole className="mr-4" />
                                                                                    </HoverCardTrigger>
                                                                                    <HoverCardContent className="p-2 bg-gray-800 text-white rounded-md shadow-lg">
                                                                                        <p className="text-sm">
                                                                                            {isAdmin ? "此阶段已锁定。帮助团队成员完成他们的任务！" : "此阶段已锁定。请等待团队成员解锁。"}
                                                                                        </p>
                                                                                    </HoverCardContent>
                                                                                </HoverCard>
                                                                            )}
                                                                            {stageStatus[
                                                                                index
                                                                            ] ===
                                                                                1 && (
                                                                                <HoverCard>
                                                                                    <HoverCardTrigger>
                                                                                        <NotepadText className="mr-4 text-yellow-500" />
                                                                                    </HoverCardTrigger>
                                                                                    <HoverCardContent className="p-2 bg-gray-800 text-white rounded-md shadow-lg">
                                                                                        <p className="text-sm">
                                                                                            This stage is in progress. Keep going!
                                                                                        </p>
                                                                                    </HoverCardContent>
                                                                                </HoverCard>
                                                                            )}
                                                                            {stageStatus[
                                                                                index
                                                                            ] ===
                                                                                2 && (
                                                                                <HoverCard>
                                                                                    <HoverCardTrigger>
                                                                                        <CircleCheck className="mr-4 text-green-500" />
                                                                                    </HoverCardTrigger>
                                                                                    <HoverCardContent className="p-2 bg-gray-800 text-white rounded-md shadow-lg">
                                                                                        <p className="text-sm">
                                                                                            This stage is completed. Great job!
                                                                                        </p>
                                                                                    </HoverCardContent>
                                                                                </HoverCard>
                                                                            )}
                                                                            {`${stage.tasksCompleted} / ${stage.totalTasks} tasks completed`}
                                                                        </span>
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger
                                                                                asChild
                                                                            >
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    className="text-red-500"
                                                                                >
                                                                                    <Trash2 />
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>
                                                                                        Confirm
                                                                                        Deletion
                                                                                    </AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        Are you sure you want to delete this stage? All information under this stage will be deleted forever!
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <Button
                                                                                        variant="secondary"
                                                                                        onClick={() => setIsOpen(false)}
                                                                                    >
                                                                                        Cancel
                                                                                    </Button>
                                                                                    <Button
                                                                                        variant="destructive"
                                                                                        onClick={() => {
                                                                                            const newStages =
                                                                                                reorderedStages.filter(
                                                                                                    (_, i) => i !== index,
                                                                                                );
                                                                                            setReorderedStages(
                                                                                                newStages,
                                                                                            );
                                                                                            setIsOpen(
                                                                                                false,
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        Delete
                                                                                    </Button>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Reorder.Item>
                                                    ))}
                                            </Reorder.Group>
                                            <div className="w-full flex items-center mt-4 gap-4">
                                                <ReorderIcon
                                                    dragControls={dragControl}
                                                />
                                                <div className="w-full block flex-1 p-4 bg-gray-200 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-300 cursor-pointer">
                                                    <div className="flex w-full justify-between items-center">
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full flex justify-between items-center"
                                                            onClick={() => {
                                                                const newStage: Stage =
                                                                    {
                                                                        id: "-1",
                                                                        title: "New Stage",
                                                                        order: reorderedStages.length,
                                                                        tasksCompleted: 0,
                                                                        totalTasks: 0,
                                                                    };
                                                                setReorderedStages(
                                                                    [
                                                                        ...reorderedStages,
                                                                        newStage,
                                                                    ],
                                                                );
                                                            }}
                                                        >
                                                            <span className="w-full text-lg font-semibold text-gray-500">
                                                                + New Stage
                                                            </span>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
                                            <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                                Team Stages
                                            </h3>
                                            {stages.map((stage, index) => (
                                                <HoverCard key={stage.id}>
                                                    <HoverCardTrigger asChild>
                                                        <Link
                                                            href={`/org/${id}/proj/${projId}/stage/${stage.id}`}
                                                            className={`block p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 ${stageStatus[index] === 0 && !isAdmin ? 'pointer-events-none opacity-50' : ''}`}
                                                        >
                                                            <div className="flex w-full justify-between items-center">
                                                                <span className="text-lg font-semibold">
                                                                    {index + 1}. {stage.title}
                                                                </span>
                                                                <span className="flex items-center text-sm text-gray-500">
                                                                    {stageStatus[index] === 0 && (
                                                                    <LockKeyhole className="mr-4" />
                                                                    )}
                                                                    {stageStatus[index] === 1 && (
                                                                    <NotepadText className="mr-4 text-yellow-500" />
                                                                    )}
                                                                    {stageStatus[index] === 2 && (
                                                                    <CircleCheck className="mr-4 text-green-500" />
                                                                    )}
                                                                    {`${stage.tasksCompleted} / ${stage.totalTasks} tasks completed`}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    </HoverCardTrigger>
                                                </HoverCard>
                                                ))}

                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="team-analytics" className="space-y-6">
                        {/* Team Score Analysis Section */}
                        <Card>
                            {analysisLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-32 w-full" />
                                    <Skeleton className="h-32 w-full" />
                                </div>
                            ) : (
                                <TeamScoreCard
                                    orgId={id}
                                    members={projectMembers}
                                    projectFilter={projId}
                                    initialAnalysis={analysisData?.analysis || null}
                                    lastAnalysisTime={analysisData?.timestamp || null}
                                />
                            )}
                        </Card>

                        {/* Team Members Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UsersIcon className="h-5 w-5 text-blue-600" />
                                    Team Members
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {projectMembers && projectMembers.length > 0 ? (
                                    <div className="grid gap-3">
                                        {projectMembers.map(
                                            (member: string, index: number) => {
                                                const isAdmin = proj?.admins?.includes(member) || false;
                                                return (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                                    >
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-medium">
                                                                {member
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">
                                                                {member}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge
                                                                    variant={isAdmin ? "default" : "secondary"}
                                                                    className={`text-xs ${isAdmin ? "bg-blue-600 text-white" : ""}`}
                                                                >
                                                                    {isAdmin ? "Admin" : "Team Member"}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <p className="text-lg font-medium">
                                            No team members assigned
                                        </p>
                                        <p className="text-sm">
                                            Add team members to start collaboration
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Add Stage Alert Dialog */}
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="default"
                        className="fixed bottom-4 right-4"
                        onClick={() => setIsOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Stage
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-full max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Add New Stage</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter the details for the new stage.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="p-4">
                        <Label
                            htmlFor="stage-title"
                            className="text-sm font-medium text-gray-700"
                        >
                            Stage Title
                        </Label>
                        <input
                            id="stage-title"
                            type="text"
                            value={newStageTitle}
                            onChange={(e) => setNewStageTitle(e.target.value)}
                            placeholder="Enter stage title"
                            className="w-full border border-gray-300 rounded-md p-2"
                        />
                    </div>
                    <AlertDialogFooter>
                        <Button
                            onClick={() => setIsOpen(false)}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                try {
                                    await updateStages(projId, [{
                                        id: "-1",
                                        title: newStageTitle,
                                        order: reorderedStages.length,
                                        tasksCompleted: 0,
                                        totalTasks: 0
                                    }], []);
                                    toast.success("Stage added successfully!");
                                } catch (error) {
                                    console.error("Error adding stage:", error);
                                    toast.error("Failed to add stage.");
                                } finally {
                                    setIsOpen(false);
                                }
                            }}
                        >
                            Create Stage
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default ProjectPage;
