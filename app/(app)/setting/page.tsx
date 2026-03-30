'use client'

import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { updateUserMatchingPreference, getUserMatchingPreference } from "@/actions/actions";
import { useAnimations } from "@/contexts/AnimationContext";
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Shield, Sparkles, Pencil } from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type ProfileInputs = {
    displayName: string;
    demographic: string;
    gender: string;
};

/** Which profile row is in inline-edit mode (only one at a time). */
type ProfileEditField = "name" | "gender" | "demographic";

const GENDER_OPTIONS = ["Male", "Female", "Other"] as const;
const DEMOGRAPHIC_OPTIONS = [
    "Middle/High School Student",
    "College Student",
    "Professional",
    "Personal",
] as const;

const DEMO_SELECT_FIELDS: {
    key: keyof Pick<ProfileInputs, "gender" | "demographic">;
    label: string;
    options: readonly string[];
    inputId: string;
}[] = [
    { key: "gender", label: "Gender", options: GENDER_OPTIONS, inputId: "settings-gender" },
    {
        key: "demographic",
        label: "Demographic",
        options: DEMOGRAPHIC_OPTIONS,
        inputId: "settings-demographic",
    },
];

function clerkDisplayName(
    u:
        | {
              fullName: string | null;
              firstName: string | null;
              lastName: string | null;
          }
        | null
        | undefined,
): string {
    if (!u) return "";
    return (
        u.fullName || [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || ""
    );
}

const AVATAR_MAX_BYTES = 10 * 1024 * 1024;

function SettingPage() {
    const { user } = useUser();
    const { animationsEnabled, setAnimationsEnabled, loading: animationLoading } = useAnimations();
    const [allowMatching, setAllowMatching] = useState<boolean>(true);
    const [matchingLoading, setMatchingLoading] = useState<boolean>(true);
    const [allowTaskAssignment, setAllowTaskAssignment] = useState<boolean>(true);
    const [allowGroupEvaluation, setAllowGroupEvaluation] = useState<boolean>(true);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [adminCheckLoading, setAdminCheckLoading] = useState<boolean>(true);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [adminBulkLoading, setAdminBulkLoading] = useState(false);
    const [profileEditField, setProfileEditField] = useState<ProfileEditField | null>(
        null,
    );
    const avatarFileInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement | null>(null);

    const {
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors, isSubmitting: profileSubmitting },
        setValue: setProfileValue,
        register,
        reset,
        watch,
    } = useForm<ProfileInputs>({
        shouldUnregister: false,
        defaultValues: {
            displayName: "",
            gender: "",
            demographic: "",
        },
    });

    const {
        ref: rhfDisplayNameRef,
        ...displayNameInputProps
    } = register("displayName", {
        required: "Name is required",
        maxLength: {
            value: 120,
            message: "Name is too long",
        },
    });

    useEffect(() => {
        if (!user) return;
        reset({
            displayName: clerkDisplayName(user),
            gender: (user.unsafeMetadata?.gender as string) || "",
            demographic: (user.unsafeMetadata?.demographic as string) || "",
        });
    }, [
        user?.id,
        user?.fullName,
        user?.firstName,
        user?.lastName,
        user?.unsafeMetadata?.gender,
        user?.unsafeMetadata?.demographic,
        reset,
    ]);

    const displayNameWatch = watch("displayName");

    useEffect(() => {
        if (profileEditField !== "name") return;
        const id = requestAnimationFrame(() => {
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        });
        return () => cancelAnimationFrame(id);
    }, [profileEditField]);

    const cancelProfileInlineEdit = useCallback(() => {
        if (!user || !profileEditField) return;
        if (profileEditField === "name") {
            setProfileValue("displayName", clerkDisplayName(user));
        } else if (profileEditField === "gender") {
            setProfileValue("gender", (user.unsafeMetadata?.gender as string) || "");
        } else {
            setProfileValue(
                "demographic",
                (user.unsafeMetadata?.demographic as string) || "",
            );
        }
        setProfileEditField(null);
    }, [user, profileEditField, setProfileValue]);

    const clearProfileInlineEdit = useCallback(() => setProfileEditField(null), []);

    const onProfileSubmit: SubmitHandler<ProfileInputs> = async (data) => {
        if (!user) return;

        const trimmedName = data.displayName.trim();
        if (!trimmedName) {
            toast.error("Please enter your name");
            return;
        }

        const nameChanged = trimmedName !== clerkDisplayName(user);

        const parts = trimmedName.split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

        const currentGender = user.unsafeMetadata?.gender;
        const currentDemographic = user.unsafeMetadata?.demographic;

        const updatedMetadata: Partial<Pick<ProfileInputs, "gender" | "demographic">> = {};
        if (data.gender && data.gender !== currentGender) {
            updatedMetadata.gender = data.gender;
        }
        if (data.demographic && data.demographic !== currentDemographic) {
            updatedMetadata.demographic = data.demographic;
        }

        const hasMetaChanges = Object.keys(updatedMetadata).length > 0;

        if (!nameChanged && !hasMetaChanges) {
            clearProfileInlineEdit();
            toast.success("Profile is already up to date");
            return;
        }

        try {
            const payload: {
                firstName?: string;
                lastName?: string;
                unsafeMetadata?: Record<string, unknown>;
            } = {};

            if (nameChanged) {
                payload.firstName = firstName;
                payload.lastName = lastName;
            }
            if (hasMetaChanges) {
                payload.unsafeMetadata = {
                    ...user.unsafeMetadata,
                    ...updatedMetadata,
                };
            }

            await user.update(payload);
            await user.reload();
            clearProfileInlineEdit();
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Update failed, please try again");
        }
    };

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user?.primaryEmailAddress?.emailAddress) {
                setAdminCheckLoading(false);
                return;
            }

            try {
                const userEmail = user.primaryEmailAddress.emailAddress;

                const orgsQuery = query(
                    collection(db, "organizations"),
                    where("admins", "array-contains", userEmail)
                );

                const orgsSnapshot = await getDocs(orgsQuery);
                const isOrgAdmin = !orgsSnapshot.empty;

                const projectsQuery = query(
                    collection(db, "projects"),
                    where("admins", "array-contains", userEmail)
                );

                const projectsSnapshot = await getDocs(projectsQuery);
                const isProjectAdmin = !projectsSnapshot.empty;

                setIsAdmin(isOrgAdmin || isProjectAdmin);
            } catch (error) {
                console.error("Error checking admin status:", error);
                setIsAdmin(false);
            } finally {
                setAdminCheckLoading(false);
            }
        };

        checkAdminStatus();
    }, [user]);

    useEffect(() => {
        if (user) {
            getUserMatchingPreference()
                .then((result) => {
                    if (result.success) {
                        setAllowMatching(result.allowMatching || true);
                    }
                })
                .catch((error) => {
                    console.error("Failed to get matching preference:", error);
                })
                .finally(() => {
                    setMatchingLoading(false);
                });
        }
    }, [user]);

    const handleMatchingPreferenceChange = (checked: boolean) => {
        setAllowMatching(checked);
        updateUserMatchingPreference(checked)
            .then((result) => {
                if (result.success) {
                    toast.success(checked ? "Admin matching enabled" : "Admin matching disabled");
                } else {
                    toast.error("Update failed");
                    setAllowMatching(!checked);
                }
            })
            .catch((error) => {
                toast.error("Update failed: " + error.message);
                setAllowMatching(!checked);
            });
    };

    const handleTaskAssignmentPreferenceChange = (checked: boolean) => {
        setAllowTaskAssignment(checked);
        toast.success(checked ? "Admin task assignment enabled" : "Admin task assignment disabled");
    };

    const handleGroupEvaluationPreferenceChange = (checked: boolean) => {
        setAllowGroupEvaluation(checked);
        toast.success(checked ? "Admin group evaluation enabled" : "Admin group evaluation disabled");
    };

    const handleAllAdminParticipation = async (enabled: boolean) => {
        if (matchingLoading || adminBulkLoading) return;
        const prevMatching = allowMatching;
        const prevTask = allowTaskAssignment;
        const prevEval = allowGroupEvaluation;
        setAllowMatching(enabled);
        setAllowTaskAssignment(enabled);
        setAllowGroupEvaluation(enabled);
        setAdminBulkLoading(true);
        try {
            const result = await updateUserMatchingPreference(enabled);
            if (!result.success) {
                setAllowMatching(prevMatching);
                setAllowTaskAssignment(prevTask);
                setAllowGroupEvaluation(prevEval);
                toast.error("Update failed");
                return;
            }
            toast.success(
                enabled ? "All participation options enabled" : "All participation options disabled",
            );
        } catch (error) {
            setAllowMatching(prevMatching);
            setAllowTaskAssignment(prevTask);
            setAllowGroupEvaluation(prevEval);
            toast.error(
                "Update failed: " + (error instanceof Error ? error.message : String(error)),
            );
        } finally {
            setAdminBulkLoading(false);
        }
    };

    const handleAvatarFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !user) return;
            if (!file.type.startsWith("image/")) {
                toast.error("Please choose an image file.");
                return;
            }
            if (file.size > AVATAR_MAX_BYTES) {
                toast.error("Image must be 10MB or smaller.");
                return;
            }
            setAvatarUploading(true);
            try {
                await user.setProfileImage({ file });
                await user.reload();
                toast.success("Profile photo updated");
            } catch (error) {
                console.error("setProfileImage failed:", error);
                toast.error(
                    "Could not update photo. Check Clerk Dashboard: profile image uploads must be enabled for your application.",
                );
            } finally {
                setAvatarUploading(false);
            }
        },
        [user],
    );

    const handleRemoveAvatar = useCallback(async () => {
        if (!user) return;
        setAvatarUploading(true);
        try {
            await user.setProfileImage({ file: null });
            await user.reload();
            toast.success("Profile photo removed");
        } catch (error) {
            console.error("remove profile image failed:", error);
            toast.error("Could not remove photo. Please try again.");
        } finally {
            setAvatarUploading(false);
        }
    }, [user]);

    const openAvatarPicker = useCallback(() => {
        avatarFileInputRef.current?.click();
    }, []);

    if (!user || adminCheckLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div
                    className="settings-enter w-full max-w-md border border-neutral-900/10 bg-white/75 px-8 py-10 shadow-[8px_8px_0_0_rgba(18,16,24,0.08)]"
                    style={{ animationDelay: "0.05s" }}
                >
                    <div className="flex flex-col items-center gap-5">
                        <div
                            className="h-11 w-11 animate-spin rounded-full border-2 border-neutral-300 border-t-[var(--afora)]"
                            aria-hidden
                        />
                        <div className="text-center">
                            <p className="settings-display text-lg font-semibold text-foreground">
                                Loading
                            </p>
                            <p className="mt-1 text-sm text-neutral-600">
                                {!user ? "Getting user information" : "Checking permissions"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const fieldLabel =
        "text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-neutral-500";

    return (
        <div className="min-h-screen bg-background pb-20">
            <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-hidden
                onChange={handleAvatarFileChange}
            />

            {/* Hero: asymmetric grid, single avatar + actions */}
            <header className="relative overflow-hidden border-b border-neutral-900/10 bg-[#f2efe6]">
                <div
                    className="pointer-events-none absolute -right-24 top-1/2 h-[min(120vw,520px)] w-[min(120vw,520px)] -translate-y-1/2 rotate-[18deg] rounded-[2.5rem] border-2 border-[var(--afora)]/25 bg-[var(--afora)]/[0.06]"
                    aria-hidden
                />
                <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
                    <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
                        <div
                            className="settings-enter max-w-xl space-y-4"
                            style={{ animationDelay: "0.08s" }}
                        >
                            <p className={fieldLabel}>Afora · Account</p>
                            <div className="flex flex-wrap items-end gap-4">
                                <h1 className="settings-display text-4xl font-extrabold leading-[0.95] text-foreground md:text-5xl">
                                    Settings
                                </h1>
                                <span
                                    className="hidden h-px flex-1 min-w-[3rem] bg-neutral-900/15 sm:block"
                                    aria-hidden
                                />
                            </div>
                            <p className="max-w-md text-base leading-relaxed text-neutral-600">
                                Profile, preferences, and tools that shape how you show up in teams.
                            </p>
                        </div>

                        <div
                            className="settings-enter relative flex flex-col items-center gap-4 lg:-mt-4 lg:items-end"
                            style={{ animationDelay: "0.18s" }}
                        >
                            <div className="relative">
                                <div
                                    className="absolute -inset-3 -z-10 rotate-6 rounded-3xl bg-[var(--afora)]/10"
                                    aria-hidden
                                />
                                <Avatar className="h-28 w-28 rounded-2xl border-2 border-neutral-900/10 shadow-[6px_6px_0_0_rgba(18,16,24,0.12)] ring-0 ring-offset-0">
                                    <AvatarImage
                                        src={user.imageUrl || ""}
                                        alt={user.fullName || "User Avatar"}
                                        className="rounded-2xl object-cover"
                                    />
                                    <AvatarFallback className="settings-display rounded-2xl bg-neutral-200 text-3xl font-bold text-neutral-700">
                                        {user.fullName?.charAt(0) ||
                                            user.primaryEmailAddress?.emailAddress?.charAt(0) ||
                                            "U"}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm lg:justify-end">
                                <button
                                    type="button"
                                    disabled={avatarUploading}
                                    onClick={openAvatarPicker}
                                    className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
                                >
                                    {avatarUploading ? "Uploading…" : "Change photo"}
                                </button>
                                {user.imageUrl ? (
                                    <>
                                        <span className="text-muted-foreground/40" aria-hidden>
                                            ·
                                        </span>
                                        <button
                                            type="button"
                                            disabled={avatarUploading}
                                            onClick={handleRemoveAvatar}
                                            className="text-muted-foreground underline-offset-2 transition-colors hover:text-destructive hover:underline disabled:pointer-events-none disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </>
                                ) : null}
                            </div>
                            <div className="w-full border-t border-neutral-900/10 pt-4 text-center lg:text-right">
                                <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
                                    <p className="settings-display text-xl font-bold text-foreground">
                                        {user.fullName || "User"}
                                    </p>
                                    <Badge
                                        variant="secondary"
                                        className="rounded-sm border border-emerald-800/20 bg-emerald-50 px-2 py-0 text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-900"
                                    >
                                        Verified
                                    </Badge>
                                </div>
                                <p className="mt-1 break-all text-sm text-neutral-600">
                                    {user.primaryEmailAddress?.emailAddress || "No email set"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
                <Tabs
                    defaultValue="profile"
                    className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14"
                >
                    <TabsList
                        className="settings-enter flex h-auto w-full flex-shrink-0 flex-row gap-1 rounded-xl border border-neutral-900/10 bg-white/70 p-1.5 shadow-sm backdrop-blur-sm lg:w-52 lg:flex-col lg:items-stretch"
                        style={{ animationDelay: "0.22s" }}
                    >
                        <TabsTrigger
                            value="profile"
                            className="settings-display flex flex-1 justify-center gap-2 rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold data-[state=active]:border-neutral-900/10 data-[state=active]:bg-background data-[state=active]:shadow-none lg:justify-start lg:border-l-[3px] lg:border-l-transparent lg:pl-3 lg:data-[state=active]:border-l-[var(--afora)]"
                        >
                            <User className="h-4 w-4 opacity-70" />
                            Profile
                        </TabsTrigger>
                        {isAdmin && (
                            <TabsTrigger
                                value="admin"
                                className="settings-display flex flex-1 justify-center gap-2 rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold data-[state=active]:border-neutral-900/10 data-[state=active]:bg-background data-[state=active]:shadow-none lg:justify-start lg:border-l-[3px] lg:border-l-transparent lg:pl-3 lg:data-[state=active]:border-l-[var(--afora)]"
                            >
                                <Shield className="h-4 w-4 opacity-70" />
                                Admin
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <div className="min-w-0 flex-1 space-y-8">
                        <TabsContent value="profile" className="mt-0 space-y-8 focus-visible:outline-none">
                            <Card
                                className="settings-enter overflow-hidden border border-border bg-card/90 shadow-sm backdrop-blur-sm"
                                style={{ animationDelay: "0.28s" }}
                            >
                                <CardHeader className="space-y-2 border-b border-border px-6 py-6 md:px-8">
                                    <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
                                        <User
                                            className="h-5 w-5 shrink-0 text-[var(--afora)]"
                                            aria-hidden
                                        />
                                        Personal profile
                                    </CardTitle>
                                    <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                                        One place for your account info and preferences. Email is from your
                                        sign-in; change your photo in the page header. Use Save profile to persist
                                        name and demographic fields.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <section
                                        className="px-6 py-6 md:px-8"
                                        aria-labelledby="personal-profile-heading"
                                    >
                                        <form
                                            onSubmit={handleProfileSubmit(onProfileSubmit)}
                                            className="space-y-5"
                                        >
                                            <h3
                                                id="personal-profile-heading"
                                                className="sr-only"
                                            >
                                                Profile and preferences
                                            </h3>

                                            <div className="space-y-4">
                                                <p className={fieldLabel}>General</p>
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor={
                                                            profileEditField === "name"
                                                                ? "settings-display-name"
                                                                : undefined
                                                        }
                                                        className={fieldLabel}
                                                    >
                                                        Name
                                                    </Label>
                                                    {profileEditField === "name" ? (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Input
                                                                id="settings-display-name"
                                                                autoComplete="name"
                                                                placeholder="Your name"
                                                                className="h-10 w-full min-w-0 max-w-[16rem] sm:w-[16rem]"
                                                                {...displayNameInputProps}
                                                                ref={(el) => {
                                                                    rhfDisplayNameRef(el);
                                                                    nameInputRef.current = el;
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="shrink-0 self-start text-muted-foreground sm:self-center"
                                                                onClick={cancelProfileInlineEdit}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="min-h-9 max-w-[calc(100%-2.5rem)] truncate py-2 text-base font-medium leading-snug text-foreground">
                                                                {(displayNameWatch && displayNameWatch.trim()) ||
                                                                    "Not set"}
                                                            </p>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                                                                onClick={() => setProfileEditField("name")}
                                                                aria-label="Edit name"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {profileErrors.displayName && (
                                                        <span className="text-sm text-destructive">
                                                            {profileErrors.displayName.message}
                                                        </span>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        Shown across Afora.
                                                    </p>
                                                    
                                                </div>
                                                <dl className="space-y-3">
                                                    <div>
                                                        <dt className={fieldLabel}>Email</dt>
                                                        <dd className="mt-1.5 break-all text-base text-foreground">
                                                            {user.primaryEmailAddress?.emailAddress || "Not set"}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt className={fieldLabel}>Account status</dt>
                                                        <dd className="mt-1.5">
                                                            <Badge
                                                                variant="secondary"
                                                                className="rounded-sm border border-emerald-800/20 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900"
                                                            >
                                                                Verified
                                                            </Badge>
                                                        </dd>
                                                    </div>
                                                </dl>

                                                
                                            </div>

                                            <div className="space-y-4 border-t border-border pt-6">
                                                <p className={fieldLabel}>Demographics</p>

                                                {DEMO_SELECT_FIELDS.map(
                                                    ({ key, label, options, inputId }) => {
                                                        const isOpen = profileEditField === key;
                                                        const value = watch(key);
                                                        const fieldError = profileErrors[key];
                                                        return (
                                                            <div key={key} className="space-y-1.5">
                                                                <Label
                                                                    htmlFor={isOpen ? inputId : undefined}
                                                                    className={fieldLabel}
                                                                >
                                                                    {label}
                                                                </Label>
                                                                {isOpen ? (
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <Select
                                                                            value={value || undefined}
                                                                            onValueChange={(v) =>
                                                                                setProfileValue(key, v, {
                                                                                    shouldDirty: true,
                                                                                })
                                                                            }
                                                                        >
                                                                            <SelectTrigger
                                                                                id={inputId}
                                                                                className="h-10 w-full min-w-0 max-w-[16rem] bg-background sm:w-[16rem]"
                                                                            >
                                                                                <SelectValue
                                                                                    placeholder={`Select ${label.toLowerCase()}`}
                                                                                />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {options.map((opt) => (
                                                                                    <SelectItem
                                                                                        key={opt}
                                                                                        value={opt}
                                                                                    >
                                                                                        {opt}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="shrink-0 self-start text-muted-foreground sm:self-center"
                                                                            onClick={cancelProfileInlineEdit}
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <p className="min-h-9 max-w-[calc(100%-2.5rem)] truncate py-2 text-base font-medium leading-snug text-foreground">
                                                                            {value?.trim() || "Not set"}
                                                                        </p>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                                                                            onClick={() => setProfileEditField(key)}
                                                                            aria-label={`Edit ${label.toLowerCase()}`}
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                                {fieldError && (
                                                                    <span className="text-sm text-destructive">
                                                                        {fieldError.message}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>

                                                <div className="border-t border-border pt-6">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                                                        <div className="min-w-0">
                                                            <Label
                                                                htmlFor="animation-switch"
                                                                className="flex cursor-pointer items-center gap-2 text-base font-medium text-foreground"
                                                            >
                                                                <Sparkles
                                                                    className="h-4 w-4 shrink-0 text-muted-foreground"
                                                                    aria-hidden
                                                                />
                                                                Celebration animations
                                                            </Label>
                                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                                {animationsEnabled
                                                                    ? "Confetti and rocket effects on tasks, claims, and surveys."
                                                                    : "Effects are turned off."}
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id="animation-switch"
                                                            checked={animationsEnabled}
                                                            onCheckedChange={setAnimationsEnabled}
                                                            disabled={animationLoading}
                                                            className="shrink-0"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex justify-end border-t border-border pt-6">
                                                    <Button
                                                        type="submit"
                                                        disabled={profileSubmitting}
                                                        className="rounded-md bg-foreground px-6 font-semibold text-background hover:bg-neutral-800"
                                                    >
                                                        {profileSubmitting ? "Saving…" : "Save profile"}
                                                    </Button>
                                                </div>
                                            </form>
                                    </section>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {isAdmin && (
                            <TabsContent value="admin" className="mt-0 space-y-8 focus-visible:outline-none">
                                <Card
                                    className="settings-enter border border-neutral-900/10 bg-white/80 shadow-[12px_12px_0_0_rgba(18,16,24,0.06)] backdrop-blur-sm"
                                    style={{ animationDelay: "0.28s" }}
                                >
                                    <CardHeader className="space-y-1 border-b border-neutral-900/10 pb-6">
                                        <CardTitle className="settings-display flex items-center gap-2 text-2xl font-bold">
                                            <Settings className="h-5 w-5 text-[var(--afora)]" />
                                            Admin participation
                                        </CardTitle>
                                        <CardDescription className="text-base text-neutral-600">
                                            Control how your admin role is included in matching and workflows.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="divide-y divide-border rounded-lg border border-border">
                                            <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                                                <div className="min-w-0">
                                                    <Label
                                                        htmlFor="admin-all-switch"
                                                        className="cursor-pointer text-base font-medium text-foreground"
                                                    >
                                                        All participation options
                                                    </Label>
                                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                                        Turn every switch below on or off at once.
                                                    </p>
                                                </div>
                                                <Switch
                                                    id="admin-all-switch"
                                                    checked={
                                                        allowMatching &&
                                                        allowTaskAssignment &&
                                                        allowGroupEvaluation
                                                    }
                                                    onCheckedChange={(checked) =>
                                                        void handleAllAdminParticipation(checked)
                                                    }
                                                    disabled={matchingLoading || adminBulkLoading}
                                                    className="shrink-0"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                                                <div className="min-w-0">
                                                    <Label
                                                        htmlFor="matching-switch"
                                                        className="cursor-pointer text-base font-medium text-foreground"
                                                    >
                                                        Include admin in matching
                                                    </Label>
                                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                                        {allowMatching
                                                            ? "Counted in team matching."
                                                            : "Not included in matching."}
                                                    </p>
                                                </div>
                                                <Switch
                                                    id="matching-switch"
                                                    checked={allowMatching}
                                                    onCheckedChange={handleMatchingPreferenceChange}
                                                    disabled={matchingLoading || adminBulkLoading}
                                                    className="shrink-0"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                                                <div className="min-w-0">
                                                    <Label
                                                        htmlFor="task-assignment-switch"
                                                        className="cursor-pointer text-base font-medium text-foreground"
                                                    >
                                                        Include admin in task generation
                                                    </Label>
                                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                                        {allowTaskAssignment
                                                            ? "Eligible for auto-assigned tasks."
                                                            : "Excluded from auto-assignment."}
                                                    </p>
                                                </div>
                                                <Switch
                                                    id="task-assignment-switch"
                                                    checked={allowTaskAssignment}
                                                    onCheckedChange={handleTaskAssignmentPreferenceChange}
                                                    disabled={adminBulkLoading}
                                                    className="shrink-0"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                                                <div className="min-w-0">
                                                    <Label
                                                        htmlFor="evaluation-switch"
                                                        className="cursor-pointer text-base font-medium text-foreground"
                                                    >
                                                        Include admin in compatibility report
                                                    </Label>
                                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                                        {allowGroupEvaluation
                                                            ? "Included in compatibility and performance reports."
                                                            : "Excluded from those reports."}
                                                    </p>
                                                </div>
                                                <Switch
                                                    id="evaluation-switch"
                                                    checked={allowGroupEvaluation}
                                                    onCheckedChange={handleGroupEvaluationPreferenceChange}
                                                    disabled={adminBulkLoading}
                                                    className="shrink-0"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}
                    </div>
                </Tabs>
            </div>
        </div>
    );
}

export default SettingPage;
