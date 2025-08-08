"use client";

import { Settings, Mail, Calendar } from "lucide-react";
import { useCollection } from "react-firebase-hooks/firestore";
import { useUser } from "@clerk/nextjs";
import { collection, DocumentData, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooterGroup,
} from "@/components/ui/sidebar";
import { Organization } from "@/types/types";

interface OrgDocument extends DocumentData {
    createdAt: string;
    role: string;
    orgId: string;
    userId: string;
    orgTitle: string;
}

function MySidebar() {
    const { user } = useUser();
    const [userOrgs] = useCollection(
        user &&
            user.primaryEmailAddress &&
            collection(
                db,
                "users",
                user.primaryEmailAddress.toString(),
                "orgs",
            ),
    );
    const [orgIds, setOrgIds] = useState<string[]>([]);
    const [orgMap, setOrgMap] = useState<Map<string, string>>(new Map());

    // Memoize the query to maintain stability
    const orgQuery = useMemo(
        () =>
            orgIds.length > 0 && orgIds.filter(Boolean).length > 0
                ? query(
                        collection(db, "organizations"),
                        where("__name__", "in", orgIds.filter(Boolean)),
                    )
                : null,
        [orgIds],
    );

    const [value, loading, error] = useCollection(orgQuery);

    // Get orgIds from userOrgs
    useEffect(() => {
        if (!userOrgs) return;
        console.log(userOrgs);
        const orgDocs = userOrgs.docs.map((doc) => doc.data() as OrgDocument);
        const ids = orgDocs.map((org) => org.orgId).filter(Boolean); // 过滤空值
        console.log("MySidebar - Updated orgIds:", ids);
        setOrgIds(ids);
    }, [userOrgs]);

    // Create map from organizations collection data
    useEffect(() => {
        if (!value) return;

        const newOrgMap = new Map<string, string>();
        value.docs.forEach((doc) => {
            const data = doc.data() as Organization;
            newOrgMap.set(doc.id, data.title); // Assuming the title field is called 'title'
        });

        setOrgMap(newOrgMap);
    }, [value]);

    return (
        <div className="h-full">
            <Sidebar collapsible="icon">
                <SidebarContent>
                    <div className="flex-1">
                        <SidebarGroup>
                            <SidebarGroupLabel>Groups</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {/* Loading state */}
                                    {loading && (
                                        <SidebarMenuItem>
                                            <div className="px-2 py-1 text-sm text-gray-500">
                                                Loading groups...
                                            </div>
                                        </SidebarMenuItem>
                                    )}

                                    {/* Error state */}
                                    {error && (
                                        <SidebarMenuItem>
                                            <div className="px-2 py-1 text-sm text-red-500">
                                                Error loading groups
                                            </div>
                                        </SidebarMenuItem>
                                    )}

                                    {/* Groups list */}
                                    {!loading &&
                                        !error &&
                                        orgMap &&
                                        Array.from(orgMap.entries()).map(
                                            ([id, title]) => (
                                                <SidebarMenuItem key={id}>
                                                    <SidebarMenuButton asChild>
                                                        <Link
                                                            className="group-data-[collapsible=icon]:hidden"
                                                            href={`/org/${id}`}
                                                        >
                                                            <span className="truncate border-e-indigo-50 font-bold">
                                                                {title}
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                    <SidebarMenuButton asChild className="hidden group-data-[collapsible=icon]:flex">
                                                        <Link href={`/org/${id}`}>
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 text-purple-700 font-semibold">
                                                                {title.charAt(0).toUpperCase()}
                                                            </div>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ),
                                        )}

                                    {/* Empty state */}
                                    {!loading &&
                                        !error &&
                                        orgMap &&
                                        orgMap.size === 0 &&
                                        orgIds.length === 0 && (
                                            <SidebarMenuItem>
                                                <div className="px-2 py-1 text-sm text-gray-500">
                                                    No groups found
                                                </div>
                                            </SidebarMenuItem>
                                        )}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <SidebarGroup>
                            <SidebarGroupLabel>Tools</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton asChild>
                                            <Link href="/notifications" className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                <span className="truncate">Notifications</span>
                                            </Link>
                                        </SidebarMenuButton>
                                        <SidebarMenuButton asChild>
                                            <Link href="#calendar" className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                <span className="truncate">Calendar</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </div>

                    <SidebarFooterGroup>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="/setting" className="flex items-center gap-2">
                                        <Settings className="h-4 w-4" />
                                        <span className="truncate">Settings</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarFooterGroup>
                </SidebarContent>
            </Sidebar>
        </div>
    );
}

export default MySidebar;
