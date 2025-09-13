import { adminDb } from "@/firebase-admin";

export interface Notification {
    id: string;
    type: "welcome" | "message" | "mention" | "follow" | "star" | "system";
    title: string;
    description: string;
    link?: string;
    time: string;
    read: boolean;
}

export async function sendNotification(notificationObject: Notification, userID: string) {
    return adminDb
        .collection("users").doc(userID)
        .collection("notifications").add(notificationObject);
}

export async function sendNotificationBulk(notificationObject: Notification, userIDs: string[]) {
    const batch = adminDb.batch();

    userIDs.map(userEmail => {
        const newNotificationRef = adminDb.collection("users").doc(userEmail).collection("notifications").doc();
        batch.set(newNotificationRef, notificationObject);
    });
    

    return batch.commit();
}