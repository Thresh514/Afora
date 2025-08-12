"use client";

import { Loader2 } from "lucide-react";
import React from "react";

interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string;
    description?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isVisible,
    message = "Processing...",
    description
}) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="flex flex-col items-center space-y-4 rounded-lg bg-white p-8 shadow-2xl">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {message}
                    </h3>
                    {description && (
                        <p className="mt-2 text-sm text-gray-600">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
