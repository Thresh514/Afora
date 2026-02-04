"use client";

import { useRef, useEffect, useState, type ReactNode, Children } from "react";

type Props = { children: ReactNode; className?: string };

export default function FadeInSection({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`origin-center transition-all duration-700 ease-out ${
        visible
          ? "translate-y-0 rotate-0 scale-100 opacity-100"
          : "translate-y-12 -rotate-4 scale-[0.98] opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

type StaggerProps = { children: ReactNode; className?: string; delayMs?: number };

export function FadeInStagger({ children, className = "", delayMs = 100 }: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, i) => (
        <div
          key={i}
          className={`origin-center transition-all duration-600 ease-out ${
            visible
              ? "translate-y-0 rotate-0 opacity-100"
              : "translate-y-8 -rotate-2 opacity-0"
          }`}
          style={{ transitionDelay: visible ? `${i * delayMs}ms` : "0ms" }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
