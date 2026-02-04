"use client";

import Link from "next/link";
import Image from "next/image";
import { Linkedin, Twitter, Instagram } from "lucide-react";

const platformLinks = [
  { label: "Platform Overview", href: "/#platform" },
  { label: "Landing Page Templates", href: "/#solutions" },
  { label: "Plans", href: "/price" },
  { label: "All Features", href: "/#solutions" },
];

const resourceLinks = [
  { label: "Blog", href: "#" },
  { label: "Landing Pages Guide", href: "#" },
  { label: "Optimization Guide", href: "#" },
];

const communityLinks = [
  { label: "Help Center", href: "#" },
  { label: "Customer Stories", href: "#" },
  { label: "System Status", href: "#" },
];

const companyLinks = [
  { label: "About", href: "#" },
  { label: "Press", href: "#" },
  { label: "Careers", href: "#" },
  { label: "Contact Us", href: "#" },
];

const socialIcons = [
  { Icon: Linkedin, href: "#", label: "LinkedIn" },
  { Icon: Twitter, href: "#", label: "Twitter" },
  { Icon: Instagram, href: "#", label: "Instagram" },
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Top: Logo + address | Nav columns */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block">
              <Image src="/logoFull.svg" alt="Afora" width={120} height={40} />
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              212 3rd Ave N, Ste 475
              <br />
              Minneapolis MN, 55401-1478
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            <div>
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
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">
                Resources
              </h3>
              <ul className="mt-4 space-y-3">
                {resourceLinks.map((item) => (
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
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">
                Community & Support
              </h3>
              <ul className="mt-4 space-y-3">
                {communityLinks.map((item) => (
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
            <div>
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
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>
    </footer>
  );
}
