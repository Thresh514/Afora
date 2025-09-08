"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { 
    Target, 
    CheckCircle2, 
    MessageSquare, 
    Edit3, 
    User,
    Calendar,
    Clock,
    Star,
    Upload,
    FileText,
    Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";

interface Task {
    id: string;
    title: string;
    description: string;
    assignee: string;
    soft_deadline: string;
    hard_deadline: string;
    points: number;
    isCompleted: boolean;
    progress: number;
    order: number;
}

interface MockTaskMainContentProps {
    projId: string;
    stageId: string;
    taskId: string;
    task: Task;
    taskLocked: boolean;
}

// Mock comments data
const mockComments = [
    {
        id: "comment-1",
        author: "admin@afora.com",
        content: "Great progress on this task! The requirements are well-documented and comprehensive.",
        timestamp: "2024-01-20T10:30:00Z",
        isPublic: true
    },
    {
        id: "comment-2",
        author: "member1@afora.com",
        content: "I've reviewed the technical specifications. Everything looks good to proceed with development.",
        timestamp: "2024-01-21T14:15:00Z",
        isPublic: true
    },
    {
        id: "comment-3",
        author: "member2@afora.com",
        content: "The UI mockups are ready for review. Should I schedule a design review meeting?",
        timestamp: "2024-01-22T09:45:00Z",
        isPublic: true
    }
];

// Mock submissions data
const mockSubmissions = [
    {
        id: "submission-1",
        author: "admin@afora.com",
        title: "Requirements Document v1.0",
        description: "Complete requirements specification document with all functional and non-functional requirements",
        timestamp: "2024-01-25T16:30:00Z",
        files: ["requirements_v1.pdf", "user_stories.docx"],
        status: "approved"
    },
    {
        id: "submission-2",
        author: "member1@afora.com",
        title: "System Architecture Diagrams",
        description: "Technical architecture diagrams and database schema documentation",
        timestamp: "2024-01-28T11:20:00Z",
        files: ["architecture_diagrams.pdf", "database_schema.sql"],
        status: "pending"
    }
];

const MockTaskMainContent = ({
    projId,
    stageId,
    taskId,
    task,
    taskLocked,
}: MockTaskMainContentProps) => {
    const [completionPercentage, setCompletionPercentage] = useState([task.progress]);
    const [isCompleted, setIsCompleted] = useState(task.isCompleted);
    const [newComment, setNewComment] = useState("");
    const [comments, setComments] = useState(mockComments);
    const [submissions, setSubmissions] = useState(mockSubmissions);

    const handleProgressChange = (value: number[]) => {
        setCompletionPercentage(value);
        if (value[0] === 100 && !isCompleted) {
            setIsCompleted(true);
            toast.success("Task completed! 🎉");
        } else if (value[0] < 100 && isCompleted) {
            setIsCompleted(false);
        }
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        
        const comment = {
            id: `comment-${Date.now()}`,
            author: "admin@afora.com",
            content: newComment,
            timestamp: new Date().toISOString(),
            isPublic: true
        };
        
        setComments([...comments, comment]);
        setNewComment("");
        toast.success("Comment added successfully! (Mock mode)");
    };

    const handleFileUpload = () => {
        toast.success("File uploaded successfully! (Mock mode)");
    };

    const handleSubmitWork = () => {
        const submission = {
            id: `submission-${Date.now()}`,
            author: "admin@afora.com",
            title: "Work Submission",
            description: "Completed work for this task",
            timestamp: new Date().toISOString(),
            files: ["work_submission.pdf"],
            status: "pending"
        };
        
        setSubmissions([...submissions, submission]);
        toast.success("Work submitted successfully! (Mock mode)");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-12 mb-8">
            {/* Left Side - Combined Progress + Proof of Completion */}
            <div className="lg:col-span-2">
                <Card>
                    {/* Progress Section */}
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Target className="h-5 w-5 text-[#6F61EF]" />
                            <span>Task Progress</span>

                            <div
                                className={`ml-auto flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                                    isCompleted
                                        ? "bg-green-100 text-green-700"
                                        : completionPercentage[0] > 50
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-100 text-gray-700"
                                }`}
                            >
                                {isCompleted && (
                                    <CheckCircle2 className="h-4 w-4" />
                                )}
                                <span>
                                    {isCompleted ? "Completed" : "In Progress"}
                                </span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">
                                    Progress: {completionPercentage[0]}%
                                </span>
                                <span className="text-sm text-gray-500">
                                    {isCompleted ? "Task completed!" : "Keep going!"}
                                </span>
                            </div>
                            <Progress value={completionPercentage[0]} className="h-2" />
                            
                            {!taskLocked && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Adjust Progress:
                                    </label>
                                    <Slider
                                        value={completionPercentage}
                                        onValueChange={handleProgressChange}
                                        max={100}
                                        step={1}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Task Details */}
                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-semibold text-gray-900">Task Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-600">Assignee:</span>
                                    <span className="font-medium">{task.assignee}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Star className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-600">Points:</span>
                                    <span className="font-medium">{task.points}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-600">Soft Deadline:</span>
                                    <span className="font-medium">{task.soft_deadline}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-600">Hard Deadline:</span>
                                    <span className="font-medium">{task.hard_deadline}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Proof of Completion Section */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span>Proof of Completion</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            {submissions.map((submission) => (
                                <div
                                    key={submission.id}
                                    className="p-4 border rounded-lg bg-gray-50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">
                                                {submission.title}
                                            </h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {submission.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                {submission.files.map((file, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded"
                                                    >
                                                        <FileText className="h-3 w-3" />
                                                        {file}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={submission.status === "approved" ? "default" : "secondary"}
                                            className={submission.status === "approved" ? "bg-green-100 text-green-800" : ""}
                                        >
                                            {submission.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <h5 className="font-medium text-gray-900">Submit Work</h5>
                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleFileUpload}
                                    className="w-full"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Files
                                </Button>
                                <Button
                                    onClick={handleSubmitWork}
                                    className="w-full"
                                >
                                    Submit Work
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Side - Comments */}
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5 text-[#6F61EF]" />
                            <span>Comments & Discussion</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Comments List */}
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="p-4 border rounded-lg bg-gray-50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                    {comment.author.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {comment.author}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(comment.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700">
                                                {comment.content}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Comment */}
                        <div className="space-y-3 pt-4 border-t">
                            <h5 className="font-medium text-gray-900">Add Comment</h5>
                            <div className="space-y-2">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write your comment here..."
                                    className="w-full p-3 border rounded-lg resize-none"
                                    rows={3}
                                />
                                <Button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    size="sm"
                                >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Add Comment
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MockTaskMainContent;

