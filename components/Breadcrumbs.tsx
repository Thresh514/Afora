"use client";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import { db } from "@/firebase";
import { Organization, Project, Stage, Task } from "@/types/types";
import { doc } from "firebase/firestore";

import { usePathname } from "next/navigation";
import { Fragment, useEffect, useMemo } from "react";
import { useDocument } from "react-firebase-hooks/firestore";

// 文本截断函数
const truncateText = (text: string, maxLength: number = 15) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
};

function Breadcrumbs() {
    // Adds a path that a user can refer to know where they are and click to "parent" directories
    const path = usePathname();

    // console.log(`Path: "${path}"`);

    const segments = useMemo(() => {
        const pathSegments = path
            ? path.split("/").filter((segment) => segment !== "")
            : [];
        
        // Filter out non-org routes
        if (pathSegments.length >= 1 && pathSegments[0] !== "org") {
            return [];
        }
        
        return pathSegments;
    }, [path]);

    useEffect(() => {
        // console.log(segments);
    }, [segments]);

    // Determine route structure
    const isOrgRoute = segments.length >= 2 && segments[0] === "org";
    const isProjRoute = segments.length >= 4 && segments[2] === "proj";
    const isStageRoute = segments.length >= 6 && segments[4] === "stage";
    const isTaskRoute = segments.length >= 8 && segments[6] === "task";
    const isLeaderboardRoute =
        segments.length >= 5 && segments[4] === "leaderboard";

    // Get document references based on route structure
    const orgDocRef = isOrgRoute ? doc(db, "organizations", segments[1]) : null;
    const [orgDoc] = useDocument(orgDocRef);

    const projDocRef = isProjRoute ? doc(db, "projects", segments[3]) : null;
    const [projDoc] = useDocument(projDocRef);

    const stageDocRef =
        isStageRoute
            ? doc(db, "projects", segments[3], "stages", segments[5])
            : null;
    const [stageDoc] = useDocument(stageDocRef);

    const taskDocRef =
        isTaskRoute
            ? doc(
                  db,
                  "projects",
                  segments[3],
                  "stages",
                  segments[5],
                  "tasks",
                  segments[7],
              )
            : null;
    const [taskDoc] = useDocument(taskDocRef);

    // Get titles from documents
    const orgTitle =
        orgDoc && orgDoc.exists()
            ? (orgDoc.data() as Organization).title
            : null;
    const projTitle =
        projDoc && projDoc.exists()
            ? (projDoc.data() as Project).title
            : null;
    const stageTitle =
        stageDoc && stageDoc.exists()
            ? (stageDoc.data() as Stage).title
            : null;
    const taskTitle =
        taskDoc && taskDoc.exists() ? (taskDoc.data() as Task).title : null;
    const leaderboardTitle = isLeaderboardRoute ? "Leaderboard" : null;

    // 定义breadcrumb项目类型
    type BreadcrumbItemType = {
        title: string;
        href: string;
        isActive?: boolean;
        isEllipsis?: boolean;
    };

    // 计算需要显示的breadcrumb项目数量
    const breadcrumbItems: BreadcrumbItemType[] = [];

    // Home
    breadcrumbItems.push({ title: "Home", href: "/" });

    // Organization
    if (isOrgRoute && orgTitle) {
        breadcrumbItems.push({
            title: truncateText(orgTitle, 12),
            href: `/${segments.slice(0, 2).join("/")}`,
            isActive: !isProjRoute,
        });
    }

    // Project
    if (isProjRoute && projTitle) {
        breadcrumbItems.push({
            title: truncateText(projTitle, 12),
            href: `/${segments.slice(0, 4).join("/")}`,
            isActive: isLeaderboardRoute || (!isStageRoute && !isTaskRoute),
        });
    }

    // Stage
    if (isStageRoute && stageTitle) {
        breadcrumbItems.push({
            title: truncateText(stageTitle, 12),
            href: `/${segments.slice(0, 6).join("/")}`,
            isActive: !isTaskRoute,
        });
    }

    // Task
    if (isTaskRoute && taskTitle) {
        breadcrumbItems.push({
            title: truncateText(taskTitle, 12),
            href: "",
            isActive: true,
        });
    }

    // Leaderboard
    if (isLeaderboardRoute && leaderboardTitle) {
        breadcrumbItems.push({
            title: leaderboardTitle,
            href: "",
            isActive: true,
        });
    }

    // 如果有超过3个项目，显示省略号
    let displayItems: BreadcrumbItemType[] = breadcrumbItems;
    if (breadcrumbItems.length > 4) {
        displayItems = [
            breadcrumbItems[0], // Home
            { title: "...", href: "", isEllipsis: true },
            ...breadcrumbItems.slice(-2), // 最后两个项目
        ];
    }

    return (
        <Breadcrumb className="hidden md:block">
            <BreadcrumbList className="text-white text-sm">
                {displayItems.map((item, index) => (
                    <Fragment key={index}>
                        {index > 0 && (
                            <BreadcrumbSeparator className="text-white" />
                        )}
                        <BreadcrumbItem>
                            {item.isEllipsis ? (
                                <BreadcrumbEllipsis className="text-white" />
                            ) : item.isActive ? (
                                <BreadcrumbPage
                                    className="text-white font-medium max-w-[120px] truncate"
                                    title={item.title}
                                >
                                    {item.title}
                                </BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink
                                    href={item.href}
                                    className="text-white hover:text-gray-200 max-w-[120px] truncate"
                                    title={item.title}
                                >
                                    {item.title}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

export default Breadcrumbs;
