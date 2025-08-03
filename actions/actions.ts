"use server";
import { adminDb } from "@/firebase-admin";
import { GeneratedTasks, Stage } from "@/types/types";
import { auth } from "@clerk/nextjs/server";
import { Timestamp } from "firebase-admin/firestore";
import axios from "axios";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase";

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
    } catch (e) {
        return { success: false, message: (e as Error).message };
    }
}

export async function createNewOrganization(
    orgName: string,
    orgDescription: string,
) {
    const x = await auth();
    const { userId, sessionClaims } = x; //await auth();

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
        const validRegex = /^[a-zA-Z0-9.,'-]+$/;
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

export async function setUserOnboardingSurvey(selectedTags: string[][]) {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
        throw new Error("Unauthorized - no user ID");
    }

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
            console.log(
                "Debug setUserOnboardingSurvey - currentUser:",
                JSON.stringify(
                    {
                        id: user?.id,
                        emailAddresses: user?.emailAddresses?.map(
                            (ea) => ea.emailAddress,
                        ),
                        primaryEmailAddress:
                            user?.primaryEmailAddress?.emailAddress,
                    },
                    null,
                    2,
                ),
            );

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
        console.error("setUserOnboardingSurvey failed: no valid email found");
        throw new Error(
            `Unauthorized - no valid email found. Got: ${userEmail}`,
        );
    }
    try {
        const formatted = selectedTags.map((tags) => tags.join(","));

        // Check if any of the formatted strings are empty
        if (formatted.some((tag) => tag === "")) {
            throw new Error(
                "Please select at least one tag for each question!",
            );
        }

        await adminDb.collection("users").doc(userEmail).set(
            {
                onboardingSurveyResponse: formatted,
            },
            { merge: true },
        );
        return { success: true };
    } catch (error) {
        console.error(error);
        return { success: false, message: (error as Error).message };
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
    console.log(
        "Debug setProjOnboardingSurvey - sessionClaims:",
        JSON.stringify(sessionClaims, null, 2),
    );

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
            console.log(
                "Debug - currentUser:",
                JSON.stringify(
                    {
                        id: user?.id,
                        emailAddresses: user?.emailAddresses?.map(
                            (ea) => ea.emailAddress,
                        ),
                        primaryEmailAddress:
                            user?.primaryEmailAddress?.emailAddress,
                    },
                    null,
                    2,
                ),
            );

            userEmail =
                user?.emailAddresses?.[0]?.emailAddress ||
                user?.primaryEmailAddress?.emailAddress;
        } catch (clerkError) {
            console.error("Failed to get user from Clerk:", clerkError);
        }
    }

    // 最终的调试信息
    console.log("Debug setProjOnboardingSurvey - final values:", {
        userId,
        userEmail,
        orgId,
        responsesLength: responses?.length,
        hasValidEmail:
            !!userEmail &&
            typeof userEmail === "string" &&
            userEmail.length > 0,
    });

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

        console.log(
            "About to save to path:",
            `users/${userEmail}/orgs/${orgId}`,
        );

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

        console.log("Successfully saved survey response");
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
                .add({
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

        // 创建项目文档
        const projectRef = await adminDb.collection("projects").add({
            orgId: orgId,
            title: projectTitle.trim(),
            members: members,
            admins: [userId],
            createdAt: Timestamp.now(),
        });

        const projectId = projectRef.id;

        // 更新项目文档添加 projId 字段
        await projectRef.update({ projId: projectId });

        // 在组织的项目子集合中添加引用
        await adminDb
            .collection("organizations")
            .doc(orgId)
            .collection("projs")
            .add({
                projId: projectId,
                members: members,
            });

        // 为创建者添加项目引用
        await adminDb
            .collection("users")
            .doc(userId)
            .collection("projs")
            .doc(projectId)
            .set(
                {
                    orgId: orgId,
                },
                { merge: true },
            );

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
                    assignee: null,
                    id: taskRef.id,
                    order: taskIndex,
                    soft_deadline: task.soft_deadline,
                    hard_deadline: task.hard_deadline,
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
    order: number,
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
            title: "New Task",
            description: "This is a default task description.",
            assignee: "", // 更新字段名以匹配新的结构
            id: taskRef.id,
            order: order,
            isCompleted: false,
            // 新增任务池相关字段
            status: "available",
            points: 1,
            completion_percentage: 0,
            can_be_reassigned: true,
            soft_deadline: "",
            hard_deadline: "",
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
            ...(projectData?.admins || []),
        ];
        
        // 去重，确保没有重复的成员
        const members = [...new Set(allMembers)];
        
        console.log("Project members before deduplication:", allMembers);
        console.log("Project members after deduplication:", members);

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
                        console.log(`User document not found for: ${memberEmail}`);
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
                        console.log(`Project document not found for: ${projId}`);
                        return null;
                    }
                    
                    const projectData = projectDoc.data();
                    const orgId = projectData?.orgId;
                    
                    if (!orgId) {
                        console.log(`No orgId found for project: ${projId}`);
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
                        console.log(`Found projResponses for ${memberEmail}:`, projResponses.length, "items");
                    } else {
                        console.log(`No org document found for user ${memberEmail} in org ${orgId}`);
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
            points: taskData?.points || 1,
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
            pointsEarned = taskData?.points || 1;
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
                    (taskData.can_be_reassigned || !taskData.assignee)
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
        const scores = await adminDb
            .collection("user_scores")
            .where("project_id", "==", projId)
            .orderBy("total_points", "desc")
            .limit(50)
            .get();

        const leaderboard = scores.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
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
        });

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
            console.log("Returning empty leaderboard due to missing index");
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

