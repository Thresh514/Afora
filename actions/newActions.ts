/**
 * New Actions for Afora - Based on Updated Database Structure
 * 
 * This file contains all functionality adapted to work with the new database structure:
 * 1. User-Organization relationships are stored in users/{email}/orgs/{orgId}
 * 2. Uses roles array and joinedProjs array for member management
 * 3. Organization members are queried via collectionGroup("orgs")
 * 4. Project members are queried via joinedProjs array
 */

"use server";
import { adminDb } from "@/firebase-admin";
import { auth } from "@clerk/nextjs/server";
import { Timestamp } from "firebase-admin/firestore";

// ============================================================================
// TYPES
// ============================================================================

export interface UserOrgData {
    orgId: string;
    userId: string;
    createdAt?: string;
    roles: string[];
    joinedProjs: string[];
}

export interface UserProjectData {
    projId: string;
    joinedAt: string;
    score: {
        total_points: number;
        tasks_assigned: number;
        tasks_completed: number;
        streak: number;
        last_updated: string;
    };
    projOnboardingSurveyResponse: string[];
}

export interface OrganizationMember {
    email: string;
    name: string;
    username: string;
    userImage: string;
    roles: string[];
    joinedProjs: string[];
}

export interface ProjectMember {
    email: string;
    name: string;
    username: string;
    userImage: string;
    role: string; // "admin" or "member"
    roles: string[];
    joinedProjs: string[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get user email from Clerk session claims with multiple fallback methods
 * @returns Promise<string> - User email address
 * @throws Error if no email is found
 */
async function getUserEmail(): Promise<string> {
    const { sessionClaims } = await auth();
    
    if (!sessionClaims) {
        throw new Error("No session claims found");
    }

    // Try multiple ways to get email
    let userEmail: string | undefined;
    
    if (sessionClaims.email && typeof sessionClaims.email === "string") {
        userEmail = sessionClaims.email;
    } else if (sessionClaims.primaryEmailAddress && typeof sessionClaims.primaryEmailAddress === "string") {
        userEmail = sessionClaims.primaryEmailAddress;
    } else if (sessionClaims.emailAddresses && Array.isArray(sessionClaims.emailAddresses) && sessionClaims.emailAddresses.length > 0) {
        userEmail = sessionClaims.emailAddresses[0] as string;
    }

    if (!userEmail) {
        throw new Error("Current user email not found");
    }

    return userEmail;
}

/**
 * Check if user has admin permissions (admin or owner)
 * @param roles - Array of user roles
 * @returns boolean - True if user has admin permissions
 */
function hasAdminPermissions(roles: string[]): boolean {
    return roles.includes('admin') || roles.includes('owner');
}

/**
 * Get primary role from roles array (owner > admin > member)
 * @param roles - Array of user roles
 * @returns string - Primary role
 */
function getPrimaryRole(roles: string[]): string {
    if (roles.includes('owner')) return 'owner';
    if (roles.includes('admin')) return 'admin';
    return 'member';
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Create a new user in the system
 * @param userEmail - User's email address
 * @param username - User's username
 * @param userImage - User's profile image URL
 * @returns Promise<{success: boolean, message: string}> - Result of user creation
 */
async function createNewUser(
    userEmail: string,
    username: string,
    userImage: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userRef = adminDb.collection("users").doc(userEmail);

        // Update current user's profile info whenever it is changed/updated
        await userRef.set({
            name: username,
            email: userEmail,
            username: username,
            userImage: userImage,
            onboardingSurveyResponse: [],
        }, { merge: true });

        // Add welcome notification
        userRef.collection("notifications").add({
            type: "welcome",
            title: "Welcome to Afora!",
            message: "This is where you can view any updates about tasks or projects you're subscribed to."
        });

        return { success: true, message: "User created successfully" };
    } catch (e) {
        return { success: false, message: (e as Error).message };
    }
}

/**
 * Set user's onboarding survey response
 * @param selectedTags - Array of selected tags from onboarding survey
 * @returns Promise<{success: boolean, message: string}> - Result of survey save
 */
async function setUserOnboardingSurvey(selectedTags: string[][]) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        const userRef = adminDb.collection("users").doc(userEmail);
        
        await userRef.update({
            onboardingSurveyResponse: selectedTags,
        });

        return { success: true, message: "Onboarding survey saved successfully" };
    } catch (error) {
        console.error("Error setting onboarding survey:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Update user's matching preferences
 * @param preferences - User's matching preferences object
 * @returns Promise<{success: boolean, message: string}> - Result of preference update
 */
async function updateUserMatchingPreference(preferences: any) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        const userRef = adminDb.collection("users").doc(userEmail);
        
        await userRef.update({
            matchingPreferences: preferences,
            lastUpdated: Timestamp.now(),
        });

        return { success: true, message: "Matching preferences updated successfully" };
    } catch (error) {
        console.error("Error updating matching preferences:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Get user's matching preferences
 * @returns Promise<{success: boolean, preferences?: any, message?: string}> - User's preferences
 */
async function getUserMatchingPreference() {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        const userRef = adminDb.collection("users").doc(userEmail);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return { success: false, message: "User not found" };
        }

        const userData = userDoc.data();
        return { 
            success: true, 
            preferences: userData?.matchingPreferences || {} 
        };
    } catch (error) {
        console.error("Error getting matching preferences:", error);
        return { success: false, message: (error as Error).message };
    }
}

// ============================================================================
// ORGANIZATION MANAGEMENT
// ============================================================================

/**
 * Create a new organization
 * @param orgName - Organization name
 * @param orgDescription - Organization description
 * @returns Promise<{success: boolean, message: string, orgId?: string}> - Result of organization creation
 */
async function createNewOrganization(
    orgName: string,
    orgDescription: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();

        // Create organization document
        const orgRef = adminDb.collection("organizations").doc();
        const orgId = orgRef.id;
        
        await orgRef.set({
            title: orgName,
            description: orgDescription,
            createdAt: Timestamp.now(),
        });

        // Add creator as owner in user's orgs subcollection
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        await userOrgRef.set({
            orgId,
            userId: userEmail,
            roles: ["owner"],
            joinedProjs: [],
            createdAt: new Date().toISOString(),
        });

        return { 
            success: true, 
            message: "Organization created successfully",
            orgId 
        };
    } catch (error) {
        console.error("Error creating organization:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Delete an organization (owner only)
 * @param orgId - Organization ID to delete
 * @returns Promise<{success: boolean, message: string}> - Result of organization deletion
 */
async function deleteOrg(orgId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        
        // Check if user is owner
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        if (!userOrgDoc.exists) {
            return { success: false, message: "User is not a member of this organization" };
        }

        const userOrgData = userOrgDoc.data() as UserOrgData;
        const isOwner = userOrgData.roles?.includes('owner');
        
        if (!isOwner) {
            return { success: false, message: "Only organization owners can delete the organization" };
        }

        // Delete organization document
        await adminDb.collection("organizations").doc(orgId).delete();

        // Delete all user-organization relationships for this org
        const orgMembersQuery = await adminDb
            .collectionGroup("orgs")
            .where("orgId", "==", orgId)
            .get();

        const batch = adminDb.batch();
        orgMembersQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        return { success: true, message: "Organization deleted successfully" };
    } catch (error) {
        console.error("Error deleting organization:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Invite a user to an organization (owner only)
 * @param email - Email of user to invite
 * @param orgId - Organization ID
 * @param accessRole - Role to assign (default: "member")
 * @returns Promise<{success: boolean, message: string}> - Result of invitation
 */
async function inviteUserToOrg(email: string, orgId: string, accessRole: string = "member") {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const currentUserEmail = await getUserEmail();
        
        // Check if current user has permission (owner only)
        const currentUserOrgRef = adminDb.collection("users").doc(currentUserEmail).collection("orgs").doc(orgId);
        const currentUserOrgDoc = await currentUserOrgRef.get();
        
        let isOwner = false;
        if (currentUserOrgDoc.exists) {
            const currentUserOrgData = currentUserOrgDoc.data() as UserOrgData;
            isOwner = currentUserOrgData.roles?.includes('owner');
        } else {
            // If no org data found, assume user is owner (they created the org)
            isOwner = true;
        }
        
        if (!isOwner) {
            return { success: false, message: "Only organization owners can invite users" };
        }

        // Prevent inviting as owner
        if (accessRole === "owner") {
            return { success: false, message: "Cannot invite users as owner" };
        }

        // Check if user exists
        const userRef = adminDb.collection("users").doc(email);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return { success: false, message: "User does not exist" };
        }

        // Check if user is already a member
        const userOrgRef = adminDb.collection("users").doc(email).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        if (userOrgDoc.exists) {
            return { success: false, message: "User is already a member of this organization" };
        }

        // Add user to organization
        await userOrgRef.set({
            orgId,
            userId: email,
            roles: [accessRole],
            joinedProjs: [],
            createdAt: new Date().toISOString(),
        });

        return { success: true, message: "User invited successfully" };
    } catch (error) {
        console.error("Error inviting user:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Upgrade a user's role in an organization (owner only)
 * @param email - Email of user to upgrade
 * @param orgId - Organization ID
 * @param newRole - New role to assign
 * @returns Promise<{success: boolean, message: string}> - Result of role upgrade
 */
async function upgradeUserRole(email: string, orgId: string, newRole: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const currentUserEmail = await getUserEmail();
        
        // Check if current user has permission (owner only)
        const currentUserOrgRef = adminDb.collection("users").doc(currentUserEmail).collection("orgs").doc(orgId);
        const currentUserOrgDoc = await currentUserOrgRef.get();
        
        let isOwner = false;
        if (currentUserOrgDoc.exists) {
            const currentUserOrgData = currentUserOrgDoc.data() as UserOrgData;
            isOwner = currentUserOrgData.roles?.includes('owner');
        } else {
            isOwner = true;
        }
        
        if (!isOwner) {
            return { success: false, message: "Only organization owners can upgrade user roles" };
        }

        // Prevent upgrading to owner
        if (newRole === "owner") {
            return { success: false, message: "Cannot upgrade user to owner" };
        }

        // Update user role
        const userOrgRef = adminDb.collection("users").doc(email).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        if (!userOrgDoc.exists) {
            return { success: false, message: "User is not a member of this organization" };
        }

        await userOrgRef.update({
            roles: [newRole],
        });

        return { success: true, message: "User role upgraded successfully" };
    } catch (error) {
        console.error("Error upgrading user role:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Remove a user from an organization (owner/admin only)
 * @param email - Email of user to remove
 * @param orgId - Organization ID
 * @returns Promise<{success: boolean, message: string}> - Result of user removal
 */
async function removeUserFromOrg(email: string, orgId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const currentUserEmail = await getUserEmail();
        
        // Check if current user has permission (owner or admin)
        const currentUserOrgRef = adminDb.collection("users").doc(currentUserEmail).collection("orgs").doc(orgId);
        const currentUserOrgDoc = await currentUserOrgRef.get();
        
        let hasPermission = false;
        if (currentUserOrgDoc.exists) {
            const currentUserOrgData = currentUserOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(currentUserOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can remove users" };
        }

        // Remove user from organization
        const userOrgRef = adminDb.collection("users").doc(email).collection("orgs").doc(orgId);
        await userOrgRef.delete();

        return { success: true, message: "User removed from organization successfully" };
    } catch (error) {
        console.error("Error removing user from organization:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Get all members of an organization
 * @param orgId - Organization ID
 * @returns Promise<{success: boolean, members?: OrganizationMember[], message?: string}> - Organization members
 */
async function getOrganizationMembers(orgId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        console.log("getOrganizationMembers - Querying for orgId:", orgId);
        
        // Query all users who are members of this organization
        const query = await adminDb
            .collectionGroup("orgs")
            .where("orgId", "==", orgId)
            .get();

        console.log("getOrganizationMembers - Found", query.docs.length, "documents");
        
        const members: OrganizationMember[] = [];
        
        for (const doc of query.docs) {
            const orgData = doc.data();
            const userEmail = doc.ref.parent.parent?.id; // Get user email from path
            
            console.log("getOrganizationMembers - Processing doc:", {
                path: doc.ref.path,
                userEmail,
                orgData
            });
            
            if (userEmail) {
                // Get user basic info
                const userDoc = await adminDb.collection("users").doc(userEmail).get();
                const userData = userDoc.data();
                
                members.push({
                    email: userEmail,
                    name: userData?.name || userEmail.split('@')[0],
                    username: userData?.username || userEmail.split('@')[0],
                    userImage: userData?.userImage || "",
                    roles: orgData.roles || [],
                    joinedProjs: orgData.joinedProjs || []
                });
            }
        }

        console.log("getOrganizationMembers - Returning members:", members);
        return { success: true, members };
    } catch (error) {
        console.error("getOrganizationMembers error:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Set organization background image (owner/admin only)
 * @param orgId - Organization ID
 * @param imageUrl - Background image URL
 * @returns Promise<{success: boolean, message: string}> - Result of image setting
 */
async function setBgImage(orgId: string, imageUrl: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        
        // Check if user has permission
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        let hasPermission = false;
        if (userOrgDoc.exists) {
            const userOrgData = userOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(userOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can set background image" };
        }

        // Update organization background image
        await adminDb.collection("organizations").doc(orgId).update({
            backgroundImage: imageUrl,
        });

        return { success: true, message: "Background image set successfully" };
    } catch (error) {
        console.error("Error setting background image:", error);
        return { success: false, message: (error as Error).message };
    }
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

/**
 * Create a new project in an organization (owner/admin only)
 * @param orgId - Organization ID
 * @param title - Project title
 * @param teamSize - Maximum team size (default: 3)
 * @returns Promise<{success: boolean, message: string, projectId?: string}> - Result of project creation
 */
async function createProject(orgId: string, title: string, teamSize: number = 3) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        
        // Check if user has permission
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        let hasPermission = false;
        if (userOrgDoc.exists) {
            const userOrgData = userOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(userOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can create projects" };
        }

        // Create project document
        const projectRef = adminDb.collection("organizations").doc(orgId).collection("projects").doc();
        const projectId = projectRef.id;
        
        await projectRef.set({
            title,
            createdAt: Timestamp.now(),
            teamSize,
            currentMembers: [],
            spotsAvailable: teamSize,
            teamCharterResponse: [],
        });

        return { 
            success: true, 
            message: "Project created successfully",
            projectId 
        };
    } catch (error) {
        console.error("Error creating project:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Delete a project from an organization (owner/admin only)
 * @param projectId - Project ID to delete
 * @param orgId - Organization ID
 * @returns Promise<{success: boolean, message: string}> - Result of project deletion
 */
async function deleteProject(projectId: string, orgId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        
        // Check if user has permission
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        let hasPermission = false;
        if (userOrgDoc.exists) {
            const userOrgData = userOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(userOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can delete projects" };
        }

        // Delete project document
        await adminDb.collection("organizations").doc(orgId).collection("projects").doc(projectId).delete();

        // Remove project from all users' joinedProjs
        const orgMembersQuery = await adminDb
            .collectionGroup("orgs")
            .where("orgId", "==", orgId)
            .get();

        const batch = adminDb.batch();
        for (const doc of orgMembersQuery.docs) {
            const orgData = doc.data();
            const currentJoinedProjs = orgData.joinedProjs || [];
            const updatedJoinedProjs = currentJoinedProjs.filter((projId: string) => projId !== projectId);
            
            if (updatedJoinedProjs.length !== currentJoinedProjs.length) {
                batch.update(doc.ref, {
                    joinedProjs: updatedJoinedProjs
                });
            }
        }
        await batch.commit();

        return { success: true, message: "Project deleted successfully" };
    } catch (error) {
        console.error("Error deleting project:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Update project title (owner/admin only)
 * @param projectId - Project ID
 * @param orgId - Organization ID
 * @param newTitle - New project title
 * @returns Promise<{success: boolean, message: string}> - Result of title update
 */
async function updateProjectTitle(projectId: string, orgId: string, newTitle: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        
        // Check if user has permission
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        let hasPermission = false;
        if (userOrgDoc.exists) {
            const userOrgData = userOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(userOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can update project titles" };
        }

        // Update project title
        await adminDb.collection("organizations").doc(orgId).collection("projects").doc(projectId).update({
            title: newTitle,
        });

        return { success: true, message: "Project title updated successfully" };
    } catch (error) {
        console.error("Error updating project title:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Set team charter for a project (owner/admin only)
 * @param projectId - Project ID
 * @param orgId - Organization ID
 * @param charterResponse - Team charter response array
 * @returns Promise<{success: boolean, message: string}> - Result of charter setting
 */
async function setTeamCharter(projectId: string, orgId: string, charterResponse: string[]) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        
        // Check if user has permission
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        let hasPermission = false;
        if (userOrgDoc.exists) {
            const userOrgData = userOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(userOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can set team charter" };
        }

        // Update team charter
        await adminDb.collection("organizations").doc(orgId).collection("projects").doc(projectId).update({
            teamCharterResponse: charterResponse,
        });

        return { success: true, message: "Team charter set successfully" };
    } catch (error) {
        console.error("Error setting team charter:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Update project team size (owner/admin only)
 * @param projectId - Project ID
 * @param orgId - Organization ID
 * @param teamSize - New team size
 * @returns Promise<{success: boolean, message: string}> - Result of team size update
 */
async function updateProjectTeamSize(projectId: string, orgId: string, teamSize: number) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        
        // Check if user has permission
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        let hasPermission = false;
        if (userOrgDoc.exists) {
            const userOrgData = userOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(userOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can update team size" };
        }

        // Update team size
        await adminDb.collection("organizations").doc(orgId).collection("projects").doc(projectId).update({
            teamSize,
            spotsAvailable: teamSize,
        });

        return { success: true, message: "Team size updated successfully" };
    } catch (error) {
        console.error("Error updating team size:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Get all members of a project by querying joinedProjs
 * @param projectId - Project ID
 * @param orgId - Organization ID
 * @returns Promise<{success: boolean, data?: ProjectMember[], message?: string}> - Project members
 */
async function getProjectMembers(projectId: string, orgId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        console.log("getProjectMembers - Querying for projectId:", projectId);
        
        // Query all users who are members of this project through joinedProjs
        const query = await adminDb
            .collectionGroup("orgs")
            .where("joinedProjs", "array-contains", projectId)
            .get();

        console.log("getProjectMembers - Found", query.docs.length, "documents");
        
        const members: ProjectMember[] = [];
        
        for (const doc of query.docs) {
            const orgData = doc.data();
            const userEmail = doc.ref.parent.parent?.id; // Get user email from path
            
            console.log("getProjectMembers - Processing doc:", {
                path: doc.ref.path,
                userEmail,
                orgData
            });
            
            if (userEmail) {
                // Get user basic info
                const userDoc = await adminDb.collection("users").doc(userEmail).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    
                    // Determine role based on organization roles
                    const roles = orgData.roles || [];
                    const isAdmin = roles.includes('admin') || roles.includes('owner');
                    
                    members.push({
                        email: userEmail,
                        role: isAdmin ? "admin" : "member",
                        name: userData?.name || userEmail.split('@')[0],
                        username: userData?.username || userEmail.split('@')[0],
                        userImage: userData?.userImage || "",
                        roles,
                        joinedProjs: orgData.joinedProjs || []
                    });
                }
            }
        }

        console.log("getProjectMembers - Returning members:", members);
        return {
            success: true,
            data: members,
            message: "Project members retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting project members:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Get project team charter
 * @param projectId - Project ID
 * @param orgId - Organization ID
 * @returns Promise<{success: boolean, charter?: string[], message?: string}> - Team charter
 */
async function getProjectTeamCharter(projectId: string, orgId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const projectDoc = await adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("projects")
            .doc(projectId)
            .get();

        if (!projectDoc.exists) {
            return { success: false, message: "Project not found" };
        }

        const projectData = projectDoc.data();
        return {
            success: true,
            charter: projectData?.teamCharterResponse || [],
        };
    } catch (error) {
        console.error("Error getting team charter:", error);
        return { success: false, message: (error as Error).message };
    }
}

// ============================================================================
// PROJECT MEMBER MANAGEMENT
// ============================================================================

/**
 * Add a user to a project (owner/admin only)
 * @param projectId - Project ID
 * @param orgId - Organization ID
 * @param userEmail - Email of user to add
 * @param role - Role to assign (default: "member")
 * @returns Promise<{success: boolean, message: string}> - Result of member addition
 */
async function addProjectMember(projectId: string, orgId: string, userEmail: string, role: string = "member") {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const currentUserEmail = await getUserEmail();
        
        // Check if current user has permission
        const currentUserOrgRef = adminDb.collection("users").doc(currentUserEmail).collection("orgs").doc(orgId);
        const currentUserOrgDoc = await currentUserOrgRef.get();
        
        let hasPermission = false;
        if (currentUserOrgDoc.exists) {
            const currentUserOrgData = currentUserOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(currentUserOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can add project members" };
        }

        // Check if user is a member of the organization
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        if (!userOrgDoc.exists) {
            return { success: false, message: "User is not a member of this organization" };
        }

        // Add project to user's joinedProjs
        const userOrgData = userOrgDoc.data() as UserOrgData;
        const currentJoinedProjs = userOrgData.joinedProjs || [];
        
        if (!currentJoinedProjs.includes(projectId)) {
            // Update joinedProjs array
            await userOrgRef.update({
                joinedProjs: [...currentJoinedProjs, projectId]
            });

            // Create project details in projects subcollection
            const userProjectRef = userOrgRef.collection("projects").doc(projectId);
            await userProjectRef.set({
                projId: projectId,
                joinedAt: new Date().toISOString(),
                score: {
                    total_points: 0,
                    tasks_assigned: 0,
                    tasks_completed: 0,
                    streak: 0,
                    last_updated: new Date().toISOString()
                },
                projOnboardingSurveyResponse: []
            });
        }

        return { success: true, message: "User added to project successfully" };
    } catch (error) {
        console.error("Error adding project member:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Remove a user from a project (owner/admin only)
 * @param projectId - Project ID
 * @param orgId - Organization ID
 * @param userEmail - Email of user to remove
 * @returns Promise<{success: boolean, message: string}> - Result of member removal
 */
async function removeProjectMember(projectId: string, orgId: string, userEmail: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const currentUserEmail = await getUserEmail();
        
        // Check if current user has permission
        const currentUserOrgRef = adminDb.collection("users").doc(currentUserEmail).collection("orgs").doc(orgId);
        const currentUserOrgDoc = await currentUserOrgRef.get();
        
        let hasPermission = false;
        if (currentUserOrgDoc.exists) {
            const currentUserOrgData = currentUserOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(currentUserOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can remove project members" };
        }

        // Remove project from user's joinedProjs
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        if (userOrgDoc.exists) {
            const userOrgData = userOrgDoc.data() as UserOrgData;
            const currentJoinedProjs = userOrgData.joinedProjs || [];
            const updatedJoinedProjs = currentJoinedProjs.filter((projId: string) => projId !== projectId);
            
            // Update joinedProjs array
            await userOrgRef.update({
                joinedProjs: updatedJoinedProjs
            });

            // Delete project details from projects subcollection
            const userProjectRef = userOrgRef.collection("projects").doc(projectId);
            await userProjectRef.delete();
        }

        return { success: true, message: "User removed from project successfully" };
    } catch (error) {
        console.error("Error removing project member:", error);
        return { success: false, message: (error as Error).message };
    }
}

// ============================================================================
// PROJECT SCORE MANAGEMENT
// ============================================================================

/**
 * Get user's project score and details
 * @param userId - User email
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @returns Promise<{success: boolean, data?: UserProjectData, message?: string}> - Project score data
 */
async function getUserProjectScore(userId: string, orgId: string, projectId: string) {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
        throw new Error("Unauthorized");
    }

    try {
        const userProjectRef = adminDb
            .collection("users")
            .doc(userId)
            .collection("orgs")
            .doc(orgId)
            .collection("projects")
            .doc(projectId);
        
        const userProjectDoc = await userProjectRef.get();
        
        if (!userProjectDoc.exists) {
            return { success: false, message: "User is not a member of this project" };
        }

        const projectData = userProjectDoc.data() as UserProjectData;
        return {
            success: true,
            data: projectData
        };
    } catch (error) {
        console.error("Error getting user project score:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Update user's project score
 * @param userId - User email
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param scoreUpdate - Partial score update object
 * @returns Promise<{success: boolean, message: string}> - Result of score update
 */
async function updateUserProjectScore(
    userId: string, 
    orgId: string, 
    projectId: string, 
    scoreUpdate: Partial<UserProjectData['score']>
) {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
        throw new Error("Unauthorized");
    }

    try {
        const userProjectRef = adminDb
            .collection("users")
            .doc(userId)
            .collection("orgs")
            .doc(orgId)
            .collection("projects")
            .doc(projectId);
        
        const userProjectDoc = await userProjectRef.get();
        
        if (!userProjectDoc.exists) {
            return { success: false, message: "User is not a member of this project" };
        }

        // Update score with new data
        await userProjectRef.update({
            'score.last_updated': new Date().toISOString(),
            ...Object.keys(scoreUpdate).reduce((acc, key) => {
                acc[`score.${key}`] = scoreUpdate[key as keyof typeof scoreUpdate];
                return acc;
            }, {} as any)
        });

        return { success: true, message: "Project score updated successfully" };
    } catch (error) {
        console.error("Error updating user project score:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Set user's project onboarding survey response
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @param surveyResponse - Survey response array
 * @returns Promise<{success: boolean, message: string}> - Result of survey save
 */
async function setUserProjectOnboardingSurvey(
    orgId: string, 
    projectId: string, 
    surveyResponse: string[]
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        const userProjectRef = adminDb
            .collection("users")
            .doc(userEmail)
            .collection("orgs")
            .doc(orgId)
            .collection("projects")
            .doc(projectId);
        
        const userProjectDoc = await userProjectRef.get();
        
        if (!userProjectDoc.exists) {
            return { success: false, message: "User is not a member of this project" };
        }

        await userProjectRef.update({
            projOnboardingSurveyResponse: surveyResponse
        });

        return { success: true, message: "Project onboarding survey saved successfully" };
    } catch (error) {
        console.error("Error setting project onboarding survey:", error);
        return { success: false, message: (error as Error).message };
    }
}

/**
 * Get user's project onboarding survey response
 * @param orgId - Organization ID
 * @param projectId - Project ID
 * @returns Promise<{success: boolean, survey?: string[], message?: string}> - Survey response
 */
async function getUserProjectOnboardingSurvey(orgId: string, projectId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        const userProjectRef = adminDb
            .collection("users")
            .doc(userEmail)
            .collection("orgs")
            .doc(orgId)
            .collection("projects")
            .doc(projectId);
        
        const userProjectDoc = await userProjectRef.get();
        
        if (!userProjectDoc.exists) {
            return { success: false, message: "User is not a member of this project" };
        }

        const projectData = userProjectDoc.data() as UserProjectData;
        return {
            success: true,
            survey: projectData.projOnboardingSurveyResponse || []
        };
    } catch (error) {
        console.error("Error getting project onboarding survey:", error);
        return { success: false, message: (error as Error).message };
    }
}

// ============================================================================
// TASK MANAGEMENT
// ============================================================================

/**
 * Create a task in a project stage (owner/admin only)
 * @param projectId - Project ID
 * @param orgId - Organization ID
 * @param stageId - Stage ID
 * @param taskData - Task data object
 * @returns Promise<{success: boolean, message: string, taskId?: string}> - Result of task creation
 */
async function createTask(projectId: string, orgId: string, stageId: string, taskData: any) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userEmail = await getUserEmail();
        
        // Check if user has permission
        const userOrgRef = adminDb.collection("users").doc(userEmail).collection("orgs").doc(orgId);
        const userOrgDoc = await userOrgRef.get();
        
        let hasPermission = false;
        if (userOrgDoc.exists) {
            const userOrgData = userOrgDoc.data() as UserOrgData;
            hasPermission = hasAdminPermissions(userOrgData.roles || []);
        } else {
            hasPermission = true; // Owner who created the org
        }
        
        if (!hasPermission) {
            return { success: false, message: "Only organization owners and admins can create tasks" };
        }

        // Create task document
        const taskRef = adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("projects")
            .doc(projectId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc();
        
        await taskRef.set({
            ...taskData,
            id: taskRef.id,
            createdAt: Timestamp.now(),
        });

        return { 
            success: true, 
            message: "Task created successfully",
            taskId: taskRef.id 
        };
    } catch (error) {
        console.error("Error creating task:", error);
        return { success: false, message: (error as Error).message };
    }
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export {
    // User Management
    createNewUser,
    setUserOnboardingSurvey,
    updateUserMatchingPreference,
    getUserMatchingPreference,
    
    // Organization Management
    createNewOrganization,
    deleteOrg,
    inviteUserToOrg,
    upgradeUserRole,
    removeUserFromOrg,
    getOrganizationMembers,
    setBgImage,
    
    // Project Management
    createProject,
    deleteProject,
    updateProjectTitle,
    setTeamCharter,
    updateProjectTeamSize,
    getProjectMembers,
    getProjectTeamCharter,
    
    // Project Member Management
    addProjectMember,
    removeProjectMember,
    
    // Project Score Management
    getUserProjectScore,
    updateUserProjectScore,
    setUserProjectOnboardingSurvey,
    getUserProjectOnboardingSurvey,
    
    // Task Management
    createTask,
};
