"use server";
import { adminDb } from "@/firebase-admin";
import { GeneratedTasks, Stage, appQuestions, projQuestions, OnboardingPayload, Task, UserTaskWithContext } from "@/types/types";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import axios from "axios";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase";
import { matching, matchingWithExistingTeam } from "@/ai_scripts/matching";

// IMPLEMENT THIS WITH FIREBASE FIRESTORE NOW THAT WE AREN'T USING LIVE BLOCKS

export async function createNewUser(
    userEmail: string,
    username: string,
    userImage: string,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userRef = adminDb.collection("users").doc(userEmail);

        // update current user's profile info whenever it is changed/updated
        await userRef.set(
            {
                email: userEmail,
                username: username,
                userImage: userImage,
            },
            { merge: true },
        );

        userRef.collection("notifications").add({
            type: "welcome",
            title: "Welcome to Afora!",
            message: "This is where you can view any updates about tasks or projects you're subscribed to."
        });

    } catch (e) {
        return { success: false, message: (e as Error).message };
    }
}

export async function createNewOrganization(
    orgName: string,
    orgDescription: string) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // 获取用户邮箱而不是用户ID
        let userEmail: string | undefined;
        if (sessionClaims?.email && typeof sessionClaims.email === "string") {
            userEmail = sessionClaims.email;
        } else if (
            sessionClaims?.primaryEmailAddress &&
            typeof sessionClaims.primaryEmailAddress === "string"
        ) {
            userEmail = sessionClaims.primaryEmailAddress;
        }

        // 如果仍然没有邮箱，尝试从 Clerk API 获取
        if (!userEmail) {
            try {
                const { currentUser } = await import("@clerk/nextjs/server");
                const user = await currentUser();
                userEmail =
                    user?.emailAddresses?.[0]?.emailAddress ||
                    user?.primaryEmailAddress?.emailAddress;
            } catch (clerkError) {
                console.error(
                    "Failed to get user email from Clerk:",
                    clerkError,
                );
            }
        }

        if (!userEmail) {
            throw new Error("Current user email not found");
        }

        // Validate orgDescription for valid characters
        const validRegex = /.*/;
        if (!validRegex.test(orgName)) {
            throw new Error(
                "Organization name contains invalid characters. Only alphanumeric characters and punctuation (.,'-) are allowed.",
            );
            // I feel like  an organization should be able to contain spaces because that is so normal
            // Would there be a way to do this?
        }

        const docCollectionRef = adminDb.collection("organizations");
        const docRef = await docCollectionRef.add({
            createdAt: Timestamp.now(),
            title: orgName,
            description: orgDescription,
            admins: [userEmail], // 使用邮箱而不是用户ID
            members: [],
        });

        await adminDb
            .collection("users")
            .doc(userEmail)
            .collection("orgs")
            .doc(docRef.id)
            .set({
                userId: userEmail, // 使用邮箱而不是用户ID
                role: "admin",
                orgId: docRef.id,
            });
        return { orgId: docRef.id, success: true };
    } catch (e) {
        return {
            success: false,
            message: (e as Error).message,
            orgId: undefined,
        };
    }
}

export async function deleteOrg(orgId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        await adminDb.collection("organizations").doc(orgId).delete();

        const query = await adminDb
            .collectionGroup("orgs")
            .where("orgId", "==", orgId)
            .get();

        const batch = adminDb.batch();
        // delete the organization reference in the user's collection for every user in the organization
        query.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false };
    }
}

