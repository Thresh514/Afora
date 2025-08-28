'use client'


import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { updateUserMatchingPreference, getUserMatchingPreference } from "@/actions/actions";
import { db } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, User, Shield } from "lucide-react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type ProfileInputs = {
    demographic: string;
    gender: string;
};

function SettingPage() {
    const { user } = useUser();
    const [allowMatching, setAllowMatching] = useState<boolean>(true);
    const [matchingLoading, setMatchingLoading] = useState<boolean>(true);
    const [allowTaskAssignment, setAllowTaskAssignment] = useState<boolean>(true);
    const [allowGroupEvaluation, setAllowGroupEvaluation] = useState<boolean>(true);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [adminCheckLoading, setAdminCheckLoading] = useState<boolean>(true);
    
    // 性别和人口统计选项
    const genders = ["Male", "Female", "Other"];
    const demographics = [
        "Middle/High School Student",
        "College Student", 
        "Professional",
        "Personal",
    ];

    // 个人资料表单
    const {
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors },
        setValue: setProfileValue,
    } = useForm<ProfileInputs>({
        defaultValues: {
            gender: (user?.unsafeMetadata?.gender as string) || "",
            demographic: (user?.unsafeMetadata?.demographic as string) || "",
        },
    });

    // 处理个人资料表单提交
    const onProfileSubmit: SubmitHandler<ProfileInputs> = async (data) => {
        const currentGender = user?.unsafeMetadata?.gender;
        const currentDemographic = user?.unsafeMetadata?.demographic;

        // 创建包含已更改字段的对象
        const updatedMetadata: Partial<ProfileInputs> = {};
        if (data.gender && data.gender !== currentGender) {
            updatedMetadata.gender = data.gender;
        }
        if (data.demographic && data.demographic !== currentDemographic) {
            updatedMetadata.demographic = data.demographic;
        }

        // If there are no changes, don't update
        if (Object.keys(updatedMetadata).length === 0) {
            toast.success("Profile is already up to date");
            return;
        }

        try {
            await user?.update({
                unsafeMetadata: {
                    ...user.unsafeMetadata,
                    ...updatedMetadata,
                },
            });
            toast.success("Profile updated successfully");
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Update failed, please try again");
        }
    };

    // Check if user is admin
    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user?.primaryEmailAddress?.emailAddress) {
                setAdminCheckLoading(false);
                return;
            }

            try {
                const userEmail = user.primaryEmailAddress.emailAddress;
                
                // Check if user is admin in any organization
                const orgsQuery = query(
                    collection(db, "organizations"),
                    where("admins", "array-contains", userEmail)
                );
                
                const orgsSnapshot = await getDocs(orgsQuery);
                const isOrgAdmin = !orgsSnapshot.empty;

                // Check if user is admin in any project (check all organizations)
                let isProjectAdmin = false;
                const orgsSnapshot2 = await getDocs(collection(db, "organizations"));
                
                for (const orgDoc of orgsSnapshot2.docs) {
                    const projectsSnapshot = await getDocs(
                        query(
                            collection(db, "organizations", orgDoc.id, "projects"),
                            where("admins", "array-contains", userEmail)
                        )
                    );
                    if (!projectsSnapshot.empty) {
                        isProjectAdmin = true;
                        break;
                    }
                }

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

    // Get user matching preferences
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

        // Update matching preference
    const handleMatchingPreferenceChange = (checked: boolean) => {
        setAllowMatching(checked);
        updateUserMatchingPreference(checked)
            .then((result) => {
                if (result.success) {
                    toast.success(checked ? "Admin matching enabled" : "Admin matching disabled");
                } else {
                    toast.error("Update failed");
                    // Restore previous state
                    setAllowMatching(!checked);
                }
            })
            .catch((error) => {
                toast.error("Update failed: " + error.message);
                // Restore previous state
                setAllowMatching(!checked);
            });
    };

    // Update task assignment preference (frontend only for now)
    const handleTaskAssignmentPreferenceChange = (checked: boolean) => {
        setAllowTaskAssignment(checked);
        toast.success(checked ? "Admin task assignment enabled" : "Admin task assignment disabled");
    };

    // Update group evaluation preference (frontend only for now)
    const handleGroupEvaluationPreferenceChange = (checked: boolean) => {
        setAllowGroupEvaluation(checked);
        toast.success(checked ? "Admin group evaluation enabled" : "Admin group evaluation disabled");
    };



    if (!user || adminCheckLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
                <Card className="w-96 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-gray-900">Loading...</h3>
                                <p className="text-sm text-gray-600">
                                    {!user ? "Getting user information" : "Checking permissions"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Page Title */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Settings className="h-8 w-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900">Settings Center</h1>
                    </div>
                    <p className="text-gray-600">Manage your profile, preferences and system functions</p>
                </div>

                {/* User Info Card */}
                <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-6">
                            <Avatar className="h-20 w-20 ring-4 ring-blue-100">
                                <AvatarImage 
                                    src={user.imageUrl || ""} 
                                    alt={user.fullName || "User Avatar"} 
                                />
                                <AvatarFallback className="text-2xl font-semibold bg-blue-100 text-blue-700">
                                    {user.fullName?.charAt(0) || user.primaryEmailAddress?.emailAddress?.charAt(0) || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {user.fullName || "User"}
                                    </h2>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                                        Verified
                                    </Badge>
                                </div>
                                <p className="text-gray-600 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    {user.primaryEmailAddress?.emailAddress || "No email set"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} bg-white/80 backdrop-blur-sm border shadow-sm`}>
                        <TabsTrigger value="profile" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Profile
                        </TabsTrigger>
                        {isAdmin && (
                            <TabsTrigger value="admin" className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* Profile Settings */}
                    <TabsContent value="profile" className="space-y-6">
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-600" />
                                    Personal Profile
                                </CardTitle>
                                <CardDescription>
                                    View and manage your personal information
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Basic Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium text-gray-700">Username</Label>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">
                                                {user.fullName || "Not set"}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-700">Email Address</Label>
                                            <p className="mt-1 text-lg text-gray-900">
                                                {user.primaryEmailAddress?.emailAddress || "Not set"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium text-gray-700">Account Status</Label>
                                            <div className="mt-1">
                                                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                                                    Verified
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-gray-700">Avatar</Label>
                                            <div className="mt-2">
                                                <Avatar className="h-16 w-16 ring-4 ring-blue-100">
                                                    <AvatarImage 
                                                        src={user.imageUrl || ""} 
                                                        alt={user.fullName || "User Avatar"} 
                                                    />
                                                    <AvatarFallback className="text-xl font-semibold bg-blue-100 text-blue-700">
                                                        {user.fullName?.charAt(0) || user.primaryEmailAddress?.emailAddress?.charAt(0) || "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Detailed Information Form */}
                                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Gender</Label>
                                            <Select
                                                onValueChange={(value) => setProfileValue("gender", value)}
                                                defaultValue={user?.unsafeMetadata?.gender as string}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={
                                                            (user?.unsafeMetadata?.gender as string) ||
                                                            "Select Gender"
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {genders.map((gender) => (
                                                        <SelectItem key={gender} value={gender}>
                                                            {gender}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {profileErrors.gender && (
                                                <span className="text-red-500 text-sm">
                                                    {profileErrors.gender.message}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Demographic</Label>
                                            <Select
                                                onValueChange={(value) => setProfileValue("demographic", value)}
                                                defaultValue={user?.unsafeMetadata?.demographic as string}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue
                                                        placeholder={
                                                            (user?.unsafeMetadata?.demographic as string) ||
                                                            "Select Demographic"
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {demographics.map((demographic) => (
                                                        <SelectItem key={demographic} value={demographic}>
                                                            {demographic}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {profileErrors.demographic && (
                                                <span className="text-red-500 text-sm">
                                                    {profileErrors.demographic.message}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                            Save Profile
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Admin Functions - Only show if user is admin */}
                    {isAdmin && (
                        <TabsContent value="admin" className="space-y-6">
                        {/* Admin Participation Settings */}
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-blue-600" />
                                    Admin Participation Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Matching Setting */}
                                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Label htmlFor="matching-switch" className="text-lg font-semibold cursor-pointer text-gray-900">
                                                Include Admin in Matching
                                            </Label>
                                            <Badge variant={allowMatching ? "default" : "secondary"} className="text-xs">
                                                {allowMatching ? "Included" : "Excluded"}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {allowMatching 
                                                ? "Admin will be considered as a participant in team matching algorithms" 
                                                : "Admin will be excluded from team matching processes"
                                            }
                                        </p>
                                    </div>
                                    <Switch
                                        id="matching-switch"
                                        checked={allowMatching}
                                        onCheckedChange={handleMatchingPreferenceChange}
                                        disabled={matchingLoading}
                                        className="ml-6 data-[state=checked]:bg-blue-600"
                                    />
                                </div>

                                {/* Task Assignment Setting */}
                                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Label htmlFor="task-assignment-switch" className="text-lg font-semibold cursor-pointer text-gray-900">
                                                Include Admin in Task Generation
                                            </Label>
                                            <Badge variant={allowTaskAssignment ? "default" : "secondary"} className="text-xs">
                                                {allowTaskAssignment ? "Included" : "Excluded"}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {allowTaskAssignment 
                                                ? "Admin can be assigned tasks during automatic task allocation" 
                                                : "Admin will be excluded from automatic task assignments"
                                            }
                                        </p>
                                    </div>
                                    <Switch
                                        id="task-assignment-switch"
                                        checked={allowTaskAssignment}
                                        onCheckedChange={handleTaskAssignmentPreferenceChange}
                                        className="ml-6 data-[state=checked]:bg-green-600"
                                    />
                                </div>

                                {/* Group Evaluation Setting */}
                                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-100">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Label htmlFor="evaluation-switch" className="text-lg font-semibold cursor-pointer text-gray-900">
                                                Include Admin in Team Compatibility Test Report
                                            </Label>
                                            <Badge variant={allowGroupEvaluation ? "default" : "secondary"} className="text-xs">
                                                {allowGroupEvaluation ? "Included" : "Excluded"}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {allowGroupEvaluation 
                                                ? "Admin will be included in group compatibility and performance evaluations" 
                                                : "Admin will be excluded from group evaluation workflows"
                                            }
                                        </p>
                                    </div>
                                    <Switch
                                        id="evaluation-switch"
                                        checked={allowGroupEvaluation}
                                        onCheckedChange={handleGroupEvaluationPreferenceChange}
                                        className="ml-6 data-[state=checked]:bg-purple-600"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </div>
    );
}

export default SettingPage;
