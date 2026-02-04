"use client";

import { usePathname } from "next/navigation";
import PublicNavbar from "@/components/PublicNavbar";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/login");

  return (
    <div className="flex min-h-screen flex-col">
      {!isLogin && <PublicNavbar />}
      <div className="flex-1">{children}</div>
    </div>
  );
}
