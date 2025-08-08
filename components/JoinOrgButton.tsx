"use client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { inviteUserToOrg } from "@/actions/actions";

function JoinOrgButton({
    isOpen,
    setIsOpen,
}: {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}) {
    // Updated component name
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [orgCode, setOrgCode] = useState(""); // Updated state variable
    const { user } = useUser();

    const handleJoinNewOrganization = () => {
        // Updated function name
        console.log(user!.emailAddresses + " tried joining " + orgCode);

        startTransition(async () => {
            const { success, message } =
                user && user.id && user.primaryEmailAddress
                    ? await inviteUserToOrg(
                          orgCode,
                          user.primaryEmailAddress.emailAddress,
                          "editor",
                      )
                    : { success: false, message: "user does not exist" };
            if (success && orgCode && orgCode.trim()) {
                console.log("Successfully joined");
                setIsOpen(false);
                router.push(`/org/${orgCode}`); // Updated route
                toast.success("Successfully joined!");
                setOrgCode("");
            } else {
                console.log("Failed to join", message);
                toast.error(message || "Failed to join group");
            }
        });
    };
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* <Button disabled={isPending} className="bg-[#6F61EF] flex flex-1 hover:bg-[#5646e4]">
        {isPending ? "Loading..." : "Join Organization"}
      </Button> */}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Join a Group</DialogTitle>{" "}
                    {/* Updated title */}
                    <DialogDescription>Enter the access code</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="orgCode" className="text-right">
                            {" "}
                            {/* Updated label */}
                            Group Code
                        </Label>
                        <Input
                            id="orgCode" // Updated input id
                            value={orgCode}
                            onChange={(e) => setOrgCode(e.target.value)} // Updated state update
                            placeholder="Enter code"
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        type="submit"
                        onClick={handleJoinNewOrganization}
                        disabled={isPending}
                    >
                        {" "}
                        {/* Updated onClick */}
                        {isPending ? "Joining..." : "Join"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
export default JoinOrgButton; // Updated export
