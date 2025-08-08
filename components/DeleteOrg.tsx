"use client";

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useTransition } from "react";
import { Button } from "./ui/button";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteOrg } from "@/actions/actions";

function DeleteOrg() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const pathname = usePathname();
    const router = useRouter();

    const handleDelete = async () => {
        const orgId = pathname.split("/").pop();
        if (!orgId) return;

        startTransition(async () => {
            const { success } = await deleteOrg(orgId);

            if (success) {
                router.replace("/");
                toast.success("Group deleted successfully");
                setIsOpen(false);
            } else {
                toast.error("Failed to delete group");
            }
        });
    };

    return (
        <div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <Button asChild variant="destructive">
                    <DialogTrigger>Delete</DialogTrigger>
                </Button>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Are you absolutely sure you want to delete?
                        </DialogTitle>
                        <DialogDescription>
                            This will delete the group and all its
                            contents, removing all users from the group.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-end gap-2">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isPending}
                        >
                            {isPending ? "Deleting..." : "Delete"}
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Close
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default DeleteOrg;
