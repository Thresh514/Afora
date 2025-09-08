"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trophy, Target, BarChart3, Eye, EyeOff, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import MockProjTab from "./MockProjTab";
import MockMemberList from "./MockMemberList";

// Static data
const mockOrgData = {
    id: "mock-org-1",
    title: "Afora Demo Team",
    description: "A comprehensive demonstration team showcasing all Afora platform features and capabilities",
    backgroundImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    admins: ["admin@afora.com", "demo@afora.com"],
    members: ["member1@afora.com", "member2@afora.com", "member3@afora.com"],
    createdAt: "2024-01-15T10:00:00Z",
    imageUrl: "/logoFull.svg"
};

const mockProjectsData = [
    {
        id: "proj-1",
        title: "AI-Powered Team Collaboration Platform",
        description: "Building an intelligent team collaboration platform that leverages AI technology to enhance team efficiency",
        status: "active",
        createdAt: "2024-01-20T09:00:00Z",
        members: ["admin@afora.com", "member1@afora.com", "member2@afora.com"],
        admins: ["admin@afora.com"],
        progress: 75,
        totalTasks: 24,
        completedTasks: 18
    },
    {
        id: "proj-2", 
        title: "Smart Task Assignment System",
        description: "Developing an AI-based automated task assignment and optimization system",
        status: "planning",
        createdAt: "2024-02-01T14:30:00Z",
        members: ["demo@afora.com", "member2@afora.com", "member3@afora.com"],
        admins: ["demo@afora.com"],
        progress: 30,
        totalTasks: 15,
        completedTasks: 4
    },
    {
        id: "proj-3",
        title: "Team Analytics Dashboard",
        description: "Creating a comprehensive team collaboration efficiency analysis and reporting tool",
        status: "completed",
        createdAt: "2024-01-10T11:15:00Z",
        members: ["admin@afora.com", "member1@afora.com", "member3@afora.com"],
        admins: ["admin@afora.com"],
        progress: 100,
        totalTasks: 12,
        completedTasks: 12
    }
];

const MockOrganizationPage = () => {
    const [activeTab, setActiveTab] = useState("projects");
    const [showAccessCode, setShowAccessCode] = useState(false);

    return (
        <div className="overflow-x-hidden p-4">
            {/* Header Section - Copying exact design from OrgHeader */}
            <div className="relative w-full h-80 rounded-lg overflow-hidden">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url(${mockOrgData.backgroundImage})`,
                    }}
                />

                {/* Content Container */}
                <div className="relative h-full flex flex-col justify-between p-6">
                    {/* Top Section */}
                    <div className="flex justify-between items-start">
                        {/* Back Button */}
                        <Link href="/">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Home
                            </Button>
                        </Link>
                    </div>

                    {/* Bottom Section */}
                    <div className="flex justify-between items-end">
                        {/* Organization Title */}
                        <div className="flex-1">
                            <div className="backdrop-blur-md bg-white/75 rounded-xl p-4 inline-block">
                                <h1 className="text-5xl font-lighter tracking-wide text-gray-900 mb-2">
                                    {mockOrgData.title}
                                </h1>
                                {mockOrgData.description && (
                                    <p className="text-gray-700 text-lg max-w-2xl tracking-wide pl-2">
                                        {mockOrgData.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Access Code Card */}
                        <div className="backdrop-blur-md bg-white/75 rounded-xl p-4">
                            <div className="text-sm font-medium text-gray-600 mb-1">
                                Access Code
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded select-all">
                                    {showAccessCode ? mockOrgData.id : "••••••••••••••••••••"}
                                </code>
                                <button
                                    type="button"
                                    className="focus:outline-none"
                                    onClick={() => setShowAccessCode((v) => !v)}
                                    title={showAccessCode ? "Hide" : "Show"}
                                >
                                    {showAccessCode ? (
                                        <EyeOff className="w-4 h-4 text-gray-600 hover:text-gray-900 transition-colors" />
                                    ) : (
                                        <Eye className="w-4 h-4 text-gray-600 hover:text-gray-900 transition-colors" />
                                    )}
                                </button>
                                <Copy
                                    className="w-5 h-5 cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
                                    onClick={() => {
                                        navigator.clipboard.writeText(mockOrgData.id);
                                        toast.success("Access code copied to clipboard!");
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-xl p-1">
                    <TabsTrigger
                        value="projects"
                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        Teams
                    </TabsTrigger>
                    <TabsTrigger
                        value="members"
                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        Members
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="projects" className="mt-4">
                    <MockProjTab 
                        projects={mockProjectsData}
                        orgId={mockOrgData.id}
                    />
                </TabsContent>
                
                <TabsContent value="members" className="mt-4">
                    <MockMemberList 
                        admins={mockOrgData.admins}
                        members={mockOrgData.members}
                        orgId={mockOrgData.id}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default MockOrganizationPage;
