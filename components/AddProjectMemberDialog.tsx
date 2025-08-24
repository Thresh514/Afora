"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { addProjectMember } from "@/actions/actions";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface AddProjectMemberDialogProps {
    projId: string;
    onMemberAdded?: () => void;
    trigger?: React.ReactNode;
}

export default function AddProjectMemberDialog({ 
    projId, 
    onMemberAdded,
    trigger 
}: AddProjectMemberDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "member">("member");

    const handleAddMember = async (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.error("Please enter an email address");
            return;
        }

        startTransition(async () => {
            try {
                const { success, message } = await addProjectMember(projId, email.trim(), role);

                if (success) {
                    setIsOpen(false);
                    setEmail("");
                    toast.success("Member added successfully");
                    onMemberAdded?.();
                } else {
                    toast.error(message || "Failed to add member");
                }
            } catch (error) {
                console.error("Error adding member:", error);
                toast.error("An unexpected error occurred. Please try again.");
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                        Enter the email of the person you want to add to your team.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMember} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as "admin" | "member")}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="member">Team Member</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={!email.trim() || isPending}
                        >
                            {isPending ? "Adding..." : "Add Member"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
