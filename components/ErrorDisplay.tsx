"use client";

import React from "react";
import { AlertTriangle, RefreshCcw, X } from "lucide-react";
import { Button } from "./ui/button";
// Note: Using Card components since Alert might not be available
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export interface ErrorInfo {
    type: "smart_matching" | "team_charter" | "task_generation" | "general";
    message: string;
    details?: string;
    timestamp?: Date;
    canRetry?: boolean;
    onRetry?: () => void;
    onDismiss?: () => void;
}

interface ErrorDisplayProps {
    error: ErrorInfo;
    className?: string;
}

const getErrorTypeInfo = (type: ErrorInfo["type"]) => {
    switch (type) {
        case "smart_matching":
            return {
                title: "Smart Matching Failed",
                description: "There was an issue generating team assignments",
                color: "border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50",
                iconColor: "text-purple-600",
                titleColor: "text-purple-800",
                detailsColor: "bg-purple-100/70",
                buttonColor: "bg-purple-600 hover:bg-purple-700 text-white",
                solutionsColor: "text-purple-700"
            };
        case "team_charter":
            return {
                title: "Team Charter Save Failed",
                description: "Unable to save your team charter responses",
                color: "border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50",
                iconColor: "text-blue-600",
                titleColor: "text-blue-800",
                detailsColor: "bg-blue-100/70",
                buttonColor: "bg-blue-600 hover:bg-blue-700 text-white",
                solutionsColor: "text-blue-700"
            };
        case "task_generation":
            return {
                title: "Task Generation Failed",
                description: "Could not generate tasks for your project",
                color: "border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50",
                iconColor: "text-emerald-600",
                titleColor: "text-emerald-800",
                detailsColor: "bg-emerald-100/70",
                buttonColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
                solutionsColor: "text-emerald-700"
            };
        default:
            return {
                title: "Error",
                description: "An unexpected error occurred",
                color: "border-red-300 bg-gradient-to-br from-red-50 to-pink-50",
                iconColor: "text-red-600",
                titleColor: "text-red-800",
                detailsColor: "bg-red-100/70",
                buttonColor: "bg-red-600 hover:bg-red-700 text-white",
                solutionsColor: "text-red-700"
            };
    }
};

const formatErrorMessage = (error: ErrorInfo) => {
    const commonSolutions = {
        smart_matching: [
            "Ensure you have at least 2 unassigned members in your organization",
            "Check that projects have available team spots",
            "Verify member survey data is complete",
            "Try reducing the team size requirement"
        ],
        team_charter: [
            "Make sure all required questions are answered",
            "Check your internet connection",
            "Verify you have permission to edit this project",
            "Try saving individual sections separately"
        ],
        task_generation: [
            "Complete the team charter before generating tasks",
            "Ensure all team members have filled out their surveys",
            "Check that the project has assigned team members",
            "Verify the AI service is available"
        ]
    };

    const solutions = commonSolutions[error.type as keyof typeof commonSolutions] || [
        "Check your internet connection",
        "Try refreshing the page",
        "Contact support if the issue persists"
    ];

    return { solutions };
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
    error, 
    className = "" 
}) => {
    const typeInfo = getErrorTypeInfo(error.type);
    const { solutions } = formatErrorMessage(error);

    return (
        <Card className={`${typeInfo.color} ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className={`flex items-center gap-2 text-lg ${typeInfo.titleColor}`}>
                    <AlertTriangle className={`h-5 w-5 ${typeInfo.iconColor}`} />
                    {typeInfo.title}
                    {error.onDismiss && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={error.onDismiss}
                            className="ml-auto h-6 w-6 p-0 hover:bg-white/50"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border-0 bg-white/50 p-3 rounded-md">
                    <div className="text-sm">
                        <strong>{typeInfo.description}</strong>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className={`text-sm font-medium ${typeInfo.solutionsColor}`}>Error Details:</p>
                    <p className={`text-sm text-gray-700 ${typeInfo.detailsColor} p-3 rounded-md`}>
                        {error.message}
                    </p>
                    {error.details && (
                        <details className="text-xs text-gray-600">
                            <summary className={`cursor-pointer hover:${typeInfo.titleColor}`}>
                                Technical Details
                            </summary>
                            <pre className={`mt-2 ${typeInfo.detailsColor} p-2 rounded text-xs overflow-auto`}>
                                {error.details}
                            </pre>
                        </details>
                    )}
                </div>

                <div className="space-y-2">
                    <p className={`text-sm font-medium ${typeInfo.solutionsColor}`}>Possible Solutions:</p>
                    <ul className="text-sm text-gray-700 space-y-1">
                        {solutions.map((solution: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className={`${typeInfo.iconColor} mt-1`}>•</span>
                                <span>{solution}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {error.timestamp && (
                    <p className="text-xs text-gray-400 border-t pt-2">
                        Error occurred at: {error.timestamp.toLocaleString()}
                    </p>
                )}

                {error.canRetry && error.onRetry && (
                    <div className="flex justify-end pt-2 border-t">
                        <Button
                            onClick={error.onRetry}
                            size="sm"
                            className={`${typeInfo.buttonColor} border-0`}
                        >
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Toast 版本的错误显示
export const showErrorToast = (error: ErrorInfo) => {
    const { toast } = require("sonner");
    const typeInfo = getErrorTypeInfo(error.type);
    
    toast.error(typeInfo.title, {
        description: error.message,
        duration: 8000,
        action: error.canRetry && error.onRetry ? {
            label: "Retry",
            onClick: error.onRetry
        } : undefined
    });
};

export default ErrorDisplay;
