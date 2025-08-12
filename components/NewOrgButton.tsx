"use client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { useState, useTransition } from "react";
import { createNewOrganization } from "@/actions/actions";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-label";
import { Input } from "./ui/input";
import { Textarea } from "@/components/ui/textarea";

function NewOrgButton({
    isOpen,
    setIsOpen,
}: {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [orgName, setOrgName] = useState("");
    const [orgDescription, setOrgDescription] = useState("");
    const router = useRouter();

    const handleCreateNewOrganization = () => {
        startTransition(() => {
            (async () => {
                const { orgId, success, message } = await createNewOrganization(
                    orgName,
                    orgDescription,
                );
                if (success && orgId) {
                    toast.success("Group created successfully!");
                    setIsOpen(false);
                    router.push(`/org/${orgId}`);
                    setOrgName("");
                    setOrgDescription("");
                } else {
                    toast.error(message || "Failed to create group");
                }
            })();
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* <Button
        disabled={isPending}
        className="bg-[#6F61EF] flex flex-1 hover:bg-[#5646e4]"
      >
        {isPending ? "Loading..." : "Create Org"}
      </Button> */}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Group</DialogTitle>
                    <DialogDescription>
                        Enter the group details
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="orgName" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="orgName"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            placeholder="Enter group name"
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="orgDescription" className="text-right">
                            Description
                        </Label>
                        <Textarea
                            id="orgDescription"
                            value={orgDescription}
                            onChange={(e) => setOrgDescription(e.target.value)}
                            placeholder="Enter group description"
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        type="submit"
                        onClick={handleCreateNewOrganization}
                        disabled={isPending}
                    >
                        {isPending ? "Creating..." : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
export default NewOrgButton;
