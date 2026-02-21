"use client";

import { Plus, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { collection } from "firebase/firestore";
import { db } from "@/firebase";
import { useCollection } from "react-firebase-hooks/firestore";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import HomePageCard from "./HomePageCard";
import LoadingSpinner from "./LoadingSpinner";
import { UserOrgData } from "@/types/types";
import NewOrgButton from "./NewOrgButton";
import JoinOrgButton from "./JoinOrgButton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import Image from "next/image";

function SignedInLanding() {
    const router = useRouter();
    const [orgs, setOrgs] = useState<UserOrgData[]>([]);
    const { user } = useUser();
    const email = user?.primaryEmailAddress?.emailAddress || "";
    const [orgsData, orgsLoading, orgsError] = useCollection(email ? collection(db, "users", email, "orgs") : null);

    const [isNewOrgOpen, setIsNewOrgOpen] = useState(false);
    const [isJoinOrgOpen, setIsJoinOrgOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState("");

    useEffect(() => {
        if (!orgsData) return;
        // console.log('Raw orgs data:', orgsData.docs.map(doc => ({ id: doc.id, data: doc.data() })));
        
        const orgsList = orgsData.docs
            .map((doc) => {
                const data = doc.data();
                if (!data.orgId) {
                    console.warn('Found org document without orgId:', doc.id);
                    return null;
                }
                return {
                    ...data,
                    orgId: data.orgId || doc.id
                };
            })
            .filter((org): org is UserOrgData => {
                if (!org) {
                    return false;
                }
                // console.log('Processing org:', org);
                return true;
            });
        
        // console.log('Filtered orgs list:', orgsList);
        setOrgs(orgsList);
    }, [orgsData]);

    // Get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 6) return "Good night";
        if (hour < 12) return "Good morning";
        if (hour < 14) return "Good afternoon";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    if (!user || orgsLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (orgsError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="text-red-500 bg-red-50 px-6 py-4 rounded-lg shadow-sm">
                    Failed to load groups. Please try again later.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full max-w-[90rem] mx-auto px-3">
            {/* Nido Scout-style Banner */}
            <div className="relative pt-8 pb-12">
                <div className="w-full">
                    <div className="bg-purple-50 rounded-xl p-6 md:p-8 border border-purple-100 shadow-sm">
                        <div className="flex flex-col gap-6">
                            <div>
                                <h2 className="text-xl text-gray-600 mb-1">
                                    {getGreeting()}, {user.firstName || user.username}
                                </h2>
                                <p className="text-gray-600 text-sm">
                                    {orgs.length > 0
                                        ? `You've joined ${orgs.length} group${orgs.length > 1 ? "s" : ""}`
                                        : "Start by creating or joining a group"}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                    Search your tasks
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            type="text"
                                            placeholder="Search tasks by keyword..."
                                            value={searchKeyword}
                                            onChange={(e) => setSearchKeyword(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    router.push(
                                                        `/my-tasks?q=${encodeURIComponent(searchKeyword.trim())}`
                                                    );
                                                }
                                            }}
                                            className="pl-10 bg-white border-gray-200"
                                        />
                                    </div>
                                    <Button
                                        onClick={() =>
                                            router.push(
                                                `/my-tasks?q=${encodeURIComponent(searchKeyword.trim())}`
                                            )
                                        }
                                        className="bg-gray-900 hover:bg-gray-800 text-white shrink-0"
                                    >
                                        Search
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full pb-12">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900">My Groups</h2>
                    
                    {/* Organization Actions */}
                    <div className="relative">
                        <NewOrgButton isOpen={isNewOrgOpen} setIsOpen={setIsNewOrgOpen} />
                        <JoinOrgButton isOpen={isJoinOrgOpen} setIsOpen={setIsJoinOrgOpen} />
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-full shadow-md hover:shadow-lg transition-all duration-300 border border-indigo-100 hover:border-indigo-200">
                                    <Plus className="w-5 h-5" />
                                    <span>New Group</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem>
                                    <Button
                                        className="bg-[#6F61EF] w-full hover:bg-[#5646e4]"
                                        onClick={() => {
                                            setIsNewOrgOpen(true);
                                            setDropdownOpen(false);
                                        }}
                                    >
                                        Create Group
                                    </Button>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Button
                                        className="bg-[#6F61EF] w-full hover:bg-[#5646e4]"
                                        onClick={() => {
                                            setIsJoinOrgOpen(true);
                                            setDropdownOpen(false);
                                        }}
                                    >
                                        Join Group
                                    </Button>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {orgs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {orgs
                            .filter((org) => org && org.orgId && typeof org.orgId === 'string')
                            .map((org) => (
                                <React.Fragment key={org.orgId}>
                                    <HomePageCard org={org} />
                                </React.Fragment>
                            ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-100">
                        <Image
                            src="/logoFull.svg"
                            alt="Logo"
                            width={96}
                            height={96}
                            className="mb-6 opacity-80"
                        />
                        <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                            Create Your First Group
                        </h2>
                        <p className="text-gray-600 mb-8 text-center max-w-md">
                            Create a group, invite team members, and start your collaboration journey
                        </p>
                        <button 
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-indigo-700"
                            onClick={() => setIsNewOrgOpen(true)}
                        >
                            <Plus className="w-5 h-5" />
                            <span>New Group</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SignedInLanding;