export async function inviteUserToOrg(
    orgId: string,
    email: string,
    access: string,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userDoc = await adminDb.collection("users").doc(email).get();
        // TODO: consider adding sending emails invitations
        if (!userDoc.exists) {
            throw new Error(`User with email ${email} not found!`);
        }

        orgId = orgId.trim();
        if (!orgId) {
            throw new Error("Organization id cannot be empty");
        }

        const orgSnapshot = await adminDb
            .collection("organizations")
            .doc(orgId)
            .get();

        // Check if the organization exists
        if (!orgSnapshot.exists) {
            throw new Error(`Organization with id ${orgId} not found`);
        }

        // Check if the user is already a member of the organization
        const organizationData = orgSnapshot.data();
        const members = organizationData?.members || [];
        const admins = organizationData?.admins || [];

        if (members.includes(email) || admins.includes(email)) {
            throw new Error(`User is already a member of the organization`);
        }

        // Add the user to the organization's members or admins array
        await adminDb
            .collection("organizations")
            .doc(orgId)
            .set(
                access === "admin"
                    ? { admins: [...admins, email] }
                    : { members: [...members, email] }, // append the new email to the corresponding array
                { merge: true }, // use merge to only update the members or admins field without overwriting the document
            );

        await adminDb
            .collection("users")
            .doc(email)
            .collection("orgs")
            .doc(orgId)
            .set({
                userId: email,
                role: access,
                createdAt: Timestamp.now(),
                orgId,
            });

        return { success: true, message: "User invited successfully" };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

async function getCurrentUserEmail(): Promise<string | undefined> {
    const { sessionClaims } = await auth();
    if (sessionClaims?.email && typeof sessionClaims.email === "string") {
        return sessionClaims.email;
    }
    if (
        sessionClaims?.primaryEmailAddress &&
        typeof sessionClaims.primaryEmailAddress === "string"
    ) {
        return sessionClaims.primaryEmailAddress;
    }
    if (
        sessionClaims?.emailAddresses &&
        Array.isArray(sessionClaims.emailAddresses) &&
        sessionClaims.emailAddresses.length > 0
    ) {
        return sessionClaims.emailAddresses[0] as string;
    }
    try {
        const { currentUser } = await import("@clerk/nextjs/server");
        const user = await currentUser();
        return (
            user?.emailAddresses?.[0]?.emailAddress ||
            user?.primaryEmailAddress?.emailAddress
        );
    } catch {
        return undefined;
    }
}

export async function setUserOnboardingSurvey(payload: OnboardingPayload): Promise<{
    success: boolean;
    message?: string;
    securityCode?: string;
}> {
    const { userId } = await auth();
    if (!userId) {
        return { success: false, message: "Unauthorized - no user ID" };
    }

    const userEmail = await getCurrentUserEmail();
    if (
        !userEmail ||
        typeof userEmail !== "string" ||
        userEmail.trim().length === 0
    ) {
        return {
            success: false,
            message: "Unauthorized - no valid email found.",
        };
    }

    try {
        if (!payload.phone?.trim()) {
            return { success: false, message: "Phone number is required." };
        }
        if (!payload.email?.trim()) {
            return { success: false, message: "Email is required." };
        }
        if (!payload.softSkills?.length) {
            return {
                success: false,
                message: "Please select at least one soft skill.",
            };
        }
        if (!payload.targetIndustry?.length) {
            return {
                success: false,
                message: "Please select at least one target industry.",
            };
        }

        const securityCodePlain = crypto
            .randomBytes(5)
            .toString("hex")
            .toUpperCase();
        const securityCodeHash = crypto
            .createHash("sha256")
            .update(securityCodePlain)
            .digest("hex");

        const onboardingSurveyResponse = [
            payload.softSkills.join(","),
            payload.targetIndustry.join(","),
            payload.aspirations?.trim() || "",
        ];

        await adminDb.collection("users").doc(userEmail).set(
            {
                phone: payload.phone.trim(),
                phoneVerified: false,
                backupPhones: payload.backupPhones?.filter(Boolean) || [],
                email: payload.email.trim(),
                securityCodeBackup: securityCodeHash,
                softSkills: payload.softSkills,
                targetIndustry: payload.targetIndustry,
                aspirations: payload.aspirations?.trim() || null,
                notificationPreference: payload.notificationPreference,
                notificationPermissionGranted: payload.notificationPermissionGranted,
                onboardingSurveyResponse,
            },
            { merge: true },
        );

        return {
            success: true,
            securityCode: securityCodePlain,
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            message: (error as Error).message,
        };
    }
}

export async function setProjOnboardingSurvey(
    orgId: string,
    responses: string[],
) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
        throw new Error("Unauthorized - no user ID");
    }

    // 详细的调试信息 - 先看看 sessionClaims 里有什么
    // console.log("Debug setProjOnboardingSurvey - sessionClaims:", JSON.stringify(sessionClaims, null, 2));

    // 尝试多种方式获取用户邮箱
    let userEmail: string | undefined;

    // 检查 sessionClaims 中的各种可能的邮箱字段
    if (sessionClaims?.email && typeof sessionClaims.email === "string") {
        userEmail = sessionClaims.email;
    } else if (
        sessionClaims?.primaryEmailAddress &&
        typeof sessionClaims.primaryEmailAddress === "string"
    ) {
        userEmail = sessionClaims.primaryEmailAddress;
    } else if (
        sessionClaims?.emailAddresses &&
        Array.isArray(sessionClaims.emailAddresses) &&
        sessionClaims.emailAddresses.length > 0
    ) {
        userEmail = sessionClaims.emailAddresses[0] as string;
    }

    // 如果仍然没有邮箱，尝试从 Clerk API 获取
    if (!userEmail) {
        try {
            const { currentUser } = await import("@clerk/nextjs/server");
            const user = await currentUser();
            // console.log(
            //     "Debug - currentUser:",
            //     JSON.stringify(
            //         {
            //             id: user?.id,
            //             emailAddresses: user?.emailAddresses?.map(
            //                 (ea) => ea.emailAddress,
            //             ),
            //             primaryEmailAddress:
            //                 user?.primaryEmailAddress?.emailAddress,
            //         },
            //         null,
            //         2,
            //     ),
            // );

            userEmail =
                user?.emailAddresses?.[0]?.emailAddress ||
                user?.primaryEmailAddress?.emailAddress;
        } catch (clerkError) {
            console.error("Failed to get user from Clerk:", clerkError);
        }
    }

    // 最终的调试信息
    // console.log("Debug setProjOnboardingSurvey - final values:", {
    //     userId,
    //     userEmail,
    //     orgId,
    //     responsesLength: responses?.length,
    //     hasValidEmail:
    //         !!userEmail &&
    //         typeof userEmail === "string" &&
    //         userEmail.length > 0,
    // );

    if (
        !userEmail ||
        typeof userEmail !== "string" ||
        userEmail.trim().length === 0
    ) {
        console.error("Authentication failed: no valid email found");
        throw new Error(
            `Unauthorized - no valid email found. Got: ${userEmail}`,
        );
    }

    try {
        // Check if any of the responses are empty
        if (responses.some((r) => r === "")) {
            throw new Error("Please answer all questions!");
        }

        // console.log("About to save to path:",`users/${userEmail}/orgs/${orgId}`);

        await adminDb
            .collection("users")
            .doc(userEmail.trim())
            .collection("orgs")
            .doc(orgId)
            .set(
                {
                    projOnboardingSurveyResponse: responses,
                },
                { merge: true },
            );

        // console.log("Successfully saved survey response");
        return { success: true };
    } catch (error) {
        console.error("setProjOnboardingSurvey error:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function updateProjects(orgId: string, groups: string[][]) {
    const { sessionClaims } = await auth();

    // 尝试多种方式获取用户邮箱
    let userId: string | undefined;

    if (sessionClaims?.email && typeof sessionClaims.email === "string") {
        userId = sessionClaims.email;
    } else if (
        sessionClaims?.primaryEmailAddress &&
        typeof sessionClaims.primaryEmailAddress === "string"
    ) {
        userId = sessionClaims.primaryEmailAddress;
    } else if (
        sessionClaims?.emailAddresses &&
        Array.isArray(sessionClaims.emailAddresses) &&
        sessionClaims.emailAddresses.length > 0
    ) {
        userId = sessionClaims.emailAddresses[0] as string;
    }

    if (!userId) {
        try {
            const { currentUser } = await import("@clerk/nextjs/server");
            const user = await currentUser();
            userId =
                user?.emailAddresses?.[0]?.emailAddress ||
                user?.primaryEmailAddress?.emailAddress;
        } catch (clerkError) {
            console.error("Failed to get user from Clerk:", clerkError);
        }
    }

    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        throw new Error(`Unauthorized - no valid email found. Got: ${userId}`);
    }
    try {
        groups.map(async (group, index) => {
            const projectRef = await adminDb.collection("projects").add({
                orgId: orgId,
                title: `Project ${index + 1}`,
                members: group,
                admins: [userId],
            });

            const projectId = projectRef.id;
            await projectRef.update({ projId: projectId });
            await adminDb
                .collection("organizations")
                .doc(orgId)
                .collection("projs")
                .doc(projectId)
                .set({
                    projId: projectId,
                    members: group,
                });
            group.map(async (user) => {
                await adminDb
                    .collection("users")
                    .doc(user)
                    .collection("projs")
                    .doc(projectId)
                    .set(
                        {
                            orgId: orgId,
                        },
                        { merge: true },
                    );
            });
        });
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

// 创建单个项目的函数
export async function createProject(
    orgId: string,
    projectTitle: string,
    members: string[] = [],
    admins: string[] = [],
) {
    const { sessionClaims } = await auth();

    // 尝试多种方式获取用户邮箱
    let userId: string | undefined;

    if (sessionClaims?.email && typeof sessionClaims.email === "string") {
        userId = sessionClaims.email;
    } else if (
        sessionClaims?.primaryEmailAddress &&
        typeof sessionClaims.primaryEmailAddress === "string"
    ) {
        userId = sessionClaims.primaryEmailAddress;
    } else if (
        sessionClaims?.emailAddresses &&
        Array.isArray(sessionClaims.emailAddresses) &&
        sessionClaims.emailAddresses.length > 0
    ) {
        userId = sessionClaims.emailAddresses[0] as string;
    }

    if (!userId) {
        try {
            const { currentUser } = await import("@clerk/nextjs/server");
            const user = await currentUser();
            userId =
                user?.emailAddresses?.[0]?.emailAddress ||
                user?.primaryEmailAddress?.emailAddress;
        } catch (clerkError) {
            console.error("Failed to get user from Clerk:", clerkError);
        }
    }

    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        throw new Error(`Unauthorized - no valid email found. Got: ${userId}`);
    }

    try {
        if (!projectTitle || projectTitle.trim().length === 0) {
            throw new Error("Project title cannot be empty");
        }

        // 验证组织是否存在
        const orgDoc = await adminDb
            .collection("organizations")
            .doc(orgId)
            .get();
        if (!orgDoc.exists) {
            throw new Error("Organization not found");
        }

        // 从组织文档中获取完整的管理员列表
        const orgData = orgDoc.data();
        const orgAdmins = orgData?.admins || [];
        
        // 合并传入的 admins 和组织文档中的 admins，确保所有管理员都被包含
        const allAdminsSet = new Set([...orgAdmins, ...admins]);
        const mergedAdmins = Array.from(allAdminsSet);
        
        // 确保当前用户也在管理员列表中
        const finalAdmins = mergedAdmins.includes(userId) ? mergedAdmins : [...mergedAdmins, userId];
        const finalTeamSize = finalAdmins.length + members.length;

        // 创建项目文档
        const projectData: any = {
            orgId: orgId,
            title: projectTitle.trim(),
            members: members,
            admins: finalAdmins,
            teamSize: finalTeamSize,
            createdAt: Timestamp.now(),
        };
        
        const projectRef = await adminDb.collection("projects").add(projectData);

        const projectId = projectRef.id;

        await projectRef.update({ projId: projectId });

        await adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("projs")
            .doc(projectId)
            .set({
                projId: projectId,
                title: projectTitle.trim(),
                members: members,
                admins: finalAdmins,
                teamSize: finalTeamSize,
                createdAt: Timestamp.now(),
            });

        // 为创建者添加项目引用
        await adminDb
            .collection("users")
            .doc(userId)
            .collection("projs")
            .doc(projectId)
            .set({orgId: orgId,},
                { merge: true },
            );

        // 为所有管理员添加项目引用
        for (const adminEmail of finalAdmins) {
            try {
                await adminDb
                    .collection("users")
                    .doc(adminEmail)
                    .collection("projs")
                    .doc(projectId)
                    .set({orgId: orgId,},{ merge: true },);
            } catch (error) {
                console.error(
                    `Failed to add project reference for admin ${adminEmail}:`,
                    error,
                );
            }
        }

        // 为所有成员添加项目引用
        for (const memberEmail of members) {
            try {
                await adminDb
                    .collection("users")
                    .doc(memberEmail)
                    .collection("projs")
                    .doc(projectId)
                    .set(
                        {
                            orgId: orgId,
                        },
                        { merge: true },
                    );
            } catch (error) {
                console.error(
                    `Failed to add project reference for user ${memberEmail}:`,
                    error,
                );
            }
        }

        return {
            success: true,
            projectId: projectId,
            message: "Project created successfully",
        };
    } catch (error) {
        console.error("Error creating project:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function setTeamCharter(
    projId: string,
    teamCharterResponse: string[],
) {
    const { sessionClaims } = await auth();

    // 尝试多种方式获取用户邮箱
    let userId: string | undefined;

    if (sessionClaims?.email && typeof sessionClaims.email === "string") {
        userId = sessionClaims.email;
    } else if (
        sessionClaims?.primaryEmailAddress &&
        typeof sessionClaims.primaryEmailAddress === "string"
    ) {
        userId = sessionClaims.primaryEmailAddress;
    } else if (
        sessionClaims?.emailAddresses &&
        Array.isArray(sessionClaims.emailAddresses) &&
        sessionClaims.emailAddresses.length > 0
    ) {
        userId = sessionClaims.emailAddresses[0] as string;
    }

    if (!userId) {
        try {
            const { currentUser } = await import("@clerk/nextjs/server");
            const user = await currentUser();
            userId =
                user?.emailAddresses?.[0]?.emailAddress ||
                user?.primaryEmailAddress?.emailAddress;
        } catch (clerkError) {
            console.error("Failed to get user from Clerk:", clerkError);
        }
    }

    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        throw new Error(`Unauthorized - no valid email found. Got: ${userId}`);
    }
    try {
        if (!teamCharterResponse) {
            throw new Error("Team charter cannot be empty!");
        }

        await adminDb.collection("projects").doc(projId).set(
            {
                teamCharterResponse: teamCharterResponse,
            },
            { merge: true },
        );
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function updateStagesTasks(
    projId: string,
    structure: GeneratedTasks,
): Promise<{ success: boolean; message?: string }> {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        if (!structure) {
            throw new Error("Invalid stages and tasks structure!");
        }

        const batch = adminDb.batch();
        structure.stages.forEach((stage, stageIndex) => {
            const stageRef = adminDb
                .collection("projects")
                .doc(projId)
                .collection("stages")
                .doc();
            batch.set(stageRef, {
                title: stage.stage_name,
                id: stageRef.id,
                order: stageIndex,
                totalTasks: stage.tasks.length,
                tasksCompleted: 0,
            });

            stage.tasks.forEach((task, taskIndex) => {
                const taskRef = stageRef.collection("tasks").doc();
                batch.set(taskRef, {
                    title: task.task_name,
                    description: task.task_description,
                    assignee: task.assigned_member || "", // Use AI-assigned member
                    assignment_reason: task.assignment_reason || "", // Store assignment reasoning
                    id: taskRef.id,
                    order: taskIndex,
                    soft_deadline: task.soft_deadline,
                    hard_deadline: task.hard_deadline,
                    isCompleted: false,
                    // 任务池相关字段 - if assigned, mark as assigned
                    status: task.assigned_member ? "assigned" : "available",
                    points: 10,
                    completion_percentage: 0,
                    canBeReassigned: true,
                    // Add assigned timestamp if task is pre-assigned
                    ...(task.assigned_member && { assigned_at: Timestamp.now() }),
                });
            });
        });
        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function setTaskComplete(
    projId: string,
    stageId: string,
    taskId: string,
    isCompleted: boolean,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }
    try {
        const taskRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc(taskId);
        const stageRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId);

        const batch = adminDb.batch();
        batch.set(taskRef, { isCompleted: isCompleted }, { merge: true });

        const stageDoc = await stageRef.get();
        const stageData = stageDoc.data() as Stage;
        const tasksCompleted = isCompleted
            ? stageData.tasksCompleted + 1
            : stageData.tasksCompleted - 1;
        batch.set(stageRef, { tasksCompleted }, { merge: true });

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function postComment(
    isPublic: boolean,
    projId: string,
    stageId: string,
    taskId: string,
    message: string,
    time: Timestamp,
    uid: string,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }
    try {
        const newCommentRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc(taskId)
            .collection(isPublic ? "public" : "private")
            .doc();
        await newCommentRef.set({
            message: message,
            msgId: newCommentRef.id,
            time: JSON.parse(JSON.stringify(time)),
            uid: uid,
        });
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function updateStages(
    projId: string,
    stageUpdates: Stage[],
    stagesToDelete: string[],
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const batch = adminDb.batch();
        const projRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages");

        stageUpdates.forEach((stage: Stage) => {
            // add new stages
            if (stage.id === "-1") {
                const newStageRef = projRef.doc();
                batch.set(newStageRef, {
                    title: stage.title,
                    id: newStageRef.id,
                    order: stage.order,
                    totalTasks: 0,
                    tasksCompleted: 0,
                });
            } else {
                batch.set(
                    projRef.doc(stage.id),
                    { order: stage.order, title: stage.title },
                    { merge: true },
                );
            }
        });

        // delete stages
        stagesToDelete.forEach((stageId: string) => {
            batch.delete(projRef.doc(stageId));
        });

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function createTask(
    projId: string,
    stageId: string,
    title: string,
    description: string,
    softDeadline: string,
    hardDeadline: string,
    points: number
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const taskRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc();

        const defaultTask = {
            title,
            description,
            assignee: "",
            id: taskRef.id,
            order: 0, // Update this if ordering logic is required
            isCompleted: false,
            status: "available",
            points: 10,
            completion_percentage: 0,
            can_be_reassigned: true,
            soft_deadline: softDeadline,
            hard_deadline: hardDeadline,
        };

        await taskRef.set(defaultTask);

        const stageRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId);
        const stageDoc = await stageRef.get();
        const stageData = stageDoc.data() as Stage;
        const totalTasks = stageData.totalTasks + 1;

        await stageRef.set({ totalTasks }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function deleteTask(
    projId: string,
    stageId: string,
    taskId: string,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const taskRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc(taskId);
        const stageRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId);

        const batch = adminDb.batch();
        batch.delete(taskRef);

        const stageDoc = await stageRef.get();
        const stageData = stageDoc.data() as Stage;
        const totalTasks = stageData.totalTasks - 1;
        const tasksCompleted =
            stageData.tasksCompleted - (stageData.tasksCompleted > 0 ? 1 : 0);

        batch.set(stageRef, { totalTasks, tasksCompleted }, { merge: true });

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function updateTask(
    projId: string,
    stageId: string,
    taskId: string,
    title: string,
    description: string,
    soft_deadline: string,
    hard_deadline: string,
    points?: number,
    completion_percentage?: number
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const updateData: any = {
            title,
            description,
            soft_deadline,
            hard_deadline,
        };

        // 如果提供了积分，则更新积分
        if (points !== undefined && points > 0) {
            updateData.points = points;
        }
        if (completion_percentage !== undefined) {
            updateData.completion_percentage = completion_percentage;
        }

        await adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc(taskId)
            .set(updateData, { merge: true });

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function updateProjectTitle(projId: string, newTitle: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        if (!newTitle) {
            throw new Error("Project title cannot be empty!");
        }

        await adminDb.collection("projects").doc(projId).set(
            {
                title: newTitle,
            },
            { merge: true },
        );

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getStageLockStatus(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const stagesSnapshot = await adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .orderBy("order")
            .get();
        const stages = stagesSnapshot.docs.map((doc) => doc.data() as Stage);

        const locked: boolean[] = stages.map((stage, index) => {
            if (index === 0) return false; // First stage is never locked
            return (
                stages[index - 1].tasksCompleted < stages[index - 1].totalTasks
            );
        });

        return locked;
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function searchPexelsImages(searchQuery: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const response = await axios.get("https://api.pexels.com/v1/search", {
            headers: { Authorization: process.env.PEXELS_API_KEY },
            params: { query: searchQuery, per_page: 9 },
        });

        const imageUrls = response.data.photos.map(
            (photo: any) => photo.src.original,
        );
        return { success: true, urls: imageUrls };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

export async function setBgImage(orgId: string, imageUrl: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        if (!imageUrl) {
            throw new Error("Image URL cannot be empty!");
        }

        await adminDb.collection("organizations").doc(orgId).set(
            {
                backgroundImage: imageUrl,
            },
            { merge: true },
        );

        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}


export async function getProjectMembersResponses(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // Get project data
        const projectDoc = await adminDb
            .collection("projects")
            .doc(projId)
            .get();
        if (!projectDoc.exists) {
            throw new Error("Project not found");
        }

        const projectData = projectDoc.data();
        const allMembers = [
            ...(projectData?.members || []),
            ...(projectData?.adminsAsUsers || []),
        ];
        
        // 去重，确保没有重复的成员
        const members = [...new Set(allMembers)];
        
        // console.log("Project members before deduplication:", allMembers);
        // console.log("Project members after deduplication:", members);

        if (members.length === 0) {
            return { success: true, data: [] };
        }

        // Get all project members' onboardingSurveyResponse and projOnboardingSurveyResponse
        const memberResponses = await Promise.all(
            members.map(async (memberEmail) => {
                try {
                    // Get user's general onboarding responses
                    const userDoc = await adminDb
                        .collection("users")
                        .doc(memberEmail)
                        .get();
                    
                    if (!userDoc.exists) {
                        // console.log(`User document not found for: ${memberEmail}`);
                        return null;
                    }
                    
                    const userData = userDoc.data();
                    const onboardingResponses = userData?.onboardingSurveyResponse || [];
                    
                    // Get project-specific onboarding responses from users/{email}/orgs/{orgId}
                    // We need to find the orgId for this project
                    const projectDoc = await adminDb
                        .collection("projects")
                        .doc(projId)
                        .get();
                    
                    if (!projectDoc.exists) {
                        // console.log(`Project document not found for: ${projId}`);
                        return null;
                    }
                    
                    const projectData = projectDoc.data();
                    const orgId = projectData?.orgId;
                    
                    if (!orgId) {
                        // console.log(`No orgId found for project: ${projId}`);
                        return null;
                    }
                    
                    // Get project onboarding responses from the correct path
                    const userOrgDoc = await adminDb
                        .collection("users")
                        .doc(memberEmail)
                        .collection("orgs")
                        .doc(orgId)
                        .get();
                    
                    let projResponses = [];
                    if (userOrgDoc.exists) {
                        const userOrgData = userOrgDoc.data();
                        projResponses = userOrgData?.projOnboardingSurveyResponse || [];
                        // console.log(`Found projResponses for ${memberEmail}:`, projResponses.length, "items");
                    } else {
                        // console.log(`No org document found for user ${memberEmail} in org ${orgId}`);
                    }
                    
                    return {
                        email: memberEmail,
                        onboardingResponses: onboardingResponses,
                        projResponses: projResponses,
                    };
                } catch (error) {
                    console.error(`Error getting responses for ${memberEmail}:`, error);
                    return null;
                }
            }),
        );

        // Filter out null values
        const validResponses = memberResponses.filter(
            (response) => response !== null,
        );

        return { success: true, data: validResponses };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
    }
}

// ================ 任务池管理系统 ================

export async function assignTask(
    projId: string,
    stageId: string,
    taskId: string,
    assigneeEmail: string,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // 验证输入
        if (!projId || !stageId || !taskId || !assigneeEmail) {
            throw new Error("All parameters are required");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(assigneeEmail)) {
            throw new Error("Invalid email format");
        }

        // 验证用户是否存在
        const userDoc = await adminDb
            .collection("users")
            .doc(assigneeEmail)
            .get();
        if (!userDoc.exists) {
            throw new Error("User not found");
        }

        // 验证任务是否存在和可分配
        const taskRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc(taskId);

        const taskDoc = await taskRef.get();
        if (!taskDoc.exists) {
            throw new Error("Task not found");
        }

        const taskData = taskDoc.data();
        if (taskData?.isCompleted) {
            throw new Error("Cannot assign completed task");
        }

        if (taskData?.assignee && taskData.assignee !== assigneeEmail) {
            throw new Error("Task is already assigned to another user");
        }

        // 更新任务分配信息
        await taskRef.update({
            assignee: assigneeEmail,
            status: "assigned",
            assigned_at: Timestamp.now(),
            points: taskData?.points || 10,
            completion_percentage: 0,
            can_be_reassigned: true,
        });

        // 更新用户任务统计
        await updateUserTaskStats(assigneeEmail, projId, "assigned");

        return { success: true, message: "Task assigned successfully" };
    } catch (error) {
        console.error("Error assigning task:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function completeTaskWithProgress(
    projId: string,
    stageId: string,
    taskId: string,
    completionPercentage: number = 100,
) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
        throw new Error("Unauthorized - no user ID");
    }

    // 尝试多种方式获取用户邮箱
    let userEmail: string | undefined;

    if (sessionClaims?.email && typeof sessionClaims.email === "string") {
        userEmail = sessionClaims.email;
    } else if (
        sessionClaims?.primaryEmailAddress &&
        typeof sessionClaims.primaryEmailAddress === "string"
    ) {
        userEmail = sessionClaims.primaryEmailAddress;
    } else if (
        sessionClaims?.emailAddresses &&
        Array.isArray(sessionClaims.emailAddresses) &&
        sessionClaims.emailAddresses.length > 0
    ) {
        userEmail = sessionClaims.emailAddresses[0] as string;
    }

    if (!userEmail) {
        try {
            const { currentUser } = await import("@clerk/nextjs/server");
            const user = await currentUser();
            userEmail =
                user?.emailAddresses?.[0]?.emailAddress ||
                user?.primaryEmailAddress?.emailAddress;
        } catch (clerkError) {
            console.error("Failed to get user from Clerk:", clerkError);
        }
    }

    if (
        !userEmail ||
        typeof userEmail !== "string" ||
        userEmail.trim().length === 0
    ) {
        throw new Error(
            `Unauthorized - no valid email found. Got: ${userEmail}`,
        );
    }

    try {
        if (completionPercentage < 0 || completionPercentage > 100) {
            throw new Error("Completion percentage must be between 0 and 100");
        }

        const taskRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc(taskId);

        const taskDoc = await taskRef.get();
        if (!taskDoc.exists) {
            throw new Error("Task not found");
        }

        const taskData = taskDoc.data();
        if (taskData?.assignee !== userEmail) {
            throw new Error("Task not assigned to this user");
        }

        if (taskData?.isCompleted) {
            throw new Error("Task is already completed");
        }

        const isCompleted = completionPercentage >= 100;

        // 更新任务状态
        await taskRef.update({
            isCompleted: isCompleted,
            status: isCompleted ? "completed" : "in_progress",
            completion_percentage: completionPercentage,
            ...(isCompleted && { completed_at: Timestamp.now() }),
        });

        let pointsEarned = 0;

        // 如果任务完成，更新阶段进度和用户积分
        if (isCompleted) {
            // 更新阶段统计
            const stageRef = adminDb
                .collection("projects")
                .doc(projId)
                .collection("stages")
                .doc(stageId);

            const stageDoc = await stageRef.get();
            const stageData = stageDoc.data();

            if (stageData) {
                const tasksCompleted = stageData.tasksCompleted + 1;
                await stageRef.update({ tasksCompleted });
            }

            // 更新用户积分
            pointsEarned = taskData?.points || 10;
            await updateUserScore(userEmail, projId, pointsEarned, true);
            await updateUserTaskStats(userEmail, projId, "completed");
        }

        return {
            success: true,
            points_earned: pointsEarned,
            message: isCompleted
                ? "Task completed successfully"
                : "Progress updated",
        };
    } catch (error) {
        console.error("Error completing task:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function submitTask(
    projId: string,
    stageId: string,
    taskId: string,
    content: string,
) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
        throw new Error("Unauthorized - no user ID");
    }

    // 尝试多种方式获取用户邮箱
    let userEmail: string | undefined;

    if (sessionClaims?.email && typeof sessionClaims.email === "string") {
        userEmail = sessionClaims.email;
    } else if (
        sessionClaims?.primaryEmailAddress &&
        typeof sessionClaims.primaryEmailAddress === "string"
    ) {
        userEmail = sessionClaims.primaryEmailAddress;
    } else if (
        sessionClaims?.emailAddresses &&
        Array.isArray(sessionClaims.emailAddresses) &&
        sessionClaims.emailAddresses.length > 0
    ) {
        userEmail = sessionClaims.emailAddresses[0] as string;
    }

    if (!userEmail) {
        try {
            const { currentUser } = await import("@clerk/nextjs/server");
            const user = await currentUser();
            userEmail =
                user?.emailAddresses?.[0]?.emailAddress ||
                user?.primaryEmailAddress?.emailAddress;
        } catch (clerkError) {
            console.error("Failed to get user from Clerk:", clerkError);
        }
    }

    if (
        !userEmail ||
        typeof userEmail !== "string" ||
        userEmail.trim().length === 0
    ) {
        throw new Error(
            `Unauthorized - no valid email found. Got: ${userEmail}`,
        );
    }

    try {
        if (!content || content.trim().length === 0) {
            throw new Error("Submission content cannot be empty");
        }

        const taskRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc(taskId);

        const taskDoc = await taskRef.get();
        if (!taskDoc.exists) {
            throw new Error("Task not found");
        }

        const taskData = taskDoc.data();
        if (taskData?.assignee !== userEmail) {
            throw new Error("You can only submit your own assigned tasks");
        }

        // 创建提交记录
        const submissionRef = taskRef.collection("submissions").doc();
        await submissionRef.set({
            user_email: userEmail,
            content: content.trim(),
            submitted_at: Timestamp.now(),
        });

        return {
            success: true,
            submission_id: submissionRef.id,
            message: "Task submitted successfully",
        };
    } catch (error) {
        console.error("Error submitting task:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getTaskSubmissions(
    projId: string,
    stageId: string,
    taskId: string,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const submissionsSnapshot = await adminDb
            .collection("projects").doc(projId)
            .collection("stages").doc(stageId)
            .collection("tasks").doc(taskId)
            .collection("submissions")
            .orderBy("submitted_at", "desc")
            .get();

        const submissions = submissionsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                user_email: data.user_email,
                content: data.content,
                // Convert Timestamp to plain object
                submitted_at: data.submitted_at ? {
                    _seconds: data.submitted_at.seconds,
                    _nanoseconds: data.submitted_at.nanoseconds
                } : null,
            };
        });

        return {
            success: true,
            data: submissions,
            message: "Submissions retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting task submissions:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getOverdueTasks(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const now = new Date();
        const stages = await adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .orderBy("order")
            .get();

        const overdueTasks: any[] = [];

        for (const stageDoc of stages.docs) {
            const tasks = await stageDoc.ref
                .collection("tasks")
                .orderBy("order")
                .get();

            for (const taskDoc of tasks.docs) {
                const taskData = taskDoc.data();

                if (
                    !taskData.isCompleted &&
                    taskData.soft_deadline &&
                    new Date(taskData.soft_deadline) < now &&
                    !taskData.assignee
                ) {
                    overdueTasks.push({
                        id: taskDoc.id,
                        stage_id: stageDoc.id,
                        stage_title: stageDoc.data()?.title,
                        ...taskData,
                    });
                }
            }
        }

        return {
            success: true,
            tasks: JSON.parse(JSON.stringify(overdueTasks)),
            message: "Overdue tasks retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting overdue tasks:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getAvailableTasks(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const stages = await adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .orderBy("order")
            .get();

        const availableTasks: any[] = [];

        for (const stageDoc of stages.docs) {
            const tasks = await stageDoc.ref
                .collection("tasks")
                .where("status", "in", ["available", "overdue"])
                .orderBy("order")
                .get();

            for (const taskDoc of tasks.docs) {
                const taskData = taskDoc.data();
                if (!taskData.assignee || taskData.can_be_reassigned) {
                    availableTasks.push({
                        id: taskDoc.id,
                        stage_id: stageDoc.id,
                        stage_title: stageDoc.data()?.title,
                        ...taskData,
                    });
                }
            }
        }

        return {
            success: true,
            tasks: JSON.parse(JSON.stringify(availableTasks)),
            message: "Available tasks retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting available tasks:", error);
        return { success: false, message: (error as Error).message };
    }
}

// ================ 用户积分系统 ================

export async function getUserScore(userEmail: string, projectId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const scoresQuery = await adminDb
            .collection("user_scores")
            .where("user_email", "==", userEmail)
            .where("project_id", "==", projectId)
            .get();

        if (scoresQuery.empty) {
            return {
                success: true,
                data: {
                    user_email: userEmail,
                    project_id: projectId,
                    total_points: 0,
                    tasks_completed: 0,
                    tasks_assigned: 0,
                    average_completion_time: 0,
                    streak: 0,
                    last_updated: Timestamp.now(),
                },
                message: "Default score returned for new user",
            };
        }

        const scoreDoc = scoresQuery.docs[0];
        const data = scoreDoc.data();
        const scoreData = {
            id: scoreDoc.id,
            user_email: data.user_email,
            project_id: data.project_id,
            total_points: data.total_points,
            tasks_completed: data.tasks_completed,
            tasks_assigned: data.tasks_assigned,
            average_completion_time: data.average_completion_time,
            streak: data.streak,
            // Convert Timestamp to plain object
            last_updated: data.last_updated ? {
                _seconds: data.last_updated.seconds,
                _nanoseconds: data.last_updated.nanoseconds
            } : null,
        };

        return {
            success: true,
            data: scoreData,
            message: "User score retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting user score:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getProjectLeaderboard(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const projectDoc = await adminDb
            .collection("projects")
            .doc(projId)
            .get();

        if (!projectDoc.exists) {
            throw new Error("Project not found");
        }

        const projectData = projectDoc.data();
        const allMembers = [
            ...(projectData?.members || []),
            ...(projectData?.adminsAsUsers || []),
        ];

        const scores = await adminDb
            .collection("user_scores")
            .where("project_id", "==", projId)
            .orderBy("total_points", "desc")
            .limit(50)
            .get();

        const scoreMap = new Map();
        scores.docs.forEach((doc) => {
            const data = doc.data();
            scoreMap.set(data.user_email, {
                id: doc.id,
                user_email: data.user_email,
                project_id: data.project_id,
                total_points: data.total_points,
                tasks_completed: data.tasks_completed,
                tasks_assigned: data.tasks_assigned,
                average_completion_time: data.average_completion_time,
                streak: data.streak,
                last_updated: data.last_updated ? {
                    _seconds: data.last_updated.seconds,
                    _nanoseconds: data.last_updated.nanoseconds
                } : null,
            });
        });

        const leaderboard = allMembers.map((email) => {
            const existingScore = scoreMap.get(email);
            if (existingScore) {
                return existingScore;
            } else {
                //give them a default score of 0
                return {
                    id: `default_${email}_${projId}`,
                    user_email: email,
                    project_id: projId,
                    total_points: 0,
                    tasks_completed: 0,
                    tasks_assigned: 0,
                    average_completion_time: 0,
                    streak: 0,
                    last_updated: null,
                };
            }
        });

        leaderboard.sort((a, b) => b.total_points - a.total_points);

        return {
            success: true,
            leaderboard,
            message: "Leaderboard retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting project leaderboard:", error);

        // 如果是索引错误，返回空的排行榜而不是错误
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        const errorDetails = (error as any)?.details || "";

        if (
            errorMessage.includes("The query requires an index") ||
            errorMessage.includes("FAILED_PRECONDITION") ||
            errorDetails.includes("The query requires an index")
        ) {
            // console.log("Returning empty leaderboard due to missing index");
            return {
                success: true,
                leaderboard: [],
                message:
                    "Leaderboard is currently unavailable due to missing database index. Please contact your administrator.",
            };
        }

        return { success: false, message: errorMessage };
    }
}

export async function getProjectStats(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const stages = await adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .get();

        let totalTasks = 0;
        let completedTasks = 0;
        let assignedTasks = 0;
        let availableTasks = 0;
        let overdueTasks = 0;

        const now = new Date();

        for (const stageDoc of stages.docs) {
            const tasks = await stageDoc.ref.collection("tasks").get();

            for (const taskDoc of tasks.docs) {
                const taskData = taskDoc.data();
                totalTasks++;

                if (taskData.isCompleted) {
                    completedTasks++;
                } else if (taskData.assignee) {
                    assignedTasks++;

                    // 检查是否过期
                    if (
                        taskData.soft_deadline &&
                        new Date(taskData.soft_deadline) < now
                    ) {
                        overdueTasks++;
                    }
                } else {
                    availableTasks++;
                }
            }
        }

        const stats = {
            totalTasks,
            completedTasks,
            assignedTasks,
            availableTasks,
            overdueTasks,
            completionRate:
                totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            stageCount: stages.size,
        };

        return {
            success: true,
            data: stats,
            message: "Project stats retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting project stats:", error);
        return { success: false, message: (error as Error).message };
    }
}


async function findOrgProject(orgId: string, projId: string) {
    try {
        // 直接使用文档 ID 获取文档（因为文档 ID 就是 projId）
        const orgProjectRef = adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("projs")
            .doc(projId);
        
        const orgProjectDoc = await orgProjectRef.get();
        
        if (!orgProjectDoc.exists) {
            // 如果直接获取失败，尝试使用查询（向后兼容旧数据）
            const orgProjectsQuery = adminDb
                .collection("organizations")
                .doc(orgId)
                .collection("projs")
                .where("projId", "==", projId);
            const orgProjectsSnapshot = await orgProjectsQuery.get();
            
            if (orgProjectsSnapshot.empty) {
                return null;
            }
            
            const fallbackDoc = orgProjectsSnapshot.docs[0];
            return {
                doc: fallbackDoc,
                ref: fallbackDoc.ref,
                data: fallbackDoc.data()
            };
        }
        
        return {
            doc: orgProjectDoc,
            ref: orgProjectRef,
            data: orgProjectDoc.data()
        };
    } catch (error) {
        console.error(`Error finding org project ${projId} in org ${orgId}:`, error);
        return null;
    }
}

export async function addProjectMember(
    projId: string,
    userEmail: string,
    role: "admin" | "member" = "member",
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            console.error("Auth failed: No userId");
            return { success: false, message: "Unauthorized - Please sign in again" };
        }

        // console.log(`Adding member: ${userEmail} to project: ${projId} with role: ${role}`);

        // Check if user exists
        const userDoc = await adminDb.collection("users").doc(userEmail).get();
        if (!userDoc.exists) {
            console.error(`User not found: ${userEmail}`);
            return { success: false, message: `User with email ${userEmail} not found` };
        }

        // First get the project from the projects collection to get orgId
        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            console.error(`Project not found: ${projId}`);
            return { success: false, message: "Project not found" };
        }

        const projectData = projectDoc.data();
        const orgId = projectData?.orgId;
        
        if (!orgId) {
            console.error(`No orgId found for project: ${projId}`);
            return { success: false, message: "Project organization not found" };
        }

        // Now work with the organization's subcollection
        const orgProject = await findOrgProject(orgId, projId);
        if (!orgProject) {
            console.error(`Project not found in organization subcollection: ${projId}`);
            return { success: false, message: "Project not found in organization" };
        }

        const orgProjectRef = orgProject.ref;
        const orgProjectData = orgProject.data;
        const currentMembers = orgProjectData?.members || [];
        const currentAdmins = orgProjectData?.admins || [];

        // Check if user is already a member
        const isAlreadyMember = currentMembers.includes(userEmail) || currentAdmins.includes(userEmail);
        if (isAlreadyMember) {
            return { success: false, message: "User is already a member of this project" };
        }

        // Check team capacity before adding
        const teamSize = orgProjectData?.teamSize || projectData?.teamSize || 3; // Default to 3 if not set
        const currentTotalMembers = currentMembers.length + currentAdmins.length;
        
        if (currentTotalMembers >= teamSize) {
            return { 
                success: false, 
                message: `Project is full (${currentTotalMembers}/${teamSize} members). Cannot add more members.` 
            };
        }

        // Add user to project in both collections
        if (role === "admin") {
            const updatedAdmins = [...currentAdmins, userEmail];
            await Promise.all([
                projectRef.update({
                    admins: updatedAdmins,
                }),
                orgProjectRef.update({
                    admins: updatedAdmins,
                })
            ]);
        } else {
            const updatedMembers = [...currentMembers, userEmail];
            await Promise.all([
                projectRef.update({
                    members: updatedMembers,
                }),
                orgProjectRef.update({
                    members: updatedMembers,
                })
            ]);
        }

        // Add project to user's projs collection
        try {
            await adminDb
                .collection("users")
                .doc(userEmail)
                .collection("projs")
                .doc(projId)
                .set(
                    {
                        orgId: projectData?.orgId,
                    },
                    { merge: true },
                );
        } catch (error) {
            console.error(`Failed to add project reference for user ${userEmail}:`, error);
            // Don't fail the entire operation if this fails
        }

        // console.log(`Successfully added ${userEmail} as ${role} to project ${projId}`);
        return {
            success: true,
            message: `User added as ${role} successfully`,
        };
    } catch (error) {
        console.error("Error adding project member:", error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : "An unexpected error occurred" 
        };
    }
}

// batch update project members
export async function updateProjectMembers(
    projId: string,
    memberEmails: string[],
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            throw new Error("Project not found");
        }

        const projectData = projectDoc.data();
        const orgId = projectData?.orgId;

        if (!orgId) {
            throw new Error("Project organization not found");
        }

        // Update both the main projects collection and organization subcollection
        const orgProjectRef = adminDb.collection("organizations").doc(orgId).collection("projs").doc(projId);
        
        await Promise.all([
            projectRef.update({
                members: memberEmails,
            }),
            orgProjectRef.update({
                members: memberEmails,
            })
        ]);

        // add the project to the new members' projs collection
        for (const memberEmail of memberEmails) {
            try {
                await adminDb
                    .collection("users")
                    .doc(memberEmail)
                    .collection("projs")
                    .doc(projId)
                    .set(
                        {
                            orgId: orgId,
                        },
                        { merge: true },
                    );
            } catch (error) {
                console.error(
                    `Failed to add project reference for user ${memberEmail}:`,
                    error,
                );
            }
        }

        return {
            success: true,
            message: "Project members updated successfully",
        };
    } catch (error) {
        console.error("Error updating project members:", error);
        return { success: false, message: (error as Error).message };
    }
}

// remove project member
export async function removeProjectMember(projId: string, userEmail: string) {
    try {
        const { userId } = await auth();
        if (!userId) {
            console.error("Auth failed: No userId");
            return { success: false, message: "Unauthorized - Please sign in again" };
        }

        // console.log(`Removing member: ${userEmail} from project: ${projId}`);

        // First get the project from the projects collection to get orgId
        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            console.error(`Project not found: ${projId}`);
            return { success: false, message: "Project not found" };
        }

        const projectData = projectDoc.data();
        const orgId = projectData?.orgId;
        
        if (!orgId) {
            console.error(`No orgId found for project: ${projId}`);
            return { success: false, message: "Project organization not found" };
        }

        // Now work with the organization's subcollection
        const orgProject = await findOrgProject(orgId, projId);
        if (!orgProject) {
            console.error(`Project not found in organization subcollection: ${projId}`);
            return { success: false, message: "Project not found in organization" };
        }

        const orgProjectRef = orgProject.ref;
        const orgProjectData = orgProject.data;
        const currentMembers = orgProjectData?.members || [];
        const currentAdmins = orgProjectData?.admins || [];


        // Remove user from the members and admins lists
        const updatedMembers = currentMembers.filter(
            (email: string) => email !== userEmail,
        );
        const updatedAdmins = currentAdmins.filter(
            (email: string) => email !== userEmail,
        );

        // Update both the main projects collection and organization subcollection
        await Promise.all([
            projectRef.update({
                members: updatedMembers,
                admins: updatedAdmins,
            }),
            orgProjectRef.update({
                members: updatedMembers,
                admins: updatedAdmins,
            })
        ]);

        // Remove the project from the user's projs collection
        try {
            await adminDb
                .collection("users")
                .doc(userEmail)
                .collection("projs")
                .doc(projId)
                .delete();
        } catch (error) {
            console.error(
                `Failed to remove project reference for user ${userEmail}:`,
                error,
            );
            // Don't fail the entire operation if this fails
        }

        // console.log(`Successfully removed ${userEmail} from project ${projId}`);
        return {
            success: true,
            message: "User removed from project successfully",
        };
    } catch (error) {
        console.error("Error removing project member:", error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : "An unexpected error occurred" 
        };
    }
}

// change project member role
export async function changeProjectMemberRole(
    projId: string,
    userEmail: string,
    newRole: "admin" | "member"
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            console.error("Auth failed: No userId");
            return { success: false, message: "Unauthorized - Please sign in again" };
        }

        // console.log(`Changing role for: ${userEmail} in project: ${projId} to: ${newRole}`);

        // First get the project from the projects collection to get orgId
        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            console.error(`Project not found: ${projId}`);
            return { success: false, message: "Project not found" };
        }

        const projectData = projectDoc.data();
        const orgId = projectData?.orgId;
        
        if (!orgId) {
            console.error(`No orgId found for project: ${projId}`);
            return { success: false, message: "Project organization not found" };
        }

        // Now work with the organization's subcollection
        const orgProject = await findOrgProject(orgId, projId);
        if (!orgProject) {
            console.error(`Project not found in organization subcollection: ${projId}`);
            return { success: false, message: "Project not found in organization" };
        }

        const orgProjectRef = orgProject.ref;
        const orgProjectData = orgProject.data;
        const currentMembers = orgProjectData?.members || [];
        const currentAdmins = orgProjectData?.admins || [];


        // Remove user from all lists first
        const updatedMembers = currentMembers.filter(
            (email: string) => email !== userEmail,
        );
        const updatedAdmins = currentAdmins.filter(
            (email: string) => email !== userEmail,
        );

        // Add user to the appropriate list based on new role
        if (newRole === "admin") {
            updatedAdmins.push(userEmail);
        } else {
            updatedMembers.push(userEmail);
        }

        // Update both the main projects collection and organization subcollection
        await Promise.all([
            projectRef.update({
                members: updatedMembers,
                admins: updatedAdmins,
            }),
            orgProjectRef.update({
                members: updatedMembers,
                admins: updatedAdmins,
            })
        ]);

        // console.log(`Successfully changed ${userEmail} role to ${newRole} in project ${projId}`);
        return {
            success: true,
            message: `User role changed to ${newRole} successfully`,
        };
    } catch (error) {
        console.error("Error changing project member role:", error);
        return { 
            success: false, 
            message: (error as Error).message 
        };
    }
}

