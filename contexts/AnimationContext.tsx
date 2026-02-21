"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    lazy,
    Suspense,
} from "react";
import confetti from "canvas-confetti";
import { getAnimationPreference, updateAnimationPreference } from "@/actions/actions";

const RocketAnimation = lazy(() => import("@/components/RocketAnimation"));

type AnimationContextType = {
    animationsEnabled: boolean;
    setAnimationsEnabled: (enabled: boolean) => void;
    loading: boolean;
    triggerConfetti: () => void;
    triggerRocket: () => void;
};

const AnimationContext = createContext<AnimationContextType | null>(null);

const FALLBACK_ANIMATIONS: AnimationContextType = {
    animationsEnabled: true,
    setAnimationsEnabled: () => {},
    loading: false,
    triggerConfetti: () => {},
    triggerRocket: () => {},
};

function prefersReducedMotion(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AnimationProvider({ children }: { children: React.ReactNode }) {
    const [animationsEnabled, setAnimationsEnabledState] = useState(true);
    const [loading, setLoading] = useState(true);
    const [showRocket, setShowRocket] = useState(false);

    useEffect(() => {
        getAnimationPreference()
            .then((result) => {
                if (result.success && result.animationsEnabled !== undefined) {
                    setAnimationsEnabledState(result.animationsEnabled);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const setAnimationsEnabled = useCallback((enabled: boolean) => {
        setAnimationsEnabledState(enabled);
        updateAnimationPreference(enabled).catch(console.error);
    }, []);

    const triggerConfetti = useCallback(() => {
        if (prefersReducedMotion() || !animationsEnabled) return;
        confetti({
            particleCount: 100,
            spread: 160,
            origin: { y: 0.6 },
            startVelocity: 45,
        });
    }, [animationsEnabled]);

    const triggerRocket = useCallback(() => {
        if (prefersReducedMotion() || !animationsEnabled) return;
        setShowRocket(true);
    }, [animationsEnabled]);

    const handleRocketComplete = useCallback(() => {
        setShowRocket(false);
    }, []);

    return (
        <AnimationContext.Provider
            value={{
                animationsEnabled,
                setAnimationsEnabled,
                loading,
                triggerConfetti,
                triggerRocket,
            }}
        >
            {children}
            {showRocket && (
                <Suspense fallback={null}>
                    <RocketAnimation onComplete={handleRocketComplete} />
                </Suspense>
            )}
        </AnimationContext.Provider>
    );
}

export function useAnimations() {
    const ctx = useContext(AnimationContext);
    return ctx ?? FALLBACK_ANIMATIONS;
}
