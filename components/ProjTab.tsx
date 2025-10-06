"use client";
import { db } from "@/firebase";
import { Project, Task, Organization } from "@/types/types";
import {collection, getDocs, query, where, doc} from "firebase/firestore";
// 移除不再使用的 batchInQuery 导入
import React, { useEffect, useState, useTransition } from "react";
import { useCollection, useDocument } from "react-firebase-hooks/firestore";
import { Button } from "./ui/button";
import { updateProjects, previewSmartAssignment, removeProjectMember, addProjectMember } from "@/actions/actions";
import { toast } from "sonner";
import ProjectCard from "./ProjectCard";
import {Folder, Users, Briefcase, Loader2, Shuffle, ArrowRightLeft} from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import ErrorDisplay, { ErrorInfo, showErrorToast } from "./ErrorDisplay";
import AddNewTeamDialog from "./AddNewTeamDialog";
import LoadingOverlay from "./LoadingOverlay";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";

type MatchingOutput = {
    groupSize: number;
    groups: string[][];
};

const ProjTab = ({
    orgId,
    userRole,
    userId,
}: {
    userId: string;
    userRole: string;
    orgId: string;
}) => {
    const [isPending, startTransition] = useTransition();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [output, setOutput] = useState("");
    const [parsedOutput, setParsedOutput] = useState<MatchingOutput | null>(null);
    const [projectTasks, setProjectTasks] = useState<{[key: string]: Task[]}>({});
    const [defaultTeamSize] = useState(3); // Default team size for smart matching
    
    // Smart Matching Preview Dialog State
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const [previewData, setPreviewData] = useState<{
        success: boolean;
        message: string;
        preview: Array<{
            projectId: string;
            projectTitle: string;
            currentMembers: string[];
            spotsAvailable: number;
            proposedNewMembers: string[];
            aiMatchingScore: number | null;
            matchingReasoning: string;
        }>;
        totalUnassigned?: number;
        totalProjectsNeedingMembers?: number;
        totalAssigned?: number;
        remainingUnassigned?: number;
    } | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    
    // Member Transfer State (integrated with Smart Matching)
    const [transferLoading] = useState(false);
    const [draggedMember, setDraggedMember] = useState<{email: string, name: string, fromProject: string} | null>(null);
    const [dragOverProject, setDragOverProject] = useState<string | null>(null);
    
    // Preview state for temporary changes (not saved until confirm)
    const [previewChanges, setPreviewChanges] = useState<{
        [projectId: string]: {
            addedMembers: string[];
            removedMembers: string[];
            addedAdmins: string[];
            removedAdmins: string[];
        }
    }>({});
    
    // Error handling state
    const [smartMatchingError, setSmartMatchingError] = useState<ErrorInfo | null>(null);

    // 从组织的 projs 子集合读取基本项目数据
    const orgProjectsQ = query(collection(db, "organizations", orgId, "projs"));
    const [orgProjects] = useCollection(orgProjectsQ);
    
    // 从主 projects 集合读取完整项目数据（包含 title）
    const projectsQ = query(collection(db, "projects"), where("orgId", "==", orgId));
    const [allProjects] = useCollection(projectsQ);
    
    // 获取组织数据
    const [org] = useDocument(doc(db, "organizations", orgId));
    const orgData = org?.data() as Organization;

    // 移除旧的用户项目获取逻辑，现在直接使用组织的项目数据

    useEffect(() => {
        if (output) {
            try {
                const parsed: MatchingOutput = JSON.parse(output);
                setParsedOutput(parsed);
            } catch (error) {
                console.error("Error parsing output:", error);
            }
        }
    }, [output]);

    // Fetch project tasks for each project
    useEffect(() => {
        const fetchProjectTasks = async () => {
            if (!allProjects || allProjects.docs.length === 0) return;

            const tasksMap: {[key: string]: Task[]} = {};
            
            for (const projectDoc of allProjects.docs) {
                const projectId = projectDoc.id;
                try {
                    const stagesQuery = query(
                        collection(db, "projects", projectId, "stages")
                    );
                    const stagesSnapshot = await getDocs(stagesQuery);
                    
                    const allTasks: Task[] = [];
                    
                    for (const stageDoc of stagesSnapshot.docs) {
                        const tasksQuery = query(
                            collection(db, "projects", projectId, "stages", stageDoc.id, "tasks")
                        );
                        const tasksSnapshot = await getDocs(tasksQuery);
                        
                        const stageTasks = tasksSnapshot.docs.map(doc => ({
                            ...(doc.data() as Task),
                            id: doc.id
                        }));
                        
                        allTasks.push(...stageTasks);
                    }
                    
                    tasksMap[projectId] = allTasks;
                } catch (error) {
                    console.error(`Error fetching tasks for project ${projectId}:`, error);
                }
            }
            
            setProjectTasks(tasksMap);
        };

        fetchProjectTasks();
    }, [allProjects, refreshTrigger]);

    const handleAccept = () => {
        if (!parsedOutput) return;

        startTransition(async () => {
            try {
                const result = await updateProjects(orgId, parsedOutput.groups);
                if (result?.success) {
                    toast.success("Teams updated successfully!");
                    setOutput("");
                    setParsedOutput(null);
                    setRefreshTrigger((prev: number) => prev + 1);
                } else {
                    toast.error(result?.message || "Failed to update projects");
                }
            } catch (error) {
                console.error("Failed to update projects:", error);
                toast.error("Failed to update teams");
            }
        });
    };

    const handleProjectCreated = () => {
        setRefreshTrigger((prev: number) => prev + 1);
    };

    const handleSmartMatching = async () => {
        // console.log("Current userRole:", userRole); // Debug info
        if (userRole !== "admin") {
            showErrorToast({
                type: "smart_matching",
                message: "Only administrators can use smart matching functionality",
                canRetry: false
            });
            return;
        }
        
        setIsPreviewLoading(true);
        setSmartMatchingError(null);
        
        try {
            // console.log("🔍 Getting smart assignment preview with defaultTeamSize:", defaultTeamSize);
            const result = await previewSmartAssignment(orgId, defaultTeamSize);
            // console.log("📊 Preview result:", result);

            if (result.success) {
                setPreviewData(result);
                setIsPreviewDialogOpen(true);
                setSmartMatchingError(null);
            } else {
                const errorInfo: ErrorInfo = {
                    type: "smart_matching",
                    message: result.message || "Failed to generate assignment preview",
                    details: (result as { debug?: unknown }).debug ? JSON.stringify((result as { debug?: unknown }).debug, null, 2) : undefined,
                    timestamp: new Date(),
                    canRetry: true,
                    onRetry: handleSmartMatching,
                    onDismiss: () => setSmartMatchingError(null)
                };
                setSmartMatchingError(errorInfo);
                showErrorToast(errorInfo);
            }
        } catch (error) {
            console.error("Error getting assignment preview:", error);
            const errorInfo: ErrorInfo = {
                type: "smart_matching",
                message: error instanceof Error ? error.message : "An unexpected error occurred during smart matching",
                details: error instanceof Error ? error.stack : String(error),
                timestamp: new Date(),
                canRetry: true,
                onRetry: handleSmartMatching,
                onDismiss: () => setSmartMatchingError(null)
            };
            setSmartMatchingError(errorInfo);
            showErrorToast(errorInfo);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleConfirmAssignment = async () => {
        startTransition(async () => {
            try {
                // console.log("🚀 Applying preview changes:", previewChanges);
                
                // Apply all preview changes to the database
                for (const [projectId, changes] of Object.entries(previewChanges)) {
                    // Remove members
                    for (const memberEmail of changes.removedMembers) {
                        const removeResult = await removeProjectMember(projectId, memberEmail);
                        if (!removeResult.success) {
                            console.error(`Failed to remove member ${memberEmail} from project ${projectId}`);
                        }
                    }
                    
                    // Remove admins
                    for (const adminEmail of changes.removedAdmins) {
                        const removeResult = await removeProjectMember(projectId, adminEmail);
                        if (!removeResult.success) {
                            console.error(`Failed to remove admin ${adminEmail} from project ${projectId}`);
                        }
                    }
                    
                    // Add members
                    for (const memberEmail of changes.addedMembers) {
                        const addResult = await addProjectMember(projectId, memberEmail, "member");
                        if (!addResult.success) {
                            console.error(`Failed to add member ${memberEmail} to project ${projectId}`);
                        }
                    }
                    
                    // Add admins
                    for (const adminEmail of changes.addedAdmins) {
                        const addResult = await addProjectMember(projectId, adminEmail, "admin");
                        if (!addResult.success) {
                            console.error(`Failed to add admin ${adminEmail} to project ${projectId}`);
                        }
                    }
                }
                
                toast.success("All changes applied successfully!");
                setIsPreviewDialogOpen(false);
                setPreviewData(null);
                setPreviewChanges({});
                setDraggedMember(null);
                setRefreshTrigger((prev: number) => prev + 1);
            } catch (error) {
                console.error("Error applying changes:", error);
                showErrorToast({
                    type: "smart_matching",
                    message: "Failed to apply some changes",
                    details: error instanceof Error ? error.message : String(error),
                    timestamp: new Date(),
                    canRetry: true
                });
            }
        });
    };

    // Preview-only member transfer (for Smart Matching Preview dialog)
    const handlePreviewMemberTransfer = (memberEmail: string, fromProjectId: string, toProjectId: string) => {
        // Get current effective members for both projects (including preview changes)
        const getEffectiveMembers = (projectId: string) => {
            const project = displayProjects.find(p => p.projId === projectId);
            const changes = previewChanges[projectId] || { addedMembers: [], removedMembers: [], addedAdmins: [], removedAdmins: [] };
            
            const currentMembers = project?.members || [];
            const currentAdmins = project?.admins || [];
            
            const effectiveMembers = [
                ...currentMembers.filter(m => !changes.removedMembers.includes(m)),
                ...changes.addedMembers
            ];
            
            const effectiveAdmins = [
                ...currentAdmins.filter(a => !changes.removedAdmins.includes(a)),
                ...changes.addedAdmins
            ];
            
            return { members: effectiveMembers, admins: effectiveAdmins };
        };

        // Check if member is already in target project
        const targetEffective = getEffectiveMembers(toProjectId);
        const isAlreadyInTarget = 
            targetEffective.members.includes(memberEmail) || 
            targetEffective.admins.includes(memberEmail);
        
        if (isAlreadyInTarget) {
            showErrorToast({
                type: "smart_matching",
                message: "Member is already in this project",
                canRetry: false
            });
            return;
        }

        // Check source project
        const sourceProject = displayProjects.find(p => p.projId === fromProjectId);
        const isAdminInSource = sourceProject?.admins?.includes(memberEmail);

        // Update preview changes
        setPreviewChanges(prev => {
            const newChanges = { ...prev };
            
            // Initialize project changes if not exists
            if (!newChanges[toProjectId]) {
                newChanges[toProjectId] = { addedMembers: [], removedMembers: [], addedAdmins: [], removedAdmins: [] };
            }

            if (fromProjectId === "unassigned") {
                // AI suggested member - just add to target
                newChanges[toProjectId].addedMembers.push(memberEmail);
            } else {
                // Initialize source project changes if not exists
                if (!newChanges[fromProjectId]) {
                    newChanges[fromProjectId] = { addedMembers: [], removedMembers: [], addedAdmins: [], removedAdmins: [] };
                }

                if (isAdminInSource) {
                    // Admin can be in multiple projects - copy
                    newChanges[toProjectId].addedAdmins.push(memberEmail);
                } else {
                    // Regular member - move (remove from source, add to target)
                    newChanges[fromProjectId].removedMembers.push(memberEmail);
                    newChanges[toProjectId].addedMembers.push(memberEmail);
                }
            }
            
            return newChanges;
        });

        const actionType = isAdminInSource ? "copied" : "moved";
        toast.success(`Member ${actionType} in preview! Click "Confirm Assignment" to apply.`);
        setDraggedMember(null);
    };



    const totalProjects = allProjects?.docs.length || 0;
    
    // 合并项目数据：从主集合获取 title，从组织子集合获取成员信息
    const allProjectsData = (allProjects?.docs || []).map((doc) => {
        const mainData = doc.data(); // 主集合数据（包含 title）
        const orgProjectDoc = orgProjects?.docs.find(orgDoc => orgDoc.id === doc.id);
        const orgData = orgProjectDoc?.data(); // 组织子集合数据（包含成员信息）
        
        return {
            projId: doc.id,
            orgId: orgId,
            title: mainData?.title, // 从主集合读取 title
            members: orgData?.members || [], // 从组织子集合读取成员
            admins: orgData?.admins || [], // 从组织子集合读取管理员
            adminsAsUsers: orgData?.adminsAsUsers || [],
            teamCharterResponse: mainData?.teamCharterResponse || [],
            teamSize: orgData?.teamSize, // 从组织子集合读取团队大小
            createdAt: mainData?.createdAt,
            description: mainData?.description,
            projectType: mainData?.projectType,
            ...mainData,
            // 用组织子集合的数据覆盖成员相关字段
            ...(orgData && {
                members: orgData.members || [],
                admins: orgData.admins || [],
                teamSize: orgData.teamSize
            })
        } as Project;
    });
    
    // 根据用户角色过滤项目
    const displayProjects = userRole === "admin" 
        ? allProjectsData // 管理员显示所有项目
        : allProjectsData.filter(proj => 
            // 普通用户只显示自己参与的项目
            proj.members?.includes(userId) || proj.admins?.includes(userId)
        );
    
    const activeProjects = displayProjects.filter(proj => 
        (proj.members?.length || 0) > 0 || (proj.admins?.length || 0) > 0
    ).length;

    return (
        <>
            <LoadingOverlay 
                isVisible={isPending}
                message="Processing Team Groups..."
                description="Applying new team group configuration, please wait..."
            />
            <div className="flex h-auto bg-gradient-to-br from-gray-50 to-purple-50 rounded-lg overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold">
                            Team Management
                        </h2>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                            <div className="text-2xl font-bold">
                                {totalProjects}
                            </div>
                            <div className="text-xs opacity-90">
                                Total Teams
                            </div>
                        </div>
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                            <div className="text-2xl font-bold">
                                {activeProjects}
                            </div>
                            <div className="text-xs opacity-90">Active</div>
                        </div>
                    </div>
                </div>
                

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                            <div className="text-sm font-medium text-gray-500">
                                Team Overview
                            </div>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">
                                                Total Teams
                                            </span>
                                            <Badge variant="secondary">
                                                {totalProjects}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">
                                                Active Teams
                                            </span>
                                            <Badge variant="default">
                                                {activeProjects}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">
                                                Role
                                            </span>
                                            <span className="text-sm font-medium">
                                                {userRole === "admin" ? "Admin" : "Member"}
                                            </span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">
                                                Total Members
                                            </span>
                                            <Badge variant="outline">
                                                {orgData ? (orgData.admins?.length || 0) + (orgData.members?.length || 0) : 0}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="space-y-2">
                        
                        {/* Add New Team - Direct invitation without AI matching */}
                        <AddNewTeamDialog 
                            orgId={orgId}
                            onTeamCreated={handleProjectCreated}
                            totalProjects={totalProjects}
                        />
                        
                        {/* Smart Matching - Only for admins */}
                        {userRole === "admin" && (
                            <>
                                <Button
                                    onClick={handleSmartMatching}
                                    disabled={isPending || isPreviewLoading || (orgData ? (orgData.members?.length || 0) === 0 : true)}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                                    size="sm"
                                >
                                    {isPreviewLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Loading Preview...
                                        </>
                                    ) : (
                                        <>
                                            <Shuffle className="h-4 w-4 mr-2" />
                                            Smart Matching
                                        </>
                                    )}
                                </Button>
                                
                                {/* Smart Matching Error Display */}
                                {smartMatchingError && (
                                    <ErrorDisplay 
                                        error={smartMatchingError} 
                                        className="mt-2 text-sm"
                                    />
                                )}
                                
                            </>
                        )}
                        

                    </div>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col bg-white">
                {/* Team Generation Results */}
                {output && parsedOutput && parsedOutput.groups && (
                    <div className="p-6 border-b border-gray-200 bg-blue-50">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Generated Team Groups
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            {parsedOutput.groups.map((group, index) => (
                                <div
                                    key={index}
                                    className="bg-white p-4 rounded-lg shadow-sm border"
                                >
                                    <h4 className="font-medium text-gray-900 mb-2">
                                        Group {index + 1}
                                    </h4>
                                    <ul className="space-y-1">
                                        {group.map((member, memberIndex) => (
                                            <li
                                                key={memberIndex}
                                                className="text-sm text-gray-600 flex items-center gap-2"
                                            >
                                                <Users className="h-3 w-3" />
                                                {member}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end space-x-4">
                            <Button disabled={isPending} onClick={handleAccept}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Accepting Groups...
                                    </>
                                ) : (
                                    "Accept Groups"
                                )}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setOutput("")}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Content Header */}
                <div className="p-6 border-b border-gray-200 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Team Overview
                    </h3>
                    <p className="text-sm text-gray-500">
                        Manage and monitor all your teams
                    </p>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-6">
                            {displayProjects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {displayProjects
                                        .sort((a, b) =>
                                            (a.title || "").localeCompare(b.title || ""),
                                        )
                                        .map((proj) => (
                                            <div
                                                key={proj.projId}
                                                className="group"
                                            >
                                                <ProjectCard
                                                    orgId={orgId}
                                                    projId={proj.projId}
                                                    projectName={proj.title}
                                                    members={proj.members}
                                                    admins={proj.admins}
                                                    tasks={projectTasks[proj.projId] || []}
                                                    backgroundImage=""
                                                />
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 max-w-md mx-auto">
                                        <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            {userRole === "admin"
                                                ? "Welcome to Team Management!"
                                                : "No teams assigned"}
                                        </h3>
                                        <p className="text-gray-500 mb-4">
                                            {userRole === "admin"
                                                ? "Start creating your first team, experience the new task pool management system"
                                                : "Wait for admins to create teams and assign you"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                </div>
            </div>
        </div>

        {/* Smart Matching Preview Dialog */}
        <AlertDialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
            <AlertDialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Shuffle className="h-5 w-5" />
                        Smart Matching Preview
                    </AlertDialogTitle>
                </AlertDialogHeader>
                
                {previewData && (
                    <div className="space-y-6">
                        {/* Statistics */}
                        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">{previewData.totalUnassigned}</div>
                                <div className="text-xs">Total Unassigned</div>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg">
                                <div className="text-lg font-bold text-green-600">{previewData.totalAssigned || 0}</div>
                                <div className="text-xs">Will Be Assigned</div>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg">
                                <div className="text-lg font-bold text-purple-600">{previewData.totalProjectsNeedingMembers}</div>
                                <div className="text-xs">Projects Involved</div>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-lg">
                                <div className="text-lg font-bold text-orange-600">{previewData.remainingUnassigned || 0}</div>
                                <div className="text-xs">Still Unassigned</div>
                            </div>
                        </div> */}

                        {/* Simple Project Grid with Drag & Drop */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <ArrowRightLeft className="h-4 w-4" />
                                Drag members between projects to adjust assignments
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {displayProjects.map((project) => {
                                    // Find AI preview data for this project
                                    const aiPreview = previewData.preview?.find((p) => p.projectId === project.projId);
                                    const proposedNewMembers = aiPreview?.proposedNewMembers || [];
                                    
                                    // Calculate effective members/admins including preview changes
                                    const projectChanges = previewChanges[project.projId] || { 
                                        addedMembers: [], removedMembers: [], addedAdmins: [], removedAdmins: [] 
                                    };
                                    
                                    const effectiveMembers = [
                                        ...(project.members || []).filter(m => !projectChanges.removedMembers.includes(m)),
                                        ...projectChanges.addedMembers
                                    ];
                                    
                                    const effectiveAdmins = [
                                        ...(project.admins || []).filter(a => !projectChanges.removedAdmins.includes(a)),
                                        ...projectChanges.addedAdmins
                                    ];
                                    
                                    // Filter out AI proposed members that have been manually moved
                                    const remainingProposedMembers = proposedNewMembers.filter((email: string) => 
                                        !Object.values(previewChanges).some(changes => 
                                            changes.addedMembers.includes(email) || changes.addedAdmins.includes(email)
                                        )
                                    );
                                    
                                    return (
                                        <motion.div
                                            key={project.projId}
                                            className={`border-2 border-dashed rounded-lg p-4 min-h-[200px] transition-all duration-200 relative ${
                                                dragOverProject === project.projId 
                                                    ? 'border-blue-400 bg-blue-50 shadow-md scale-[1.02]' 
                                                    : draggedMember && draggedMember.fromProject !== project.projId
                                                        ? 'border-gray-400 bg-gray-100 hover:border-blue-300 hover:bg-blue-25'
                                                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                                            }`}
                                            whileHover={!draggedMember ? { scale: 1.02 } : {}}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = "move";
                                                setDragOverProject(project.projId);
                                                // console.log("Drag over project:", project.projId);
                                            }}
                                            onDragLeave={() => {
                                                setDragOverProject(null);
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDragOverProject(null);
                                                // console.log("Drop event triggered on project:", project.projId);
                                                // console.log("draggedMember:", draggedMember);
                                                if (draggedMember && draggedMember.fromProject !== project.projId) {
                                                    // Check if this would be a valid drop before attempting transfer
                                                    const isAlreadyInTarget = 
                                                        (project.members?.includes(draggedMember.email)) || 
                                                        (project.admins?.includes(draggedMember.email));
                                                    
                                                    if (isAlreadyInTarget) {
                                                        showErrorToast({
                                                            type: "smart_matching",
                                                            message: "Member is already in this project",
                                                            canRetry: false
                                                        });
                                                        return;
                                                    }

                                                    // console.log("Transferring member:", draggedMember.email, "from", draggedMember.fromProject, "to", project.projId);
                                                    handlePreviewMemberTransfer(draggedMember.email, draggedMember.fromProject, project.projId);
                                                } else {
                                                    // console.log("Drop rejected - same project or no dragged member");
                                                }
                                            }}
                                            style={{ pointerEvents: 'auto' }}
                                        >
                                            {/* Project Header */}
                                            <div className="mb-3 pointer-events-none">
                                                <h3 className="font-semibold text-gray-900 mb-1">{project.title}</h3>
                                                <div className="text-sm text-gray-500">
                                                    {effectiveMembers.length + effectiveAdmins.length + remainingProposedMembers.length} members
                                                    {aiPreview && (
                                                        <span className="ml-2 text-xs text-purple-600 font-medium">
                                                            Score: {aiPreview.aiMatchingScore || 'N/A'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {/* Effective Admins */}
                                                {effectiveAdmins.map((adminEmail) => {
                                                    const isBeingDragged = draggedMember?.email === adminEmail && draggedMember?.fromProject === project.projId;
                                                    const isNewlyAdded = projectChanges.addedAdmins.includes(adminEmail);
                                                    return (
                                                        <div
                                                            key={`admin-${adminEmail}`}
                                                            className={`flex items-center gap-2 p-2 rounded-md cursor-move transition-all duration-200 ${
                                                                isNewlyAdded 
                                                                    ? 'bg-yellow-100 border-2 border-yellow-300' 
                                                                    : 'bg-red-100'
                                                            } ${
                                                                isBeingDragged ? 'opacity-30 scale-95 shadow-none' : 'opacity-100 scale-100 shadow-sm hover:shadow-md'
                                                            }`}
                                                            draggable={true}
                                                            onDragStart={(e) => {
                                                                // console.log("Dragging admin:", adminEmail, "userRole:", userRole);
                                                                setDraggedMember({
                                                                    email: adminEmail,
                                                                    name: adminEmail,
                                                                    fromProject: project.projId
                                                                });
                                                                e.dataTransfer.effectAllowed = "move";
                                                                e.dataTransfer.setData("text/plain", adminEmail);
                                                            }}
                                                            onDragEnd={() => {
                                                                // console.log("Drag ended for admin:", adminEmail);
                                                                setDraggedMember(null);
                                                            }}
                                                        >
                                                            <span className="text-sm truncate">{adminEmail}</span>
                                                            {isNewlyAdded && <span className="text-xs text-yellow-600">(Preview)</span>}
                                                        </div>
                                                    );
                                                })}
                                                
                                                {/* Effective Members */}
                                                {effectiveMembers.map((memberEmail) => {
                                                    const isBeingDragged = draggedMember?.email === memberEmail && draggedMember?.fromProject === project.projId;
                                                    const isNewlyAdded = projectChanges.addedMembers.includes(memberEmail);
                                                    return (
                                                        <div
                                                            key={`member-${memberEmail}`}
                                                            className={`flex items-center gap-2 p-2 rounded-md cursor-move transition-all duration-200 ${
                                                                isNewlyAdded 
                                                                    ? 'bg-yellow-100 border-2 border-yellow-300' 
                                                                    : 'bg-blue-100'
                                                            } ${
                                                                isBeingDragged ? 'opacity-30 scale-95 shadow-none' : 'opacity-100 scale-100 shadow-sm hover:shadow-md'
                                                            }`}
                                                            draggable={true}
                                                            onDragStart={(e) => {
                                                                // console.log("Dragging member:", memberEmail, "userRole:", userRole);
                                                                setDraggedMember({
                                                                    email: memberEmail,
                                                                    name: memberEmail,
                                                                    fromProject: project.projId
                                                                });
                                                                e.dataTransfer.effectAllowed = "move";
                                                                e.dataTransfer.setData("text/plain", memberEmail);
                                                            }}
                                                            onDragEnd={() => {
                                                                // console.log("Drag ended for member:", memberEmail);
                                                                setDraggedMember(null);
                                                            }}
                                                        >
                                                            <span className="text-sm truncate">{memberEmail}</span>
                                                            {isNewlyAdded && <span className="text-xs text-yellow-600">(Preview)</span>}
                                                        </div>
                                                    );
                                                })}
                                                
                                                {/* Remaining AI Proposed Members */}
                                                {remainingProposedMembers.map((memberEmail: string) => {
                                                    const isBeingDragged = draggedMember?.email === memberEmail && draggedMember?.fromProject === "unassigned";
                                                    return (
                                                        <div
                                                            key={`proposed-${memberEmail}`}
                                                            className={`flex items-center gap-2 p-2 bg-green-100 border-2 border-green-300 rounded-md cursor-move transition-all duration-200 ${
                                                                isBeingDragged ? 'opacity-30 scale-95 shadow-none border-green-200' : 'opacity-100 scale-100 shadow-sm hover:shadow-md hover:border-green-400'
                                                            }`}
                                                            draggable={true}
                                                            onDragStart={(e) => {
                                                                // console.log("Dragging AI suggested member:", memberEmail, "userRole:", userRole);
                                                                setDraggedMember({
                                                                    email: memberEmail,
                                                                    name: memberEmail,
                                                                    fromProject: "unassigned"
                                                                });
                                                                e.dataTransfer.effectAllowed = "move";
                                                                e.dataTransfer.setData("text/plain", memberEmail);
                                                            }}
                                                            onDragEnd={() => {
                                                                // console.log("Drag ended for AI suggested member:", memberEmail);
                                                                setDraggedMember(null);
                                                            }}
                                                        >
                                                            <span className="text-sm truncate">{memberEmail}</span>
                                                        </div>
                                                    );
                                                })}
                                                
                                                {/* Empty state */}
                                                {effectiveMembers.length === 0 && 
                                                 effectiveAdmins.length === 0 && 
                                                 remainingProposedMembers.length === 0 && (
                                                    <div className="text-center text-gray-400 py-8 pointer-events-none">
                                                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                        <div className="text-sm">No members</div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* AI Insight */}
                                            {aiPreview && (
                                                <div className="mt-3 p-2 bg-purple-50 rounded-md pointer-events-none">
                                                    <div className="text-xs text-purple-700 font-medium mb-1">AI Insight:</div>
                                                    <div className="text-xs text-purple-600">{aiPreview.matchingReasoning}</div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
                
                <AlertDialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setIsPreviewDialogOpen(false);
                            setPreviewData(null);
                            setDraggedMember(null);
                            setDragOverProject(null);
                            setPreviewChanges({});
                        }}
                        disabled={isPending || transferLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmAssignment}
                        disabled={isPending}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Assigning...
                            </>
                        ) : (
                            "Confirm Assignment"
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


        </>
    );
};

export default ProjTab;
