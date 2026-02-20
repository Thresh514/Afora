"use client";

import { Notification } from "@/actions/notifications";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell, Check, Mail, MessageSquare, Star, UserPlus } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

const mockNotifications: Notification[] = [
    {
        id: "1",
        type: "message",
        title: "New Message",
        description: "Tony Stark sent you a message in team 'AI Assistant'",
        link: "https://www.google.com",
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
];

const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
        case "message":
            return <MessageSquare className="h-4 w-4" />;
        case "mention":
            return <Mail className="h-4 w-4" />;
        case "follow":
            return <UserPlus className="h-4 w-4" />;
        case "star":
            return <Star className="h-4 w-4" />;
        case "system":
            return <Bell className="h-4 w-4" />;
        default:
            return <Bell className="h-4 w-4" />;
    }
};

export default function NotificationDropdown() {
    const [notifications, setNotifications] = useState(mockNotifications);
    const [open, setOpen] = useState(false);

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-white hover:text-white hover:bg-white/20"
                >
                    <Bell className="h-8 w-8" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-0"
                align="end"
                sideOffset={8}
            >
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {unreadCount} unread
                        </span>
                    )}
                </div>
                <ScrollArea className="h-[280px]">
                    <div className="space-y-0">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const { link } = notification;
                                return (
                                    <div
                                        key={notification.id}
                                        className={`flex items-start gap-3 border-b p-3 last:border-b-0 transition-colors ${
                                            notification.read
                                                ? "bg-background"
                                                : "bg-muted/50"
                                        } hover:bg-muted/80 cursor-default`}
                                        onClick={
                                            link
                                                ? () => {
                                                      if (link.startsWith("/")) {
                                                          window.location.href =
                                                              link;
                                                      } else {
                                                          window.open(
                                                              link,
                                                              "_blank"
                                                          );
                                                      }
                                                      setOpen(false);
                                                  }
                                                : undefined
                                        }
                                        style={{
                                            cursor: link ? "pointer" : "default",
                                        }}
                                    >
                                        <div
                                            className={`shrink-0 rounded-full p-1.5 ${
                                                notification.read
                                                    ? "bg-muted text-muted-foreground"
                                                    : "bg-primary/10 text-primary"
                                            }`}
                                        >
                                            {getNotificationIcon(
                                                notification.type
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium truncate">
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(
                                                                notification.id
                                                            );
                                                        }}
                                                        className="shrink-0 text-primary hover:text-primary/80"
                                                        title="Mark as read"
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {notification.description}
                                            </p>
                                            <span className="text-[10px] text-muted-foreground">
                                                {notification.time}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
                <div className="border-t p-2">
                    <Link
                        href="/notifications"
                        onClick={() => setOpen(false)}
                        className="block w-full rounded-md px-3 py-2 text-center text-sm font-medium text-primary hover:bg-muted"
                    >
                        View all notifications
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
