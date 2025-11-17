"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
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
import { createProject } from "@/actions/actions";
import { useDocument } from "react-firebase-hooks/firestore";
import { doc } from "firebase/firestore";
import { toast } from "sonner";
import LoadingOverlay from "./LoadingOverlay";
import { db } from "@/firebase";

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
    const [isPending, startTransition] = useTransition();
    const [org, loading, error] = useDocument(doc(db, "organizations", orgId));

    const handleCreateProject = () => {
        if (!newProjectTitle.trim()) return;

        startTransition(async () => {
            try {
                const orgData = org?.data();
                if (!orgData) {
                    toast.error("Group data not found");
                    return;
                }
                const adminMembers = orgData.admins || [];

                const result = await createProject(orgId, newProjectTitle.trim(), [], adminMembers);
                if (!result.success) {
                    toast.error(result.message || "Failed to create team");
                    return;
                }

                toast.success("Team created successfully!");
                setNewProjectTitle("");
                setIsOpen(false);
                onProjectCreated?.();
            } catch (error) {
                console.error("Error creating project:", error);
                toast.error("Failed to create team");
            }
        });
    };

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
                description="Please wait..."
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
                        Enter team name to create a new team. All organization admins will be automatically added.
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