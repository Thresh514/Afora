"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Users, ArrowRight, MoreVertical, Trash } from "lucide-react";
import { Task } from "@/types/types";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useTransition } from "react";
import { deleteProject } from "@/actions/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ProjectCardProps {
    projectName: string;
    backgroundImage: string;
    tasks: Task[];
    projId: string;
    orgId: string;
    members?: string[];
    admins?: string[];
}

const ProjectCard = ({
    projId,
    orgId,
    projectName = "Sample Team",
    tasks = [],
    members = [],
    admins = [],
}: ProjectCardProps) => {
    const router = useRouter();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Calculate actual values based on real data
    const memberCount = members.length + admins.length;
    const taskCount = tasks.length;
    const completedTasks = tasks.filter((task) => task.isCompleted).length;
    const progress =
        taskCount > 0
            ? Math.round((completedTasks / taskCount) * 100)
            : 0;

    const handleDeleteProject = () => {
        startTransition(async () => {
            try {
                const result = await deleteProject(projId, orgId);
                if (result.success) {
                    toast.success("Project deleted successfully!");
                    setIsDeleteDialogOpen(false);
                    // Refresh the page to update the project list
                    router.refresh();
                } else {
                    toast.error(result.message || "Failed to delete project");
                }
            } catch (error) {
                toast.error("Failed to delete project");
                console.error("Delete project error:", error);
            }
        });
    };

    // Color schemes based on project name - softer colors
    const getProjectTheme = (name: string) => {
        const themes = [
            {
                bg: "from-slate-400 to-slate-500",
                accent: "text-slate-600",
                badge: "bg-slate-100 text-slate-700",
            },
            {
                bg: "from-gray-400 to-gray-500",
                accent: "text-gray-600",
                badge: "bg-gray-100 text-gray-700",
            },
            {
                bg: "from-blue-300 to-blue-400",
                accent: "text-blue-600",
                badge: "bg-blue-100 text-blue-700",
            },
            {
                bg: "from-indigo-300 to-indigo-400",
                accent: "text-indigo-600",
                badge: "bg-indigo-100 text-indigo-700",
            },
            {
                bg: "from-violet-300 to-violet-400",
                accent: "text-violet-600",
                badge: "bg-violet-100 text-violet-700",
            },
        ];
        return themes[name.length % themes.length];
    };

    const theme = getProjectTheme(projectName);

    return (
        <a href={`/org/${orgId}/proj/${projId}`} className="block group">
            <Card className="w-full h-full overflow-hidden border-0 bg-white">
                {/* Header with gradient background */}
                <CardHeader className="p-0 relative">
                    <div
                        className={`h-32 bg-gradient-to-r ${theme.bg} relative overflow-hidden`}
                    >
                        {/* Decorative elements */}
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="absolute top-2 right-2 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                        <div className="absolute bottom-2 left-2 w-16 h-16 bg-white/5 rounded-full blur-lg"></div>

                        {/* Content */}
                        <div className="relative p-4 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-1 text-white/80 text-sm">
                                    <Users className="h-3 w-3" />
                                    <span>{memberCount}</span>
                                </div>
                                
                                {/* Three dot menu */}
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/20"
                                            onClick={(e) => e.preventDefault()}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Portal>
                                        <DropdownMenu.Content
                                            align="start"
                                            side="left"
                                            className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-100 bg-white p-1 shadow-md animate-in slide-in-from-right-2"
                                        >
                                            <DropdownMenu.Item
                                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-red-50 text-red-600 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash className="mr-2 h-4 w-4" />
                                                Delete Project
                                            </DropdownMenu.Item>
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1 group-hover:text-white/90 transition-colors">
                                {projectName}
                            </h2>
                        </div>
                    </div>
                </CardHeader>

                {/* Content */}
                <CardContent className="p-4 space-y-4">
                    {/* Progress section */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-700">
                                Progress
                            </h3>
                            <span className="text-sm font-semibold text-gray-900">
                                {progress}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${theme.bg} transition-all duration-500 ease-out`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>{completedTasks} completed</span>
                            <span>{taskCount - completedTasks} remaining</span>
                        </div>
                    </div>

                    {/* Action button */}
                    <Button
                        variant="outline"
                        className="w-full group-hover:bg-slate-100 group-hover:border-slate-300 transition-all duration-300"
                    >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        View Team
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                    </Button>
                </CardContent>
            </Card>
            
            {/* Delete Project Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the project &quot;{projectName}&quot; and all its stages and tasks.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteProject}
                            disabled={isPending}
                        >
                            {isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </a>
    );
};

export default ProjectCard;