// Temporary fix: Add user as admin to existing project
export async function fixProjectAdmin(
    projId: string,
    userEmail: string
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            console.error("Auth failed: No userId");
            return { success: false, message: "Unauthorized - Please sign in again" };
        }

        // console.log(`Fixing admin for project: ${projId}, adding user: ${userEmail}`);

        // Check if project exists
        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            console.error(`Project not found: ${projId}`);
            return { success: false, message: "Project not found" };
        }

        const projectData = projectDoc.data();
        const currentAdmins = projectData?.admins || [];

        // Check if user is already an admin
        if (currentAdmins.includes(userEmail)) {
            // console.log(`User ${userEmail} is already an admin`);
            return { success: true, message: "User is already an admin" };
        }

        // Add user to admins array
        await projectRef.update({
            admins: [...currentAdmins, userEmail],
        });

        // console.log(`Successfully added ${userEmail} as admin to project ${projId}`);
        return {
            success: true,
            message: "User added as admin successfully",
        };
    } catch (error) {
        console.error("Error fixing project admin:", error);
        return { 
            success: false, 
            message: (error as Error).message 
        };
    }
}

// update project team size
export async function updateProjectTeamSize(projId: string, teamSize: number) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        if (teamSize < 1 || teamSize > 20) {
            throw new Error("Team size must be between 1 and 20");
        }

        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            throw new Error("Project not found");
        }

        const projectData = projectDoc.data();
        const orgId = projectData?.orgId;

        if (!orgId) {
            throw new Error("Project organization not found");
        }

        // Get current member count from organization subcollection
        const orgProject = await findOrgProject(orgId, projId);
        if (!orgProject) {
            throw new Error("Project not found in organization");
        }

        const orgProjectRef = orgProject.ref;
        const orgProjectData = orgProject.data;

        // Update both the main projects collection and organization subcollection
        await Promise.all([
            projectRef.update({
                teamSize: teamSize,
            }),
            orgProjectRef.update({
                teamSize: teamSize,
            })
        ]);

        return {
            success: true,
            message: "Team size updated successfully",
        };
    } catch (error) {
        console.error("Error updating project team size:", error);
        return { success: false, message: (error as Error).message };
    }
}

