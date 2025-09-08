"use client";

import React from "react";
import MockTaskPage from "@/components/MockTaskPage";

interface MockTaskPageProps {
    params: {
        id: string;
        projId: string;
        stageId: string;
        taskId: string;
    };
}

const MockTaskPageRoute = ({ params }: MockTaskPageProps) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            <MockTaskPage 
                id={params.id} 
                projId={params.projId} 
                stageId={params.stageId} 
                taskId={params.taskId} 
            />
        </div>
    );
};

export default MockTaskPageRoute;

