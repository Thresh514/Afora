"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useDocument } from "react-firebase-hooks/firestore";
import { collection, doc, query } from "firebase/firestore";
import { db } from "@/firebase";
import MemberList from "./MemberList";
import { Organization, UserOrgData } from "@/types/types";
import { useUser } from "@clerk/nextjs";
import ProjTab from "./ProjTab";
import OrgHeader from "./OrgHeader";
import { getOrganizationMembers } from "@/actions/newActions";

const OrganizationPage = ({ id }: { id: string }) => {
    const { user } = useUser();

    const [org, loading, error] = useDocument(
        doc(db, "organizations", id),
    );
    const [projectsData] = useCollection(
        query(collection(db, "organizations", id, "projects")),
    );
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const [data] = useDocument(
        userEmail ? doc(db, "users", userEmail, "orgs", id) : null,
    );

    const [userOrgData, setUserOrgData] = useState<UserOrgData>();
    const [membersData, setMembersData] = useState<{
        admins: string[];
        members: string[];
    }>({ admins: [], members: [] });
    const [membersLoading, setMembersLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Function to refresh members data
    const refreshMembers = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Handle userOrgData - moved before early returns
    useEffect(() => {
        if (data) {
            const userOrg = data.data() as UserOrgData;
            console.log("OrganizationPage - User org data loaded:", userOrg);
            
            // Handle both old and new data structures
            if (userOrg.roles && userOrg.roles.length > 0) {
                // New structure: use roles array, determine primary role
                const primaryRole = userOrg.roles.includes('owner') ? 'owner' : 
                                  userOrg.roles.includes('admin') ? 'admin' : 'member';
                console.log("OrganizationPage - Using new structure, roles:", userOrg.roles, "primary role:", primaryRole);
                setUserOrgData({
                    ...userOrg,
                    role: primaryRole // Set role for backward compatibility
                });
            } else {
                // Old structure: use existing role field
                console.log("OrganizationPage - Using old structure, role:", userOrg.role);
                setUserOrgData(userOrg);
            }
        } else if (!loading && userEmail && org) {
            // Check if user is actually a member of this organization
            console.log("OrganizationPage - No user org data found, checking if user is member");
            const checkUserMembership = async () => {
                try {
                    const result = await getOrganizationMembers(id);
                    if (result.success && result.members) {
                        const userMember = result.members.find((member: any) => member.email === userEmail);
                        if (userMember) {
                            const primaryRole = userMember.roles.includes('owner') ? 'owner' : 
                                              userMember.roles.includes('admin') ? 'admin' : 'member';
                            setUserOrgData({
                                role: primaryRole,
                                createdAt: new Date().toISOString(),
                                orgId: id,
                                userId: userEmail
                            });
                        } else {
                            console.log("User is not a member of this organization");
                        }
                    }
                } catch (error) {
                    console.error("Error checking user membership:", error);
                }
            };
            
            checkUserMembership();
        }
    }, [data, loading, userEmail, org, id]);

    // Fetch organization members
    useEffect(() => {
        const fetchMembers = async () => {
            if (!id) return;
            
            setMembersLoading(true);
            try {
                const result = await getOrganizationMembers(id);
                if (result.success && result.members) {
                    const admins = result.members
                        .filter((member: any) => member.roles.includes('admin') || member.roles.includes('owner'))
                        .map((member: any) => member.email);
                    const members = result.members
                        .filter((member: any) => member.roles.includes('member'))
                        .map((member: any) => member.email);
                    
                    setMembersData({ admins, members });
                }
            } catch (error) {
                console.error('Error fetching organization members:', error);
            } finally {
                setMembersLoading(false);
            }
        };

        fetchMembers();
    }, [id, refreshTrigger]);

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
                    {orgData && userOrgData && !membersLoading ? (
                        <MemberList
                            userRole={userOrgData.role}
                            admins={membersData.admins || []}
                            members={membersData.members || []}
                            orgId={id}
                            projectsData={projectsData}
                            currentUserEmail={userEmail}
                            onMembersChanged={refreshMembers}
                        />
                    ) : membersLoading ? (
                        <div>Loading members...</div>
                    ) : null}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default OrganizationPage;
