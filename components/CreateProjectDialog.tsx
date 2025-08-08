"use client";

import { useState, useTransition } from "react";
import { Plus, Users } from "lucide-react";
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

interface CreateProjectDialogProps {
    orgId: string;
    totalProjects: number;
    userRole: "admin" | "member";
    onProjectCreated?: () => void;
}

export default function CreateProjectDialog({
    orgId,
    totalProjects,
    userRole,
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
                // 1. 创建项目
                const result = await createProject(orgId, newProjectTitle.trim());
                if (!result.success) {
                    toast.error(result.message || "Failed to create team");
                    return;
                }

                const projectId = result.projectId;
                if (!projectId) {
                    toast.error("Team created but no team ID returned");
                    return;
                }

                // 2. 如果选择了团队匹配，则进行匹配
                if (teamSize && parseInt(teamSize) > 0) {
                    try {
                        const orgData = org?.data();
                        if (!orgData) {
                            toast.error("Group data not found");
                            return;
                        }

                        const memberList = orgData.members || [];
                        if (memberList.length === 0) {
                            toast.warning("No members found in group");
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

                        // 调用匹配API
                        const matchingResult = await matching(teamSize, projQuestions, userData);
                        console.log("Matching result:", matchingResult);

                        // 解析匹配结果并更新项目成员
                        try {
                            const parsedResult = JSON.parse(matchingResult);
                            if (parsedResult.groups && parsedResult.groups.length > 0) {
                                // 使用第一个匹配的团队
                                const selectedGroup = parsedResult.groups[0];
                                if (selectedGroup && selectedGroup.length > 0) {
                                    // 更新项目成员
                                    await updateProjectMembers(projectId, selectedGroup);
                                    toast.success(`Team created with ${selectedGroup.length} matched members!`);
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

    if (userRole !== "admin") {
        return null;
    }

    if (loading) {
        return <Button disabled>Loading...</Button>;
    }

    if (error) {
        return <Button disabled>Error loading group</Button>;
    }

    return (
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
                            Team Size (Optional)
                        </Label>
                        <Input
                            id="team-size"
                            type="number"
                            min="1"
                            max="10"
                            value={teamSize}
                            onChange={(e) => setTeamSize(e.target.value)}
                            placeholder="Enter team size (1-10)"
                            className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                            Leave empty to create team without member matching
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
                        {isPending ? "Creating..." : "Create Team"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 