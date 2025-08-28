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
} from "@/components/ui/alert-dialog";
import { useTransition } from "react";
import { removeProjectMember } from "@/actions/actions";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useParams } from "next/navigation";

interface RemoveMemberDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    projId: string;
    memberEmail: string;
    onMemberRemoved?: () => void;
}

export default function RemoveMemberDialog({ 
    isOpen,
    onOpenChange,
    projId, 
    memberEmail, 
    onMemberRemoved
}: RemoveMemberDialogProps) {
    const params = useParams();
    const orgId = params.id as string;
    const [isPending, startTransition] = useTransition();

    const handleRemoveMember = async () => {
        startTransition(async () => {
            try {
                const { success, message } = await removeProjectMember(projId, memberEmail,orgId);

                if (success) {
                    onOpenChange(false);
                    toast.success("Member removed successfully");
                    onMemberRemoved?.();
                } else {
                    toast.error(message || "Failed to remove member");
                }
            } catch (error) {
                console.error("Error removing member:", error);
                toast.error("An unexpected error occurred");
            }
        });
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Remove Team Member
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove <strong>{memberEmail}</strong> from this project?
                        <br />
                        <br />
                        This action cannot be undone. The member will lose access to this project and all its resources.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleRemoveMember}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        {isPending ? "Removing..." : "Remove Member"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
