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
import { usePathname } from "next/navigation";
import { inviteUserToOrg } from "@/actions/actions";
import { toast } from "sonner";
import { Input } from "./ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight } from "lucide-react";
import { access_roles } from "@/types/types";

interface InviteUserProps {
    defaultAccessRole?: string;
}

function InviteUser(props: InviteUserProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [email, setEmail] = useState("");
    const pathname = usePathname();
    // const router = useRouter();
    const defaultAccessRole = props.defaultAccessRole || "editor"; // Default to 'editor' if not provided
    const [access, setAccess] = useState(defaultAccessRole);

    const handleInvite = async (e: FormEvent) => {
        e.preventDefault();
        const organizationId = pathname.split("/").pop(); // Assuming organization ID is in the URL
        if (!organizationId) return;

        startTransition(async () => {
            const { success, message } = await inviteUserToOrg(
                organizationId,
                email,
                access,
            ); // Updated function call

            if (success) {
                setIsOpen(false);
                toast.success("User added to group successfully");
            } else {
                toast.error(message);
            }
        });
    };

    return (
        <div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <Button asChild variant="outline">
                    <DialogTrigger>Invite</DialogTrigger>
                </Button>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Invite a user to your group
                        </DialogTitle>
                        <DialogDescription>
                            Enter the email of the user you want to invite.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInvite} className="flex gap-2">
                        <Input
                            type="email"
                            placeholder="Email"
                            className="w-full"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <ChevronRight className="h-4 w-4" />
                                    {access}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-25">
                                <DropdownMenuLabel>Invite As</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup
                                    value={access}
                                    onValueChange={setAccess}
                                >
                                    {access_roles.map((role) => (
                                        <DropdownMenuRadioItem
                                            key={role}
                                            value={role}
                                        >
                                            {role}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button type="submit" disabled={!email || isPending}>
                            {isPending ? "Inviting" : "Invite"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default InviteUser;
