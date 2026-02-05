"use client";

import Link from "next/link";
import Image from "next/image";
import { Linkedin, Twitter, Instagram } from "lucide-react";

const platformLinks = [
  { label: "Platform Overview", href: "/" },
  { label: "Customer Stories", href: "#" },
  { label: "Plans", href: "/price" },
  { label: "All Features", href: "/#features" },
];


const companyLinks = [
  { label: "About", href: "#" },
  { label: "Careers", href: "#" },
  { label: "Help Center", href: "#" },
  { label: "Contact Us", href: "#" },
];

const socialIcons = [
  { Icon: Linkedin, href: "#", label: "LinkedIn" },
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Top: Logo + address | Nav columns */}
        <div className="flex gap-24">
          <div>
            <Link href="/" className="inline-block">
              <Image src="/logoFull.svg" alt="Afora" width={120} height={40} />
            </Link>
            <p className="mt-4 text-sm text-gray-500">
            Great Neck Estates, Great Neck,<br />
            NY 11021, USA
            </p>
          </div>
          <div className="flex flex-1 justify-between">
            <div className="w-1/3 min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">
                Platform
              </h3>
              <ul className="mt-4 space-y-3">
                {platformLinks.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-600 hover:text-afora"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-1/3 min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">
                Company
              </h3>
              <ul className="mt-4 space-y-3">
                {companyLinks.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-gray-600 hover:text-afora"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Middle: Copyright | Social */}
        <div className="mt-12 flex flex-col gap-6 border-t border-gray-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Afora. All Rights Reserved.{" "}
            <Link href="#" className="hover:text-afora">
              Privacy Policy
            </Link>
            {" | "}
            <Link href="#" className="hover:text-afora">
              Legal
            </Link>
          </div>
          {/* <div className="flex items-center gap-2">
            {socialIcons.map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-afora hover:text-afora"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div> */}
        </div>
      </div>
    </footer>
  );
}
