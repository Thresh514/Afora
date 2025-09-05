"use client";

import { Notification, sendNotification } from "@/actions/notifications";
import { db } from "@/firebase";
import { useUser } from "@clerk/nextjs";
import { collection, doc, updateDoc } from "firebase/firestore";
import { Bell, Check, Mail, MessageSquare, Star, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useCollection } from "react-firebase-hooks/firestore";

const mockNotifications: Notification[] = [
    {
        id: "1",
        type: "message",
        title: "New Message",
        description: "Tony Stark sent you a message in team 'AI Assistant'",
        time: "Just now",
        read: false,
    },
    {
        id: "2",
        type: "mention",
        title: "New Mention",
        description: "Bruce Banner mentioned you in task 'Performance Optimization'",
        time: "30 mins ago",
        read: false,
    },
    {
        id: "3",
        type: "follow",
        title: "New Follower",
        description: "Peter Parker started following your team updates",
        time: "2 hours ago",
        read: true,
    },
    {
        id: "4",
        type: "star",
        title: "Team Starred",
        description: "Your team 'Team Collaboration Platform' received a new star",
        time: "Yesterday",
        read: true,
    },
    {
        id: "5",
        type: "system",
        title: "System Notice",
        description: "System maintenance scheduled for tonight, estimated duration: 2 hours",
        time: "2 days ago",
        read: true,
    },
];

const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
        case "message":
            return <MessageSquare className="h-5 w-5" />;
        case "mention":
            return <Mail className="h-5 w-5" />;
        case "follow":
            return <UserPlus className="h-5 w-5" />;
        case "star":
            return <Star className="h-5 w-5" />;
        case "system":
            return <Bell className="h-5 w-5" />;
    }
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const { user } = useUser();
    // use the user's email as the user document id
    const userEmail = user?.primaryEmailAddress?.emailAddress || "";

    // subscribe to the user's notifications subcollection
    const [notifSnapshot, notifLoading, notifError] = useCollection(
        userEmail ? collection(db, "users", userEmail, "notifications") : null,
    );

    // map Firestore docs into Notification[]
    useEffect(() => {
        setLoading(notifLoading);
        setError(notifError);

        if (!notifSnapshot) {
            setNotifications([]);
            return;
        }

        const mapped = notifSnapshot.docs.map(docSnap => {
            const data: any = docSnap.data();
            return {
                id: docSnap.id,
                type: data.type ?? "system",
                title: data.title ?? "",
                description: data.description ?? "",
                // try to coerce createdAt Timestamp to readable string, fallback to provided time string
                time: data.createdAt && typeof data.createdAt.toDate === "function"
                    ? data.createdAt.toDate().toLocaleString()
                    : (data.time ?? ""),
                read: !!data.read,
                link: data.link ?? undefined,
            } as Notification;
        });

        setNotifications(mapped);
    }, [notifSnapshot, notifLoading, notifError]);

    // update Firestore and optimistic UI when marking read
    const markAsRead = async (id: string) => {
        // optimistic update locally
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

        if (!userEmail) return;

        try {
            const docRef = doc(db, "users", userEmail, "notifications", id);
            await updateDoc(docRef, { read: true });
        } catch (e) {
            // revert optimistic change on error (simple approach)
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
            console.error("Failed to mark notification read:", e);
        }
    };

    function sendTestNotif() {
        sendNotification({
        id: "112",
        type: "message",
        title: "Hello!!!",
        description: "Hi hi hi hi hi",
        time: "Just now",
        read: false,
    }, userEmail);
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Notifications</h1>
                <p>This is a mock page for notifications.</p>
                <button className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm" onClick={sendTestNotif}>Send Notif</button>
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                    {unreadCount} unread
                </div>
            </div>

            <div className="space-y-4">
                {notifications.length>0?
                    notifications.map((notification) => {
                        const { link } = notification;
                        return (
                            <div
                                key={notification.id}
                                className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                                    notification.read ? 'bg-white' : 'bg-purple-50'
                                } hover:bg-purple-50/80`}
                                style={{cursor: link? "pointer" : "auto"}}
                                onClick={link? _=>document.location.assign(link) : undefined}
                            >
                                <div className={`p-2 rounded-full ${
                                    notification.read ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-600'
                                }`}>
                                    {getNotificationIcon(notification.type)}
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-gray-900">
                                            {notification.title}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">
                                                {notification.time}
                                            </span>
                                            {!notification.read && (
                                                <button
                                                    onClick={evt => {
                                                        evt.stopPropagation();
                                                        markAsRead(notification.id)
                                                    }}
                                                    className="text-purple-600 hover:text-purple-700"
                                                    title="Mark as read"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-600 mt-1">
                                        {notification.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                    :
                    (<div>You have no notifications!</div>)
                }
            </div>
        </div>
    );
}
