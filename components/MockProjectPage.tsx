"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
    ArrowLeft, 
    Trophy, 
    Target, 
    BarChart3, 
    Users, 
    Edit, 
    Save, 
    PencilLine,
    LockKeyhole,
    NotepadText,
    CircleCheck,
    Calendar,
    Clock,
    CheckCircle,
    PlayCircle,
    PauseCircle,
    Plus,
    MoreVertical,
    EditIcon,
    Trash2
} from "lucide-react";
import Link from "next/link";

interface MockProjectPageProps {
    id: string;
    projId: string;
}

// 静态项目数据
const mockProjectData = {
    "proj-1": {
        id: "proj-1",
        title: "AI驱动的团队协作平台",
        description: "构建一个智能化的团队协作平台，利用AI技术提升团队效率",
        status: "active",
        createdAt: "2024-01-20T09:00:00Z",
        members: ["admin@afora.com", "member1@afora.com", "member2@afora.com"],
        admins: ["admin@afora.com"],
        progress: 75,
        totalTasks: 24,
        completedTasks: 18,
        stages: [
            {
                id: "stage-1",
                title: "需求分析与设计",
                order: 0,
                tasksCompleted: 8,
                totalTasks: 8,
                status: "completed"
            },
            {
                id: "stage-2", 
                title: "核心功能开发",
                order: 1,
                tasksCompleted: 6,
                totalTasks: 10,
                status: "in_progress"
            },
            {
                id: "stage-3",
                title: "测试与优化",
                order: 2,
                tasksCompleted: 4,
                totalTasks: 6,
                status: "locked"
            }
        ],
        teamCharter: {
            responses: [
                "构建一个智能化的团队协作平台，利用AI技术提升团队效率，让团队协作更加智能和高效。",
                "1. 完成需求分析和系统设计\n2. 开发核心AI功能模块\n3. 实现智能任务分配系统\n4. 构建团队分析报告工具\n5. 进行系统测试和优化",
                "我们采用敏捷开发方法，每周进行迭代，确保项目按时交付。",
                "预计12周完成整个项目",
                "通过AI技术提升团队协作效率，减少沟通成本，提高项目成功率。"
            ]
        }
    },
    "proj-2": {
        id: "proj-2",
        title: "智能任务分配系统",
        description: "开发基于AI的任务自动分配和优化系统",
        status: "planning",
        createdAt: "2024-02-01T14:30:00Z",
        members: ["demo@afora.com", "member2@afora.com", "member3@afora.com"],
        admins: ["demo@afora.com"],
        progress: 30,
        totalTasks: 15,
        completedTasks: 4,
        stages: [
            {
                id: "stage-4",
                title: "技术调研",
                order: 0,
                tasksCompleted: 4,
                totalTasks: 6,
                status: "in_progress"
            },
            {
                id: "stage-5",
                title: "算法设计",
                order: 1,
                tasksCompleted: 0,
                totalTasks: 5,
                status: "locked"
            },
            {
                id: "stage-6",
                title: "系统实现",
                order: 2,
                tasksCompleted: 0,
                totalTasks: 4,
                status: "locked"
            }
        ],
        teamCharter: {
            responses: [
                "开发一个基于AI的智能任务分配系统，能够根据团队成员的能力、工作负载和偏好自动分配任务。",
                "1. 完成技术调研和可行性分析\n2. 设计AI算法模型\n3. 开发核心分配引擎\n4. 集成到现有平台\n5. 进行测试和优化",
                "采用迭代开发模式，每两周一个sprint，确保快速交付。",
                "预计8周完成",
                "通过智能任务分配，提高团队工作效率，减少人工分配的时间成本。"
            ]
        }
    },
    "proj-3": {
        id: "proj-3",
        title: "团队分析报告工具",
        description: "创建团队协作效率分析和报告生成工具",
        status: "completed",
        createdAt: "2024-01-10T11:15:00Z",
        members: ["admin@afora.com", "member1@afora.com", "member3@afora.com"],
        admins: ["admin@afora.com"],
        progress: 100,
        totalTasks: 12,
        completedTasks: 12,
        stages: [
            {
                id: "stage-7",
                title: "需求分析",
                order: 0,
                tasksCompleted: 3,
                totalTasks: 3,
                status: "completed"
            },
            {
                id: "stage-8",
                title: "功能开发",
                order: 1,
                tasksCompleted: 6,
                totalTasks: 6,
                status: "completed"
            },
            {
                id: "stage-9",
                title: "测试部署",
                order: 2,
                tasksCompleted: 3,
                totalTasks: 3,
                status: "completed"
            }
        ],
        teamCharter: {
            responses: [
                "开发一个团队协作效率分析工具，能够生成详细的团队表现报告，帮助管理者了解团队状态。",
                "1. 完成需求分析\n2. 设计数据收集机制\n3. 开发分析算法\n4. 构建报告生成系统\n5. 进行测试和部署",
                "采用瀑布模型，确保每个阶段都充分完成。",
                "预计6周完成",
                "通过数据分析帮助团队持续改进，提升整体协作效率。"
            ]
        }
    }
};

