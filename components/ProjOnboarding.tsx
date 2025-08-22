"use client";
import React, { useEffect, useState } from "react";

import {AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";
import { projHeader, projQuestions } from "@/types/types";
import { Progress } from "@/components/ui/progress";
import { setProjOnboardingSurvey } from "@/actions/actions";
import { toast } from "sonner";
import { db } from "@/firebase";
import { useDocument } from "react-firebase-hooks/firestore";
import { doc } from "firebase/firestore";
import { useUser } from "@clerk/nextjs";
import { Textarea } from "./ui/textarea";
import TimeSlotSelector from "./TimeSlotSelector";

// Format time slots data function
const formatTimeSlots = (selectedSlots: Set<string>): string => {
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
        const hour = Math.floor(i / 2);
        const minute = i % 2 === 0 ? "00" : "30";
        return `${hour.toString().padStart(2, "0")}:${minute}`;
    });

    // Group selected time slots by day
    const slotsByDay: { [key: string]: number[] } = {};
    
    selectedSlots.forEach(slotKey => {
        const [dayIndex, slotIndex] = slotKey.split('-').map(Number);
        const dayName = DAYS[dayIndex];
        
        if (!slotsByDay[dayName]) {
            slotsByDay[dayName] = [];
        }
        slotsByDay[dayName].push(slotIndex);
    });

    // Sort time slots for each day and merge consecutive time periods
    const formattedSchedule: { [key: string]: string[] } = {};
    
    Object.keys(slotsByDay).forEach(day => {
        const sortedSlots = slotsByDay[day].sort((a, b) => a - b);
        const timeRanges: string[] = [];
        
        if (sortedSlots.length === 0) return;
        
        let startSlot = sortedSlots[0];
        let endSlot = sortedSlots[0];
        
        for (let i = 1; i < sortedSlots.length; i++) {
            const currentSlot = sortedSlots[i];
            const prevSlot = sortedSlots[i - 1];
            
            // Check if it's a consecutive time slot (adjacent slotIndex)
            if (currentSlot - prevSlot === 1) {
                endSlot = currentSlot;
            } else {
                // Not consecutive, save current time period
                const startTime = TIME_SLOTS[startSlot];
                const endTime = TIME_SLOTS[endSlot];
                
                if (startSlot === endSlot) {
                    timeRanges.push(startTime);
                } else {
                    timeRanges.push(`${startTime}-${endTime}`);
                }
                startSlot = currentSlot;
                endSlot = currentSlot;
            }
        }
        
        // Handle the last time period
        const startTime = TIME_SLOTS[startSlot];
        const endTime = TIME_SLOTS[endSlot];
        
        if (startSlot === endSlot) {
            timeRanges.push(startTime);
        } else {
            timeRanges.push(`${startTime}-${endTime}`);
        }
        
        formattedSchedule[day] = timeRanges;
    });

    // Convert to readable string format
    const scheduleStrings = Object.keys(formattedSchedule).map(day => {
        const times = formattedSchedule[day];
        return `${day}: ${times.join(', ')}`;
    });

    return scheduleStrings.join(' | ');
};

// Create structured JSON format schedule data
const createStructuredSchedule = (selectedSlots: Set<string>): string => {
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
        const hour = Math.floor(i / 2);
        const minute = i % 2 === 0 ? "00" : "30";
        return `${hour.toString().padStart(2, "0")}:${minute}`;
    });

    // Group selected time slots by day
    const slotsByDay: { [key: string]: number[] } = {};
    
    selectedSlots.forEach(slotKey => {
        const [dayIndex, slotIndex] = slotKey.split('-').map(Number);
        const dayName = DAYS[dayIndex];
        
        if (!slotsByDay[dayName]) {
            slotsByDay[dayName] = [];
        }
        slotsByDay[dayName].push(slotIndex);
    });

    // Create structured data
    const structuredSchedule: { [key: string]: { timeRanges: string[], totalHours: number } } = {};
    
    Object.keys(slotsByDay).forEach(day => {
        const sortedSlots = slotsByDay[day].sort((a, b) => a - b);
        const timeRanges: string[] = [];
        
        if (sortedSlots.length === 0) return;
        
        let startSlot = sortedSlots[0];
        let endSlot = sortedSlots[0];
        
        for (let i = 1; i < sortedSlots.length; i++) {
            const currentSlot = sortedSlots[i];
            const prevSlot = sortedSlots[i - 1];
            
            if (currentSlot - prevSlot === 1) {
                endSlot = currentSlot;
            } else {
                const startTime = TIME_SLOTS[startSlot];
                const endTime = TIME_SLOTS[endSlot];
                
                if (startSlot === endSlot) {
                    timeRanges.push(startTime);
                } else {
                    timeRanges.push(`${startTime}-${endTime}`);
                }
                startSlot = currentSlot;
                endSlot = currentSlot;
            }
        }
        
        const startTime = TIME_SLOTS[startSlot];
        const endTime = TIME_SLOTS[endSlot];
        
        if (startSlot === endSlot) {
            timeRanges.push(startTime);
        } else {
            timeRanges.push(`${startTime}-${endTime}`);
        }
        
        // Calculate total hours
        const totalSlots = sortedSlots.length;
        const totalHours = totalSlots * 0.5; // Each slot is 30 minutes
        
        structuredSchedule[day] = {
            timeRanges,
            totalHours
        };
    });

    return JSON.stringify(structuredSchedule);
};