// delete project
export async function deleteProject(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            throw new Error("Project not found");
        }

        const projectData = projectDoc.data();
        const orgId = projectData?.orgId;

        const batch = adminDb.batch();

        // Delete all stages and their tasks
        const stagesSnapshot = await projectRef.collection("stages").get();
        for (const stageDoc of stagesSnapshot.docs) {
            const tasksSnapshot = await stageDoc.ref.collection("tasks").get();
            for (const taskDoc of tasksSnapshot.docs) {
                batch.delete(taskDoc.ref);
            }
            batch.delete(stageDoc.ref);
        }

        // Delete the project document
        batch.delete(projectRef);

        // Remove project reference from organization
        if (orgId) {
            const orgProjsSnapshot = await adminDb
                .collection("organizations")
                .doc(orgId)
                .collection("projs")
                .where("projId", "==", projId)
                .get();
            
            orgProjsSnapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
        }

        // Remove project references from all users
        const allMembers = [...(projectData?.members || []), ...(projectData?.admins || [])];
        const uniqueMembers = [...new Set(allMembers)];
        
        for (const memberEmail of uniqueMembers) {
            try {
                const userProjRef = adminDb
                    .collection("users")
                    .doc(memberEmail)
                    .collection("projs")
                    .doc(projId);
                batch.delete(userProjRef);
            } catch (error) {
                console.warn(`Failed to remove project reference for user ${memberEmail}:`, error);
            }
        }

        await batch.commit();

        return {
            success: true,
            message: "Project deleted successfully",
        };
    } catch (error) {
        console.error("Error deleting project:", error);
        return { success: false, message: (error as Error).message };
    }
}

// Simple random matching helper used for temporary assignment without GPT
function randomMatching(availableMembers: Array<{ email: string }>, teamSize: number): string[] {
    const shuffled = [...availableMembers];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    return shuffled.slice(0, teamSize).map(m => m.email);
}

// Backtracking algorithm to find optimal allocation strategy
function findOptimalAllocationWithBacktracking(projects: any[], availableMembers: number) {
    // Generate all possible allocation scenarios
    const allocationScenarios = generateAllocationScenarios(projects, availableMembers);
    
    // Evaluate each scenario and find the optimal solution
    let bestScenario = null;
    let minTotalEmptySpots = Infinity;
    let maxFilledProjects = -1;
    
    for (let i = 0; i < allocationScenarios.length; i++) {
        const scenario = allocationScenarios[i];
        const evaluation = evaluateAllocationScenario(scenario, projects);
        
        // Priority: 1. More completely filled projects 2. Fewer total empty spots
        if (evaluation.filledProjects > maxFilledProjects || 
            (evaluation.filledProjects === maxFilledProjects && evaluation.totalEmptySpots < minTotalEmptySpots)) {
            bestScenario = scenario;
            minTotalEmptySpots = evaluation.totalEmptySpots;
            maxFilledProjects = evaluation.filledProjects;
        }
    }
    
    if (bestScenario) {
        return applyAllocationScenario(bestScenario, projects);
    }
    
    // Fallback to simple strategy
    return projects.sort((a, b) => b.spotsAvailable - a.spotsAvailable);
}

