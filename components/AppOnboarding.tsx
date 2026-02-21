"use client";

import React, { useEffect, useState } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Progress } from "@/components/ui/progress";
import { createNewUser, setUserOnboardingSurvey } from "@/actions/actions";
import { toast } from "sonner";
import { db } from "@/firebase";
import { useDocument } from "react-firebase-hooks/firestore";
import { doc } from "firebase/firestore";
import { useUser } from "@clerk/nextjs";
import { appTags } from "@/types/types";
import type { OnboardingPayload, NotificationPreference } from "@/types/types";
import { Copy, Plus, X } from "lucide-react";
import { useAnimations } from "@/contexts/AnimationContext";

const STEPS = [
    "Welcome",
    "Notifications",
    "Soft Skills",
    "Target Industry",
    "Aspirations",
];
const TOTAL_STEPS = STEPS.length;

const AppOnboarding = () => {
    const { triggerConfetti } = useAnimations();
    const [isOpen, setIsOpen] = useState(false);
    const [page, setPage] = useState(0);

    const [phone, setPhone] = useState("");
    const [backupPhones, setBackupPhones] = useState<string[]>([]);
    const [email, setEmail] = useState("");
    const [softSkills, setSoftSkills] = useState<string[]>([]);
    const [targetIndustry, setTargetIndustry] = useState<string[]>([]);
    const [aspirations, setAspirations] = useState("");
    const [notificationPreference, setNotificationPreference] =
        useState<NotificationPreference>("email");
    const [notificationPermissionGranted, setNotificationPermissionGranted] =
        useState(true);

    const [searchSoft, setSearchSoft] = useState("");
    const [searchIndustry, setSearchIndustry] = useState("");
    const [securityCode, setSecurityCode] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const { user } = useUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const [userData, loading, error] = useDocument(
        userEmail ? doc(db, "users", userEmail) : null,
    );

    useEffect(() => {
        setIsOpen(true);
        setPage(0);
    }, []);

    useEffect(() => {
        if (user?.primaryEmailAddress?.emailAddress) {
            setEmail(user.primaryEmailAddress.emailAddress);
        }
    }, [user?.primaryEmailAddress?.emailAddress]);

    useEffect(() => {
        if (user?.primaryEmailAddress && user.username && user.imageUrl) {
            createNewUser(
                user.primaryEmailAddress.toString(),
                user.username,
                user.imageUrl,
            );
        }
    }, [user]);

    const toggleSoftSkill = (tag: string) => {
        setSoftSkills((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
    };
    const toggleIndustry = (tag: string) => {
        setTargetIndustry((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
    };

    const addBackupPhone = () => setBackupPhones((p) => [...p, ""]);
    const setBackupPhoneAt = (i: number, v: string) => {
        setBackupPhones((p) => {
            const next = [...p];
            next[i] = v;
            return next;
        });
    };
    const removeBackupPhone = (i: number) => {
        setBackupPhones((p) => p.filter((_, idx) => idx !== i));
    };

    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            toast.error("Notifications are not supported in this browser.");
            return;
        }
        const permission = await Notification.requestPermission();
        setNotificationPermissionGranted(permission === "granted");
        if (permission === "granted") {
            toast.success("Notifications allowed.");
        } else {
            toast.info("You can enable notifications later in settings.");
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const payload: OnboardingPayload = {
            phone: phone.trim(),
            backupPhones: backupPhones.map((p) => p.trim()).filter(Boolean),
            email: email.trim(),
            softSkills,
            targetIndustry,
            aspirations: aspirations.trim() || undefined,
            notificationPreference,
            notificationPermissionGranted,
        };
        const result = await setUserOnboardingSurvey(payload);
        setSubmitting(false);
        if (result.success && result.securityCode) {
            triggerConfetti();
            setSecurityCode(result.securityCode);
            toast.success("Profile saved. Copy your recovery code below.");
        } else if (result.success) {
            triggerConfetti();
            toast.success("Profile saved.");
            setIsOpen(false);
        } else {
            toast.error(result.message || "Something went wrong.");
        }
    };

    const copySecurityCode = () => {
        if (securityCode) {
            navigator.clipboard.writeText(securityCode);
            toast.success("Recovery code copied to clipboard.");
        }
    };

    const closeAfterCode = () => {
        setSecurityCode(null);
        setIsOpen(false);
    };

    const canNextContact = phone.trim().length > 0;
    const canNextSoft = softSkills.length > 0;
    const canNextIndustry = targetIndustry.length > 0;

    if (loading) return null;
    if (error) return <div>Onboarding error: {error.message}</div>;
    // Don't unmount while showing the security code (Firestore already has onboardingSurveyResponse)
    const hasCompletedOnboarding = !!userData?.data()?.onboardingSurveyResponse;
    if (!userData || (hasCompletedOnboarding && !securityCode)) {
        return null;
    }

    const filteredSoft = appTags
        .filter(
            (t) =>
                t.toLowerCase().indexOf(searchSoft.toLowerCase()) !== -1,
        )
        .sort();
    const filteredIndustry = appTags
        .filter(
            (t) =>
                t.toLowerCase().indexOf(searchIndustry.toLowerCase()) !== -1,
        )
        .sort();

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogOverlay className="fixed inset-0 bg-black/80" />
            <AlertDialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
                <Progress value={(page / (TOTAL_STEPS - 1)) * 100} />

                {securityCode ? (
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Save your recovery code
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Copy this code and store it somewhere safe. You
                                may need it for account recovery. We will not
                                show it again.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="flex items-center gap-2 rounded-lg border bg-muted p-4">
                            <code className="flex-1 text-xl font-mono tracking-wider">
                                {securityCode}
                            </code>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={copySecurityCode}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <AlertDialogFooter>
                            <Button onClick={closeAfterCode}>Done</Button>
                        </AlertDialogFooter>
                    </>
                ) : (
                    <>
                        {page === 0 && (
                            <>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Welcome to the onboarding survey
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Please take a minute to complete this
                                        form. It helps us with matching and
                                        teammate recommendations.
                                        <br />
                                        <br />
                                        <p className="italic">
                                            *This information will be kept private and will not be
                                            shared.
                                        </p>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                            </>
                        )}

                        {page === 1 && (
                            <>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Preferred notification methods
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Choose how you want to receive
                                        notifications. You can allow browser
                                        notifications below.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-3">
                                    <div>
                                        <Label htmlFor="phone">
                                            Phone number
                                        </Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+1 234 567 8900"
                                            value={phone}
                                            onChange={(e) =>
                                                setPhone(e.target.value)
                                            }
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <Label>Backup phone numbers</Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={addBackupPhone}
                                            >
                                                <Plus className="h-4 w-4" /> Add
                                            </Button>
                                        </div>
                                        {backupPhones.map((p, i) => (
                                            <div
                                                key={i}
                                                className="mt-2 flex gap-2"
                                            >
                                                <Input
                                                    type="tel"
                                                    placeholder="Backup phone"
                                                    value={p}
                                                    onChange={(e) =>
                                                        setBackupPhoneAt(
                                                            i,
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        removeBackupPhone(i)
                                                    }
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t pt-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {(
                                                [
                                                    "email",
                                                    "phone",
                                                    "both",
                                                ] as NotificationPreference[]
                                            ).map((opt) => (
                                                <Button
                                                    key={opt}
                                                    type="button"
                                                    variant={
                                                        notificationPreference ===
                                                        opt
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    onClick={() =>
                                                        setNotificationPreference(
                                                            opt,
                                                        )
                                                    }
                                                >
                                                    {opt === "email"
                                                        ? "Email only"
                                                        : opt === "phone"
                                                          ? "Phone only"
                                                          : "Both"}
                                                </Button>
                                            ))}
                                            <div className="flex items-center gap-2 ml-auto">
                                                <Label
                                                    htmlFor="allow-notifications"
                                                    className="text-sm font-medium cursor-pointer"
                                                >
                                                    Allow notifications
                                                </Label>
                                                <Switch
                                                    id="allow-notifications"
                                                    checked={
                                                        notificationPermissionGranted
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) => {
                                                        if (checked) {
                                                            requestNotificationPermission();
                                                        } else {
                                                            setNotificationPermissionGranted(
                                                                false,
                                                            );
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {page === 2 && (
                            <>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Soft skills
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Select the soft skills that describe
                                        you (at least one).
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Input
                                    placeholder="Search soft skills..."
                                    value={searchSoft}
                                    onChange={(e) =>
                                        setSearchSoft(e.target.value)
                                    }
                                    className="mb-2"
                                />
                                <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                                    {filteredSoft.map((tag) => (
                                        <Button
                                            key={tag}
                                            type="button"
                                            variant={
                                                softSkills.includes(tag)
                                                    ? "default"
                                                    : "outline"
                                            }
                                            size="sm"
                                            onClick={() =>
                                                toggleSoftSkill(tag)
                                            }
                                        >
                                            {tag}
                                        </Button>
                                    ))}
                                </div>
                            </>
                        )}

                        {page === 3 && (
                            <>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        What industry do you want to get into?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Select at least one. We will use this to match you with teammates.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Input
                                    placeholder="Search industries..."
                                    value={searchIndustry}
                                    onChange={(e) =>
                                        setSearchIndustry(e.target.value)
                                    }
                                    className="mb-2 mt-2"
                                />
                                <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                                    {filteredIndustry.map((tag) => (
                                        <Button
                                            key={tag}
                                            type="button"
                                            variant={
                                                targetIndustry.includes(tag)
                                                    ? "default"
                                                    : "outline"
                                            }
                                            size="sm"
                                            onClick={() =>
                                                toggleIndustry(tag)
                                            }
                                        >
                                            {tag}
                                        </Button>
                                    ))}
                                </div>
                            </>
                        )}

                        {page === 4 && (
                            <>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Aspirations or dreams
                                    </AlertDialogTitle>
                                    <p className="italic text-sm">
                                        *We will match you with users with similar aspirations.
                                    </p>
                                </AlertDialogHeader>
                                <Textarea
                                    placeholder="e.g. Lead a product team, switch to data science..."
                                    value={aspirations}
                                    onChange={(e) =>
                                        setAspirations(e.target.value)
                                    }
                                    rows={4}
                                    className="resize-none"
                                />
                            </>
                        )}

                        <AlertDialogFooter>
                            {page > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={() => setPage(page - 1)}
                                >
                                    Back
                                </Button>
                            )}
                            {page < TOTAL_STEPS - 1 ? (
                                <Button
                                    onClick={() => setPage(page + 1)}
                                    disabled={
                                        (page === 1 && !canNextContact) ||
                                        (page === 2 && !canNextSoft) ||
                                        (page === 3 && !canNextIndustry)
                                    }
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? "Saving…" : "Submit"}
                                </Button>
                            )}
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default AppOnboarding;
