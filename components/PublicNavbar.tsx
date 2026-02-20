"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/#features", label: "Features", id: "features" },
  { href: "/#resources", label: "For Teams", id: "resources" },
  { href: "/price", label: "Pricing" },
];

const HERO_SCROLL_THRESHOLD = 320;

export default function PublicNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(typeof window !== "undefined" && window.scrollY > HERO_SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, item: (typeof navItems)[number]) => {
    if (pathname !== "/" || !item.id) return;
    const el = document.getElementById(item.id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4">
      <div
        className={`mx-auto flex items-center justify-between rounded-2xl border px-6 py-3 shadow-lg transition-all duration-300 backdrop-blur-xl ${
          isScrolled
            ? "max-w-3xl border-white/20 bg-white/25 dark:border-white/10 dark:bg-gray-900/80"
            : "max-w-6xl border-white/20 bg-white/20 dark:border-white/10 dark:bg-gray-900/60"
        }`}
      >
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logoFull.svg" alt="Afora" width={100} height={34} priority />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-white/20 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Log in
          </Link>
          <button
            onClick={() => router.push("/login")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-afora px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-afora-hover"
          >
            Sign Up Free
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
