"use client";
import { db } from "@/firebase";
import { Project, Task, Organization } from "@/types/types";
import {collection, getDocs, query, where, doc} from "firebase/firestore";
import React, { useEffect, useState, useTransition } from "react";
import { useCollection, useDocument } from "react-firebase-hooks/firestore";
import { Button } from "./ui/button";
import { updateProjects } from "@/actions/actions";
import { toast } from "sonner";
import ProjectCard from "./ProjectCard";
import {Folder, Users, Briefcase} from "lucide-react";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import CreateProjectDialog from "./CreateProjectDialog";

type MatchingOutput = {
    groupSize: number;
    groups: string[][];
};

const ProjTab = ({
    orgId,
    userRole,
    userId,
}: {
    userId: string;
    userRole: string;
    orgId: string;
}) => {
    const [isPending, startTransition] = useTransition();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [output, setOutput] = useState("");
    const [parsedOutput, setParsedOutput] = useState<MatchingOutput | null>(null);
    const [projectTasks, setProjectTasks] = useState<{[key: string]: Task[]}>({});

    const adminQ = query(collection(db, "projects"), where("orgId", "==", orgId));
    const [allProjects] = useCollection(adminQ);
    
    // 获取组织数据
    const [org] = useDocument(doc(db, "organizations", orgId));
    const orgData = org?.data() as Organization;

    const userQ = query(
        collection(db, "users", userId, "projs"),
        where("orgId", "==", orgId),
    );
    const [userProjects, userLoading, userError] = useCollection(userQ);
    const [userProjList, setUserProjList] = useState<Project[]>([]);

    useEffect(() => {
        const fetchProjects = async () => {
            if (
                !userLoading &&
                !userError &&
                userProjects &&
                userProjects.docs.length > 0
            ) {
                const projectIds = userProjects.docs
                    .map((doc) => doc.id)
                    .filter(Boolean);
                if (projectIds.length > 0) {
                    try {
                        const projectDocs = await getDocs(
                            query(
                                collection(db, "projects"),
                                where("__name__", "in", projectIds),
                            ),
                        );
                        const projects = projectDocs.docs.map(
                            (doc) => ({
                                ...(doc.data() as Project),
                                projId: doc.id
                            }),
                            
                        );
                        setUserProjList(projects);
                    } catch (error) {
                        console.error("Error fetching user projects:", error);
                        toast.error("Failed to fetch your projects");
                    }
                }
            } else if (
                !userLoading &&
                !userError &&
                (!userProjects || userProjects.docs.length === 0)
            ) {
                setUserProjList([]);
            }
        };
        fetchProjects();
    }, [userProjects, userLoading, userError]);

    useEffect(() => {
        if (output) {
            try {
                const parsed: MatchingOutput = JSON.parse(output);
                setParsedOutput(parsed);
            } catch (error) {
                console.error("Error parsing output:", error);
            }
        }
    }, [output]);

    // Fetch project tasks for each project
    useEffect(() => {
        const fetchProjectTasks = async () => {
            if (!allProjects || allProjects.docs.length === 0) return;

            const tasksMap: {[key: string]: Task[]} = {};
            
            for (const projectDoc of allProjects.docs) {
                const projectId = projectDoc.id;
                try {
                    const stagesQuery = query(
                        collection(db, "projects", projectId, "stages")
                    );
                    const stagesSnapshot = await getDocs(stagesQuery);
                    
                    const allTasks: Task[] = [];
                    
                    for (const stageDoc of stagesSnapshot.docs) {
                        const tasksQuery = query(
                            collection(db, "projects", projectId, "stages", stageDoc.id, "tasks")
                        );
                        const tasksSnapshot = await getDocs(tasksQuery);
                        
                        const stageTasks = tasksSnapshot.docs.map(doc => ({
                            ...(doc.data() as Task),
                            id: doc.id
                        }));
                        
                        allTasks.push(...stageTasks);
                    }
                    
                    tasksMap[projectId] = allTasks;
                } catch (error) {
                    console.error(`Error fetching tasks for project ${projectId}:`, error);
                }
            }
            
            setProjectTasks(tasksMap);
        };

        fetchProjectTasks();
    }, [allProjects, refreshTrigger]);

    const handleAccept = () => {
        if (!parsedOutput) return;

        startTransition(async () => {
            try {
                const result = await updateProjects(orgId, parsedOutput.groups);
                if (result?.success) {
                    toast.success("Teams updated successfully!");
                    setOutput("");
                    setParsedOutput(null);
                    setRefreshTrigger((prev: number) => prev + 1);
                } else {
                    toast.error(result?.message || "Failed to update projects");
                }
            } catch (error) {
                console.error("Failed to update projects:", error);
                toast.error("Failed to update teams");
            }
        });
    };

    const handleProjectCreated = () => {
        setRefreshTrigger((prev: number) => prev + 1);
    };

    const totalProjects = allProjects?.docs.length || 0;
    const activeProjects = userRole === "admin" 
        ? (allProjects?.docs || []).filter(proj => (proj.data() as Project).members?.length > 0).length
        : userProjList.length;

    // 根据用户角色决定显示哪些项目
    const displayProjects = userRole === "admin" 
        ? (allProjects?.docs || []).map((doc) => ({
            ...(doc.data() as Project),
            projId: doc.id
        }))
        : userProjList;

    return (
        <div className="flex h-auto bg-gradient-to-br from-gray-50 to-purple-50 rounded-lg overflow-hidden py-12">
            {/* Left Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold">
                            Team Management
                        </h2>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                            <div className="text-2xl font-bold">
                                {totalProjects}
                            </div>
                            <div className="text-xs opacity-90">
                                Total Teams
                            </div>
                        </div>
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-lg">
                            <div className="text-2xl font-bold">
                                {activeProjects}
                            </div>
                            <div className="text-xs opacity-90">Active</div>
                        </div>
                    </div>
                </div>
                

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                            <div className="text-sm font-medium text-gray-500">
                                Team Overview
                            </div>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">
                                                Total Teams
                                            </span>
                                            <Badge variant="secondary">
                                                {totalProjects}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">
                                                Active Teams
                                            </span>
                                            <Badge variant="default">
                                                {activeProjects}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">
                                                Role
                                            </span>
                                            <Badge
                                                variant={userRole === "admin" ? "destructive" : "secondary"}
                                            >
                                                {userRole === "admin" ? "Admin" : "Member"}
                                            </Badge>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">
                                                Total Members
                                            </span>
                                            <Badge variant="outline">
                                                {orgData ? (orgData.admins?.length || 0) + (orgData.members?.length || 0) : 0}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="space-y-2">
                        {userRole === "admin" && (
                            <>
                                <CreateProjectDialog 
                                    orgId={orgId} 
                                    totalProjects={totalProjects}
                                    userRole={userRole as "admin" | "member"}
                                    onProjectCreated={handleProjectCreated} 
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col bg-white">
                {/* Team Generation Results */}
                {output && parsedOutput && parsedOutput.groups && (
                    <div className="p-6 border-b border-gray-200 bg-blue-50">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Generated Team Groups
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            {parsedOutput.groups.map((group, index) => (
                                <div
                                    key={index}
                                    className="bg-white p-4 rounded-lg shadow-sm border"
                                >
                                    <h4 className="font-medium text-gray-900 mb-2">
                                        Group {index + 1}
                                    </h4>
                                    <ul className="space-y-1">
                                        {group.map((member, memberIndex) => (
                                            <li
                                                key={memberIndex}
                                                className="text-sm text-gray-600 flex items-center gap-2"
                                            >
                                                <Users className="h-3 w-3" />
                                                {member}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end space-x-4">
                            <Button disabled={isPending} onClick={handleAccept}>
                                {isPending ? "Accepting..." : "Accept Groups"}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setOutput("")}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Content Header */}
                <div className="p-6 border-b border-gray-200 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Team Overview
                    </h3>
                    <p className="text-sm text-gray-500">
                        Manage and monitor all your teams
                    </p>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-6">
                            {displayProjects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {displayProjects
                                        .sort((a, b) =>
                                            a.title.localeCompare(b.title),
                                        )
                                        .map((proj) => (
                                            <div
                                                key={proj.projId}
                                                className="group"
                                            >
                                                <ProjectCard
                                                    orgId={orgId}
                                                    projId={proj.projId}
                                                    projectName={proj.title}
                                                    members={proj.members}
                                                    tasks={projectTasks[proj.projId] || []}
                                                    backgroundImage=""
                                                />
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 max-w-md mx-auto">
                                        <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            {userRole === "admin"
                                                ? "Welcome to Team Management!"
                                                : "No teams assigned"}
                                        </h3>
                                        <p className="text-gray-500 mb-4">
                                            {userRole === "admin"
                                                ? "Start creating your first team, experience the new task pool management system"
                                                : "Wait for admins to create teams and assign you"}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                </div>
            </div>
        </div>
    );
};

export default ProjTab;
