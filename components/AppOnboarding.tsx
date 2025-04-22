'use client'
import React, { useEffect, useState } from 'react'

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from './ui/button';
import { appHeader, appQuestions, appTags } from '@/types/types';
import { Progress } from "@/components/ui/progress"
import { createNewUser, setUserOnboardingSurvey } from '@/actions/actions';
import { toast } from 'sonner';
import { db } from '@/firebase';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc } from 'firebase/firestore';
import { useUser } from '@clerk/nextjs';

const AppOnboarding = () => {
    const [selectedTags, setSelectedTags] = useState<string[][]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [page, setPage] = useState(0);
    useEffect(() => {
        // Open the dialog automatically when the component mounts
        setIsOpen(true);
        setPage(0);
        setSelectedTags(Array(appQuestions.length).fill([]));
    }, []);

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) => {
            const newTags = prev.map((tags, index) => {
                if (index === page - 1) {
                    if (tags.includes(tag)) {
                        return tags.filter((t) => t !== tag);
                    } else {
                        return [...tags, tag];
                    }
                }
                return tags;
            });
            return newTags;
        });
    };
    const handleSubmit = async () => {
        const { success, message } = await setUserOnboardingSurvey(selectedTags);
        if (success) {
            toast.success('Survey response received successfully!');
            setIsOpen(false);
        } else {
            toast.error(message);
        }
    }

    const { user } = useUser();
    useEffect(() => {
        if (user) {
            if (user.primaryEmailAddress && user.username && user.imageUrl) {
                createNewUser(user.primaryEmailAddress.toString(), user.username, user.imageUrl);
            }
        }
    }, [user]);

    const [userData, loading, error] = useDocument(user && user.primaryEmailAddress && doc(db, 'users', user.primaryEmailAddress.toString()));
    if (loading) return;
    if (error) return <div> error: {error.message}</div>
    if (!userData || userData.data()?.onboardingSurveyResponse) {
        return null;
    }

    return (
        <div>
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogOverlay className="bg-black bg-opacity-80 fixed inset-0" />
                {/* <AlertDialogTrigger>Open</AlertDialogTrigger> */}
                <AlertDialogContent className="w-full max-w-2xl">
                    <Progress value={page / (appQuestions.length) * 100} />

                    {page === 0 &&
                        <AlertDialogHeader>
                            <AlertDialogTitle>App Onboarding Survey</AlertDialogTitle>
                            <AlertDialogDescription>
                                Please take a minute to fill out this mandatory form. It will help your future matching and teammates recommendations.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    }

                    {page > 0 &&
                        <>
                            <AlertDialogTitle>{appHeader[page - 1]}</AlertDialogTitle>
                            <p>{`Q${page}: ${appQuestions[page - 1]}`}</p>

                            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                                {appTags.map((tag) => (
                                    <Button
                                        key={tag}
                                        variant={selectedTags[page - 1].includes(tag) ? "default" : "outline"} // Apply selected style
                                        className={`flex items-center space-x-2 px-3 py-1 rounded-lg`}
                                        onClick={() => toggleTag(tag)}
                                    >
                                        <span>{tag}</span>
                                    </Button>
                                ))}
                            </div>
                        </>
                    }

                    <AlertDialogFooter >
                        {/* <AlertDialogCancel onClick={() => setIsOpen(false)}>Cancel</AlertDialogCancel> */}
                        {page === 0 && <Button onClick={() => setPage(page + 1)}>Start</Button>}
                        {page > 0 &&
                            <>
                                <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>Back</Button>
                                {page < appQuestions.length ?
                                    <Button onClick={() => setPage(page + 1)}>Next</Button>
                                    :
                                    <Button onClick={handleSubmit}>Submit</Button>
                                }
                            </>
                        }
                    </AlertDialogFooter >
                </AlertDialogContent >
            </AlertDialog >
        </div >
    )
}

export default AppOnboarding