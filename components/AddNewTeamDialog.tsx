"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { FormEvent, useState, useTransition, useEffect } from "react";
import { Button } from "./ui/button";
import { createProject } from "@/actions/actions";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, X, Users, Search, Check } from "lucide-react";
import { access_roles } from "@/types/types";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Organization } from "@/types/types";

interface AddNewTeamDialogProps {
    orgId: string;
    totalProjects: number;
    onTeamCreated?: () => void;
}

interface InvitedMember {
    email: string;
    role: string;
}

export default function AddNewTeamDialog({ orgId, totalProjects, onTeamCreated }: AddNewTeamDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [projectTitle, setProjectTitle] = useState("");
    const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);

    
    // Organization member related state
    const [orgMembers, setOrgMembers] = useState<string[]>([]);
    const [orgAdmins, setOrgAdmins] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

    // Fetch organization members
    useEffect(() => {
        const fetchOrgMembers = async () => {
            try {
                const orgDoc = await getDoc(doc(db, "organizations", orgId));
                if (orgDoc.exists()) {
                    const orgData = orgDoc.data() as Organization;
                    setOrgMembers(orgData.members || []);
                    setOrgAdmins(orgData.admins || []);
                }
            } catch (error) {
                console.error("Error fetching organization members:", error);
                toast.error("Failed to fetch organization members");
            }
        };

        if (isOpen && orgId) {
            fetchOrgMembers();
        }
    }, [isOpen, orgId]);

    // Filter search members
    const filteredMembers = orgMembers.filter(member => 
        member.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Toggle member selection
    const toggleMemberSelection = (email: string) => {
        const newSelected = new Set(selectedMembers);
        if (newSelected.has(email)) {
            newSelected.delete(email);
        } else {
            newSelected.add(email);
        }
        setSelectedMembers(newSelected);
    };

    // Batch add selected members
    const addSelectedMembers = () => {
        const newMembers = Array.from(selectedMembers).map(email => ({
            email,
            role: "member" // Default role
        }));

        // Filter out already invited members
        const uniqueNewMembers = newMembers.filter(newMember => 
            !invitedMembers.some(invited => invited.email === newMember.email)
        );

        if (uniqueNewMembers.length === 0) {
            toast.error("No new members to add");
            return;
        }

        setInvitedMembers([...invitedMembers, ...uniqueNewMembers]);
        setSelectedMembers(new Set());
        toast.success(`Added ${uniqueNewMembers.length} members`);
    };



    const removeMember = (email: string) => {
        setInvitedMembers(invitedMembers.filter(member => member.email !== email));
    };

    // 更新成员角色
    const updateMemberRole = (email: string, newRole: string) => {
        setInvitedMembers(invitedMembers.map(member => 
            member.email === email ? { ...member, role: newRole } : member
        ));
    };

    const handleCreateTeam = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!projectTitle.trim()) {
            toast.error("Please enter a project title");
            return;
        }

        if (invitedMembers.length === 0) {
            toast.error("Please invite at least one member");
            return;
        }

        startTransition(async () => {
            try {
                // 提取所有成员的邮箱
                const memberEmails = invitedMembers.map(member => member.email);
                
                // 创建项目
                const result = await createProject(
                    orgId,
                    projectTitle.trim(),
                    memberEmails,
                    [] // 不预设管理员
                );

                if (result.success) {
                    setIsOpen(false);
                    setProjectTitle("");
                    setInvitedMembers([]);
                    setSelectedMembers(new Set());
                    setSearchQuery("");
                    toast.success("Team created successfully!");
                    onTeamCreated?.();
                } else {
                    toast.error(result.message || "Failed to create team");
                }
            } catch (error) {
                console.error("Error creating team:", error);
                toast.error("An error occurred while creating the team");
            }
        });
    };

    return (
        <div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button
                    className={`w-full ${
                        totalProjects === 0
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg text-white"
                            : "bg-black hover:bg-gray-800 text-white"
                    }`}
                    size={totalProjects === 0 ? "default" : "sm"}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    {totalProjects === 0 ? "Create First Team" : "New Team"}
                </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Team</DialogTitle>
                        <DialogDescription>
                            Enter project title and select team members without AI matching
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleCreateTeam} className="space-y-4">
                        {/* Project Title */}
                        <div className="space-y-2">
                            <Label htmlFor="projectTitle">Project Title</Label>
                            <Input
                                id="projectTitle"
                                type="text"
                                placeholder="Enter project title"
                                value={projectTitle}
                                onChange={(e) => setProjectTitle(e.target.value)}
                                required
                            />
                        </div>

                        {/* Select from existing members */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Select from organization members ({orgMembers.length} people)
                            </Label>
                            
                            {/* 搜索栏 */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search member emails..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* 成员列表 */}
                            <div className="border rounded-lg max-h-48 overflow-y-auto">
                                {filteredMembers.length > 0 ? (
                                    <div className="divide-y">
                                        {filteredMembers.map((member) => (
                                            <div
                                                key={member}
                                                className="flex items-center justify-between p-3 hover:bg-gray-50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-5 h-5 border-2 rounded cursor-pointer flex items-center justify-center ${
                                                            selectedMembers.has(member)
                                                                ? 'bg-blue-600 border-blue-600'
                                                                : 'border-gray-300'
                                                        }`}
                                                        onClick={() => toggleMemberSelection(member)}
                                                    >
                                                        {selectedMembers.has(member) && (
                                                            <Check className="h-3 w-3 text-white" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-medium">{member}</span>
                                                    {orgAdmins.includes(member) && (
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                            Admin
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-gray-500">
                                        {searchQuery ? 'No matching members found' : 'No organization members'}
                                    </div>
                                )}
                            </div>

                            {/* Batch add button */}
                            {selectedMembers.size > 0 && (
                                <Button
                                    type="button"
                                    onClick={addSelectedMembers}
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                >
                                    Add {selectedMembers.size} selected members
                                </Button>
                            )}
                        </div>



                        {/* Invited members list */}
                        {invitedMembers.length > 0 && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Invited members ({invitedMembers.length})
                                </Label>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {invitedMembers.map((member, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                                        >
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">{member.email}</div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={member.role}
                                                        onChange={(e) => updateMemberRole(member.email, e.target.value)}
                                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                                    >
                                                        {access_roles.map((role) => (
                                                            <option key={role} value={role}>
                                                                {role}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={() => removeMember(member.email)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit button */}
                        <Button 
                            type="submit" 
                            disabled={!projectTitle.trim() || invitedMembers.length === 0 || isPending}
                            className="w-full"
                        >
                            {isPending ? "Creating..." : "Create Team"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