const MockProjectPage = ({ id, projId }: MockProjectPageProps) => {
    const [activeTab, setActiveTab] = useState("roadmap");
    const [isEditing, setIsEditing] = useState(false);
    
    const project = mockProjectData[projId as keyof typeof mockProjectData];
    
    if (!project) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">项目未找到</h1>
                    <Link href="/mock">
                        <Button>返回组织页面</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "in_progress":
                return <PlayCircle className="h-4 w-4 text-yellow-500" />;
            case "locked":
                return <LockKeyhole className="h-4 w-4 text-gray-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800 border-green-200";
            case "in_progress":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "locked":
                return "bg-gray-100 text-gray-800 border-gray-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "completed":
                return "已完成";
            case "in_progress":
                return "进行中";
            case "locked":
                return "已锁定";
            default:
                return "未知";
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-gray-100">
            {/* Header Section */}
            <div className="relative">
                <div
                    className="bg-gradient-to-r from-[#6F61EF] to-purple-600 h-64 flex items-center justify-center bg-cover bg-center"
                    style={{
                        backgroundImage: `linear-gradient(135deg, #6F61EF 0%, #8B7ED8 50%, #B794F6 100%)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                >
                    {/* 返回按钮 */}
                    <div className="absolute top-4 left-4">
                        <Link href="/mock">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                返回组织
                            </Button>
                        </Link>
                    </div>

                    {/* 半透明卡片 */}
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
                            {/* 项目信息部分 */}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                                        {project.title}
                                    </h1>
                                    <div className="flex items-center gap-3">
                                        <Link href={`/mock/org/${id}/proj/${projId}/leaderboard`}>
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
                                            variant="ghost"
                                            size="sm"
                                            className="text-white hover:bg-white/20 transition-colors"
                                            onClick={() => setIsEditing(!isEditing)}
                                        >
                                            {isEditing ? "Save" : "Edit"}
                                            {isEditing ? (
                                                <Save className="ml-1 h-4 w-4" />
                                            ) : (
                                                <PencilLine className="ml-1 h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl md:text-2xl font-semibold text-white">
                                        Team Overview
                                    </h2>
                                    <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-3 inline-flex items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-white text-sm font-medium">
                                                Progress:
                                            </span>
                                            <div className="bg-white bg-opacity-30 rounded-full h-2 w-48 overflow-hidden">
                                                <div
                                                    className="h-full bg-white rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${project.progress}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className="font-bold text-white text-lg min-w-[3rem]">
                                                {project.progress}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section with Tabs */}
            <div className="flex-1 p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                        {/* 项目统计卡片 */}
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
                                            {project.totalTasks}
                                        </div>
                                    </div>
                                    <div className="text-center flex flex-row items-center gap-2">
                                        <div className="text-sm text-gray-500">
                                            Completed:
                                        </div>
                                        <div className="text-xl font-bold text-green-600">
                                            {project.completedTasks}
                                        </div>
                                    </div>
                                    <div className="text-center flex flex-row items-center gap-2">
                                        <div className="text-sm text-gray-500">
                                            Assigned:
                                        </div>
                                        <div className="text-xl font-bold text-yellow-600">
                                            {Math.floor(project.completedTasks * 0.8)}
                                        </div>
                                    </div>
                                    <div className="text-center flex flex-row items-center gap-2">
                                        <div className="text-sm text-gray-500">
                                            Available:
                                        </div>
                                        <div className="text-xl font-bold text-gray-600">
                                            {project.totalTasks - project.completedTasks - Math.floor(project.completedTasks * 0.8)}
                                        </div>
                                    </div>
                                    <div className="text-center flex flex-row items-center gap-2">
                                        <div className="text-sm text-gray-500">
                                            Overdue:
                                        </div>
                                        <div className="text-xl font-bold text-red-600">
                                            2
                                        </div>
                                    </div>
                                    <div className="text-center flex flex-row items-center gap-2">
                                        <div className="text-sm text-gray-500">
                                            Completion Rate:
                                        </div>
                                        <div className="text-xl font-bold text-purple-600">
                                            {project.progress.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 阶段列表 */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                                    Team Stages
                                </h3>
                                {project.stages.map((stage, index) => (
                                    <div
                                        key={stage.id}
                                        className={`block p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 ${
                                            stage.status === "locked" ? 'opacity-50' : ''
                                        }`}
                                    >
                                        <div className="flex w-full justify-between items-center">
                                            <span className="text-lg font-semibold">
                                                {index + 1}. {stage.title}
                                            </span>
                                            <span className="flex items-center text-sm text-gray-500">
                                                {stage.status === "locked" && (
                                                    <LockKeyhole className="mr-4" />
                                                )}
                                                {stage.status === "in_progress" && (
                                                    <NotepadText className="mr-4 text-yellow-500" />
                                                )}
                                                {stage.status === "completed" && (
                                                    <CircleCheck className="mr-4 text-green-500" />
                                                )}
                                                {`${stage.tasksCompleted} / ${stage.totalTasks} tasks completed`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="team-analytics" className="space-y-6">
                        {/* 团队成员部分 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    Team Members
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3">
                                    {project.members.map((member: string, index: number) => {
                                        const isMemberAdmin = project.admins?.includes(member) || false;
                                        return (
                                            <div
                                                key={index}
                                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-medium">
                                                        {member.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">
                                                        {member}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge
                                                            variant={isMemberAdmin ? "default" : "secondary"}
                                                            className={`text-xs ${isMemberAdmin ? "bg-blue-600 text-white" : ""}`}
                                                        >
                                                            {isMemberAdmin ? "Admin" : "Team Member"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Team Charter 部分 */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Edit className="h-5 w-5 text-green-600" />
                                    Team Charter
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {project.teamCharter.responses.map((response, index) => (
                                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-2">
                                                问题 {index + 1}
                                            </h4>
                                            <p className="text-gray-700 whitespace-pre-line">
                                                {response}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default MockProjectPage;

