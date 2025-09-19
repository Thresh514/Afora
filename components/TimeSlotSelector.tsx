"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
});

const TimeSlotSelector = ({
    selectedSlots,
    setSelectedSlots,
}: {
    selectedSlots: Set<string>;
    setSelectedSlots: React.Dispatch<React.SetStateAction<Set<string>>>;
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartPos, setDragStartPos] = useState<{
        day: number;
        slot: number;
    } | null>(null);
    const [dragEndPos, setDragEndPos] = useState<{
        day: number;
        slot: number;
    } | null>(null);
    const [tempSelectedBoxes, setTempSelectedBoxes] = useState<Set<string>>(
        new Set(),
    );
    const gridRef = useRef<HTMLDivElement>(null);

    // console.log(dragEndPos);
    const toggleSelectedBoxes = () => {
        setSelectedSlots((prevSelected) => {
            const newSelected = new Set(prevSelected);
            tempSelectedBoxes.forEach((key) => {
                if (newSelected.has(key)) {
                    newSelected.delete(key);
                } else {
                    newSelected.add(key);
                }
            });
            return newSelected;
        });
        setTempSelectedBoxes(new Set());
    };

    const handleMouseDown = (dayIndex: number, slotIndex: number) => {
        setIsDragging(true);
        setDragStartPos({ day: dayIndex, slot: slotIndex });
        setDragEndPos({ day: dayIndex, slot: slotIndex });
        setTempSelectedBoxes(new Set([`${dayIndex}-${slotIndex}`]));
    };

    const handleMouseEnter = (dayIndex: number, slotIndex: number) => {
        if (isDragging) {
            setDragEndPos({ day: dayIndex, slot: slotIndex });
            setTempSelectedBoxes((prevSelected) => {
                const newSelected = new Set(prevSelected);
                const minDay = Math.min(dragStartPos!.day, dayIndex);
                const maxDay = Math.max(dragStartPos!.day, dayIndex);
                const minSlot = Math.min(dragStartPos!.slot, slotIndex);
                const maxSlot = Math.max(dragStartPos!.slot, slotIndex);

                for (let day = minDay; day <= maxDay; day++) {
                    for (let slot = minSlot; slot <= maxSlot; slot++) {
                        newSelected.add(`${day}-${slot}`);
                    }
                }
                return newSelected;
            });
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            toggleSelectedBoxes();
        }
        setIsDragging(false);
        setDragStartPos(null);
        setDragEndPos(null);
    };

    return (
        <Card
            className="w-full max-w-5xl mx-auto"
            style={{ userSelect: "none" }}
        >
            <CardContent className="overflow-hidden">
                <div className="flex flex-col h-[60vh]">
                    <div className="flex-none grid grid-cols-[auto_1fr] gap-x-0.5">
                        <div className="w-12"></div>
                        <div className="grid grid-cols-7 gap-x-2 pl-2">
                            {DAYS.map((day) => (
                                <h3 key={day} className="font-semibold">
                                    {day}
                                </h3>
                            ))}
                        </div>
                    </div>
                    <div className="flex-grow overflow-auto">
                        <div className="flex h-full">
                            <div className="flex-none pr-2 space-y-0">
                                {TIME_SLOTS.map((time, index) => (
                                    <div
                                        key={time}
                                        className={`h-6 flex items-center justify-end text-sm text-muted-foreground ${index % 2 === 0 ? "" : "invisible"}`}
                                    >
                                        {time}
                                    </div>
                                ))}
                            </div>
                            <div
                                className="flex-grow"
                                ref={gridRef}
                                onMouseLeave={handleMouseUp}
                                onMouseUp={handleMouseUp}
                            >
                                <div className="grid grid-cols-7 gap-x-0.5 gap-y-0 h-full">
                                    {DAYS.map((day, dayIndex) => (
                                        <div
                                            key={day}
                                            className="flex flex-col items-center"
                                        >
                                            <div className="flex flex-col items-center">
                                                {TIME_SLOTS.map(
                                                    (_, slotIndex) => {
                                                        const slotKey = `${dayIndex}-${slotIndex}`;
                                                        return (
                                                            <div
                                                                key={slotKey}
                                                                className={`w-16 h-6 rounded-sm transition-colors cursor-pointer ${
                                                                    selectedSlots.has(
                                                                        slotKey,
                                                                    )
                                                                        ? "bg-primary hover:bg-primary/90"
                                                                        : "bg-secondary hover:bg-secondary/80"
                                                                } ${
                                                                    tempSelectedBoxes.has(
                                                                        slotKey,
                                                                    )
                                                                        ? "ring-2 ring-offset-1 ring-primary"
                                                                        : ""
                                                                }`}
                                                                onMouseDown={() =>
                                                                    handleMouseDown(
                                                                        dayIndex,
                                                                        slotIndex,
                                                                    )
                                                                }
                                                                onMouseEnter={() =>
                                                                    handleMouseEnter(
                                                                        dayIndex,
                                                                        slotIndex,
                                                                    )
                                                                }
                                                                aria-label={`${day} ${TIME_SLOTS[slotIndex]} ${selectedSlots.has(slotKey) ? "selected" : "not selected"}`}
                                                                role="checkbox"
                                                                aria-checked={selectedSlots.has(
                                                                    slotKey,
                                                                )}
                                                                tabIndex={0}
                                                                onKeyDown={(
                                                                    e,
                                                                ) => {
                                                                    if (
                                                                        e.key ===
                                                                            "Enter" ||
                                                                        e.key ===
                                                                            " "
                                                                    ) {
                                                                        setTempSelectedBoxes(
                                                                            new Set(
                                                                                [
                                                                                    slotKey,
                                                                                ],
                                                                            ),
                                                                        );
                                                                        toggleSelectedBoxes();
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TimeSlotSelector;
