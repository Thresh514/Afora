"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useTransition } from "react";
import { Button } from "./ui/button";
import { removeProjectMember } from "@/actions/actions";
import { toast } from "sonner";
import { UserMinus, AlertTriangle } from "lucide-react";
import { useParams } from "next/navigation";

interface RemoveProjectMemberDialogProps {
    projId: string;
    memberEmail: string;
    memberRole?: "admin" | "member";
    onMemberRemoved?: () => void;
    trigger?: React.ReactNode;
}

export default function RemoveProjectMemberDialog({ 
    projId, 
    memberEmail, 
    onMemberRemoved,
    trigger 
}: RemoveProjectMemberDialogProps) {
    const params = useParams();
    const orgId = params.id as string;
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleRemoveMember = async () => {
        startTransition(async () => {
            try {
                const { success, message } = await removeProjectMember(projId, memberEmail,orgId);

                if (success) {
                    setIsOpen(false);
                    toast.success("Member removed successfully");
                    onMemberRemoved?.();
                } else {
                    toast.error(message || "Failed to remove member");
                }
            } catch (error) {
                console.error("Error removing member:", error);
                toast.error("An unexpected error occurred. Please try again.");
            }
        });
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Remove Team Member
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove <strong>{memberEmail}</strong> from your team? 
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleRemoveMember}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isPending ? "Removing..." : "Remove Member"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