// ================ 团队管理系统 ================

export async function addProjectMember(
    projId: string,
    userEmail: string,
    role: "admin" | "member" = "member",
) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // 验证用户是否存在
        const userDoc = await adminDb.collection("users").doc(userEmail).get();
        if (!userDoc.exists) {
            throw new Error("User not found");
        }

        // 验证项目是否存在
        const projectRef = adminDb.collection("projects").doc(projId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            throw new Error("Project not found");
        }

        const projectData = projectDoc.data();
        const currentMembers = projectData?.members || [];
        const currentAdmins = projectData?.admins || [];

        // 检查用户是否已经是成员
        if (
            currentMembers.includes(userEmail) ||
            currentAdmins.includes(userEmail)
        ) {
            throw new Error("User is already a member of this project");
        }

        // 添加成员到相应的角色数组
        if (role === "admin") {
            await projectRef.update({
                admins: [...currentAdmins, userEmail],
            });
        } else {
            await projectRef.update({
                members: [...currentMembers, userEmail],
            });
        }

        // 为用户添加项目引用
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

        return {
            success: true,
            message: `User added as ${role} successfully`,
        };
    } catch (error) {
        console.error("Error adding project member:", error);
        return { success: false, message: (error as Error).message };
    }
}

// 批量更新项目成员
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

        // 更新项目成员列表
        await projectRef.update({
            members: memberEmails,
        });

        // 为所有新成员添加项目引用
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

// 移除项目成员
export async function removeProjectMember(projId: string, userEmail: string) {
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
        const currentMembers = projectData?.members || [];
        const currentAdmins = projectData?.admins || [];

        // 从成员或管理员列表中移除
        const updatedMembers = currentMembers.filter(
            (email: string) => email !== userEmail,
        );
        const updatedAdmins = currentAdmins.filter(
            (email: string) => email !== userEmail,
        );

        await projectRef.update({
            members: updatedMembers,
            admins: updatedAdmins,
        });

        // 移除用户的项目引用
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
        }

        return {
            success: true,
            message: "User removed from project successfully",
        };
    } catch (error) {
        console.error("Error removing project member:", error);
        return { success: false, message: (error as Error).message };
    }
}

// 更新项目团队大小
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

        await projectRef.update({
            teamSize: teamSize,
        });

        return {
            success: true,
            message: "Team size updated successfully",
        };
    } catch (error) {
        console.error("Error updating project team size:", error);
        return { success: false, message: (error as Error).message };
    }
}

// 自动分配组织成员到项目
export async function autoAssignMembersToProjects(orgId: string) {
    const { userId } = await auth();
    if (!userId) {
        throw new Error("Unauthorized");
    }

    try {
        // 获取组织信息
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

        // 获取组织的所有项目
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
                ...data,
            };
        });

        // 计算当前已分配的成员
        const assignedMembers = new Set();
        projects.forEach((project) => {
            const projectMembers = (project.members as string[]) || [];
            projectMembers.forEach((member: string) =>
                assignedMembers.add(member),
            );
        });

        // 获取未分配的成员
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

        // 默认团队大小为3
        const defaultTeamSize = 3;
        let assignedCount = 0;

        // 为每个项目分配成员
        for (
            let i = 0;
            i < projects.length && unassignedMembers.length > 0;
            i++
        ) {
            const project = projects[i];
            const currentMembers = (project.members as string[]) || [];
            const spotsAvailable = defaultTeamSize - currentMembers.length;

            if (spotsAvailable > 0) {
                const membersToAdd = unassignedMembers.splice(
                    0,
                    spotsAvailable,
                );
                const updatedMembers = [...currentMembers, ...membersToAdd];

                // 更新项目成员
                await adminDb.collection("projects").doc(project.id).update({
                    members: updatedMembers,
                });

                // 为新成员添加项目引用
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

                assignedCount += membersToAdd.length;
            }
        }

        return {
            success: true,
            message: `Successfully assigned ${assignedCount} members to projects`,
            assigned: assignedCount,
            remaining: unassignedMembers.length,
        };
    } catch (error) {
        console.error("Error auto-assigning members:", error);
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
            console.log(`Migrating project: ${projId}`);

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
                            points: 1,
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
                ...(projectData?.admins || []),
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
