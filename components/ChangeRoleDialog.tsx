"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useTransition } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { changeProjectMemberRole } from "@/actions/actions";
import { toast } from "sonner";
import { UserCog } from "lucide-react";

interface ChangeRoleDialogProps {
    projId: string;
    memberEmail: string;
    currentRole: "admin" | "member";
    onRoleChanged?: () => void;
    trigger?: React.ReactNode;
}

export default function ChangeRoleDialog({ 
    projId, 
    memberEmail, 
    currentRole,
    onRoleChanged,
    trigger 
}: ChangeRoleDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [selectedRole, setSelectedRole] = useState<"admin" | "member">(currentRole);

    const handleChangeRole = async () => {
        if (selectedRole === currentRole) {
            toast.info("No changes made - same role selected");
            setIsOpen(false);
            return;
        }

        startTransition(async () => {
            try {
                const { success, message } = await changeProjectMemberRole(projId, memberEmail, selectedRole);

                if (success) {
                    setIsOpen(false);
                    toast.success(`Role changed to ${selectedRole === "admin" ? "Admin" : "Member"} successfully`);
                    onRoleChanged?.();
                } else {
                    toast.error(message || "Failed to change role");
                }
            } catch (error) {
                console.error("Error changing role:", error);
                toast.error("An unexpected error occurred");
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        <UserCog className="h-4 w-4" />
                        Change Role
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-blue-600" />
                        Change Member Role
                    </DialogTitle>
                    <DialogDescription>
                        Change the role for <strong>{memberEmail}</strong> in this project.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="role">Select New Role</Label>
                        <Select 
                            value={selectedRole} 
                            onValueChange={(value: "admin" | "member") => setSelectedRole(value)}
                        >
                            <SelectTrigger id="role">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">
                                    <div className="flex flex-col">
                                        <span className="font-medium">Admin</span>
                                        <span className="text-sm text-gray-500">
                                            Full access to project management
                                        </span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="member">
                                    <div className="flex flex-col">
                                        <span className="font-medium">Member</span>
                                        <span className="text-sm text-gray-500">
                                            Standard project access
                                        </span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={handleChangeRole}
                            disabled={isPending}
                            className="flex-1"
                        >
                            {isPending ? "Changing..." : "Change Role"}
                        </Button>
                        <Button
                            onClick={() => setIsOpen(false)}
                            variant="outline"
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
