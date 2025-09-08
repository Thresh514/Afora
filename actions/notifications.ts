import { db } from "@/firebase";
import { addDoc, collection, doc, writeBatch } from "firebase/firestore";
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
    const notifRef = collection(db, "users", userID, "notifications");
    return addDoc(notifRef, notificationObject);
}

export async function sendNotificationBulk(notificationObject: Notification, userIDs: string[]) {
    const batch = writeBatch(db);
    
    userIDs.map(userID => {
        const notifRef = collection(db, "users", userID, "notifications");
        batch.set(doc(notifRef), notificationObject);
    });
    

    return batch.commit();
}