"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
    ArrowLeft, 
    Trophy, 
    Medal, 
    Award, 
    Target,
    BarChart3,
    Users,
    Calendar,
    Star
} from "lucide-react";
import Link from "next/link";

interface MockLeaderboardProps {
    id: string;
    projId: string;
}

// 模拟排行榜数据
const mockLeaderboardData = [
    {
        rank: 1,
        name: "张管理员",
        email: "admin@afora.com",
        avatar: "张",
        points: 1250,
        tasksCompleted: 45,
        tasksAssigned: 50,
        completionRate: 90,
        streak: 15,
        badges: ["Early Bird", "Task Master", "Team Player"],
        isCurrentUser: true
    },
    {
        rank: 2,
        name: "王开发",
        email: "member1@afora.com",
        avatar: "王",
        points: 980,
        tasksCompleted: 38,
        tasksAssigned: 42,
        completionRate: 90.5,
        streak: 12,
        badges: ["Code Wizard", "Problem Solver"],
        isCurrentUser: false
    },
    {
        rank: 3,
        name: "陈设计",
        email: "member2@afora.com",
        avatar: "陈",
        points: 850,
        tasksCompleted: 32,
        tasksAssigned: 38,
        completionRate: 84.2,
        streak: 8,
        badges: ["Creative Genius", "Design Expert"],
        isCurrentUser: false
    },
    {
        rank: 4,
        name: "李演示",
        email: "demo@afora.com",
        avatar: "李",
        points: 720,
        tasksCompleted: 28,
        tasksAssigned: 35,
        completionRate: 80,
        streak: 6,
        badges: ["Presentation Pro"],
        isCurrentUser: false
    },
    {
        rank: 5,
        name: "刘测试",
        email: "member3@afora.com",
        avatar: "刘",
        points: 650,
        tasksCompleted: 25,
        tasksAssigned: 32,
        completionRate: 78.1,
        streak: 4,
        badges: ["Quality Guardian"],
        isCurrentUser: false
    }
];

const MockLeaderboard = ({ id, projId }: MockLeaderboardProps) => {
    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="h-6 w-6 text-yellow-500" />;
            case 2:
                return <Medal className="h-6 w-6 text-gray-400" />;
            case 3:
                return <Award className="h-6 w-6 text-amber-600" />;
            default:
                return <span className="text-lg font-bold text-gray-500">#{rank}</span>;
        }
    };

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 1:
                return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200";
            case 2:
                return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200";
            case 3:
                return "bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200";
            default:
                return "bg-white border-gray-200";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <Link href={`/mock/org/${id}/proj/${projId}`}>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                返回项目
                            </Button>
                        </Link>
                    </div>
                    
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                            <Trophy className="h-10 w-10 text-yellow-500" />
                            团队排行榜
                        </h1>
                        <p className="text-gray-600 text-lg">
                            看看谁是最优秀的团队成员！
                        </p>
                    </div>
                </div>

                {/* 统计概览 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">总参与人数</p>
                                    <p className="text-3xl font-bold text-gray-900">{mockLeaderboardData.length}</p>
                                </div>
                                <Users className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">总积分</p>
                                    <p className="text-3xl font-bold text-purple-600">
                                        {mockLeaderboardData.reduce((acc, user) => acc + user.points, 0)}
                                    </p>
                                </div>
                                <Star className="h-8 w-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">完成任务</p>
                                    <p className="text-3xl font-bold text-green-600">
                                        {mockLeaderboardData.reduce((acc, user) => acc + user.tasksCompleted, 0)}
                                    </p>
                                </div>
                                <Target className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">平均完成率</p>
                                    <p className="text-3xl font-bold text-orange-600">
                                        {Math.round(mockLeaderboardData.reduce((acc, user) => acc + user.completionRate, 0) / mockLeaderboardData.length)}%
                                    </p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 排行榜 */}
                <div className="space-y-4">
                    {mockLeaderboardData.map((user, index) => (
                        <Card 
                            key={user.email} 
                            className={`${getRankColor(user.rank)} ${
                                user.isCurrentUser ? 'ring-2 ring-blue-500' : ''
                            } transition-all duration-300 hover:shadow-lg`}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {/* 排名 */}
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm">
                                            {getRankIcon(user.rank)}
                                        </div>
                                        
                                        {/* 用户信息 */}
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16">
                                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xl font-bold">
                                                    {user.avatar}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-xl font-semibold text-gray-900">
                                                        {user.name}
                                                    </h3>
                                                    {user.isCurrentUser && (
                                                        <Badge variant="default" className="bg-blue-600 text-white">
                                                            你
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 mb-2">{user.email}</p>
                                                
                                                {/* 徽章 */}
                                                <div className="flex flex-wrap gap-1">
                                                    {user.badges.map((badge, badgeIndex) => (
                                                        <Badge 
                                                            key={badgeIndex} 
                                                            variant="secondary" 
                                                            className="text-xs"
                                                        >
                                                            {badge}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* 统计数据 */}
                                    <div className="text-right">
                                        <div className="grid grid-cols-2 gap-6 text-center">
                                            <div>
                                                <p className="text-2xl font-bold text-gray-900">{user.points}</p>
                                                <p className="text-sm text-gray-600">积分</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-green-600">{user.tasksCompleted}</p>
                                                <p className="text-sm text-gray-600">完成任务</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-blue-600">{user.completionRate}%</p>
                                                <p className="text-sm text-gray-600">完成率</p>
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-orange-600">{user.streak}</p>
                                                <p className="text-sm text-gray-600">连续天数</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* 底部信息 */}
                <div className="mt-8 text-center text-gray-500">
                    <p className="text-sm">
                        排行榜每24小时更新一次 • 最后更新：{new Date().toLocaleString('zh-CN')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MockLeaderboard;

