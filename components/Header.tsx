"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Breadcrumbs from "./Breadcrumbs";
import Link from "next/link";
import { Settings } from "lucide-react";
import FundUs from "./FundUs";
import ContactUs from "./ContactUs";
import { SidebarTrigger } from "./ui/sidebar";
import { Button } from "./ui/button";
import Image from "next/image";

function Header() {
    return (
        <header className="top-0 left-0 right-0 z-10 shadow-md bg-[#6F61EF]">
            <div className="flex items-center justify-between m-1 mx-4">
                <SignedIn>
                    <div className="flex items-center text-white text-2xl pr-2 -mx-2">
                        <SidebarTrigger className="text-white text-4xl" />
                    </div>
                </SignedIn>
                <div className="flex items-center justify-between flex-1">
                    <h1 className="text-2xl font-bold text-white">
                        <Link href="/">
                            <Image
                                src="/logoFull.svg"
                                alt="Logo"
                                width={150}
                                height={50}
                            />
                        </Link>
                    </h1>

                    {/* Breadcrumbs */}
                    <SignedIn>
                        <Breadcrumbs />
                    </SignedIn>

                    <div className="flex gap-6 items-center text-white">
                        <FundUs />
                        <ContactUs />
                        <SignedOut>
                            <SignInButton />
                        </SignedOut>

                        <SignedIn>
                            <Link href={"/setting"}>
                                <p className="truncate">
                                    <Settings className="text-white hover:translate-y-[-2px] transition-transform duration-300" />
                                </p>
                            </Link>
                            <UserButton />
                        </SignedIn>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