// Debug function: show comparison before and after optimization
const debugScheduleFormat = (selectedSlots: Set<string>) => {
    const oldFormat = Array.from(selectedSlots).join(", ");
    const newStructuredFormat = createStructuredSchedule(selectedSlots);
    const newReadableFormat = formatTimeSlots(selectedSlots);
    
    console.log("=== Schedule Format Optimization Comparison ===");
    console.log("Old format (hard to read):", oldFormat);
    console.log("New structured format (JSON):", newStructuredFormat);
    console.log("New readable format:", newReadableFormat);
    console.log("=== End Comparison ===");
};

interface ProjOnboardingProps {
    orgId: string;
    projId: string;
    onDismiss?: () => void;
}

const ProjOnboarding = ({ orgId, projId, onDismiss }: ProjOnboardingProps) => {
    const [responses, setResponses] = useState<string[]>([]);
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
    const [isOpen, setIsOpen] = useState(false);
    const [page, setPage] = useState(0);


    const { user } = useUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;

    const [userData] = useDocument(
        userEmail && orgId ? doc(db, "users", userEmail, "orgs", orgId) : null,
    );

    // Check if user has completed the survey
    const hasCompletedSurvey = userData?.data()?.projOnboardingSurveyResponse;

    useEffect(() => {
        // Always show the dialog when component mounts, regardless of completion status
        setIsOpen(true);
        setPage(0);
        setResponses(Array(projQuestions.length).fill(""));
        setSelectedSlots(new Set());

    }, [projId]); // Re-trigger when projId changes

    const handleSubmit = async () => {
        // Debug output: show format optimization effect
        debugScheduleFormat(selectedSlots);
        
        // Use structured JSON format to save schedule data
        const structuredSchedule = createStructuredSchedule(selectedSlots);
        const readableSchedule = formatTimeSlots(selectedSlots);
        
        // Save structured data to the last question, readable format as comment
        responses[projQuestions.length - 1] = `${structuredSchedule} | Readable: ${readableSchedule}`;
        
        const { success, message } = await setProjOnboardingSurvey(
            orgId,
            responses,
        );
        if (success) {
            toast.success("Survey response received successfully!");
            setIsOpen(false);
            onDismiss?.();
        } else {
            toast.error(message);
        }
    };

    const handleSkip = () => {
        setIsOpen(false);
        onDismiss?.();
        toast.info("Survey skipped. You can complete it later.");
    };

    const handleDismiss = () => {
        setIsOpen(false);
        onDismiss?.();
        toast.info("Survey dismissed. You can complete it later.");
    };

    // Don't render if user has completed the survey and we're not forcing a re-show
    if (hasCompletedSurvey && !isOpen) {
        return null;
    }

    return (
        <>
            <AlertDialog 
                open={isOpen} 
                onOpenChange={(open) => {
                    // 在第一个问题时不允许关闭对话框
                    if (page === 1 && !open) {
                        return;
                    }
                    setIsOpen(open);
                }}
            >
                <AlertDialogContent className="w-full max-w-2xl">
                    <Progress value={(page / projQuestions.length) * 100} />

                    {page === 0 && (
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Team Onboarding Survey
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Please take a minute to fill out this form. The information will be used for matching
                                of teammates for your team. You can skip this for now, but it will appear again next time.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    )}

                    {page > 0 && (
                        <>
                            <AlertDialogTitle>
                                {projHeader[page - 1]}
                            </AlertDialogTitle>
                            <p>{`Q${page}: ${projQuestions[page - 1]}`}</p>
                            {page === projQuestions.length ? (
                                <TimeSlotSelector
                                    selectedSlots={selectedSlots}
                                    setSelectedSlots={setSelectedSlots}
                                />
                            ) : (
                                <Textarea
                                    placeholder="Enter your response"
                                    value={responses[page - 1]}
                                    onChange={(e) => {
                                        setResponses((prev) => {
                                            const newR = [...prev];
                                            newR[page - 1] = e.target.value;
                                            return newR;
                                        });
                                    }}
                                />
                            )}
                        </>
                    )}

                    <AlertDialogFooter>
                        {page === 0 && (
                            <div className="flex gap-2 w-full">
                                <Button variant="outline" onClick={handleSkip} className="flex-1">
                                    Skip for Now
                                </Button>
                                <Button onClick={() => setPage(page + 1)} className="flex-1">
                                    Start Survey
                                </Button>
                            </div>
                        )}
                        {page > 0 && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setPage(page - 1)}
                                >
                                    Back
                                </Button>
                                {page < projQuestions.length ? (
                                    <Button onClick={() => setPage(page + 1)}>
                                        Next
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={handleDismiss}>
                                            Dismiss
                                        </Button>
                                        <Button onClick={handleSubmit}>
                                            Submit
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default ProjOnboarding;
