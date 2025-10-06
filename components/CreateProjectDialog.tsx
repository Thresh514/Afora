"use client";

import { useState, useTransition } from "react";
import { Plus, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject, updateProjectMembers } from "@/actions/actions";
import { matching } from "@/ai_scripts/matching";
import { projQuestions } from "@/types/types";
import { db } from "@/firebase";
import { useDocument } from "react-firebase-hooks/firestore";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import LoadingOverlay from "./LoadingOverlay";

interface CreateProjectDialogProps {
    orgId: string;
    totalProjects: number;
    userRole: "admin" | "member";
    onProjectCreated?: () => void;
}

export default function CreateProjectDialog({
    orgId,
    totalProjects,
    onProjectCreated,
}: CreateProjectDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [teamSize, setTeamSize] = useState("3");
    const [isPending, startTransition] = useTransition();
    const [org, loading, error] = useDocument(doc(db, "organizations", orgId));

    const handleCreateProject = () => {
        if (!newProjectTitle.trim()) return;

        startTransition(async () => {
            try {
                // 1. 获取组织数据并准备管理员列表
                const orgData = org?.data();
                if (!orgData) {
                    toast.error("Group data not found");
                    return;
                }

                // 自动将所有管理员添加到项目中
                const adminMembers = orgData.admins || [];
                // console.log("Adding admins to project:", adminMembers);

                // 创建项目并包含所有管理员
                const memberCountToMatch = teamSize && parseInt(teamSize) > 0 ? parseInt(teamSize) : 0;
                // 计算总团队大小：admin数量 + 要匹配的成员数量  
                const totalTeamSize = memberCountToMatch > 0 ? adminMembers.length + memberCountToMatch : undefined;
                const result = await createProject(orgId, newProjectTitle.trim(), [], adminMembers);
                if (!result.success) {
                    toast.error(result.message || "Failed to create team");
                    return;
                }

                const projectId = result.projectId;
                if (!projectId) {
                    toast.error("Team created but no team ID returned");
                    return;
                }

                // 2. 如果选择了团队匹配，则匹配普通成员（管理员已自动包含）
                if (teamSize && parseInt(teamSize) > 0) {
                    try {
                        // 匹配用户指定数量的普通成员
                        const memberList = orgData.members || [];
                        // const adminsCount = adminMembers.length;
                        
                        // console.log(`Member count to match: ${memberCountToMatch}, Admins: ${adminsCount}, Total will be: ${memberCountToMatch + adminsCount}`);
                        
                        if (memberCountToMatch === 0) {
                            toast.success("Team created successfully!");
                            setNewProjectTitle("");
                            setTeamSize("3");
                            setIsOpen(false);
                            onProjectCreated?.();
                            return;
                        }
                        
                        if (memberList.length === 0) {
                            toast.success("Team created successfully!");
                            setNewProjectTitle("");
                            setTeamSize("3");
                            setIsOpen(false);
                            onProjectCreated?.();
                            return;
                        }

                        // 获取成员的调查响应
                        const userDataPromise = memberList.map(async (user: string) => {
                            const userOrg = await getDoc(doc(db, "users", user, "org", orgId));
                            const userOrgData = userOrg.data();
                            const surveyResponse = userOrgData?.projOnboardingSurveyResponse
                                ? userOrgData.projOnboardingSurveyResponse.join(",")
                                : "";
                            return `{${user}:${surveyResponse}}`;
                        });

                        const userData = await Promise.all(userDataPromise);

                        // 调用匹配API，匹配指定数量的成员
                        const matchingResult = await matching(memberCountToMatch, projQuestions, userData);
                        // console.log("Matching result:", matchingResult);

                        // 解析匹配结果并更新项目成员
                        try {
                            const parsedResult = JSON.parse(matchingResult);
                            if (parsedResult.groups && parsedResult.groups.length > 0) {
                                // 使用第一个匹配的团队
                                const selectedGroup = parsedResult.groups[0];
                                if (selectedGroup && selectedGroup.length > 0) {
                                    // 更新项目成员（只添加匹配的普通成员，管理员已在admins字段中）
                                    await updateProjectMembers(projectId, selectedGroup);
                                    toast.success("Team created successfully!");
                                } else {
                                    toast.success("Team created successfully!");
                                }
                            } else {
                                toast.success("Team created successfully!");
                            }
                        } catch (parseError) {
                            console.error("Error parsing matching result:", parseError);
                            toast.success("Team created successfully!");
                        }
                    } catch (matchingError) {
                        console.error("Error in team matching:", matchingError);
                        toast.success("Team created successfully!");
                    }
                } else {
                    toast.success("Team created successfully!");
                }

                setNewProjectTitle("");
                setTeamSize("3");
                setIsOpen(false);
                onProjectCreated?.();
            } catch (error) {
                console.error("Error creating project:", error);
                toast.error("Failed to create team");
            }
        });
    };

    // All team members can create projects, so remove admin-only restriction
    // if (userRole !== "admin") {
    //     return null;
    // }

    if (loading) {
        return <Button disabled>Loading...</Button>;
    }

    if (error) {
        return <Button disabled>Error loading group</Button>;
    }

    return (
        <>
            <LoadingOverlay 
                isVisible={isPending}
                message="Creating Team..."
                description="Matching optimal team member combinations, please wait..."
            />
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    className={`w-full ${
                        totalProjects === 0
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg text-white"
                            : ""
                    }`}
                    size={totalProjects === 0 ? "default" : "sm"}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    {totalProjects === 0 ? "Create First Team" : "New Team"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                    <DialogDescription>
                        Enter team details and optionally match members.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="project-title" className="text-sm font-medium">
                            Team Name
                        </Label>
                        <Input
                            id="project-title"
                            value={newProjectTitle}
                            onChange={(e) => setNewProjectTitle(e.target.value)}
                            placeholder="Enter team name..."
                            onKeyPress={(e) =>
                                e.key === "Enter" && handleCreateProject()
                            }
                        />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="team-size" className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Member Count (Optional)
                        </Label>
                        <Input
                            id="team-size"
                            type="number"
                            min="1"
                            max="10"
                            value={teamSize}
                            onChange={(e) => setTeamSize(e.target.value)}
                            placeholder="Enter member count (1-10)"
                            className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                            Number of regular members to match (admins are automatically included)
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateProject}
                        disabled={isPending || !newProjectTitle.trim()}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating Team...
                            </>
                        ) : (
                            "Create Team"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
} 