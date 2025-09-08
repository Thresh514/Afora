"use client";

import React from "react";
import MockStagePage from "@/components/MockStagePage";

interface MockStagePageProps {
    params: {
        id: string;
        projId: string;
        stageId: string;
    };
}

const MockStagePageRoute = ({ params }: MockStagePageProps) => {
    return (
        <div className="min-h-screen bg-gray-100">
            <MockStagePage id={params.id} projId={params.projId} stageId={params.stageId} />
        </div>
    );
};

export default MockStagePageRoute;

