"use client";

import React from "react";
import MockProjectPage from "@/components/MockProjectPage";

interface MockProjectPageProps {
    params: {
        id: string;
        projId: string;
    };
}

const MockProjectPageRoute = ({ params }: MockProjectPageProps) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <MockProjectPage id={params.id} projId={params.projId} />
        </div>
    );
};

export default MockProjectPageRoute;

