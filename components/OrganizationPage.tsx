"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useDocument } from "react-firebase-hooks/firestore";
import { collection, doc, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import MemberList from "./MemberList";
import { Organization, UserOrgData } from "@/types/types";
import { useUser } from "@clerk/nextjs";
import ProjTab from "./ProjTab";
import OrgHeader from "./OrgHeader";

const OrganizationPage = ({ id }: { id: string }) => {
    const { user } = useUser();

    const [org, loading, error] = useDocument(
        doc(db, "organizations", id),
    );
    const [projectsData] = useCollection(
        query(collection(db, "projects"), where("orgId", "==", id)),
    );
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const [data] = useDocument(
        userEmail ? doc(db, "users", userEmail, "orgs", id) : null,
    );

    const [userOrgData, setUserOrgData] = useState<UserOrgData>();

    // Handle userOrgData - moved before early returns
    useEffect(() => {
        if (data) {
            const userOrg = data.data() as UserOrgData;
            console.log("OrganizationPage - User org data loaded:", userOrg);
            setUserOrgData(userOrg);
        } else if (!loading && userEmail && org) {
            const orgData = org.data() as Organization;
            const isAdmin = orgData?.admins?.includes(userEmail);
            const isMember = orgData?.members?.includes(userEmail);

            if (isAdmin || isMember) {
                console.log(
                    "OrganizationPage - Creating default user org data. IsAdmin:",
                    isAdmin,
                );
                const defaultUserOrgData: UserOrgData = {
                    createdAt: new Date().toISOString(),
                    role: isAdmin ? "admin" : "member",
                    orgId: id,
                    userId: userEmail,
                };
                setUserOrgData(defaultUserOrgData);
            }
        }
    }, [data, loading, userEmail, org, id]);

    // Get orgData before any early returns
    const orgData = org?.data() as Organization;

    // Early returns after all hooks
        if (loading) {
            return <div>Loading...</div>;
        }

        if (error) {
            return <div>Error: {error.message}</div>;
        }

        if (!org) {
            return <div>No group found</div>;
        }

    if (!orgData) {
        return <div>No group found</div>;
    }

    return (
        <div className="overflow-x-hidden p-4">
            {/* Header Section */}
            <OrgHeader id={id} />
            
            {/* Tabs Section */}
            <Tabs defaultValue="projects" className="mt-6 w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-xl p-1">
                    <TabsTrigger
                        value="projects"
                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        Teams
                    </TabsTrigger>
                    <TabsTrigger
                        value="members"
                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                        Members
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="projects" className="mt-4">
                    {user && user.primaryEmailAddress && userOrgData && (
                        <ProjTab
                            userRole={userOrgData.role}
                            userId={user.primaryEmailAddress.toString()}
                            orgId={id}
                        />
                    )}
                </TabsContent>
                <TabsContent value="members" className="mt-4">
                    {orgData && userOrgData && (
                        <MemberList
                            userRole={userOrgData.role}
                            admins={orgData.admins}
                            members={orgData.members}
                            orgId={id}
                            projectsData={projectsData}
                            currentUserEmail={userEmail}
                        />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default OrganizationPage;
