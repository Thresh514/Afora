"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Breadcrumbs from "./Breadcrumbs";
import Link from "next/link";
import FundUs from "./FundUs";
import NotificationDropdown from "./NotificationDropdown";
import { SidebarTrigger } from "./ui/sidebar";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

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
                        <SignedIn>
                            <Link href="/home">
                                <Image
                                    src="/logoFull.svg"
                                    alt="Logo"
                                    width={150}
                                    height={50}
                                />
                            </Link>
                        </SignedIn>
                        <SignedOut>
                            <Link href="/">
                                <Image
                                    src="/logoFull.svg"
                                    alt="Logo"
                                    width={150}
                                    height={50}
                                />
                            </Link>
                        </SignedOut>
                    </h1>

                    {/* Breadcrumbs */}
                    <SignedIn>
                        <Breadcrumbs />
                    </SignedIn>

                    <div className="flex gap-4 items-center text-white">
                        <ThemeToggle />
                        <FundUs />
                        <SignedOut>
                            <SignInButton
                                forceRedirectUrl="/home"
                                signUpForceRedirectUrl="/home"
                            />
                        </SignedOut>
                        <SignedIn>
                            <NotificationDropdown />
                            <UserButton
                                appearance={{
                                    elements: {
                                        formFieldInput:
                                            "!max-w-[min(100%,16rem)] w-full sm:!w-[16rem]",
                                        formFieldRow: "flex-wrap items-center gap-2",
                                        profileSectionContent__emailAddresses:
                                            "flex flex-col gap-2",
                                        profileSectionPrimaryButton__emailAddresses:
                                            "w-fit self-start",
                                    },
                                }}
                            />
                        </SignedIn>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
