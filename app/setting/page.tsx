'use client'

import Unsafe from "@/components/Unsafe";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { autoDropOverdueTasks } from "@/actions/actions";
import { useState, useTransition } from "react";
import { toast } from "sonner";

function SettingPage() {
    const { user } = useUser();
    const [isPending, startTransition] = useTransition();
    const [lastDropResult, setLastDropResult] = useState<string>("");

    const handleAutoDropOverdueTasks = () => {
        startTransition(async () => {
            try {
                const result = await autoDropOverdueTasks();
                if (result.success) {
                    toast.success(`✅ ${result.message}`);
                    setLastDropResult(`处理了 ${result.tasksProcessed} 个过期任务`);
                } else {
                    toast.error(`❌ ${result.message}`);
                }
            } catch (error) {
                toast.error("执行失败: " + (error as Error).message);
            }
        });
    };

    if (!user) {
        // Show a loading state or a message if the user is not loaded
        return <div>Loading...</div>;
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-6xl px-4">
                <div className="flex flex-col items-center gap-4 p-4 bg-white shadow-md rounded-lg"> 
                    {user.imageUrl ? (
                        <Image 
                            src={user.imageUrl}
                            width={150}
                            height={150}
                            alt="Profile Picture"
                            className="rounded-full"
                        />
                    ) : (
                        <div className="w-36 h-36 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-gray-500">No Image</span>
                        </div>
                    )}
                    <div className="text-center">
                        <h1 className="text-2xl font-semibold">{user.fullName || "No Name Available"}</h1>
                        <p className="text-gray-500">
                            {user.primaryEmailAddress?.emailAddress || "No Email Available"}
                        </p>
                    </div>
                    
                    {/* 管理员功能区 */}
                    <div className="w-full mt-6 p-4 border-t border-gray-200">
                        <h2 className="text-lg font-semibold mb-4 text-center">系统管理</h2>
                        <div className="flex flex-col items-center gap-4">
                            <div className="text-center">
                                <h3 className="font-medium mb-2">自动处理过期任务</h3>
                                <p className="text-sm text-gray-500 mb-3">
                                    扫描并自动将超过 soft deadline 的已分配任务移动到 bounty pool
                                </p>
                                <Button 
                                    onClick={handleAutoDropOverdueTasks}
                                    disabled={isPending}
                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                >
                                    {isPending ? "处理中..." : "🔄 处理过期任务"}
                                </Button>
                                {lastDropResult && (
                                    <p className="text-sm text-green-600 mt-2">
                                        上次执行: {lastDropResult}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <Unsafe />
                </div>
            </div>
        </div>
    );
}

export default SettingPage;
