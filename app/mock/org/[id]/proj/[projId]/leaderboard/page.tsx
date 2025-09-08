"use client";

import React from "react";
import MockLeaderboard from "@/components/MockLeaderboard";

interface MockLeaderboardPageProps {
    params: {
        id: string;
        projId: string;
    };
}

const MockLeaderboardPageRoute = ({ params }: MockLeaderboardPageProps) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <MockLeaderboard id={params.id} projId={params.projId} />
        </div>
    );
};

export default MockLeaderboardPageRoute;

