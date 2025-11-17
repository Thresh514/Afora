"use client";

import React, { useState } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    DragOverEvent,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Users, ArrowRightLeft } from "lucide-react";
import { showErrorToast } from "./ErrorDisplay";

// 成员项组件（可拖拽）
interface DraggableMemberItemProps {
    id: string;
    email: string;
    isAdmin?: boolean;
}

function DraggableMemberItem({ id, email, isAdmin }: DraggableMemberItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id,
        disabled: isAdmin, // 管理员不可拖拽
        data: {
            email,
            type: isAdmin ? 'admin' : 'member',
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    if (isAdmin) {
        // 管理员不可拖拽，只显示
        return (
            <div
                className="flex items-center gap-2 p-2 rounded-md transition-all duration-200 bg-red-100 border border-red-300 cursor-default shadow-sm"
            >
                <span className="text-sm truncate">{email}</span>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`flex items-center gap-2 p-2 rounded-md cursor-move transition-all duration-200 bg-green-100 border border-green-300 ${
                isDragging 
                    ? 'opacity-50 scale-95 shadow-none' 
                    : 'shadow-sm hover:shadow-md hover:border-green-400'
            }`}
        >
            <span className="text-sm truncate">{email}</span>
        </div>
    );
}

// 项目容器组件（可放置区域）
interface ProjectContainerProps {
    projectId: string;
    projectTitle: string;
    effectiveAdmins: string[];
    effectiveMembers: string[];
    remainingProposedMembers: string[];
    isDragOver: boolean;
    aiMatchingScore?: number | null;      // 添加这一行
    matchingReasoning?: string;            // 添加这一行
}

function ProjectContainer({
    projectId,
    projectTitle,
    effectiveAdmins,
    effectiveMembers,
    remainingProposedMembers,
    isDragOver,
    aiMatchingScore,      // 添加这一行
    matchingReasoning,    // 添加这一行
}: ProjectContainerProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: `project-${projectId}`,
        data: {
            type: 'project',
            projectId,
        },
    });

    const totalCount = effectiveAdmins.length + effectiveMembers.length + remainingProposedMembers.length;
    const showDragOver = isDragOver || isOver;

    return (
        <motion.div
            ref={setNodeRef}
            className={`border-2 border-dashed rounded-lg p-4 min-h-[200px] transition-all duration-200 relative ${
                showDragOver
                    ? 'border-blue-400 bg-blue-50 shadow-md scale-[1.02]'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
            whileHover={{ scale: 1.02 }}
        >
            {/* Project Header */}
            <div className="mb-3 pointer-events-none">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{projectTitle}</h3>
                    {/* 显示匹配分数 */}
                    {aiMatchingScore !== null && aiMatchingScore !== undefined && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-300">
                            <span className="text-xs font-semibold text-purple-700">
                                {aiMatchingScore.toFixed(1)}
                            </span>
                            <span className="text-xs text-purple-600">/100</span>
                        </div>
                    )}
                </div>
                <div className="text-sm text-gray-500">
                    {totalCount} members
                </div>
                {/* 显示匹配原因 */}
                {matchingReasoning && (
                    <div className="mt-1 text-xs text-gray-600 italic">
                        {matchingReasoning}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {/* Effective Admins */}
                {effectiveAdmins.map((adminEmail) => (
                    <DraggableMemberItem
                        key={`admin-${projectId}-${adminEmail}`}
                        id={`admin-${projectId}-${adminEmail}`}
                        email={adminEmail}
                        isAdmin={true}
                    />
                ))}

                {/* Effective Members */}
                {effectiveMembers.map((memberEmail) => (
                    <DraggableMemberItem
                        key={`member-${projectId}-${memberEmail}`}
                        id={`member-${projectId}-${memberEmail}`}
                        email={memberEmail}
                        isAdmin={false}
                    />
                ))}

                {/* Remaining AI Proposed Members */}
                {remainingProposedMembers.map((memberEmail) => (
                    <DraggableMemberItem
                        key={`proposed-${projectId}-${memberEmail}`}
                        id={`proposed-${projectId}-${memberEmail}`}
                        email={memberEmail}
                        isAdmin={false}
                    />
                ))}

                {/* Empty state */}
                {totalCount === 0 && (
                    <div className="text-center text-gray-400 py-8 pointer-events-none">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <div className="text-sm">No members</div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// 主组件接口
interface SmartMatchingDragDropProps {
    projects: Array<{
        projId: string;
        title: string;
        members: string[];
        admins: string[];
    }>;
    previewData: {
        preview: Array<{
            projectId: string;
            proposedNewMembers: string[];
            aiMatchingScore: number | null;  // 添加这一行
            matchingReasoning: string;      // 添加这一行
        }>;
    };
    previewChanges: {
        [projectId: string]: {
            addedMembers: string[];
            removedMembers: string[];
            addedAdmins: string[];
            removedAdmins: string[];
        };
    };
    onMemberTransfer: (memberEmail: string, fromProjectId: string, toProjectId: string) => void;
}

export default function SmartMatchingDragDrop({
    projects,
    previewData,
    previewChanges,
    onMemberTransfer,
}: SmartMatchingDragDropProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [dragOverProject, setDragOverProject] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 需要移动 8px 才开始拖拽，避免误触
            },
        })
    );

    // 解析拖拽项的 ID，提取项目 ID 和成员邮箱
    const parseDragId = (id: string): { projectId: string; email: string; type: 'admin' | 'member' | 'proposed' } | null => {
        if (id.startsWith('admin-')) {
            const parts = id.replace('admin-', '').split('-');
            const projectId = parts[0];
            const email = parts.slice(1).join('-');
            return { projectId, email, type: 'admin' };
        } else if (id.startsWith('member-')) {
            const parts = id.replace('member-', '').split('-');
            const projectId = parts[0];
            const email = parts.slice(1).join('-');
            return { projectId, email, type: 'member' };
        } else if (id.startsWith('proposed-')) {
            const parts = id.replace('proposed-', '').split('-');
            const projectId = parts[0];
            const email = parts.slice(1).join('-');
            return { projectId, email, type: 'proposed' };
        }
        return null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        if (!over) {
            setDragOverProject(null);
            return;
        }

        // 检查是否拖拽到了项目容器上
        const overId = over.id as string;
        if (overId.startsWith('project-')) {
            const projectId = overId.replace('project-', '');
            setDragOverProject(projectId);
        } else {
            // 拖到了成员项上，解析出项目 ID
            const parsed = parseDragId(overId);
            if (parsed) {
                setDragOverProject(parsed.projectId);
            } else {
                setDragOverProject(null);
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        
        setActiveId(null);
        setDragOverProject(null);

        if (!over) return;

        const activeParsed = parseDragId(active.id as string);
        if (!activeParsed) return;

        // 管理员不可拖拽
        if (activeParsed.type === 'admin') {
            return;
        }

        // 获取目标项目 ID
        let targetProjectId: string | null = null;
        
        const overId = over.id as string;
        if (overId.startsWith('project-')) {
            // 拖到了项目容器上
            targetProjectId = overId.replace('project-', '');
        } else {
            // 拖到了另一个成员项上
            const overParsed = parseDragId(overId);
            if (overParsed) {
                targetProjectId = overParsed.projectId;
            } else {
                return;
            }
        }

        // 如果是同一个项目，不处理
        if (activeParsed.projectId === targetProjectId) {
            return;
        }

        // 检查目标项目是否已包含该成员
        const targetProject = projects.find(p => p.projId === targetProjectId);
        if (targetProject) {
            const targetChanges = previewChanges[targetProjectId] || {
                addedMembers: [],
                removedMembers: [],
                addedAdmins: [],
                removedAdmins: [],
            };

            const effectiveMembers = [
                ...(targetProject.members || []).filter(m => !targetChanges.removedMembers.includes(m)),
                ...targetChanges.addedMembers,
            ];
            const effectiveAdmins = [
                ...(targetProject.admins || []).filter(a => !targetChanges.removedAdmins.includes(a)),
                ...targetChanges.addedAdmins,
            ];

            if (effectiveMembers.includes(activeParsed.email) || effectiveAdmins.includes(activeParsed.email)) {
                showErrorToast({
                    type: "smart_matching",
                    message: "Member is already in this project",
                    canRetry: false,
                });
                return;
            }
        }

        // 确定源项目 ID
        // proposed 类型的成员来自它们当前所在的项目
        // 如果是从 AI 建议的未分配成员，fromProjectId 应该是 "unassigned"
        let fromProjectId = activeParsed.projectId;
        
        // 对于 proposed 类型，它们已经在某个项目中显示（作为 AI 建议）
        // 但如果它们还没有被手动添加到任何项目，则视为 "unassigned"
        if (activeParsed.type === 'proposed') {
            // 检查这个成员是否已经在任何项目的 addedMembers 或 addedAdmins 中
            const isManuallyAdded = Object.values(previewChanges).some(changes =>
                changes.addedMembers.includes(activeParsed.email) || 
                changes.addedAdmins.includes(activeParsed.email)
            );
            
            if (!isManuallyAdded) {
                // 这是一个纯 AI 建议的成员，还没有被手动添加，视为 "unassigned"
                fromProjectId = "unassigned";
            }
            // 否则，fromProjectId 保持为 activeParsed.projectId（它当前显示的项目）
        }

        // 执行转移
        onMemberTransfer(activeParsed.email, fromProjectId, targetProjectId);
    };

    // 计算每个项目的有效成员
    const getProjectEffectiveData = (project: typeof projects[0]) => {
        const aiPreview = previewData.preview?.find((p) => p.projectId === project.projId);
        const proposedNewMembers = aiPreview?.proposedNewMembers || [];
        const aiMatchingScore = aiPreview?.aiMatchingScore ?? null;
        const matchingReasoning = aiPreview?.matchingReasoning || "";
        
        const projectChanges = previewChanges[project.projId] || {
            addedMembers: [],
            removedMembers: [],
            addedAdmins: [],
            removedAdmins: [],
        };

        const effectiveMembersRaw = [
            ...(project.members || []).filter(m => !projectChanges.removedMembers.includes(m)),
            ...projectChanges.addedMembers,
        ];

        const effectiveAdminsRaw = [
            ...(project.admins || []).filter(a => !projectChanges.removedAdmins.includes(a)),
            ...projectChanges.addedAdmins,
        ];

        // 去重并确保管理员不出现在成员列表
        const effectiveAdmins = Array.from(new Set(effectiveAdminsRaw));
        const effectiveMembers = Array.from(new Set(effectiveMembersRaw)).filter(m => !effectiveAdmins.includes(m));

        // 过滤 AI 提议：去重，排除已在任一项目被手动加入，且排除已在当前有效成员/管理员中的邮箱
        const remainingProposedMembers = Array.from(new Set(proposedNewMembers))
            .filter((email: string) =>
                !Object.values(previewChanges).some(changes =>
                    changes.addedMembers.includes(email) || changes.addedAdmins.includes(email)
                )
            )
            .filter((email: string) => !effectiveMembers.includes(email) && !effectiveAdmins.includes(email));

        return { effectiveAdmins, effectiveMembers, remainingProposedMembers, aiMatchingScore, matchingReasoning };
    };

    // 获取当前拖拽的成员信息
    const getActiveMemberInfo = () => {
        if (!activeId) return null;
        const parsed = parseDragId(activeId);
        if (!parsed) return null;
        return parsed.email;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <ArrowRightLeft className="h-4 w-4" />
                Drag members between projects to adjust assignments
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => {
                        const { 
                            effectiveAdmins, 
                            effectiveMembers, 
                            remainingProposedMembers,
                            aiMatchingScore,      // 添加这一行
                            matchingReasoning     // 添加这一行
                        } = getProjectEffectiveData(project);

                        return (
                            <ProjectContainer
                                key={project.projId}
                                projectId={project.projId}
                                projectTitle={project.title}
                                effectiveAdmins={effectiveAdmins}
                                effectiveMembers={effectiveMembers}
                                remainingProposedMembers={remainingProposedMembers}
                                isDragOver={dragOverProject === project.projId}
                                aiMatchingScore={aiMatchingScore}      // 添加这一行
                                matchingReasoning={matchingReasoning}  // 添加这一行
                            />
                        );
                    })}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-green-100 border border-green-300 shadow-lg">
                            <span className="text-sm">{getActiveMemberInfo()}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

