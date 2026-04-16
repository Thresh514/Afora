"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Lottie from "lottie-react";

/** Served from `public/complete.json` (see Next.js `public/` static files). */
const COMPLETE_LOTTIE_SRC = "/complete.json";

interface TaskCompleteLottieProps {
  onComplete: () => void;
}

export default function TaskCompleteLottie({ onComplete }: TaskCompleteLottieProps) {
  const doneRef = useRef(false);
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(COMPLETE_LOTTIE_SRC)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setAnimationData(json);
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const t = window.setTimeout(finish, 6000);
    return () => window.clearTimeout(t);
  }, [finish]);

  if (typeof document === "undefined" || !animationData) return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 pointer-events-none flex items-center justify-center bg-background/50 backdrop-blur-sm"
      style={{ zIndex: 2147483647 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="w-36 h-36 sm:w-44 sm:h-44"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
      >
        <Lottie
          animationData={animationData}
          loop={false}
          className="h-full w-full"
          onComplete={finish}
        />
      </motion.div>
    </motion.div>,
    document.body
  );
}
