// Firebase/Firestore 特定的 TypeScript 类型定义

import { Timestamp } from "firebase/firestore";

// ================ 扩展现有类型 ================

// 基于现有的 Task 类型扩展
export interface FirestoreTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  order: number;
  isCompleted: boolean;
  status: "available" | "assigned" | "in_progress" | "completed" | "overdue";
  soft_deadline?: string;
  hard_deadline?: string;
  points: number;
  completion_percentage: number;
  assigned_at?: Timestamp;
  completed_at?: Timestamp;
  can_be_reassigned: boolean;
}

// 用户评分
export interface UserScore {
  id: string;
  user_email: string;
  project_id: string;
  total_points: number;
  tasks_completed: number;
  tasks_assigned: number;
  average_completion_time: number;
  streak: number;
  last_updated: Timestamp;
}

// 任务提交
export interface TaskSubmission {
  id: string;
  task_id: string;
  user_email: string;
  content: string;
  submitted_at: Timestamp;
}

// 评论
export interface TaskComment {
  msgId: string;
  message: string;
  time: Timestamp;
  uid: string;
}

// ================ Server Actions 类型 ================

// 标准响应
export interface ActionResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// 任务分配请求
export interface AssignTaskRequest {
  projId: string;
  stageId: string;
  taskId: string;
  assigneeEmail: string;
}

// 任务完成响应
export interface CompleteTaskResponse extends ActionResponse {
  points_earned?: number;
}

// 任务提交响应
export interface SubmitTaskResponse extends ActionResponse {
  submission_id?: string;
}

// 排行榜响应
export interface LeaderboardResponse extends ActionResponse {
  leaderboard?: UserScore[];
}

// 过期任务响应
export interface OverdueTasksResponse extends ActionResponse {
  tasks?: FirestoreTask[];
}