// Generate all possible allocation scenarios
function generateAllocationScenarios(projects: any[], availableMembers: number): number[][] {
    const scenarios: number[][] = [];
    
    // Recursively generate allocation scenarios
    function backtrack(projectIndex: number, allocation: number[], remainingMembers: number) {
        if (projectIndex === projects.length) {
            if (remainingMembers >= 0) {
                scenarios.push([...allocation]);
            }
            return;
        }
        
        const project = projects[projectIndex];
        const maxAssignable = Math.min(project.spotsAvailable, remainingMembers);
        
        // Try assigning 0 to maxAssignable members to current project
        for (let assign = 0; assign <= maxAssignable; assign++) {
            allocation[projectIndex] = assign;
            backtrack(projectIndex + 1, allocation, remainingMembers - assign);
        }
    }
    
    backtrack(0, [], availableMembers);
    return scenarios;
}

// Evaluate allocation scenario
function evaluateAllocationScenario(allocation: number[], projects: any[]) {
    let filledProjects = 0;
    let totalEmptySpots = 0;
    
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const assigned = allocation[i];
        const remaining = project.spotsAvailable - assigned;
        
        if (remaining === 0) {
            filledProjects++;
        }
        totalEmptySpots += remaining;
    }
    
    return { filledProjects, totalEmptySpots, allocation };
}

// Apply allocation scenario, return project processing order
function applyAllocationScenario(allocation: number[], projects: any[]) {
    const projectsWithAllocation = projects.map((project, index) => ({
        ...project,
        plannedAllocation: allocation[index]
    }));
    
    // Sort by allocation count descending, prioritize projects with more member allocations
    return projectsWithAllocation
        .filter(p => p.plannedAllocation > 0)
        .sort((a, b) => b.plannedAllocation - a.plannedAllocation);
}

// Preview smart assignment results without actually assigning
export async function previewSmartAssignment(orgId: string, teamSize?: number) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // Get the organization information
        const orgDoc = await adminDb
            .collection("organizations")
            .doc(orgId)
            .get();
        if (!orgDoc.exists) {
            throw new Error("Organization not found");
        }

        const orgData = orgDoc.data();
        const allMembers = [
            ...(orgData?.members || []),
            ...(orgData?.admins || []),
        ];

        // Get all the projects in the organization
        const projectsSnapshot = await adminDb
            .collection("projects")
            .where("orgId", "==", orgId)
            .get();

        if (projectsSnapshot.empty) {
            throw new Error("No projects found in this organization");
        }

        const projects = projectsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                members: data.members || [],
                title: data.title || "",
                teamSize: data.teamSize || teamSize,
                admins: data.admins || [],
                adminsAsUsers: data.adminsAsUsers || [], // 添加这一行
                ...data,
            };
        });

        // Calculate the current assigned members
        const assignedMembers = new Set();
        projects.forEach((project) => {
            const projectMembers = (project.members as string[]) || [];
            projectMembers.forEach((member: string) =>
                assignedMembers.add(member),
            );
        });

        // Get the unassigned members
        const unassignedMembers = allMembers.filter(
            (member) => !assignedMembers.has(member),
        );

        if (unassignedMembers.length === 0) {
            return {
                success: false,
                message: "No unassigned members to assign",
                preview: []
            };
        }

        // Get member survey data for unassigned members
        const memberSurveyData: any[] = [];
        for (const member of unassignedMembers) {
            try {
                const memberDoc = await adminDb
                    .collection("users")
                    .doc(member)
                    .get();
                if (memberDoc.exists) {
                    const memberData = memberDoc.data();
                    // Get project onboarding survey response
                    let projOnboardingSurveyResponse: string[] = [];
                    try {
                        const orgDoc = await adminDb
                            .collection("users")
                            .doc(member)
                            .collection("orgs")
                            .doc(orgId)
                            .get();
                        if (orgDoc.exists) {
                            projOnboardingSurveyResponse = orgDoc.data()?.projOnboardingSurveyResponse || [];
                        }
                    } catch (error) {
                        console.error(`Error fetching project survey for member ${member}:`, error);
                    }
                    
                    memberSurveyData.push({
                        email: member,
                        name: memberData?.fullName || member,
                        onboardingSurveyResponses: memberData?.onboardingSurveyResponse || [],
                        projOnboardingSurveyResponses: projOnboardingSurveyResponse,
                    });
                }
            } catch (error) {
                console.error(`Error fetching data for member ${member}:`, error);
                memberSurveyData.push({
                    email: member,
                    name: member,
                    onboardingSurveyResponses: [],
                    projOnboardingSurveyResponses: [],
                });
            }
        }

        // Calculate project requirements
        const projectsNeedingMembers = projects
            .map(project => {
                const currentMembers = (project.members as string[]) || [];
                const currentAdmins = ((project as any).admins as string[]) || [];
                const adminsAsUsers = ((project as any).adminsAsUsers as string[]) || [];
                const allCurrentMembers = [...new Set([...currentMembers, ...currentAdmins])];
                const projectTeamSize = project.teamSize || teamSize || 3;
                const spotsAvailable = projectTeamSize - allCurrentMembers.length;
                return {
                    ...project,
                    currentMembers: allCurrentMembers,
                    adminsAsUsers: adminsAsUsers, // 添加这一行，保存 adminsAsUsers
                    projectTeamSize,
                    spotsAvailable
                };
            })
            .filter(project => project.spotsAvailable > 0);

        if (projectsNeedingMembers.length === 0) {
            return {
                success: false,
                message: "All projects are already full",
                preview: []
            };
        }

        const totalSpotsNeeded = projectsNeedingMembers.reduce((sum, project) => sum + project.spotsAvailable, 0);
        const availableMembers = memberSurveyData.length;
        
        // Optimal allocation strategy: prioritize larger projects
        let optimalAllocation;
        if (availableMembers >= totalSpotsNeeded) {
            // If enough members, all projects can be filled completely - sort by project size descending
            optimalAllocation = projectsNeedingMembers.sort((a, b) => b.spotsAvailable - a.spotsAvailable);
        } else {
            // Not enough members, use backtracking algorithm for optimal allocation
            optimalAllocation = findOptimalAllocationWithBacktracking(projectsNeedingMembers, availableMembers);
        }

        // Run AI matching for each project to get actual smart assignments
        const preview = [];
        let remainingMembers = [...memberSurveyData]; // Create a copy

        for (const project of optimalAllocation) {
            if (project.spotsAvailable > 0 && remainingMembers.length > 0) {
                try {
                    // 判断是否应该考虑现有成员
                    const hasMembers = (project.members as string[])?.length > 0;
                    const hasAdminsAsUsers = ((project as any).adminsAsUsers as string[])?.length > 0;
                    const shouldConsiderExistingTeam = hasMembers || hasAdminsAsUsers;
                    
                    // Get existing project members' information (只在需要时获取)
                    const existingMembersData = [];
                    if (shouldConsiderExistingTeam) {
                        // 合并 members 和 adminsAsUsers（不包括纯 admins）
                        const membersToConsider = [
                            ...((project.members as string[]) || []),
                            ...(((project as any).adminsAsUsers as string[]) || [])
                        ];
                        
                        for (const memberEmail of membersToConsider) {
                            try {
                                const userDoc = await adminDb
                                    .collection("users")
                                    .doc(memberEmail)
                                    .get();
                                
                                if (userDoc.exists) {
                                    const userData = userDoc.data();
                                    const onboardingSurveyResponses = userData?.onboardingSurveyResponse || [];
                                    
                                    // Get project onboarding survey response
                                    let projOnboardingSurveyResponse: string[] = [];
                                    try {
                                        const orgDoc = await adminDb
                                            .collection("users")
                                            .doc(memberEmail)
                                            .collection("orgs")
                                            .doc(orgId)
                                            .get();
                                        if (orgDoc.exists) {
                                            projOnboardingSurveyResponse = orgDoc.data()?.projOnboardingSurveyResponse || [];
                                        }
                                    } catch (error) {
                                        console.error(`Error fetching project survey for existing member ${memberEmail}:`, error);
                                    }
                                    
                                    existingMembersData.push({
                                        email: memberEmail,
                                        name: userData?.fullName || memberEmail,
                                        onboardingSurveyResponses: onboardingSurveyResponses,
                                        projOnboardingSurveyResponses: projOnboardingSurveyResponse,
                                    });
                                }
                            } catch (error) {
                                console.error(`Failed to get data for existing member ${memberEmail}:`, error);
                            }
                        }
                    }

                    // Prepare AI matching input data for new members
                    const newMembersInput: string[] = remainingMembers.map(member => {
                        const onboardingResponses = member.onboardingSurveyResponses || [];
                        const projResponses = member.projOnboardingSurveyResponses || [];
                        
                        let responseText = `User: ${member.email}, Name: ${member.name || member.email}\n`;
                        
                        // Add onboarding survey responses
                        appQuestions.forEach((question, index) => {
                            responseText += `Onboarding Question ${index + 1}: ${question}\n`;
                            responseText += `Onboarding Question ${index + 1} Answer: ${onboardingResponses[index] || 'Not provided'}\n`;
                        });
                        
                        // Add project onboarding survey responses
                        projQuestions.forEach((question, index) => {
                            responseText += `Project Onboarding Question ${index + 1} (${projQuestions[index].substring(0, 50)}...): ${question}\n`;
                            responseText += `Project Onboarding Question ${index + 1} Answer: ${projResponses[index] || 'Not provided'}\n`;
                        });
                        
                        return responseText;
                    });
                    
                    // Prepare existing members information (只在需要时准备)
                    const existingMembersInfo: string[] = shouldConsiderExistingTeam 
                        ? existingMembersData.map(member => {
                            const onboardingResponses = member.onboardingSurveyResponses || [];
                            const projResponses = member.projOnboardingSurveyResponses || [];
                            
                            let responseText = `Existing Member: ${member.email}, Name: ${member.name || member.email}\n`;
                            
                            // Add onboarding survey responses
                            appQuestions.forEach((question, index) => {
                                responseText += `Onboarding Question ${index + 1}: ${question}\n`;
                                responseText += `Onboarding Question ${index + 1} Answer: ${onboardingResponses[index] || 'Not provided'}\n`;
                            });
                            
                            // Add project onboarding survey responses
                            projQuestions.forEach((question, index) => {
                                responseText += `Project Onboarding Question ${index + 1} (${projQuestions[index].substring(0, 50)}...): ${question}\n`;
                                responseText += `Project Onboarding Question ${index + 1} Answer: ${projResponses[index] || 'Not provided'}\n`;
                            });
                            
                            return responseText;
                        })
                        : []; // 如果没有现有成员，传空数组

                    // Calculate actual allocation size
                    const plannedAllocation = (project as any).plannedAllocation || project.spotsAvailable;
                    const actualAllocationSize = Math.min(plannedAllocation, remainingMembers.length);

                    // Combine appQuestions and projQuestions for AI matching
                    const allQuestions = [...appQuestions, ...projQuestions];

                    // Use AI matching instead of random matching
                    let assignedEmails: string[] = [];
                    let matchingReasoning = "AI matching completed";
                    let aiMatchingScore: number | null = null;

                    try {
                        // 根据是否有现有成员选择不同的匹配函数
                        const aiResult = shouldConsiderExistingTeam
                            ? await matchingWithExistingTeam(
                                actualAllocationSize,
                                allQuestions,
                                newMembersInput,
                                existingMembersInfo
                            )
                            : await matching(
                                actualAllocationSize,
                                allQuestions,
                                newMembersInput
                            );
                        
                        // Parse AI result (JSON string)
                        const parsedResult = JSON.parse(aiResult);
                        
                        if (parsedResult.groups && parsedResult.groups.length > 0) {
                            // Extract emails from the first group (since we're selecting members for one project)
                            const selectedGroup = parsedResult.groups[0];
                            assignedEmails = selectedGroup.map((emailOrName: string) => {
                                // Find the matching member by email or name
                                const member = remainingMembers.find(m => 
                                    m.email === emailOrName || 
                                    m.name === emailOrName ||
                                    emailOrName.includes(m.email)
                                );
                                return member?.email || emailOrName;
                            }).filter((email: string) => email && remainingMembers.some(m => m.email === email));
                            
                            // Limit to actual allocation size
                            assignedEmails = assignedEmails.slice(0, actualAllocationSize);
                            
                            // Extract compatibility score if available
                            if (parsedResult.compatibility_score !== undefined) {
                                aiMatchingScore = parsedResult.compatibility_score;
                            } else if (parsedResult.groups && parsedResult.groups.length > 0 && parsedResult.groups[0].score !== undefined) {
                                aiMatchingScore = parsedResult.groups[0].score;
                            }
                            
                            matchingReasoning = shouldConsiderExistingTeam
                                ? `AI selected ${assignedEmails.length} members based on complementarity with existing team (compatibility score: ${aiMatchingScore !== null ? aiMatchingScore.toFixed(1) : 'N/A'})`
                                : `AI selected ${assignedEmails.length} members based on compatibility (score: ${aiMatchingScore !== null ? aiMatchingScore.toFixed(1) : 'N/A'})`;
                        } else {
                            // Fallback to random if AI returns no groups
                            console.warn(`AI matching returned no groups for project ${project.id}, falling back to random`);
                            assignedEmails = randomMatching(remainingMembers, actualAllocationSize);
                            matchingReasoning = "Random assignment (AI matching returned no results)";
                        }
                    } catch (aiError) {
                        console.error(`AI matching failed for project ${project.id}:`, aiError);
                        // Fallback to random matching if AI fails
                        assignedEmails = randomMatching(remainingMembers, actualAllocationSize);
                        matchingReasoning = `Random assignment (AI matching failed: ${aiError instanceof Error ? aiError.message : String(aiError)})`;
                    }
                    
                    // Remove assigned members from remaining pool
                    remainingMembers = remainingMembers.filter(member => 
                        !assignedEmails.includes(member.email)
                    );

                    preview.push({
                        projectId: project.id,
                        projectTitle: project.title,
                        currentMembers: project.currentMembers,
                        spotsAvailable: project.spotsAvailable,
                        proposedNewMembers: assignedEmails,
                        aiMatchingScore: aiMatchingScore,
                        matchingReasoning: matchingReasoning
                    });

                } catch (error) {
                    console.error(`Matching failed for project ${project.id}:`, error);
                    // Continue to next project even if one fails
                }
            }
        }

        return {
            success: true,
            message: `Smart matching completed: ${memberSurveyData.length - remainingMembers.length} members assigned to ${preview.length} projects`,
            preview,
            totalUnassigned: memberSurveyData.length,
            totalProjectsNeedingMembers: projectsNeedingMembers.length,
            totalAssigned: memberSurveyData.length - remainingMembers.length,
            remainingUnassigned: remainingMembers.length
        };
    } catch (error) {
        console.error("Error previewing smart assignment:", error);
        return { success: false, message: (error as Error).message, preview: [] };
    }
}

