"use client";

import { Button } from "@/components/ui/button";

interface BountyBoardButtonProps {
    overdueTasks: number;
    showBountyBoard: boolean;
    onClick: () => void;
}

const BountyBoardButton = ({
    overdueTasks,
    showBountyBoard,
    onClick,
}: BountyBoardButtonProps) => {
    // if there are no tasks, show the normal button
    if (overdueTasks === 0) {
        return (
            <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 transition-colors"
                onClick={onClick}
            >
                Bounty Board
            </Button>
        );
    }

    // when there are tasks, show the cool animation button
    return (
        <>
            {/* Add custom CSS for gradient animation */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                            @keyframes gradient {
                            0% { background-position: 0% 50%; }
                            50% { background-position: 100% 50%; }
                            100% { background-position: 0% 50%; }
                            }
                            `,
                }}
            />

            <Button
                size="sm"
                className="relative text-white transition-all duration-500 overflow-hidden group animate-pulse hover:animate-none hover:scale-105 border-2 border-transparent hover:border-white/30 hover:bg-transparent"
                onClick={onClick}
                style={{
                    background:
                        "linear-gradient(-45deg, #ff006e, #8338ec, #3a86ff, #06ffa5, #ffbe0b, #fb8500, #ff006e)",
                    backgroundSize: "400% 400%",
                    animation: showBountyBoard
                        ? "none"
                        : "gradient 4s ease infinite",
                    boxShadow:
                        "0 0 30px rgba(255, 0, 110, 0.6), 0 0 60px rgba(131, 56, 236, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.1)",
                }}
            >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                <span className="relative z-10 font-bold drop-shadow-[0_0_5px_rgba(0,0,0,0.5)] tracking-wide">
                    Bounty Board
                </span>
                <span className="ml-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full relative z-10 shadow-lg font-bold">
                    {overdueTasks}
                </span>
            </Button>
        </>
    );
};

export default BountyBoardButton;
