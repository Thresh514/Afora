"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleAdminUserParticipation, checkAdminUserParticipation } from "@/actions/actions";
import { toast } from "sonner";
import { Users, UserCog } from "lucide-react";
import { useDocument } from "react-firebase-hooks/firestore";
import { doc } from "firebase/firestore";
import { db } from "@/firebase";

export default function AdminUserParticipation() {
    const params = useParams();
    const { user } = useUser();
    const projId = params.projId as string;
    
    const [isParticipating, setIsParticipating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    // 获取项目数据来检查用户是否是admin
    const [projectDoc, projectLoading, projectError] = useDocument(
        projId ? doc(db, "projects", projId) : null
    );

    const project = projectDoc?.data();
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const isAdmin = userEmail && project?.admins?.includes(userEmail);

    useEffect(() => {
        const checkStatus = async () => {
            if (!projId || !isAdmin) {
                setIsLoading(false);
                return;
            }

            try {
                const result = await checkAdminUserParticipation(projId);
                if (result.success) {
                    setIsParticipating(result.participating);
                }
            } catch (error) {
                console.error("Error checking participation status:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!projectLoading) {
            checkStatus();
        }
    }, [projId, isAdmin, projectLoading]);

    const handleToggle = async (checked: boolean) => {
        setIsUpdating(true);
        try {
            const result = await toggleAdminUserParticipation(projId, checked);
            
            if (result.success) {
                setIsParticipating(checked);
                toast.success(result.message);
            } else {
                toast.error(result.message || "Failed to update participation status");
            }
        } catch (error) {
            console.error("Error toggling participation:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsUpdating(false);
        }
    };

    // 如果还在加载项目数据，或者用户不是admin，不显示组件
    if (projectLoading || isLoading || !isAdmin || !projId) {
        return null;
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-blue-600" />
                    Admin User Participation
                </CardTitle>
                <CardDescription>
                    As an admin, you can choose to also participate in user activities like task assignments and team matching.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2">
                    <Switch
                        id="admin-user-participation"
                        checked={isParticipating}
                        onCheckedChange={handleToggle}
                        disabled={isUpdating}
                    />
                    <Label htmlFor="admin-user-participation" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {isParticipating 
                            ? "Participating in user activities" 
                            : "Admin-only mode (not participating in user activities)"
                        }
                    </Label>
                </div>
                {isParticipating && (
                    <p className="text-sm text-muted-foreground mt-2">
                        You will be included in task assignments, team matching, and other user activities.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}