// Smart assign organization members to projects using AI matching
export async function autoAssignMembersToProjects(orgId: string, teamSize?: number) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // Get the organization information
        const orgDoc = await adminDb
            .collection("organizations")
            .doc(orgId)
            .get();
        if (!orgDoc.exists) {
            throw new Error("Organization not found");
        }

        const orgData = orgDoc.data();
        const allMembers = [
            ...(orgData?.members || []),
            ...(orgData?.admins || []),
        ];

        // Get all the projects in the organization
        const projectsSnapshot = await adminDb
            .collection("projects")
            .where("orgId", "==", orgId)
            .get();

        if (projectsSnapshot.empty) {
            throw new Error("No projects found in this organization");
        }

        const projects = projectsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                members: data.members || [],
                title: data.title || "",
                admins: data.admins || [],
                adminsAsUsers: data.adminsAsUsers || [],
                teamSize: data.teamSize || teamSize, // Use project's own team size or passed parameter
                ...data,
            };
        });

        // Calculate the current assigned members
        const assignedMembers = new Set();
        projects.forEach((project) => {
            const projectMembers = (project.members as string[]) || [];
            const participatingAdmins = (project.adminsAsUsers as string[]) || [];

            [...projectMembers, ...participatingAdmins].forEach((member: string) =>
                assignedMembers.add(member),
            );
        });

        // Get the unassigned members
        const unassignedMembers = allMembers.filter(
            (member) => !assignedMembers.has(member),
        );

        if (unassignedMembers.length === 0) {
            return {
                success: true,
                message: "All members are already assigned to projects",
                assigned: 0,
            };
        }

        // Get user survey responses for AI matching
        let memberSurveyData = [];
        for (const memberEmail of unassignedMembers) {
            try {
                const userDoc = await adminDb
                    .collection("users")
                    .doc(memberEmail)
                    .get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    
                    // 检查用户是否允许参与匹配
                    const allowMatching = userData?.allowMatching !== false; // 默认true，除非明确设置为false
                    
                    if (allowMatching) {
                        // Get user's platform survey response data
                        const onboardingSurveyResponses = userData?.onboardingSurveyResponse || [];
                        
                        memberSurveyData.push({
                            email: memberEmail,
                            name: userData?.fullName || memberEmail,
                            onboardingSurveyResponses: onboardingSurveyResponses,
                        });
                    } else {
                        // console.log(`User ${memberEmail} has opted out of matching`);
                    }
                }
            } catch (error) {
                console.error(`Failed to get survey data for ${memberEmail}:`, error);
                // Continue processing other users even if one fails
                memberSurveyData.push({
                    email: memberEmail,
                    name: memberEmail,
                    onboardingSurveyResponses: [],
                });
            }
        }

        let totalAssignedCount = 0;
        const assignmentResults = [];

        // Smart assignment for projects using optimal filling strategy
        
        // Calculate project requirements and available members
        const projectsNeedingMembers = projects
            .map(project => {
                const currentMembers = (project.members as string[]) || [];
                const currentAdmins = ((project as any).admins as string[]) || [];
                const participatingAdmins = (project.adminsAsUsers as string[]) || [];
                // 合并成员和管理员，确保管理员的技能也被考虑
                const allCurrentMembers = [...new Set([...currentMembers, ...currentAdmins, ...participatingAdmins])];
                const projectTeamSize = project.teamSize || teamSize; // Use project config > passed parameter
                const spotsAvailable = projectTeamSize - allCurrentMembers.length;
                return {
                    ...project,
                    currentMembers: allCurrentMembers, // 使用包含管理员的完整成员列表
                    projectTeamSize,
                    spotsAvailable
                };
            })
            .filter(project => project.spotsAvailable > 0);

        const totalSpotsNeeded = projectsNeedingMembers.reduce((sum, project) => sum + project.spotsAvailable, 0);
        const availableMembers = memberSurveyData.length;
        
        // Optimal allocation strategy: prioritize larger projects
        let optimalAllocation;
        if (availableMembers >= totalSpotsNeeded) {
            // If enough members, all projects can be filled completely - sort by project size descending
            optimalAllocation = projectsNeedingMembers.sort((a, b) => b.spotsAvailable - a.spotsAvailable);
        } else {
            // Not enough members, use backtracking algorithm for optimal allocation
            optimalAllocation = findOptimalAllocationWithBacktracking(projectsNeedingMembers, availableMembers);
        }

        for (const project of optimalAllocation) {
            if (project.spotsAvailable > 0 && memberSurveyData.length > 0) {
                try {
                    // Get existing project members' information
                    const existingMembersData = [];
                    for (const memberEmail of project.currentMembers) {
                        try {
                            const userDoc = await adminDb
                                .collection("users")
                                .doc(memberEmail)
                                .get();
                            
                            if (userDoc.exists) {
                                const userData = userDoc.data();
                                const onboardingSurveyResponses = userData?.onboardingSurveyResponse || [];
                                existingMembersData.push({
                                    email: memberEmail,
                                    name: userData?.fullName || memberEmail,
                                    onboardingSurveyResponses: onboardingSurveyResponses,
                                });
                            }
                        } catch (error) {
                            console.error(`Failed to get data for existing member ${memberEmail}:`, error);
                        }
                    }

                    // Prepare AI matching input data
                    const matchingInput: string[] = memberSurveyData.map(member => {
                        const responses = member.onboardingSurveyResponses || [];
                        return `User: ${member.email}, Name: ${member.name}, Survey Responses: ${JSON.stringify(responses)}`;
                    });
                    
                    // Prepare existing members information
                    const existingMembersInfo = existingMembersData.map(member => {
                        const responses = member.onboardingSurveyResponses || [];
                        return `Existing Member: ${member.email}, Name: ${member.name}, Survey Responses: ${JSON.stringify(responses)}`;
                    });

                    // Calculate actual allocation size (using backtracking planned allocation or project needs)
                    const plannedAllocation = (project as any).plannedAllocation || project.spotsAvailable;
                    const actualAllocationSize = Math.min(plannedAllocation, memberSurveyData.length);

					// Random matching (temporary replacement for GPT)
					const membersToAdd: string[] = randomMatching(memberSurveyData, actualAllocationSize);
					if (membersToAdd.length > 0) {
						const projectDoc = await adminDb.collection("projects").doc(project.id).get();
						const projectData = projectDoc.data();
						const currentMembers = (projectData?.members as string[]) || [];
						const updatedMembers = [...currentMembers, ...membersToAdd];

						await adminDb.collection("projects").doc(project.id).update({
							members: updatedMembers,
						});

						for (const memberEmail of membersToAdd) {
							try {
								await adminDb
									.collection("users")
									.doc(memberEmail)
									.collection("projs")
									.doc(project.id)
									.set(
										{
											orgId: orgId,
										},
										{ merge: true },
									);
							} catch (error) {
								console.error(
									`Failed to add project reference for user ${memberEmail}:`,
									error,
								);
							}
						}

						memberSurveyData = memberSurveyData.filter(
							member => !membersToAdd.includes(member.email)
						);

						totalAssignedCount += membersToAdd.length;
						assignmentResults.push({
							projectId: project.id,
							projectTitle: project.title,
							assignedMembers: membersToAdd,
							count: membersToAdd.length
						});
					}
                } catch (error) {
                    console.error(`AI matching failed for project ${project.id}:`, error);
                    // If AI matching fails, could implement simple round-robin assignment as fallback
                    // For now, skip this project
                    continue;
                }
            }
        }

        return {
            success: true,
            message: `Successfully assigned ${totalAssignedCount} members to projects using AI matching`,
            assigned: totalAssignedCount,
            remaining: memberSurveyData.length,
            details: assignmentResults,
        };
    } catch (error) {
        console.error("Error smart-assigning members:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getProjectMembers(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const projectDoc = await adminDb
            .collection("projects")
            .doc(projId)
            .get();

        if (!projectDoc.exists) {
            throw new Error("Project not found");
        }

        const projectData = projectDoc.data();
        const members = projectData?.members || [];
        const admins = projectData?.admins || [];

        // 获取成员详细信息
        const memberDetails = [];

        for (const email of [...members, ...admins]) {
            const userDoc = await adminDb.collection("users").doc(email).get();
            if (userDoc.exists) {
                memberDetails.push({
                    email,
                    role: admins.includes(email) ? "admin" : "member",
                    ...userDoc.data(),
                });
            }
        }

        return {
            success: true,
            data: memberDetails,
            message: "Project members retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting project members:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function saveTeamCompatibilityScore(
    orgId: string,
    projectId: string,
    userEmail: string,
    scores: {
        communication_score: number;
        collaboration_score: number;
        technical_score: number;
        leadership_score: number;
        overall_score: number;
    },
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // 验证分数范围
        const scoreValues = Object.values(scores);
        if (scoreValues.some((score) => score < 0 || score > 100)) {
            throw new Error("All scores must be between 0 and 100");
        }

        const compatibilityRef = adminDb
            .collection("team_compatibility_scores")
            .doc();
        await compatibilityRef.set({
            org_id: orgId,
            project_id: projectId,
            user_email: userEmail,
            ...scores,
            last_updated: Timestamp.now(),
        });

        return {
            success: true,
            score_id: compatibilityRef.id,
            message: "Team compatibility score saved successfully",
        };
    } catch (error) {
        console.error("Error saving team compatibility score:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getTeamCompatibilityScores(
    orgId: string,
    projectId?: string,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        let query = adminDb
            .collection("team_compatibility_scores")
            .where("org_id", "==", orgId);

        if (projectId) {
            query = query.where("project_id", "==", projectId);
        }

        const snapshot = await query.orderBy("overall_score", "desc").get();

        const scores = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                org_id: data.org_id,
                project_id: data.project_id,
                user_email: data.user_email,
                communication_score: data.communication_score,
                collaboration_score: data.collaboration_score,
                technical_score: data.technical_score,
                leadership_score: data.leadership_score,
                overall_score: data.overall_score,
                // Convert Timestamp to plain object
                last_updated: data.last_updated ? {
                    _seconds: data.last_updated.seconds,
                    _nanoseconds: data.last_updated.nanoseconds
                } : null,
            };
        });

        return {
            success: true,
            data: scores,
            message: "Team compatibility scores retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting team compatibility scores:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getProjectAnalytics(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // 获取项目基本信息
        const projectDoc = await adminDb
            .collection("projects")
            .doc(projId)
            .get();
        if (!projectDoc.exists) {
            throw new Error("Project not found");
        }

        const projectData = projectDoc.data();

        // 获取阶段和任务统计
        const stagesSnapshot = await adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .get();

        let totalTasks = 0;
        let completedTasks = 0;
        let stageStats = [];

        for (const stageDoc of stagesSnapshot.docs) {
            const stageData = stageDoc.data();
            const tasksSnapshot = await stageDoc.ref.collection("tasks").get();

            const stageTasks = tasksSnapshot.docs;
            const stageCompletedTasks = stageTasks.filter(
                (doc) => doc.data().isCompleted,
            ).length;

            totalTasks += stageTasks.length;
            completedTasks += stageCompletedTasks;

            stageStats.push({
                stage_id: stageDoc.id,
                stage_title: stageData.title,
                total_tasks: stageTasks.length,
                completed_tasks: stageCompletedTasks,
                completion_rate:
                    stageTasks.length > 0
                        ? (stageCompletedTasks / stageTasks.length) * 100
                        : 0,
            });
        }

        // 获取用户积分统计
        const scoresSnapshot = await adminDb
            .collection("user_scores")
            .where("project_id", "==", projId)
            .orderBy("total_points", "desc")
            .get();

        const userStats = scoresSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                user_email: data.user_email,
                total_points: data.total_points,
                tasks_completed: data.tasks_completed,
                tasks_assigned: data.tasks_assigned,
                average_completion_time: data.average_completion_time,
                streak: data.streak,
                // Convert Timestamp to plain object
                last_updated: data.last_updated ? {
                    _seconds: data.last_updated.seconds,
                    _nanoseconds: data.last_updated.nanoseconds
                } : null,
                project_id: data.project_id,
            };
        });

        const analytics = {
            project_info: {
                id: projId,
                title: projectData?.title,
                member_count:
                    (projectData?.members?.length || 0) +
                    (projectData?.admins?.length || 0),
                created_at: projectData?.createdAt,
            },
            task_analytics: {
                total_tasks: totalTasks,
                completed_tasks: completedTasks,
                completion_rate:
                    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
                stage_breakdown: stageStats,
            },
            user_performance: userStats,
            summary: {
                most_active_user: userStats[0]?.user_email || "N/A",
                project_health:
                    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            },
        };

        return {
            success: true,
            data: analytics,
            message: "Project analytics retrieved successfully",
        };
    } catch (error) {
        console.error("Error getting project analytics:", error);
        return { success: false, message: (error as Error).message };
    }
}

