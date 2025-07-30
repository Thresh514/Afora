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

// 格式化时间表数据的函数
const formatTimeSlots = (selectedSlots: Set<string>): string => {
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
        const hour = Math.floor(i / 2);
        const minute = i % 2 === 0 ? "00" : "30";
        return `${hour.toString().padStart(2, "0")}:${minute}`;
    });

    // 按天分组选中的时间槽
    const slotsByDay: { [key: string]: number[] } = {};
    
    selectedSlots.forEach(slotKey => {
        const [dayIndex, slotIndex] = slotKey.split('-').map(Number);
        const dayName = DAYS[dayIndex];
        
        if (!slotsByDay[dayName]) {
            slotsByDay[dayName] = [];
        }
        slotsByDay[dayName].push(slotIndex);
    });

    // 将每个天的时间槽排序并合并连续时间段
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
            
            // 检查是否是连续的时间槽（相邻的slotIndex）
            if (currentSlot - prevSlot === 1) {
                endSlot = currentSlot;
            } else {
                // 不连续，保存当前时间段
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
        
        // 处理最后一个时间段
        const startTime = TIME_SLOTS[startSlot];
        const endTime = TIME_SLOTS[endSlot];
        
        if (startSlot === endSlot) {
            timeRanges.push(startTime);
        } else {
            timeRanges.push(`${startTime}-${endTime}`);
        }
        
        formattedSchedule[day] = timeRanges;
    });

    // 转换为易读的字符串格式
    const scheduleStrings = Object.keys(formattedSchedule).map(day => {
        const times = formattedSchedule[day];
        return `${day}: ${times.join(', ')}`;
    });

    return scheduleStrings.join(' | ');
};

// 创建结构化JSON格式的时间表数据
const createStructuredSchedule = (selectedSlots: Set<string>): string => {
    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
        const hour = Math.floor(i / 2);
        const minute = i % 2 === 0 ? "00" : "30";
        return `${hour.toString().padStart(2, "0")}:${minute}`;
    });

    // 按天分组选中的时间槽
    const slotsByDay: { [key: string]: number[] } = {};
    
    selectedSlots.forEach(slotKey => {
        const [dayIndex, slotIndex] = slotKey.split('-').map(Number);
        const dayName = DAYS[dayIndex];
        
        if (!slotsByDay[dayName]) {
            slotsByDay[dayName] = [];
        }
        slotsByDay[dayName].push(slotIndex);
    });

    // 创建结构化数据
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
        
        // 计算总小时数
        const totalSlots = sortedSlots.length;
        const totalHours = totalSlots * 0.5; // 每个slot是30分钟
        
        structuredSchedule[day] = {
            timeRanges,
            totalHours
        };
    });

    return JSON.stringify(structuredSchedule);
};

// 调试函数：展示优化前后的对比
const debugScheduleFormat = (selectedSlots: Set<string>) => {
    const oldFormat = Array.from(selectedSlots).join(", ");
    const newStructuredFormat = createStructuredSchedule(selectedSlots);
    const newReadableFormat = formatTimeSlots(selectedSlots);
    
    console.log("=== 时间表格式优化对比 ===");
    console.log("旧格式 (难读):", oldFormat);
    console.log("新结构化格式 (JSON):", newStructuredFormat);
    console.log("新易读格式:", newReadableFormat);
    console.log("=== 结束对比 ===");
};

const ProjOnboarding = ({ orgId }: { orgId: string }) => {
const [responses, setResponses] = useState<string[]>([]);
const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
const [isOpen, setIsOpen] = useState(false);
const [page, setPage] = useState(0);

    useEffect(() => {
        // Open the dialog automatically when the component mounts
        setIsOpen(true);
        setPage(0);
        setResponses(Array(projQuestions.length).fill(""));
        setSelectedSlots(new Set());
    }, []);

    const handleSubmit = async () => {
        // 调试输出：展示格式优化效果
        debugScheduleFormat(selectedSlots);
        
        // 使用结构化的JSON格式保存时间表数据
        const structuredSchedule = createStructuredSchedule(selectedSlots);
        const readableSchedule = formatTimeSlots(selectedSlots);
        
        // 将结构化数据保存到最后一个问题，易读格式作为注释
        responses[projQuestions.length - 1] = `${structuredSchedule} | Readable: ${readableSchedule}`;
        
        const { success, message } = await setProjOnboardingSurvey(
            orgId,
            responses,
        );
        if (success) {
            toast.success("Survey response received successfully!");
            setIsOpen(false);
        } else {
            toast.error(message);
        }
    };

    const { user } = useUser();

    const userEmail = user?.primaryEmailAddress?.emailAddress;

    const [userData] = useDocument(
        userEmail && orgId ? doc(db, "users", userEmail, "orgs", orgId) : null,
    );

    if (!userData || userData.data()?.projOnboardingSurveyResponse) {
        return null;
    }

    return (
        <>
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                {/* <AlertDialogOverlay className="bg-black bg-opacity-80 fixed inset-0" /> */}
                {/* <AlertDialogTrigger>Open</AlertDialogTrigger> */}
                <AlertDialogContent className="w-full max-w-2xl">
                    <Progress value={(page / projQuestions.length) * 100} />

                    {page === 0 && (
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Project Onboarding Survey
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Please take a minute to fill out this mandatory
                                form. The information will be used for matching
                                of teammates for your project.
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
                        {/* <AlertDialogCancel onClick={() => setIsOpen(false)}>Cancel</AlertDialogCancel> */}
                        {page === 0 && (
                            <Button onClick={() => setPage(page + 1)}>
                                Start
                            </Button>
                        )}
                        {page > 0 && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                >
                                    Back
                                </Button>
                                {page < projQuestions.length ? (
                                    <Button onClick={() => setPage(page + 1)}>
                                        Next
                                    </Button>
                                ) : (
                                    <Button onClick={handleSubmit}>
                                        Submit
                                    </Button>
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
