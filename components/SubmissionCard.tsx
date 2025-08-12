"use client";
import React, { useState, useEffect, useTransition, useCallback } from "react";
// Card components removed - now using direct div layout
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { File, X, Upload, Loader, Clock7, Check, Target } from "lucide-react";
import { Task } from "@/types/types";
import { toast } from "sonner";
import { getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase";
import { useUser } from "@clerk/nextjs";

interface FileItem {
    id: string;
    file: File;
}
interface DownloadableFile {
    id: string;
    name: string;
    url: string;
}

const SubmissionCard = ({
    task,
    taskId,
    taskLocked,
}: {
    task: Task;
    projId: string;
    stageId: string;
    taskId: string;
    taskLocked: boolean;
}) => {
    const { user } = useUser();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmittingPending, startSubmittingTransition] = useTransition();
    const [submittedFiles, setSubmittedFiles] = useState<DownloadableFile[]>(
        [],
    );
    
    const fetchSubmittedFiles = useCallback(async () => {
        try {
            const listRef = ref(storage, `tasksSubmission/${taskId}`);
            listAll(listRef)
                .then(async (res) => {
                    const files = await Promise.all(
                        res.items.map(async (itemRef) => {
                            const url = await getDownloadURL(itemRef);
                            return {
                                id: itemRef.name,
                                name: itemRef.name,
                                url,
                            };
                        }),
                    );
                    setSubmittedFiles(files);
                })
                .catch((error) => {
                    console.error("Failed to list files:", error);
                });
        } catch (error) {
            console.error("Failed to fetch submitted files:", error);
        }
    }, [taskId]);

    useEffect(() => {
        fetchSubmittedFiles();
    }, [fetchSubmittedFiles]);

    useEffect(() => {
        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            if (!e.relatedTarget) {
                setIsDragging(false);
            }
        };

        window.addEventListener("dragenter", handleDragEnter);
        window.addEventListener("dragleave", handleDragLeave);

        return () => {
            window.removeEventListener("dragenter", handleDragEnter);
            window.removeEventListener("dragleave", handleDragLeave);
        };
    }, []);

    const handleFiles = (newFiles: FileList) => {
        const newFileItems = Array.from(newFiles).map((file) => ({
            id: crypto.randomUUID(),
            file,
        }));
        setFiles((prev) => [...prev, ...newFileItems]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((file) => file.id !== id));
        const fileUploadInput = document.getElementById(
            "fileUpload",
        ) as HTMLInputElement;
        if (fileUploadInput) {
            fileUploadInput.value = "";
        }
    };

    const handleSubmit = () => {
        startSubmittingTransition(async () => {
            try {
                const totalSize = files.reduce(
                    (acc, { file }) => acc + file.size,
                    0,
                );
                if (totalSize > 10 * 1024 * 1024) {
                    // 10 MB
                    throw new Error("Total file size exceeds 10 MB.");
                }
                await Promise.all(
                    files.map(async ({ file }) => {
                        const storageRef = ref(
                            storage,
                            `tasksSubmission/${taskId}/${file.name}`,
                        );
                        await uploadBytes(storageRef, file, {
                            contentDisposition: `attachment; filename="${file.name}"`,
                        });
                    }),
                );
                toast.success("Files uploaded successfully!");
                setFiles([]);
                fetchSubmittedFiles();
            } catch (error) {
                if (error instanceof Error) {
                    toast.error(`Failed to upload files: ${error.message}`);
                } else {
                    toast.error(
                        "Failed to upload files due to an unknown error.",
                    );
                }
                console.error("Upload error:", error);
            }
        });
    };

    return (
        <>
            <div className="w-full space-y-6">
                {/* Submitted Files Section */}
                {submittedFiles.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            Submitted Files
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                            {submittedFiles.map(({ id, name, url }) => (
                                <div
                                    key={id}
                                    className="bg-green-50 border border-green-200 p-3 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <File className="h-5 w-5 text-green-600" />
                                        <div className="flex-1 min-w-0">
                                            <a
                                                href={url}
                                                download={name}
                                                className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline block truncate"
                                                title={name}
                                            >
                                                {name}
                                            </a>
                                            <p className="text-xs text-green-600">
                                                Submitted
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pending Files Section */}
                {files.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Clock7 className="h-4 w-4 text-orange-500" />
                            Files to Submit
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                            {files.map(({ id, file }) => (
                                <div
                                    key={id}
                                    className="bg-orange-50 border border-orange-200 p-3 rounded-lg"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <File className="h-5 w-5 text-orange-600" />
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className="text-sm font-medium text-orange-700 truncate"
                                                    title={file.name}
                                                >
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-orange-600">
                                                    {(
                                                        file.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(2)}{" "}
                                                    MB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(id)}
                                            className="p-1 hover:bg-orange-200 rounded-md transition-colors"
                                            title="Remove file"
                                        >
                                            <X className="h-4 w-4 text-orange-600" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* File Upload Section */}
                {!task?.isCompleted && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Upload className="h-4 w-4 text-blue-500" />
                            Upload Files
                        </h4>

                        {/* Check if user is assigned to this task */}
                        {task?.assignee === user?.primaryEmailAddress?.emailAddress ? (
                            <>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-gray-50 hover:bg-blue-50"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                >
                                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 mb-2">
                                        Drag & drop files here, or{" "}
                                        <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
                                            browse
                                            <Input
                                                id="fileUpload"
                                                type="file"
                                                onChange={(e) =>
                                                    e.target.files &&
                                                    handleFiles(e.target.files)
                                                }
                                                multiple
                                                className="hidden"
                                                disabled={taskLocked}
                                            />
                                        </label>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Maximum file size: 10MB total
                                    </p>
                                </div>

                                {/* Submit Button */}
                                {files.length > 0 && (
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmittingPending || taskLocked}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {isSubmittingPending ? (
                                            <>
                                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-4 w-4 mr-2" />
                                                Submit {files.length} File
                                                {files.length > 1 ? "s" : ""}
                                            </>
                                        )}
                                    </Button>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex flex-col items-center space-y-3">
                                    <Target className="h-8 w-8 text-gray-300" />
                                    <div className="space-y-1">
                                        <p className="text-gray-700 font-medium text-sm">
                                            {task?.assignee
                                                ? "This task is assigned by others"
                                                : "This task is unassigned"}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            {task?.assignee
                                                ? `Assigned to: ${task.assignee}`
                                                : "No one has been assigned to this task yet"}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            You can browse other tasks in the team
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isDragging && (
                <div
                    className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex items-center justify-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onDragLeave={() => setIsDragging(false)}
                >
                    <div className="bg-white p-4 md:p-8 rounded-lg shadow-lg flex flex-col items-center space-y-4">
                        <Upload className="h-8 w-8 md:h-12 md:w-12 text-gray-400" />
                        <p className="text-sm md:text-base text-gray-500">
                            Drop your files here
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default SubmissionCard;
