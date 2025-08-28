"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Leaderboard from "@/components/Leaderboard";
import { UserScore } from "@/types/types";
import { getProjectLeaderboard } from "@/actions/actions";

function LeaderboardPage() {
    const params = useParams();
    const id = params.id as string;
    const projId = params.projId as string;
    
    const { isSignedIn, isLoaded } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const [userScores, setUserScores] = useState<UserScore[]>([]);
    const [loading, setLoading] = useState(true);

    const loadRealData = useCallback(async () => {
        try {
            // 获取项目排行榜数据
            const leaderboardResponse = await getProjectLeaderboard(projId, id);
            if (
                leaderboardResponse.success &&
                leaderboardResponse.leaderboard
            ) {
                // 将后端数据转换为前端需要的格式
                const formattedScores: UserScore[] =
                    leaderboardResponse.leaderboard.map((score: Record<string, unknown>) => ({
                        userId: score.id as string,
                        email: score.user_email as string,
                        totalPoints: score.total_points as number,
                        tasksCompleted: score.tasks_completed as number,
                        tasksAssigned: score.tasks_assigned as number,
                        averageCompletionTime:
                            (score.average_completion_time as number) || 0,
                        streak: (score.streak as number) || 0,
                    }));
                setUserScores(formattedScores);
            } else {
                console.error(
                    "Failed to load leaderboard:",
                    leaderboardResponse.message,
                );
                setUserScores([]);
            }

            setLoading(false);
        } catch (error) {
            console.error("Error loading leaderboard data:", error);
            setUserScores([]);
            setLoading(false);
        }
    }, [projId]);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.replace("/");
        }
    }, [isLoaded, isSignedIn, router]);

    useEffect(() => {
        loadRealData();
    }, [loadRealData]);

    if (!isSignedIn) return null;

    if (loading) {
        return <Skeleton className="w-full h-96" />;
    }

    return (
        <div className="container mx-auto p-6">
            {/* Navigation */}
            <div className="mb-6">
                <Link href={`/org/${id}/proj/${projId}`}>
                    <Button variant="ghost" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Team
                    </Button>
                </Link>
            </div>

            {/* Leaderboard Component */}
            <Leaderboard
                userScores={userScores}
                currentUserEmail={user?.primaryEmailAddress?.emailAddress}
            />
        </div>
    );
}

export default LeaderboardPage;
