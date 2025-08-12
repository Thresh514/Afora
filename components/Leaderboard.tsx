"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserScore } from "@/types/types";
import {
    Trophy,
    Medal,
    Award,
    Clock,
    CheckCircle,
    Target,
    Flame,
} from "lucide-react";

interface LeaderboardProps {
    userScores: UserScore[];
    currentUserEmail?: string; 
}

type DisplayLimit = 3 | 5 | 10 | "all";

const Leaderboard: React.FC<LeaderboardProps> = ({
    userScores,
    currentUserEmail,
}) => {
    const [sortedScores, setSortedScores] = useState<UserScore[]>([]);
    const [displayLimit, setDisplayLimit] = useState<DisplayLimit>(10);

    useEffect(() => {
        // Sort users by total points (descending)
        const sorted = [...userScores].sort(
            (a, b) => b.totalPoints - a.totalPoints,
        );
        setSortedScores(sorted);
    }, [userScores]);

    // Get available display options based on total member count
    const getAvailableDisplayOptions = useCallback((): DisplayLimit[] => {
        const totalMembers = sortedScores.length;
        const options: DisplayLimit[] = [];

        if (totalMembers >= 3) options.push(3);
        if (totalMembers >= 5) options.push(5);
        if (totalMembers >= 10) options.push(10);
        options.push("all");

        return options;
    }, [sortedScores.length]);

    // Auto-adjust display limit if current selection is not available
    useEffect(() => {
        const availableOptions = getAvailableDisplayOptions();
        if (!availableOptions.includes(displayLimit)) {
            setDisplayLimit(availableOptions[availableOptions.length - 1]); // Default to 'all' or highest available
        }
    }, [sortedScores.length, displayLimit, getAvailableDisplayOptions]);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Trophy className="h-6 w-6 text-yellow-500" />;
            case 2:
                return <Medal className="h-6 w-6 text-gray-400" />;
            case 3:
                return <Award className="h-6 w-6 text-amber-600" />;
            default:
                return (
                    <div className="h-6 w-6 flex items-center justify-center text-gray-500 font-bold">
                        {rank}
                    </div>
                );
        }
    };

    const getRankBadgeVariant = (rank: number) => {
        switch (rank) {
            case 1:
                return "default";
            case 2:
                return "secondary";
            case 3:
                return "outline";
            default:
                return "outline";
        }
    };

    const getStreakDisplay = (streak: number) => {
        if (streak === 0) return null;
        return (
            <div className="flex items-center gap-1 text-orange-600">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-semibold">{streak}</span>
            </div>
        );
    };

    const formatEmail = (email: string) => {
        return email.length > 20 ? email.substring(0, 20) + "..." : email;
    };

    const isCurrentUser = (email: string) => {
        return (
            currentUserEmail &&
            (email === currentUserEmail || email.includes(currentUserEmail))
        );
    };

    // Find current user's rank
    const currentUserRank = currentUserEmail
        ? sortedScores.findIndex((user) => isCurrentUser(user.email)) + 1
        : 0;

    // Get top users for display
    const getTopUsers = () => {
        if (displayLimit === "all") {
            return sortedScores;
        }
        return sortedScores.slice(0, displayLimit);
    };

    // Get current user if they're not in the top display
    const getCurrentUserIfNotInTop = () => {
        if (displayLimit === "all") {
            return null; // All users are already shown
        }

        if (currentUserEmail && currentUserRank > displayLimit) {
            return (
                sortedScores.find((user) => isCurrentUser(user.email)) || null
            );
        }

        return null; // Current user is in top or no current user
    };

    const topUsers = getTopUsers();
    const currentUserOutOfTop = getCurrentUserIfNotInTop();

    const topPerformers = topUsers.slice(0, 3);
    const otherPerformers = topUsers.slice(3);

    return (
        <div className="space-y-6">
            <Tabs defaultValue="rankings" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="rankings">Rankings</TabsTrigger>
                    <TabsTrigger value="detailed">Detailed Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="rankings" className="space-y-4">
                    {/* Top 3 Performers */}
                    {topPerformers.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    🏆 Top Performers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4">
                                    {topPerformers.map((user) => {
                                        const rank =
                                            sortedScores.findIndex(
                                                (u) => u.userId === user.userId,
                                            ) + 1;
                                        const isCurrentUserCard = isCurrentUser(
                                            user.email,
                                        );
                                        const isOutOfRange =
                                            displayLimit !== "all" &&
                                            rank > displayLimit;

                                        const cardClassName = `flex items-center gap-4 p-4 rounded-lg border ${
                                            isCurrentUserCard
                                                ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 ring-2 ring-blue-200"
                                                : "bg-gradient-to-r from-gray-50 to-white"
                                        } ${isOutOfRange ? "border-dashed border-orange-300 bg-orange-50" : ""}`;

                                        return (
                                            <div
                                                key={user.userId}
                                                className={cardClassName}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {getRankIcon(rank)}
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarFallback>
                                                            {user.email
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`font-semibold ${isCurrentUserCard ? "text-blue-800" : ""}`}
                                                        >
                                                            {formatEmail(
                                                                user.email,
                                                            )}
                                                            {isCurrentUserCard &&
                                                                " (You)"}
                                                        </span>
                                                        <Badge
                                                            variant={getRankBadgeVariant(
                                                                rank,
                                                            )}
                                                        >
                                                            #{rank}
                                                        </Badge>
                                                        {getStreakDisplay(
                                                            user.streak,
                                                        )}
                                                        {isOutOfRange && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-orange-600 border-orange-300"
                                                            >
                                                                Your Rank
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {user.tasksCompleted}{" "}
                                                        tasks completed •{" "}
                                                        {user.averageCompletionTime.toFixed(
                                                            1,
                                                        )}
                                                        h avg
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {user.totalPoints}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        points
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Other Performers - only show if there are non-top-3 users in the top display */}
                    {otherPerformers.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Other Team Members
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {otherPerformers.map((user) => {
                                        const rank =
                                            sortedScores.findIndex(
                                                (u) => u.userId === user.userId,
                                            ) + 1;
                                        const isCurrentUserCard = isCurrentUser(
                                            user.email,
                                        );

                                        const cardClassName = `flex items-center gap-4 p-3 rounded-lg border ${
                                            isCurrentUserCard
                                                ? "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 ring-2 ring-blue-200"
                                                : "hover:bg-gray-50"
                                        }`;

                                        return (
                                            <div
                                                key={user.userId}
                                                className={cardClassName}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 flex items-center justify-center text-gray-500 font-bold">
                                                        {rank}
                                                    </div>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="text-sm">
                                                            {user.email
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`font-medium ${isCurrentUserCard ? "text-blue-800" : ""}`}
                                                        >
                                                            {formatEmail(
                                                                user.email,
                                                            )}
                                                            {isCurrentUserCard &&
                                                                " (You)"}
                                                        </span>
                                                        {getStreakDisplay(
                                                            user.streak,
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {user.tasksCompleted}{" "}
                                                        completed •{" "}
                                                        {user.tasksAssigned}{" "}
                                                        assigned
                                                    </div>
                                                </div>

                                                <div className="text-lg font-semibold text-blue-600">
                                                    {user.totalPoints}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Current User (if not in top display) */}
                    {currentUserOutOfTop && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Your Rank
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                        (#{currentUserRank} out of{" "}
                                        {sortedScores.length})
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {(() => {
                                        const user = currentUserOutOfTop;
                                        const rank = currentUserRank;

                                        return (
                                            <div className="flex items-center gap-4 p-3 rounded-lg border bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 ring-2 ring-blue-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 flex items-center justify-center text-gray-500 font-bold">
                                                        {rank}
                                                    </div>
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="text-sm">
                                                            {user.email
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-blue-800">
                                                            {formatEmail(
                                                                user.email,
                                                            )}{" "}
                                                            (You)
                                                        </span>
                                                        {getStreakDisplay(
                                                            user.streak,
                                                        )}
                                                        <Badge
                                                            variant="outline"
                                                            className="text-orange-600 border-orange-300"
                                                        >
                                                            Your Rank
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {user.tasksCompleted}{" "}
                                                        completed •{" "}
                                                        {user.tasksAssigned}{" "}
                                                        assigned
                                                    </div>
                                                </div>

                                                <div className="text-lg font-semibold text-blue-600">
                                                    {user.totalPoints}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {userScores.length === 0 && (
                        <Card>
                            <CardContent className="text-center py-8">
                                <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                                    No team members found
                                </h3>
                                <p className="text-gray-400">
                                    Add members to your team to see the leaderboard!
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="detailed" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Detailed Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2">
                                                Member
                                            </th>
                                            <th className="text-center py-2">
                                                Points
                                            </th>
                                            <th className="text-center py-2">
                                                Completed
                                            </th>
                                            <th className="text-center py-2">
                                                Assigned
                                            </th>
                                            <th className="text-center py-2">
                                                Avg Time
                                            </th>
                                            <th className="text-center py-2">
                                                Streak
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedScores.map((user) => {
                                            const isCurrentUserRow =
                                                isCurrentUser(user.email);
                                            return (
                                                <tr
                                                    key={user.userId}
                                                    className={`border-b hover:bg-gray-50 ${
                                                        isCurrentUserRow
                                                            ? "bg-blue-50 hover:bg-blue-100"
                                                            : ""
                                                    }`}
                                                >
                                                    <td className="py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarFallback className="text-xs">
                                                                    {user.email
                                                                        .charAt(
                                                                            0,
                                                                        )
                                                                        .toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span
                                                                className={`font-medium ${isCurrentUserRow ? "text-blue-800" : ""}`}
                                                            >
                                                                {formatEmail(
                                                                    user.email,
                                                                )}
                                                                {isCurrentUserRow &&
                                                                    " (You)"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3">
                                                        <Badge
                                                            variant={
                                                                isCurrentUserRow
                                                                    ? "default"
                                                                    : "outline"
                                                            }
                                                        >
                                                            {user.totalPoints}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-center py-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                            {
                                                                user.tasksCompleted
                                                            }
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Target className="h-4 w-4 text-blue-500" />
                                                            {user.tasksAssigned}
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Clock className="h-4 w-4 text-purple-500" />
                                                            {user.averageCompletionTime.toFixed(
                                                                1,
                                                            )}
                                                            h
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3">
                                                        {user.streak > 0 ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Flame className="h-4 w-4 text-orange-500" />
                                                                {user.streak}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">
                                                                -
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Leaderboard;