// ================ 数据库迁移功能 ================

export async function migrateTasksToTaskPool() {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        let migratedTasks = 0;
        let errors = [];

        // 获取所有项目
        const projectsSnapshot = await adminDb.collection("projects").get();

        for (const projectDoc of projectsSnapshot.docs) {
            const projId = projectDoc.id;
            // console.log(`Migrating project: ${projId}`);

            // 获取项目的所有阶段
            const stagesSnapshot = await adminDb
                .collection("projects")
                .doc(projId)
                .collection("stages")
                .get();

            for (const stageDoc of stagesSnapshot.docs) {
                const stageId = stageDoc.id;

                // 获取阶段的所有任务
                const tasksSnapshot = await adminDb
                    .collection("projects")
                    .doc(projId)
                    .collection("stages")
                    .doc(stageId)
                    .collection("tasks")
                    .get();

                const batch = adminDb.batch();
                let batchCount = 0;

                for (const taskDoc of tasksSnapshot.docs) {
                    const taskId = taskDoc.id;
                    const taskData = taskDoc.data();

                    try {
                        // 检查任务是否已经迁移
                        if (taskData.status) {
                            continue;
                        }

                        // 准备迁移数据
                        const migrationUpdate: any = {
                            status: taskData.isCompleted
                                ? "completed"
                                : "available",
                            points: 10,
                            completion_percentage: taskData.isCompleted
                                ? 100
                                : 0,
                            can_be_reassigned: true,

                            // 修复字段名变更：assignedTo -> assignee
                            ...(taskData.assignedTo && {
                                assignee: taskData.assignedTo,
                            }),

                            soft_deadline: taskData.soft_deadline || "",
                            hard_deadline: taskData.hard_deadline || "",
                            migrated_at: Timestamp.now(),
                        };

                        // 如果任务已分配但未完成，设置状态为 assigned
                        if (taskData.assignedTo && !taskData.isCompleted) {
                            migrationUpdate.status = "assigned";
                        }

                        // 如果任务已完成，添加完成时间
                        if (taskData.isCompleted && !taskData.completed_at) {
                            migrationUpdate.completed_at = Timestamp.now();
                        }

                        // 添加新字段
                        batch.update(taskDoc.ref, migrationUpdate);

                        batchCount++;
                        migratedTasks++;

                        // Firebase batch 限制
                        if (batchCount >= 400) {
                            await batch.commit();
                            batchCount = 0;
                        }
                    } catch (error) {
                        errors.push({
                            projId,
                            stageId,
                            taskId,
                            error: (error as Error).message,
                        });
                    }
                }

                // 提交剩余的批次
                if (batchCount > 0) {
                    await batch.commit();
                }
            }
        }

        return {
            success: true,
            message: `Migration completed! ${migratedTasks} tasks migrated.`,
            data: {
                migratedTasks,
                errors: errors.length > 0 ? errors : undefined,
            },
        };
    } catch (error) {
        console.error("Migration failed:", error);
        return {
            success: false,
            message: `Migration failed: ${(error as Error).message}`,
        };
    }
}

export async function initializeUserScores(projId?: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        let projectsToProcess = [];

        if (projId) {
            projectsToProcess.push(projId);
        } else {
            const projectsSnapshot = await adminDb.collection("projects").get();
            projectsToProcess = projectsSnapshot.docs.map((doc) => doc.id);
        }

        let initializedUsers = 0;

        for (const currentProjId of projectsToProcess) {
            const projectDoc = await adminDb
                .collection("projects")
                .doc(currentProjId)
                .get();

            if (!projectDoc.exists) {
                continue;
            }

            const projectData = projectDoc.data();
            const allMembers = [
                ...(projectData?.members || []),
                ...(projectData?.adminsAsUsers || []),
            ];

            for (const userEmail of allMembers) {
                               try {
                    // 检查用户是否已有积分记录
                    const existingScores = await adminDb
                        .collection("user_scores")
                        .where("user_email", "==", userEmail)
                        .where("project_id", "==", currentProjId)
                        .get();

                    if (!existingScores.empty) {
                        continue;
                    }

                    // 创建初始积分记录
                    await adminDb.collection("user_scores").add({
                        user_email: userEmail,
                        project_id: currentProjId,
                        total_points: 0,
                        tasks_completed: 0,
                        tasks_assigned: 0,
                        average_completion_time: 0,
                        streak: 0,
                        last_updated: Timestamp.now(),
                    });

                    initializedUsers++;
                } catch (error) {
                    console.error(
                        `Error initializing score for ${userEmail}:`,
                        error,
                    );
                }
            }
        }

        return {
            success: true,
            message: `Initialized scores for ${initializedUsers} users.`,
            data: { initializedUsers },
        };
    } catch (error) {
        console.error("Score initialization failed:", error);
        return {
            success: false,
            message: `Score initialization failed: ${(error as Error).message}`,
        };
    }
}

// ================ 辅助函数 ================

async function updateUserScore(
    userEmail: string,
    projectId: string,
    points: number,
    taskCompleted: boolean,
) {
    try {
        const scoresQuery = await adminDb
            .collection("user_scores")
            .where("user_email", "==", userEmail)
            .where("project_id", "==", projectId)
            .get();

        let scoreRef;
        let currentData = {
            total_points: 0,
            tasks_completed: 0,
            tasks_assigned: 0,
            streak: 0,
        };

        if (scoresQuery.empty) {
            scoreRef = adminDb.collection("user_scores").doc();
        } else {
            scoreRef = scoresQuery.docs[0].ref;
            currentData = { ...currentData, ...scoresQuery.docs[0].data() };
        }

        const updateData = {
            user_email: userEmail,
            project_id: projectId,
            total_points: currentData.total_points + points,
            tasks_completed: taskCompleted
                ? currentData.tasks_completed + 1
                : currentData.tasks_completed,
            last_updated: Timestamp.now(),
        };

        await scoreRef.set(updateData, { merge: true });

        return {
            success: true,
            new_total: updateData.total_points,
        };
    } catch (error) {
        console.error("Failed to update user score:", error);
        return { success: false, message: (error as Error).message };
    }
}

async function updateUserTaskStats(
    userEmail: string,
    projectId: string,
    action: "assigned" | "completed" | "unassigned",
) {
    try {
        const scoresQuery = await adminDb
            .collection("user_scores")
            .where("user_email", "==", userEmail)
            .where("project_id", "==", projectId)
            .get();

        let scoreRef;
        let currentData = {
            tasks_completed: 0,
            tasks_assigned: 0,
            streak: 0,
        };

        if (scoresQuery.empty) {
            scoreRef = adminDb.collection("user_scores").doc();
        } else {
            scoreRef = scoresQuery.docs[0].ref;
            currentData = { ...currentData, ...scoresQuery.docs[0].data() };
        }

        const updateData: any = {
            user_email: userEmail,
            project_id: projectId,
            last_updated: Timestamp.now(),
        };

        switch (action) {
            case "assigned":
                updateData.tasks_assigned = currentData.tasks_assigned + 1;
                break;
            case "completed":
                updateData.tasks_completed = currentData.tasks_completed + 1;
                updateData.streak = currentData.streak + 1;
                break;
            case "unassigned":
                updateData.tasks_assigned = Math.max(
                    0,
                    currentData.tasks_assigned - 1,
                );
                break;
        }

        await scoreRef.set(updateData, { merge: true });
    } catch (error) {
        console.error("Failed to update user task stats:", error);
    }
}

export async function unassignTask(
    projId: string,
    stageId: string,
    taskId: string,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const taskRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc(taskId);

        const taskDoc = await taskRef.get();
        if (!taskDoc.exists) {
            throw new Error("Task not found");
        }

        const taskData = taskDoc.data();
        if (!taskData?.assignee) {
            throw new Error("Task is not assigned");
        }

        // 更新任务状态为未分配
        await taskRef.update({
            assignee: "",
            status: "available",
            assigned_at: null,
            completion_percentage: 0,
        });

        // 更新用户任务统计
        await updateUserTaskStats(taskData.assignee, projId, "unassigned");

        return { success: true, message: "Task unassigned successfully" };
    } catch (error) {
        console.error("Error unassigning task:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function reassignTask(
    projId: string,
    stageId: string,
    taskId: string,
    newAssigneeEmail: string,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // validate input
        if (!newAssigneeEmail) {
            throw new Error("New assignee email is required");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newAssigneeEmail)) {
            throw new Error("Invalid email format");
        }

        // validate new assignee
        const userDoc = await adminDb
            .collection("users")
            .doc(newAssigneeEmail)
            .get();
        if (!userDoc.exists) {
            throw new Error("User not found");
        }

        const taskRef = adminDb
            .collection("projects")
            .doc(projId)
            .collection("stages")
            .doc(stageId)
            .collection("tasks")
            .doc(taskId);

        const taskDoc = await taskRef.get();
        if (!taskDoc.exists) {
            throw new Error("Task not found");
        }

        const taskData = taskDoc.data();
        if (!taskData?.assignee) {
            throw new Error("Task is not assigned");
        }

        const oldAssigneeEmail = taskData.assignee;

        // update task assignment
        await taskRef.update({
            assignee: newAssigneeEmail,
            status: "assigned",
            assigned_at: Timestamp.now(),
            completion_percentage: 0,
        });

        // update stats: remove old assignee, add new assignee
        await updateUserTaskStats(oldAssigneeEmail, projId, "unassigned");
        await updateUserTaskStats(newAssigneeEmail, projId, "assigned");

        return { success: true, message: "Task reassigned successfully" };
    } catch (error) {
        console.error("Error reassigning task:", error);
        return { success: false, message: (error as Error).message };
    }
}

// ================ Team Analysis ================

