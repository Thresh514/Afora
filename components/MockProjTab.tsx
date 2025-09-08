"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
    Users, 
    Calendar, 
    Target, 
    BarChart3, 
    ArrowRight,
    Clock,
    CheckCircle,
    PlayCircle,
    PauseCircle
} from "lucide-react";
import Link from "next/link";

interface MockProject {
    id: string;
    title: string;
    description: string;
    status: "active" | "planning" | "completed" | "paused";
    createdAt: string;
    members: string[];
    admins: string[];
    progress: number;
    totalTasks: number;
    completedTasks: number;
}

interface MockProjTabProps {
    projects: MockProject[];
    orgId: string;
}

const MockProjTab = ({ projects, orgId }: MockProjTabProps) => {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "active":
                return <PlayCircle className="h-4 w-4 text-green-500" />;
            case "planning":
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case "completed":
                return <CheckCircle className="h-4 w-4 text-blue-500" />;
            case "paused":
                return <PauseCircle className="h-4 w-4 text-gray-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-800 border-green-200";
            case "planning":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "completed":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "paused":
                return "bg-gray-100 text-gray-800 border-gray-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "active":
                return "Active";
            case "planning":
                return "Planning";
            case "completed":
                return "Completed";
            case "paused":
                return "Paused";
            default:
                return "Unknown";
        }
    };

    return (
        <div className="space-y-6">
            {/* Project Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Projects</p>
                                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                            </div>
                            <Target className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Active</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {projects.filter(p => p.status === "active").length}
                                </p>
                            </div>
                            <PlayCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Completed</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {projects.filter(p => p.status === "completed").length}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Tasks</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {projects.reduce((acc, proj) => acc + proj.totalTasks, 0)}
                                </p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Project List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow duration-300">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                                        {project.title}
                                    </CardTitle>
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                        {project.description}
                                    </p>
                                </div>
                                <Badge 
                                    variant="outline" 
                                    className={`ml-2 ${getStatusColor(project.status)}`}
                                >
                                    <div className="flex items-center gap-1">
                                        {getStatusIcon(project.status)}
                                        {getStatusText(project.status)}
                                    </div>
                                </Badge>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Progress</span>
                                    <span className="font-medium text-gray-900">{project.progress}%</span>
                                </div>
                                <Progress value={project.progress} className="h-2" />
                            </div>

                            {/* Task Statistics */}
                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <Target className="h-4 w-4" />
                                        <span>{project.completedTasks}/{project.totalTasks} tasks</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        <span>{project.members.length} members</span>
                                    </div>
                                </div>
                            </div>

                            {/* Creation Date */}
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>
                                    Created {new Date(project.createdAt).toLocaleDateString('en-US')}
                                </span>
                            </div>

                            {/* Action Button */}
                            <div className="pt-2">
                                <Link href={`/mock/org/${orgId}/proj/${project.id}`}>
                                    <Button 
                                        className="w-full bg-[#6F61EF] hover:bg-[#5646e4] text-white"
                                        size="sm"
                                    >
                                        View Details
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {projects.length === 0 && (
                <div className="text-center py-12">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-500">Start by creating your first project!</p>
                </div>
            )}
        </div>
    );
};

export default MockProjTab;
