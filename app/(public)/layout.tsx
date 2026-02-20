"use client";

import { usePathname } from "next/navigation";
import PublicNavbar from "@/components/PublicNavbar";
import ThemeToggle from "@/components/ThemeToggle";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/login");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!isLogin && (
        <>
          <PublicNavbar />
          <div className="fixed right-8 top-8 z-[60]">
            <ThemeToggle />
          </div>
        </>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}
