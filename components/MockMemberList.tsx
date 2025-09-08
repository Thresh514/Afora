"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
    Users, 
    Crown, 
    UserPlus, 
    Mail,
    Calendar,
    BarChart3,
    Target
} from "lucide-react";

interface MockMemberListProps {
    admins: string[];
    members: string[];
    orgId: string;
}

const MockMemberList = ({ admins, members, orgId }: MockMemberListProps) => {
    // Mock member details
    const mockMemberDetails = {
        "admin@afora.com": {
            name: "Alex Johnson",
            role: "admin",
            joinDate: "2024-01-01",
            projects: 3,
            tasksCompleted: 45,
            avatar: "AJ"
        },
        "demo@afora.com": {
            name: "Sarah Chen",
            role: "admin", 
            joinDate: "2024-01-15",
            projects: 2,
            tasksCompleted: 32,
            avatar: "SC"
        },
        "member1@afora.com": {
            name: "Mike Rodriguez",
            role: "member",
            joinDate: "2024-01-20",
            projects: 2,
            tasksCompleted: 28,
            avatar: "MR"
        },
        "member2@afora.com": {
            name: "Emma Wilson",
            role: "member",
            joinDate: "2024-02-01",
            projects: 1,
            tasksCompleted: 18,
            avatar: "EW"
        },
        "member3@afora.com": {
            name: "David Kim",
            role: "member",
            joinDate: "2024-02-10",
            projects: 1,
            tasksCompleted: 15,
            avatar: "DK"
        }
    };

    const allMembers = [...admins, ...members];
    const totalMembers = allMembers.length;
    const totalAdmins = admins.length;
    const totalRegularMembers = members.length;

    return (
        <div className="space-y-6">
            {/* Member Statistics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Members</p>
                                <p className="text-2xl font-bold text-gray-900">{totalMembers}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Admins</p>
                                <p className="text-2xl font-bold text-purple-600">{totalAdmins}</p>
                            </div>
                            <Crown className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Team Members</p>
                                <p className="text-2xl font-bold text-green-600">{totalRegularMembers}</p>
                            </div>
                            <Users className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Admin List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-purple-600" />
                        Administrators ({totalAdmins})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {admins.map((email, index) => {
                            const memberInfo = mockMemberDetails[email as keyof typeof mockMemberDetails];
                            return (
                                <div
                                    key={email}
                                    className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200"
                                >
                                    <Avatar className="h-12 w-12">
                                        <AvatarFallback className="bg-purple-500 text-white font-medium">
                                            {memberInfo?.avatar || email.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">
                                                {memberInfo?.name || email}
                                            </h3>
                                            <Badge variant="default" className="bg-purple-600 text-white">
                                                <Crown className="h-3 w-3 mr-1" />
                                                Admin
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{email}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>Joined {memberInfo?.joinDate}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Target className="h-3 w-3" />
                                                <span>{memberInfo?.projects} projects</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <BarChart3 className="h-3 w-3" />
                                                <span>{memberInfo?.tasksCompleted} tasks</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Team Members List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-600" />
                        Team Members ({totalRegularMembers})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.map((email, index) => {
                            const memberInfo = mockMemberDetails[email as keyof typeof mockMemberDetails];
                            return (
                                <div
                                    key={email}
                                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                >
                                    <Avatar className="h-12 w-12">
                                        <AvatarFallback className="bg-green-500 text-white font-medium">
                                            {memberInfo?.avatar || email.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-gray-900">
                                                {memberInfo?.name || email}
                                            </h3>
                                            <Badge variant="secondary">
                                                Member
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{email}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>Joined {memberInfo?.joinDate}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Target className="h-3 w-3" />
                                                <span>{memberInfo?.projects} projects</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <BarChart3 className="h-3 w-3" />
                                                <span>{memberInfo?.tasksCompleted} tasks</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Invite New Member Button */}
            <div className="flex justify-center pt-4">
                <Button className="bg-[#6F61EF] hover:bg-[#5646e4] text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite New Member
                </Button>
            </div>
        </div>
    );
};

export default MockMemberList;
