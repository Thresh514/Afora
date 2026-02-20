"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import InviteUserToOrganization from "./InviteUserToOrganization";
import { useEffect, useState, useCallback, useMemo } from "react";
import { collection, QuerySnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/firebase";
import { batchInQueryForHooks } from "@/lib/batchQuery";
import { Users, FolderOpen, ArrowRight, Crown, Search, X } from "lucide-react";
import { toast } from "sonner";
import { removeProjectMember, updateProjectTeamSize, addProjectMember } from "@/actions/actions";
import Image from "next/image";

interface MemberListProps {
    admins: string[];
    members: string[];
    userRole: string;
    orgId: string;
    projectsData?: {
        docs: Array<{
            id: string;
            data: () => {
                projId?: string;
                title?: string;
                members?: string[];
                admins?: string[];
                teamSize?: number;
            };
        }>;
    };
    currentUserEmail?: string;
}

interface ProjectTeam {
    projectId: string;
    projectTitle: string;
    members: string[];
    admins?: string[];
    teamSize: number;
}

const MemberList = ({admins, members, userRole, projectsData, currentUserEmail}: MemberListProps) => {
    const [adminsPfp, setAdminsPfp] = useState<{ [email: string]: string }>({});
    const [membersPfp, setMembersPfp] = useState<{ [email: string]: string }>(
        {},
    );
    const [selectedProject, setSelectedProject] = useState<string | null>("all");
    const [searchTerm, setSearchTerm] = useState<string>("");

    const [results, setResults] = useState<QuerySnapshot<DocumentData> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // 获取用户数据的效果
    useEffect(() => {
        const fetchUserData = async () => {
            const allUsers = [...admins, ...members].filter(Boolean);
            
            if (allUsers.length === 0) {
                setResults(null);
                setLoading(false);
                setError(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const result = await batchInQueryForHooks(
                    collection(db, "users"),
                    "__name__",
                    allUsers
                );
                setResults(result);
            } catch (err) {
                console.error("Error fetching user data:", err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [admins, members]); // 依赖于 admins 和 members 的变化

    // Get projects data
    const projects = useMemo(() => projectsData?.docs || [], [projectsData]);

    useEffect(() => {
        if (!loading && results) {
            const adminsPfpData: { [email: string]: string } = {};
            const membersPfpData: { [email: string]: string } = {};

            if (results) {
                results.docs.forEach((doc) => {
                    const data = doc.data();
                    if (admins.includes(doc.id)) {
                        adminsPfpData[doc.id] = data.userImage;
                    } else if (members.includes(doc.id)) {
                        membersPfpData[doc.id] = data.userImage;
                    }
                });
            }

            setAdminsPfp(adminsPfpData);
            setMembersPfp(membersPfpData);
        }
    }, [results, loading, error, admins, members]);

    // use useMemo to calculate teams, avoid unnecessary recalculation
    const teams = useMemo(() => {
        if (!projects || projects.length === 0) {
            return [];
        }

        return projects.map((proj): ProjectTeam => {
            const projectData = proj.data();
            return {
                projectId: projectData.projId || proj.id,
                projectTitle: projectData.title || "Untitled Project",
                members: Array.isArray(projectData.members)
                    ? projectData.members
                    : [],
                admins: Array.isArray(projectData.admins)
                    ? projectData.admins
                    : [],
                teamSize:
                    typeof projectData.teamSize === "number"
                        ? projectData.teamSize  
                        : 3,
            };
        });
    }, [projects]);

    const projectTeams = teams;

    // 计算用户被分配到的项目
    const userAssignedProjects = useMemo(() => {
        if (userRole === "admin") {
            return projectTeams; // 管理员可以看到所有项目
        }

        // 对于普通用户，使用传入的 currentUserEmail
        if (!currentUserEmail) {
            return []; // 如果没有当前用户邮箱，返回空数组
        }

        return projectTeams.filter((team: ProjectTeam) =>
            team.members.includes(currentUserEmail) || 
            (team.admins && team.admins.includes(currentUserEmail)),
        );
    }, [projectTeams, userRole, currentUserEmail]);

    // 所有成员列表（包括管理员和普通成员）
    // const allMembers = useMemo(() => {
    //     return [...admins, ...members];
    // }, [admins, members]);

    // 搜索过滤逻辑
    const filteredAdmins = useMemo(() => {
        if (!searchTerm.trim()) return admins;
        return admins.filter(admin => 
            admin.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [admins, searchTerm]);

    const filteredMembers = useMemo(() => {
        if (!searchTerm.trim()) return members;
        return members.filter(member => 
            member.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [members, searchTerm]);



    const handleMemberMove = useCallback(
        async (
            memberEmail: string,
            fromProjectId: string | null,
            toProjectId: string | null,
        ) => {
            try {
                // Handle removing from source project
                if (fromProjectId) {
                    const result = await removeProjectMember(
                        fromProjectId,
                        memberEmail,
                    );
                    if (!result.success) {
                        toast.error(
                            result.message ||
                                "Failed to remove member from project",
                        );
                        return;
                    }
                }

                // Handle adding to destination project
                if (toProjectId) {
                    // Use addProjectMember function which includes capacity check
                    const result = await addProjectMember(
                        toProjectId,
                        memberEmail,
                        "member"
                    );
                    if (!result.success) {
                        toast.error(
                            result.message ||
                                "Failed to add member to project",
                        );
                        return;
                    }
                }

                const action =
                    fromProjectId && toProjectId
                        ? "moved"
                        : fromProjectId
                          ? "removed from project"
                          : "added to project";
                toast.success(`Member ${action} successfully!`);
            } catch (error) {
                console.error("Error moving member:", error);
                toast.error("Failed to move member. Please try again.");
            }
        },
        [],
    );

    const updateTeamSize = useCallback(
        async (projectId: string, newSize: number) => {
            try {
                const result = await updateProjectTeamSize(projectId, newSize);

                if (result.success) {
                    toast.success("Team size updated successfully!");
                } else {
                    toast.error(result.message || "Failed to update team size");
                }
            } catch (error) {
                console.error("Error updating team size:", error);
                toast.error("Failed to update team size");
            }
        },
        [],
    );

    const renderMemberCard = useCallback(
        (
            memberEmail: string,
            isAdmin: boolean,
            showActions: boolean = false,
            projectId?: string,
        ) => {
            const pfpData = isAdmin ? adminsPfp : membersPfp;

            return (
                <div className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Image
                                src={
                                    pfpData[memberEmail] ||
                                    "https://static.vecteezy.com/system/resources/previews/024/983/914/non_2x/simple-user-default-icon-free-png.png"
                                }
                                alt="Avatar"
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full border-2 border-gray-100 object-cover"
                            />
                            {isAdmin && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                                    <Crown className="h-3 w-3 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium text-gray-900">
                                {memberEmail}
                            </span>
                            {isAdmin && (
                                <Badge
                                    variant="secondary"
                                    className="text-xs w-fit mt-1"
                                >
                                    Admin
                                </Badge>
                            )}
                        </div>
                    </div>

                    {showActions && userRole === "admin" && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {projectId && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() =>
                                        handleMemberMove(memberEmail, projectId, null)
                                    }
                                >
                                    Remove
                                </Button>
                            )}
                            {!projectId && projectTeams.length > 0 && (
                                <Select
                                    onValueChange={(selectedProjectId) => {
                                        handleMemberMove(memberEmail, null, selectedProjectId);
                                    }}
                                >
                                    <SelectTrigger className="w-32 h-8">
                                        <SelectValue placeholder="Add to" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectTeams.map((team: ProjectTeam) => {
                                            // 检查成员是否已经在这个项目中
                                            const isAlreadyMember = team.members.includes(memberEmail) || 
                                                                   (team.admins && team.admins.includes(memberEmail));
                                            return (
                                                <SelectItem
                                                    key={team.projectId}
                                                    value={team.projectId}
                                                    disabled={isAlreadyMember}
                                                >
                                                    {team.projectTitle} {isAlreadyMember ? "(Already member)" : ""}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}
                </div>
            );
        },
        [adminsPfp, membersPfp, userRole, projectTeams, handleMemberMove],
    );

    const selectedProjectData = projectTeams.find(
        (team: ProjectTeam) => team.projectId === selectedProject,
    );
    const totalMembers = [...admins, ...members].length;
    const assignedMembers = projectTeams.reduce(
        (total: number, team: ProjectTeam) => total + (team.members?.length || 0) + (team.admins?.length || 0),
        0,
    );

    return (
        <div className="flex h-auto bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg overflow-hidden">
            {/* Left Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                            <Users className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold">Team Management</h2>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        {userRole === "admin" ? (
                            <>
                                <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                                    <div className="text-2xl font-bold">
                                        {totalMembers}
                                    </div>
                                    <div className="text-xs opacity-90">
                                        Total Members
                                    </div>
                                </div>
                                <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                                    <div className="text-2xl font-bold">
                                        {assignedMembers}
                                    </div>
                                    <div className="text-xs opacity-90">
                                        Assigned
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                                    <div className="text-2xl font-bold">
                                        {projectTeams.reduce(
                                            (
                                                total: number,
                                                team: ProjectTeam,
                                            ) => total + team.teamSize,
                                            0,
                                        )}
                                    </div>
                                    <div className="text-xs opacity-90">
                                        Total Spots
                                    </div>
                                </div>
                                <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                                    <div className="text-2xl font-bold">
                                        {assignedMembers}
                                    </div>
                                    <div className="text-xs opacity-90">
                                        Assigned
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-4">
                        {/* Overview Card */}
                        <div className="text-sm font-medium text-gray-500">
                            Group Overview
                        </div>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            Admins
                                        </span>
                                        <Badge variant="secondary">
                                            {admins.length}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            Members
                                        </span>
                                        <Badge variant="secondary">
                                            {members.length}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            Active Teams
                                        </span>
                                        <Badge variant="secondary">
                                            {projectTeams.length}
                                        </Badge>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">
                                            Available Members
                                        </span>
                                        <Badge variant="default">
                                            {totalMembers}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        {/* Team List */}
                        <div className="space-y-3">
                            <div className="text-sm font-medium text-gray-500">
                                {userRole === "admin"
                                    ? "Team List"
                                    : "My Teams"}
                            </div>
                            
                            {/* All Team Members Option */}
                            {userRole === "admin" && (
                                <div
                                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                                        selectedProject === "all"
                                            ? "bg-green-50 border-2 border-green-200 shadow-md"
                                            : "bg-green-25 border border-green-200 hover:bg-green-50"
                                    }`}
                                    onClick={() => setSelectedProject("all")}
                                >
                                    <div className="flex items-center gap-3">
                                        <Users
                                            className={`h-5 w-5 ${
                                                selectedProject === "all"
                                                    ? "text-green-600"
                                                    : "text-green-400"
                                            }`}
                                        />
                                        <div className="flex-1">
                                            <div
                                                className={`font-medium ${
                                                    selectedProject === "all"
                                                        ? "text-green-900"
                                                        : "text-green-700"
                                                }`}
                                            >
                                                All Team Members
                                            </div>
                                            <div className="text-sm text-green-600">
                                                {totalMembers} members
                                            </div>
                                        </div>
                                        {selectedProject === "all" && (
                                            <ArrowRight className="h-4 w-4 text-green-600" />
                                        )}
                                    </div>
                                </div>
                            )}
                            {userAssignedProjects.length === 0 ? (
                                <div className="text-center py-8">
                                    <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                                        {userRole === "admin"
                                            ? "No teams"
                                            : "You have not been assigned to any teams"}
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">
                                        {userRole === "admin"
                                            ? "There are no teams in this organization."
                                            : "Please contact the administrator to be assigned to a team."}
                                    </p>
                                </div>
                            ) : (
                                userAssignedProjects.map(
                                    (team: ProjectTeam) => (
                                        <div
                                            key={team.projectId}
                                            className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                                                selectedProject ===
                                                team.projectId
                                                    ? "bg-blue-50 border-2 border-blue-200 shadow-md"
                                                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:shadow-sm"
                                            }`}
                                            onClick={() =>
                                                setSelectedProject(
                                                    team.projectId,
                                                )
                                            }
                                        >
                                            <div className="flex items-center gap-3">
                                                <FolderOpen
                                                    className={`h-5 w-5 ${
                                                        selectedProject ===
                                                        team.projectId
                                                            ? "text-blue-600"
                                                            : "text-gray-400"
                                                    }`}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div
                                                        className={`font-medium truncate ${
                                                            selectedProject ===
                                                            team.projectId
                                                                ? "text-blue-900"
                                                                : "text-gray-900"
                                                        }`}
                                                    >
                                                        {team.projectTitle}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {(team.members?.length || 0) + (team.admins?.length || 0)} members
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex gap-1">
                                                        <Badge variant="secondary">
                                                            Active
                                                        </Badge>
                                                    </div>
                                                    {selectedProject ===
                                                        team.projectId && (
                                                        <ArrowRight className="h-4 w-4 text-blue-600" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ),
                                )
                            )}

                        </div>
                    </div>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col bg-white">
                {/* Content Header */}
                <div className="p-6 border-b border-gray-200 bg-white">
                    {selectedProject === "all" ? (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                All Team Members
                            </h3>
                            <p className="text-sm text-gray-500">
                                View detailed information about all group members
                            </p>
                        </div>
                    ) : selectedProject ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {selectedProjectData?.projectTitle}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {(selectedProjectData?.members.length || 0) + (selectedProjectData?.admins?.length || 0)} team members
                                </p>
                            </div>
                            {userRole === "admin" && selectedProjectData && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">
                                        Team Size:
                                    </span>
                                    <Select
                                        value={selectedProjectData.teamSize.toString()}
                                        onValueChange={(value) => {
                                            const newSize = parseInt(value);
                                            if (!isNaN(newSize)) {
                                                updateTeamSize(
                                                    selectedProject,
                                                    newSize,
                                                );
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[2, 3, 4, 5, 6, 7, 8].map((size) => (
                                                <SelectItem
                                                    key={size}
                                                    value={size.toString()}
                                                >
                                                    {size}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {userRole === "admin"
                                    ? "Select Team"
                                    : "My Team Members"}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {userRole === "admin"
                                    ? "Select a team from the left to view team members"
                                    : "Select a team from the left to view your team members"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {selectedProject === "all" ? (
                        <div className="space-y-6">
                            {/* Search Bar */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search members by email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                {searchTerm && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <button
                                            onClick={() => setSearchTerm("")}
                                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Admins Section */}
                            <div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                                        <Crown className="h-4 w-4 text-yellow-500" />
                                        Admins ({filteredAdmins.length}{searchTerm ? ` of ${admins.length}` : ""})
                                        {userRole === "admin" && <InviteUserToOrganization defaultAccessRole="admin" />}
                                    </h4>
                                </div>
                                <div className="grid gap-3">
                                    {filteredAdmins.length > 0 ? (
                                        filteredAdmins.map((admin: string) => (
                                            <div key={`admin-${admin}`}>
                                                {renderMemberCard(admin, true, true)}
                                            </div>
                                        ))
                                    ) : searchTerm ? (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                            No admins found matching &quot;{searchTerm}&quot;
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <Separator />

                            {/* Members Section */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-500" />
                                    Members ({filteredMembers.length}{searchTerm ? ` of ${members.length}` : ""})
                                    {userRole === "admin" && <InviteUserToOrganization defaultAccessRole="member" />}
                                </h4>
                                <div className="grid gap-3">
                                    {filteredMembers.length > 0 ? (
                                        filteredMembers.map((member: string) => (
                                            <div key={`member-${member}`}>
                                                {renderMemberCard(member, false, true)}
                                            </div>
                                        ))
                                    ) : searchTerm ? (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                            No members found matching &quot;{searchTerm}&quot;
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : selectedProject ? (
                        <div className="space-y-6">
                            {/* Project Team Members */}
                            {selectedProjectData && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-4">
                                        Current Team Members
                                    </h4>
                                    <div className="grid gap-3">
                                        {/* 显示项目管理员 */}
                                        {selectedProjectData.admins?.map(
                                            (admin: string) => (
                                                <div key={`admin-${admin}`}>
                                                    {renderMemberCard(admin, true, true, selectedProject)}
                                                </div>
                                            ),
                                        )}
                                        {/* 显示项目成员 */}
                                        {selectedProjectData.members?.map(
                                            (member: string) => (
                                                <div key={`member-${member}`}>
                                                    {renderMemberCard(member, admins.includes(member), true, selectedProject)}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            {userAssignedProjects.length === 0 && (
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        {userRole === "admin"
                                            ? "No team data"
                                            : "You have not been assigned to any teams"}
                                    </h3>
                                    <p className="text-gray-500 mb-4">
                                        {userRole === "admin"
                                            ? "There are no teams in this group. Please check the following:"
                                            : "Please contact the administrator to be assigned to a team."}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberList;
