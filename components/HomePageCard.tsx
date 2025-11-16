import { db } from "@/firebase";
import { UserOrgData } from "@/types/types";
import { doc } from "firebase/firestore";
import Link from "next/link";
import React, { useState, useTransition } from "react";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { deleteOrg } from "@/actions/actions";
import { useRouter } from "next/navigation";

interface HomePageCardProps {
    org: UserOrgData;
}

function HomePageCard({ org }: HomePageCardProps) {
    const [showAccessCode, setShowAccessCode] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [orgNameInput, setOrgNameInput] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [data, loading] = useDocumentData(
        org?.orgId ? doc(db, "organizations", org.orgId) : null,
        {
            snapshotListenOptions: { includeMetadataChanges: true }
        }
    );

    if (!org?.orgId || (!loading && !data)) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex flex-col h-96 shadow-lg rounded-2xl overflow-hidden bg-white dark:bg-gray-800 w-96 animate-pulse">
                <div className="h-32 bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 flex items-center justify-center p-6">
                    <p className="text-gray-500">Loading group data...</p>
                </div>
            </div>
        );
    }

    const basePath = `/org/${org.orgId}`;
    const orgName = data?.title || "";
    const canDelete = orgNameInput.trim() === orgName.trim();

    const handleDelete = async () => {
        if (!canDelete || !org.orgId) return;

        startTransition(async () => {
            const { success } = await deleteOrg(org.orgId);

            if (success) {
                toast.success("Organization deleted successfully");
                setIsDeleteDialogOpen(false);
                setOrgNameInput("");
                router.refresh();
            } else {
                toast.error("Failed to delete organization");
            }
        });
    };

    return (
        <div className="w-96">
            <div className="relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-md group">
                <Link href={basePath} className="block flex-1">
                    <div className="flex flex-col h-96">
                        {/* Header Section */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative py-8 px-6">
                                <h1 title={data?.title} className="text-3xl font-bold tracking-tight text-white truncate">
                                    {data?.title}
                                </h1>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 bg-white dark:bg-gray-800 p-6">
                            <div className="space-y-6">
                                {/* Description */}
                                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <h2 className="text-md text-gray-900 dark:text-gray-100 mb-2">
                                        Description:
                                    </h2>
                                    <p title={data?.description} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                                        {data?.description}
                                    </p>
                                </div>

                                {/* Access Code */}
                                <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
                                    <div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Access Code
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                                        <code className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 select-all flex-1">
                                            {showAccessCode ? org.orgId : "••••••••"}
                                        </code>
                                        <button
                                            type="button"
                                            className="focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-md transition-colors"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setShowAccessCode((v) => !v);
                                            }}
                                            title={showAccessCode ? "Hide" : "Show"}
                                        >
                                            {showAccessCode ? (
                                                <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                            ) : (
                                                <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-md transition-colors"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                navigator.clipboard.writeText(org.orgId);
                                                toast.success("Access code copied to clipboard!");
                                            }}
                                        >
                                            <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>
                
                {/* Delete Icon Button - Bottom Right */}
                <div className="absolute bottom-4 right-4 z-10">
                    <Dialog 
                        open={isDeleteDialogOpen} 
                        onOpenChange={(open) => {
                            setIsDeleteDialogOpen(open);
                            if (!open) {
                                setOrgNameInput("");
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-10 w-10 rounded-full bg-gray-200 hover:bg-gray-300 shadow-lg hover:shadow-xl transition-all text-gray-600"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDeleteDialogOpen(true);
                                }}
                                title="Delete Organization"
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirm Delete Organization</DialogTitle>
                                <DialogDescription>
                                    This action will permanently delete this organization and all its contents, removing all members. This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="org-name">
                                        Please type the organization name <span className="font-semibold text-red-600">{orgName}</span> to confirm deletion:
                                    </Label>
                                    <Input
                                        id="org-name"
                                        value={orgNameInput}
                                        onChange={(e) => setOrgNameInput(e.target.value)}
                                        placeholder="Enter organization name"
                                        disabled={isPending}
                                    />
                                </div>
                            </div>
                            <DialogFooter className="sm:justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={!canDelete || isPending}
                                >
                                    {isPending ? "Deleting..." : "Delete"}
                                </Button>
                                <DialogClose asChild>
                                    <Button 
                                        type="button" 
                                        variant="secondary"
                                    >
                                        Cancel
                                    </Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}

export default HomePageCard;
