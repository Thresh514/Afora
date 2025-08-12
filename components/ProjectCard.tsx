import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Users, ArrowRight } from "lucide-react";
import { Task } from "@/types/types";

interface ProjectCardProps {
    projectName: string;
    backgroundImage: string;
    tasks: Task[];
    projId: string;
    orgId: string;
    members?: string[];
}

const ProjectCard = ({
    projId,
    orgId,
    projectName = "Sample Team",
    tasks = [],
    members = [],
}: ProjectCardProps) => {
    // Calculate actual values based on real data
    const memberCount = members.length;
    const taskCount = tasks.length;
    const completedTasks = tasks.filter((task) => task.isCompleted).length;
    const progress =
        taskCount > 0
            ? Math.round((completedTasks / taskCount) * 100)
            : 0;

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
                                    <span>{memberCount + 1}</span>
                                </div>
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
        </a>
    );
};

export default ProjectCard;
