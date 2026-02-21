"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface RocketAnimationProps {
    onComplete: () => void;
}

/** 竖直向上的火箭：尖头在上，尾焰在下 */
const RocketSvg = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 64"
        className="w-12 h-16 drop-shadow-[0_4px_12px_rgba(111,97,239,0.4)]"
    >
        <defs>
            <linearGradient id="rocketBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B7ED8" />
                <stop offset="50%" stopColor="#6F61EF" />
                <stop offset="100%" stopColor="#5B4FD4" />
            </linearGradient>
            <linearGradient id="rocketNose" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#6F61EF" />
                <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
            </defs>
        {/* 箭体 */}
        <path
            d="M24 8 L32 52 L28 56 L20 56 L16 52 Z"
            fill="url(#rocketBody)"
            stroke="#5B4FD4"
            strokeWidth="1"
        />
        {/* 尖头 */}
        <path d="M24 0 L30 8 L18 8 Z" fill="url(#rocketNose)" stroke="#8B7ED8" strokeWidth="0.5" />
        {/* 左翼 */}
        <path d="M16 52 L8 56 L12 52 Z" fill="#6F61EF" stroke="#5B4FD4" strokeWidth="0.5" />
        {/* 右翼 */}
        <path d="M32 52 L40 56 L36 52 Z" fill="#6F61EF" stroke="#5B4FD4" strokeWidth="0.5" />
        {/* 舷窗 */}
        <circle cx="24" cy="28" r="4" fill="#E0E7FF" stroke="#C7D2FE" strokeWidth="0.5" />
    </svg>
);

export default function RocketAnimation({ onComplete }: RocketAnimationProps) {
    useEffect(() => {
        const timer = setTimeout(onComplete, 4200);
        return () => clearTimeout(timer);
    }, [onComplete]);

    if (typeof document === "undefined") return null;

    return createPortal(
        <motion.div
            className="fixed inset-0 pointer-events-none flex justify-center"
            style={{ zIndex: 2147483647 }}
            initial={{ opacity: 1 }}
        >
            {/* 火箭从屏幕下方约 20% 处起飞，缓慢飞向顶部 */}
            <motion.div
                className="absolute flex flex-col items-center"
                style={{ bottom: "20%" }}
                initial={{ y: 0, opacity: 0.9 }}
                animate={{
                    y: "-80vh",
                    opacity: [0.9, 1, 0.8],
                }}
                transition={{
                    duration: 3.5,
                    ease: [0.22, 0.61, 0.36, 1],
                }}
            >
                <div className="flex flex-col items-center">
                    <RocketSvg />
                    {/* 尾焰 - 竖直向下 */}
                    <motion.div
                        className="mt-0 h-10 w-5 rounded-b-full"
                        style={{
                            background: "linear-gradient(to bottom, #FCD34D 0%, #F59E0B 40%, #EA580C 80%, transparent 100%)",
                            boxShadow: "0 0 16px 6px rgba(251,191,36,0.4)",
                        }}
                        initial={{ scaleY: 0.6, opacity: 0.85 }}
                        animate={{
                            scaleY: [0.6, 1.15, 1],
                            opacity: [0.85, 1, 0.9],
                        }}
                        transition={{
                            duration: 3.5,
                            times: [0, 0.25, 1],
                        }}
                    />
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}
