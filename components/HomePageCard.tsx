import { db } from "@/firebase";
import { UserOrgData } from "@/types/types";
import { doc } from "firebase/firestore";
import Link from "next/link";
import React, { useState } from "react";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { Copy, Eye, EyeOff, Users } from "lucide-react";
import { toast } from "sonner";

interface HomePageCardProps {
    org: UserOrgData;
}

function HomePageCard({ org }: HomePageCardProps) {
    const [showAccessCode, setShowAccessCode] = useState(false);
    const [data, loading] = useDocumentData(
        org?.orgId ? doc(db, "organizations", org.orgId) : null,
        {
            snapshotListenOptions: { includeMetadataChanges: true }
        }
    );

    if (!org?.orgId || (!loading && !data)) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex flex-col h-96 shadow-lg rounded-2xl overflow-hidden bg-white dark:bg-gray-800 w-96 animate-pulse">
                <div className="h-32 bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 flex items-center justify-center p-6">
                    <p className="text-gray-500">Loading group data...</p>
                </div>
            </div>
        );
    }

    const basePath = `/org/${org.orgId}`;
    
    return (
        <Link href={basePath} className="block w-96 group">
            <div className="flex flex-col h-80 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-md">
                {/* 标题区域 */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative py-8 px-6">
                        <h1 className="text-3xl font-bold tracking-tight text-white truncate">
                            {data?.title}
                        </h1>
                    </div>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 bg-white dark:bg-gray-800 p-6">
                    <div className="space-y-6">
                        {/* 管理员信息 */}
                        {/* <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">
                                {data?.admins[0]}
                            </span>
                        </div> */}

                        {/* 描述文本 */}
                        <div>
                            <h2 className="text-md text-gray-900 dark:text-gray-100 mb-2">
                                Description:
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3">
                                {data?.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default HomePageCard;
