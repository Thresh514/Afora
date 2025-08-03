"use client";

import { useState, useRef, useEffect } from "react";
import { CircleUser, LoaderCircle, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { postComment } from "@/actions/actions";
import { useTransition } from "react";
import { Timestamp } from "firebase/firestore";
import dynamic from 'next/dynamic';

const TiptapEditor = dynamic(() => Promise.resolve(EditorContent), {
    ssr: false,
    loading: () => <div className="min-h-[40px] p-2 bg-gray-50 animate-pulse rounded-lg" />
});

interface CommentBoxProps {
    className?: string;
    isPublic: boolean;
    projId: string;
    stageId: string;
    taskId: string;
}

const CommentBox: React.FC<CommentBoxProps> = ({
    className,
    isPublic,
    projId,
    stageId,
    taskId,
}) => {
    const { user } = useUser();
    const [isFocused, setIsFocused] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);
    const [isPending, startTransition] = useTransition();
    const [isClient, setIsClient] = useState(false);
    const [isContentPresent, setIsContentPresent] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit,
        ],
        content: '',
        onFocus: () => setIsFocused(true),
        onBlur: () => {
            if (!editor?.getText().trim()) {
                setIsFocused(false);
            }
        },
        editorProps: {
            attributes: {
                class: 'min-h-[40px] p-2 focus:outline-none prose prose-sm max-w-none',
            },
        },
        // 添加这个选项来解决 SSR 问题
        immediatelyRender: false,
    });

    useEffect(() => {
        if (!editor) return;

        const updateContentState = () => {
            setIsContentPresent(!!editor.getText().trim());
        };

        editor.on('update', updateContentState);

        return () => {
            editor.off('update', updateContentState);
        };
    }, [editor]);

    const handlePost = () => {
        if (!editor) return;
        
        const content = editor.getHTML();
        if (!content.trim()) return;

        startTransition(async () => {
            await postComment(
                isPublic,
                projId,
                stageId,
                taskId,
                content,
                new Timestamp(Date.now() / 1000, 0),
                user!.primaryEmailAddress!.toString(),
            )
                .then(() => {
                    editor.commands.setContent('');
                    setIsFocused(false);
                })
                .catch((error) => {
                    console.error("Error posting comment:", error);
                });
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                editorRef.current &&
                !editorRef.current.contains(event.target as Node)
            ) {
                if (!editor?.getText().trim()) {
                    setIsFocused(false);
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [editor]);

    if (!isClient) {
        return (
            <div className="w-full max-w-full">
                <div className="flex items-start w-full space-x-2 p-2 sm:p-3 bg-white rounded-lg shadow">
                    <div className="hidden sm:block flex-shrink-0">
                        <CircleUser className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="min-h-[40px] p-2 bg-gray-50 animate-pulse rounded-lg" />
                    </div>
                    <div className="flex-shrink-0">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gray-100 rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`relative w-full max-w-full`}
            ref={editorRef}
        >
            <div
                className={`flex items-start w-full space-x-2 p-2 sm:p-3 bg-white rounded-lg shadow transition-all duration-200 ${className}`}
            >
                <div className="hidden sm:block flex-shrink-0">
                    {user && user.imageUrl ? (
                        <Image
                            src={user.imageUrl}
                            alt="User profile image"
                            width={40}
                            height={40}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                        />
                    ) : (
                        <CircleUser className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0 relative z-50">
                    <div
                        className={`${
                            isFocused ? "border-blue-500" : "border-gray-200"
                        } border rounded-lg overflow-hidden transition-all duration-200`}
                    >
                        <TiptapEditor
                            editor={editor}
                        />
                        {!editor?.getText().trim() && !isFocused && (
                            <div className="absolute top-2 left-2 text-gray-400 pointer-events-none">
                                Leave a comment here...
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <Button
                        variant="default"
                        onClick={handlePost}
                        className="h-8 w-8 sm:h-10 sm:w-10 p-0 transition-all duration-200 hover:scale-105"
                        disabled={!isContentPresent || isPending}
                    >
                        {isPending ? (
                            <LoaderCircle className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        ) : (
                            <SendHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CommentBox;