export async function getProjectTeamCharter(projId: string) {
    try {
        const projectDoc = await adminDb.collection("projects").doc(projId).get();
        
        if (!projectDoc.exists) {
            return { success: false, message: "Project not found" };
        }
        
        const projectData = projectDoc.data();
        const teamCharterResponse = projectData?.teamCharterResponse || [];
        
        return { 
            success: true, 
            data: teamCharterResponse 
        };
    } catch (error) {
        console.error("Error getting project team charter:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function saveTeamAnalysis(
    projId: string,
    analysis: any,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // create file path
        const filePath = `team_analysis/${projId}/latest_analysis.json`;
        
        // convert analysis result to JSON string
        const analysisJson = JSON.stringify(analysis);
        
        // create Blob
        const blob = new Blob([analysisJson], { type: 'application/json' });
        
        // upload to Firebase Storage
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, blob);
        
        // save metadata to Firestore
        await adminDb.collection("projects").doc(projId).update({
            lastTeamAnalysis: {
                timestamp: new Date(),
                filePath: filePath,
            }
        });

        return {
            success: true,
            message: "Team analysis saved successfully",
        };
    } catch (error) {
        console.error("Error saving team analysis:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getTeamAnalysis(projId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // fetch project document
        const projectDoc = await adminDb.collection("projects").doc(projId).get();
        const projectData = projectDoc.data();
        
        if (!projectData?.lastTeamAnalysis?.filePath) {
            return { success: false, message: "No analysis found" };
        }

        // fetch file from Storage
        const storageRef = ref(storage, projectData.lastTeamAnalysis.filePath);
        const url = await getDownloadURL(storageRef);
        
        // fetch file content
        const response = await fetch(url);
        const analysis = await response.json();

        // handle timestamp field
        let ts = projectData.lastTeamAnalysis.timestamp;
        let timestamp;
        if (ts && typeof ts === 'object' && (ts.seconds !== undefined || ts._seconds !== undefined)) {
            // Firestore Timestamp
            timestamp = {
                _seconds: ts.seconds ?? ts._seconds,
                _nanoseconds: ts.nanoseconds ?? ts._nanoseconds ?? 0
            };
        } else if (ts instanceof Date) {
            timestamp = ts.toISOString();
        } else {
            timestamp = ts ?? null;
        }

        return {
            success: true,
            data: {
                analysis,
                timestamp,
            },
        };
    } catch (error) {
        console.error("Error getting team analysis:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function updateUserMatchingPreference(
    allowMatching: boolean,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        await adminDb.collection("users").doc(userId).set(
            {
                allowMatching: allowMatching,
                matchingPreferenceUpdatedAt: new Date().toISOString(),
            },
            { merge: true },
        );
        return { success: true };
    } catch (error) {
        console.error("Error updating matching preference:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function getUserMatchingPreference() {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        const userDoc = await adminDb.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            return { success: true, allowMatching: true }; // 默认允许匹配
        }
        
        const userData = userDoc.data();
        return { 
            success: true, 
            allowMatching: userData?.allowMatching !== false // 默认true，除非明确设置为false
        };
    } catch (error) {
        console.error("Error getting matching preference:", error);
        return { success: false, message: (error as Error).message };
    }
}

export async function autoDropOverdueTasks() {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    return await autoDropOverdueTasksInternal(userId);
}

export async function autoDropOverdueTasksInternal(executedBy: string = "system") {

    const now = new Date();
    const currentISOString = now.toISOString();

    try {
        // console.log("🔍 开始检查过期任务...");
        
        // 获取所有项目
        const projectsSnapshot = await adminDb.collection("projects").get();
        const overdueTasks: { 
            ref: FirebaseFirestore.DocumentReference; 
            data: any;
            projectId: string;
            stageId: string;
        }[] = [];
        
        for (const projectDoc of projectsSnapshot.docs) {
            const stagesSnapshot = await projectDoc.ref.collection("stages").get();
            
            for (const stageDoc of stagesSnapshot.docs) {
                const tasksSnapshot = await stageDoc.ref.collection("tasks").get();
                
                for (const taskDoc of tasksSnapshot.docs) {
                    const taskData = taskDoc.data();
                    
                    // 匹配现有的 getOverdueTasks 逻辑，但查找已分配的任务
                    if (
                        taskData.assignee && // 已分配
                        taskData.status !== "available" && // 只处理非 available 的任务
                        taskData.isCompleted !== true && // 处理 undefined 情况
                        taskData.soft_deadline &&
                        new Date(taskData.soft_deadline) < now &&
                        taskData.canBeReassigned !== false // 默认允许重新分配
                    ) {
                        overdueTasks.push({
                            ref: taskDoc.ref,
                            data: taskData,
                            projectId: projectDoc.id,
                            stageId: stageDoc.id
                        });
                    }
                }
            }
            
            // 限制批处理数量
            if (overdueTasks.length >= 100) break;
        }
        
        if (overdueTasks.length === 0) {
            // console.log("没有找到需要自动 drop 的过期任务");
            return { 
                success: true, 
                tasksProcessed: 0, 
                message: "没有需要处理的过期任务" 
            };
        }
        
        // console.log(`找到 ${overdueTasks.length} 个需要自动 drop 的过期任务`);
        
        // 使用批量写入进行更新（使用现有的 unassignTask 逻辑）
        const batch = adminDb.batch();
        let processedCount = 0;
        
        overdueTasks.forEach(({ ref, data, projectId, stageId }) => {
            // 使用现有的 unassignTask 逻辑
            batch.update(ref, {
                assignee: "",
                status: "available", 
                assigned_at: null,
                completion_percentage: 0,
                // 添加自动处理标记
                auto_dropped_at: currentISOString,
            });
            
            processedCount++;
            
            // console.log(`准备自动 drop 任务: ${data.title} (assignee: ${data.assignee})`);
            // console.log(`  项目: ${projectId}, 阶段: ${stageId}`);
        });
        
        // 执行批量更新
        if (processedCount > 0) {
            await batch.commit();
            // console.log(`✅ 成功自动 drop ${processedCount} 个过期任务`);
            
            // 记录处理结果到日志集合（可选）
            await adminDb.collection("function_logs").add({
                functionName: "autoDropOverdueTasks", 
                executedAt: currentISOString,
                tasksProcessed: processedCount,
                executedBy: executedBy,
                status: "success",
                taskDetails: overdueTasks.map(task => ({
                    title: task.data.title,
                    assignee: task.data.assignee,
                    soft_deadline: task.data.soft_deadline,
                    projectId: task.projectId,
                    stageId: task.stageId
                }))
            });
        }
        
        return {
            success: true,
            tasksProcessed: processedCount,
            executedAt: currentISOString,
            message: `成功自动 drop ${processedCount} 个过期任务`
        };
        
    } catch (error) {
        console.error("自动 drop 过期任务时发生错误:", error);
        
        // 记录错误到日志集合
        await adminDb.collection("function_logs").add({
            functionName: "autoDropOverdueTasks",
            executedAt: currentISOString,
            executedBy: executedBy,
            status: "error",
            error: (error as Error).message
        });
        
        return { 
            success: false, 
            message: `自动 drop 过期任务失败: ${(error as Error).message}` 
        };
    }
}

// 修复 toggleAdminUserParticipation 函数
export async function toggleAdminUserParticipation(
    projId: string,
    participate: boolean = true
) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            console.error("Auth failed: No userId");
            return { success: false, message: "Unauthorized - Please sign in again" };
        }

        // 使用和其他函数相同的模式获取用户邮箱
        let userEmail: string | undefined;

        // 检查 sessionClaims 中的各种可能的邮箱字段
        if (sessionClaims?.email && typeof sessionClaims.email === "string") {
            userEmail = sessionClaims.email;
        } else if (
            sessionClaims?.primaryEmailAddress &&
            typeof sessionClaims.primaryEmailAddress === "string"
        ) {
            userEmail = sessionClaims.primaryEmailAddress;
        } else if (
            sessionClaims?.emailAddresses &&
            Array.isArray(sessionClaims.emailAddresses) &&
            sessionClaims.emailAddresses.length > 0
        ) {
            userEmail = sessionClaims.emailAddresses[0] as string;
        }

        // 如果仍然没有邮箱，尝试从 Clerk API 获取
        if (!userEmail) {
            try {
                const { currentUser } = await import("@clerk/nextjs/server");
                const user = await currentUser();
                userEmail =
                    user?.emailAddresses?.[0]?.emailAddress ||
                    user?.primaryEmailAddress?.emailAddress;
            } catch (clerkError) {
                console.error("Failed to get user from Clerk:", clerkError);
            }
        }

        if (
            !userEmail ||
            typeof userEmail !== "string" ||
            userEmail.trim().length === 0
        ) {
            console.error("Authentication failed: no valid email found");
            return { 
                success: false, 
                message: `Unauthorized - no valid email found. Got: ${userEmail}` 
            };
        }

        // 检查项目是否存在
        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            console.error(`Project not found: ${projId}`);
            return { success: false, message: "Project not found" };
        }

        const projectData = projectDoc.data();
        const currentAdmins = projectData?.admins || [];
        const currentAdminsAsUsers = projectData?.adminsAsUsers || [];

        // 检查用户是否是admin
        if (!currentAdmins.includes(userEmail)) {
            console.error(`User is not an admin: ${userEmail}`);
            return { success: false, message: "Only admins can toggle user participation" };
        }

        let updatedAdminsAsUsers = [...currentAdminsAsUsers];

        if (participate) {
            // 添加到参与用户活动的admin列表
            if (!updatedAdminsAsUsers.includes(userEmail)) {
                updatedAdminsAsUsers.push(userEmail);
            }
        } else {
            // 从参与用户活动的admin列表中移除
            updatedAdminsAsUsers = updatedAdminsAsUsers.filter(
                (email: string) => email !== userEmail
            );
        }

        await projectRef.update({
            adminsAsUsers: updatedAdminsAsUsers,
        });

        return {
            success: true,
            message: participate 
                ? "You are now participating in user activities" 
                : "You are no longer participating in user activities",
        };
    } catch (error) {
        console.error("Error toggling admin user participation:", error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : "An unexpected error occurred" 
        };
    }
}

// 修复 checkAdminUserParticipation 函数
export async function checkAdminUserParticipation(projId: string) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return { success: false, participating: false };
        }

        // 使用和其他函数相同的模式获取用户邮箱
        let userEmail: string | undefined;

        // 检查 sessionClaims 中的各种可能的邮箱字段
        if (sessionClaims?.email && typeof sessionClaims.email === "string") {
            userEmail = sessionClaims.email;
        } else if (
            sessionClaims?.primaryEmailAddress &&
            typeof sessionClaims.primaryEmailAddress === "string"
        ) {
            userEmail = sessionClaims.primaryEmailAddress;
        } else if (
            sessionClaims?.emailAddresses &&
            Array.isArray(sessionClaims.emailAddresses) &&
            sessionClaims.emailAddresses.length > 0
        ) {
            userEmail = sessionClaims.emailAddresses[0] as string;
        }

        // 如果仍然没有邮箱，尝试从 Clerk API 获取
        if (!userEmail) {
            try {
                const { currentUser } = await import("@clerk/nextjs/server");
                const user = await currentUser();
                userEmail =
                    user?.emailAddresses?.[0]?.emailAddress ||
                    user?.primaryEmailAddress?.emailAddress;
            } catch (clerkError) {
                console.error("Failed to get user from Clerk:", clerkError);
            }
        }

        if (
            !userEmail ||
            typeof userEmail !== "string" ||
            userEmail.trim().length === 0
        ) {
            return { success: false, participating: false };
        }

        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            return { success: false, participating: false };
        }

        const projectData = projectDoc.data();
        const adminsAsUsers = projectData?.adminsAsUsers || [];
        const isAdmin = projectData?.admins?.includes(userEmail) || false;

        return {
            success: true,
            participating: adminsAsUsers.includes(userEmail),
            isAdmin: isAdmin,
        };
    } catch (error) {
        console.error("Error checking admin user participation:", error);
        return { success: false, participating: false };
    }
}

export async function applyGroupAssignments(
    orgId: string,
    updates: Array<{ projectId: string; members: string[]; admins: string[] }>,
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        if (!orgId || !Array.isArray(updates)) {
            throw new Error("Invalid parameters");
        }

        for (const update of updates) {
            const projectId = update.projectId;
            const members = Array.from(
                new Set((update.members || []).map((e) => e.trim()).filter(Boolean)),
            );
            const admins = Array.from(
                new Set((update.admins || []).map((e) => e.trim()).filter(Boolean)),
            );

            const projectRef = adminDb.collection("projects").doc(projectId);
            const projectSnap = await projectRef.get();
            if (!projectSnap.exists) {
                throw new Error(`Project not found: ${projectId}`);
            }

            const projectData = projectSnap.data() || {};
            const projectOrgId = projectData.orgId;
            if (!projectOrgId || projectOrgId !== orgId) {
                throw new Error(
                    `Project ${projectId} does not belong to organization ${orgId}`,
                );
            }

            const orgProjRef = adminDb
                .collection("organizations")
                .doc(orgId)
                .collection("projs")
                .doc(projectId);

            const currentMembers: string[] = (projectData.members as string[]) || [];
            const currentAdmins: string[] = (projectData.admins as string[]) || [];
            const currentParticipants = new Set([
                ...currentMembers,
                ...currentAdmins,
            ]);
            const newParticipants = new Set([...members, ...admins]);

            const updateData: any = { members, admins };
            
            if (projectData.title) {
                updateData.title = projectData.title;
            }
            if (projectData.teamSize !== undefined) {
                updateData.teamSize = projectData.teamSize;
            }
            
            await Promise.all([
                projectRef.update({ members, admins }),
                orgProjRef.set(updateData, { merge: true })
            ]);

            for (const email of newParticipants) {
                if (!currentParticipants.has(email)) {
                    try {
                        await adminDb
                            .collection("users")
                            .doc(email)
                            .collection("projs")
                            .doc(projectId)
                            .set({ orgId }, { merge: true });
                    } catch (error) {
                        console.warn(
                            `Failed to add project reference for user ${email}:`,
                            error,
                        );
                    }
                }
            }

            for (const email of currentParticipants) {
                if (!newParticipants.has(email)) {
                    try {
                        await adminDb
                            .collection("users")
                            .doc(email)
                            .collection("projs")
                            .doc(projectId)
                            .delete();
                    } catch (error) {
                        console.warn(
                            `Failed to remove project reference for user ${email}:`,
                            error,
                        );
                    }
                }
            }
        }

        return { success: true, message: "Group assignments applied successfully" };
    } catch (error) {
        console.error("Error applying group assignments:", error);
        return { success: false, message: (error as Error).message };
    }
}

function serializeTaskForClient(task: UserTaskWithContext & Record<string, unknown>): UserTaskWithContext {
    const serialized = { ...task };
    const timestampFields = ["assigned_at", "assignedAt", "completed_at", "completedAt", "auto_dropped_at"];
    for (const field of timestampFields) {
        const val = serialized[field];
        if (val && typeof val === "object" && ("seconds" in val || "_seconds" in val)) {
            const t = val as { seconds?: number; _seconds?: number };
            const sec = t.seconds ?? t._seconds ?? 0;
            (serialized as Record<string, unknown>)[field] = new Date(sec * 1000).toISOString();
        }
    }
    return serialized as UserTaskWithContext;
}

export async function getUserIncompleteTasks(searchQuery?: string): Promise<{
    success: boolean;
    tasks?: UserTaskWithContext[];
    message?: string;
}> {
    const { userId } = await auth();
    if (!userId) {
        return { success: false, message: "Unauthorized" };
    }

    const userEmail = await getCurrentUserEmail();
    if (!userEmail) {
        return { success: false, message: "User email not found" };
    }

    try {
        const userOrgsSnapshot = await adminDb
            .collection("users")
            .doc(userEmail)
            .collection("orgs")
            .get();

        const orgIds = userOrgsSnapshot.docs
            .map((doc) => doc.data().orgId)
            .filter(Boolean) as string[];

        const allTasks: UserTaskWithContext[] = [];

        for (const orgId of orgIds) {
            const projectsSnapshot = await adminDb
                .collection("projects")
                .where("orgId", "==", orgId)
                .get();

            for (const projectDoc of projectsSnapshot.docs) {
                const projId = projectDoc.id;
                const projectData = projectDoc.data();
                const projectTitle = projectData?.title as string | undefined;

                const stagesSnapshot = await adminDb
                    .collection("projects")
                    .doc(projId)
                    .collection("stages")
                    .get();

                for (const stageDoc of stagesSnapshot.docs) {
                    const stageId = stageDoc.id;
                    const stageData = stageDoc.data();
                    const stageTitle = stageData?.title as string | undefined;

                    const tasksSnapshot = await adminDb
                        .collection("projects")
                        .doc(projId)
                        .collection("stages")
                        .doc(stageId)
                        .collection("tasks")
                        .get();

                    for (const taskDoc of tasksSnapshot.docs) {
                        const taskData = taskDoc.data() as Task & { isCompleted?: boolean; status?: string };
                        const assignee = taskData.assignee || "";
                        const isCompleted = taskData.isCompleted === true || taskData.status === "completed";

                        if (assignee === userEmail && !isCompleted) {
                            const task: UserTaskWithContext = {
                                ...taskData,
                                id: taskDoc.id,
                                projId,
                                stageId,
                                orgId,
                                projectTitle,
                                stageTitle,
                            };
                            allTasks.push(serializeTaskForClient(task));
                        }
                    }
                }
            }
        }

        let filteredTasks = allTasks;

        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            filteredTasks = allTasks.filter(
                (t) =>
                    (t.title || "").toLowerCase().includes(query) ||
                    (t.description || "").toLowerCase().includes(query)
            );
        }

        filteredTasks.sort((a, b) => {
            const dateA = new Date(a.hard_deadline || 0).getTime();
            const dateB = new Date(b.hard_deadline || 0).getTime();
            return dateA - dateB;
        });

        return { success: true, tasks: filteredTasks };
    } catch (error) {
        console.error("Error getting user incomplete tasks:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch tasks",
        };
    }
}