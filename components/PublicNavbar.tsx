"use client";

import Link from "next/link";
import Image from "next/image";

/**
 * Placeholder navbar for public pages (/, /login).
 * Replace with your new navbar implementation later.
 */
export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logoFull.svg" alt="Afora" width={120} height={40} />
        </Link>
        <nav className="flex items-center gap-4">
          
        </nav>
      </div>
    </header>
  );
}
