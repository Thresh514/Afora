# Afora Firebase/Firestore API 文档

## 概述

Afora使用Firebase/Firestore作为数据库，Clerk作为身份验证系统，Next.js Server Actions处理业务逻辑。

## Firestore 数据库结构

### 集合结构设计
afora-firestore/
├── users/ # 用户集合
│ └── {userEmail}/ # 文档ID: 用户邮箱
│ ├── email: string
│ ├── username: string
│ ├── userImage: string
│ ├── onboardingSurveyResponse: string[]
│ ├── orgs/ # 子集合：用户所属组织
│ │ └── {orgId}/
│ │ ├── userId: string
│ │ ├── role: "admin" | "member"
│ │ ├── orgId: string
│ │ └── projOnboardingSurveyResponse: string[]
│ └── projs/ # 子集合：用户所属项目
│ └── {projId}/
│ └── orgId: string
│
├── organizations/ # 组织集合
│ └── {orgId}/ # 文档ID: 自动生成
│ ├── title: string
│ ├── description: string
│ ├── admins: string[] # 管理员邮箱数组
│ ├── members: string[] # 成员邮箱数组
│ ├── backgroundImage?: string
│ ├── createdAt: Timestamp
│ └── projs/ # 子集合：组织项目
│ └── {projId}/
│ ├── projId: string
│ └── members: string[]
│
├── projects/ # 项目集合
│ └── {projId}/ # 文档ID: 自动生成
│ ├── orgId: string
│ ├── title: string
│ ├── members: string[]
│ ├── admins: string[]
│ ├── teamCharterResponse?: string[]
│ ├── createdAt: Timestamp
│ └── stages/ # 子集合：项目阶段
│ └── {stageId}/ # 文档ID: 自动生成
│ ├── id: string
│ ├── title: string
│ ├── order: number
│ ├── totalTasks: number
│ ├── tasksCompleted: number
│ └── tasks/ # 子集合：阶段任务
│ └── {taskId}/ # 文档ID: 自动生成
│ ├── id: string
│ ├── title: string
│ ├── description: string
│ ├── assignee?: string
│ ├── order: number
│ ├── isCompleted: boolean
│ ├── status: "available" | "assigned" | "in_progress" | "completed" | "overdue"
│ ├── soft_deadline?: string
│ ├── hard_deadline?: string
│ ├── points: number
│ ├── completion_percentage: number
│ ├── assigned_at?: Timestamp
│ ├── completed_at?: Timestamp
│ ├── can_be_reassigned: boolean
│ ├── public/ # 子集合：公开评论
│ │ └── {commentId}/
│ │ ├── msgId: string
│ │ ├── message: string
│ │ ├── time: Timestamp
│ │ └── uid: string
│ ├── private/ # 子集合：私有评论
│ │ └── {commentId}/
│ │ ├── msgId: string
│ │ ├── message: string
│ │ ├── time: Timestamp
│ │ └── uid: string
│ └── submissions/ # 子集合：任务提交
│ └── {submissionId}/
│ ├── user_email: string
│ ├── content: string
│ └── submitted_at: Timestamp
│
├── user_scores/ # 用户评分集合
│ └── {scoreId}/ # 文档ID: 自动生成
│ ├── user_email: string
│ ├── project_id: string
│ ├── total_points: number
│ ├── tasks_completed: number
│ ├── tasks_assigned: number
│ ├── average_completion_time: number
│ ├── streak: number
│ └── last_updated: Timestamp
│
└── team_compatibility_scores/ # 团队兼容性评分集合
└── {scoreId}/ # 文档ID: 自动生成
├── org_id: string
├── project_id?: string
├── user_email: string
├── communication_score: number
├── collaboration_score: number
├── technical_score: number
├── leadership_score: number
├── overall_score: number
└── last_updated: Timestamp

## Server Actions API

### 现有的 Actions (已在 actions/actions.ts 中)

#### 用户管理
- `createNewUser(userEmail, username, userImage)`
- `setUserOnboardingSurvey(selectedTags)`

#### 组织管理
- `createNewOrganization(orgName, orgDescription)`
- `deleteOrg(orgId)`
- `inviteUserToOrg(orgId, email, access)`
- `getOrganizationMembersResponses(orgId)`
- `setBgImage(orgId, imageUrl)`

#### 项目管理
- `updateProjects(orgId, groups)`
- `setTeamCharter(projId, teamCharterResponse)`
- `updateProjectTitle(projId, newTitle)`

#### 任务管理
- `createTask(projId, stageId, order)`
- `deleteTask(projId, stageId, taskId)`
- `updateTask(projId, stageId, taskId, title, description, soft_deadline, hard_deadline)`
- `setTaskComplete(projId, stageId, taskId, isCompleted)`
- `postComment(isPublic, projId, stageId, taskId, message, time, uid)`

### 需要新增的 Actions

#### 任务分配和完成
```typescript
// 任务分配
export async function assignTask(
  projId: string,
  stageId: string, 
  taskId: string, 
  assigneeEmail: string
): Promise<{success: boolean; message?: string}>

// 任务完成（带进度）
export async function completeTaskWithProgress(
  projId: string,
  stageId: string,
  taskId: string, 
  completionPercentage: number
): Promise<{success: boolean; points_earned?: number; message?: string}>

// 任务提交
export async function submitTask(
  projId: string,
  stageId: string,
  taskId: string, 
  content: string
): Promise<{success: boolean; submission_id?: string; message?: string}>

// 获取过期任务
export async function getOverdueTasks(
  projId: string
): Promise<{success: boolean; tasks?: any[]; message?: string}>
```

#### 评分和排行
```typescript
// 获取项目排行榜
export async function getProjectLeaderboard(
  projId: string
): Promise<{success: boolean; leaderboard?: any[]; message?: string}>

// 更新用户评分
export async function updateUserScore(
  userEmail: string,
  projectId: string, 
  points: number, 
  taskCompleted: boolean
): Promise<{success: boolean; new_total?: number; message?: string}>
```

## 环境配置

```env
# Firebase配置
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Clerk身份验证
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# 外部API
PEXELS_API_KEY=your_pexels_api_key
OPENAI_API_KEY=your_openai_api_key
```
```

## 2. types/firebase-types.ts

```typescript
// Firebase/Firestore 特定的 TypeScript 类型定义

import { Timestamp } from 'firebase/firestore';

// ================ 扩展现有类型 ================

// 基于现有的 Task 类型扩展
export interface FirestoreTask {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  order: number;
  isCompleted: boolean;
  status: 'available' | 'assigned' | 'in_progress' | 'completed' | 'overdue';
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
```

## 3. actions/taskActionsExample.ts

```typescript
'use server'

// 基于现有 actions/actions.ts 风格的任务管理扩展

import { adminDb } from "@/firebase-admin";
import { auth } from "@clerk/nextjs/server";
import { Timestamp } from "firebase/firestore";

// ================ 任务分配功能 ================

export async function assignTask(
  projId: string,
  stageId: string, 
  taskId: string, 
  assigneeEmail: string
) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  try {
    // 验证email格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(assigneeEmail)) {
      throw new Error('Invalid email format');
    }

    const taskRef = adminDb
      .collection('projects').doc(projId)
      .collection('stages').doc(stageId)
      .collection('tasks').doc(taskId);

    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    // 更新任务分配信息
    await taskRef.update({
      assignee: assigneeEmail,
      status: 'assigned',
      assigned_at: Timestamp.now()
    });

    // 更新用户任务统计
    await updateUserTaskStats(assigneeEmail, projId, 'assigned');

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: (error as Error).message };
  }
}

// ================ 任务完成功能（增强版） ================

export async function completeTaskWithProgress(
  projId: string,
  stageId: string,
  taskId: string, 
  completionPercentage: number = 100
) {
  const { userId, sessionClaims } = await auth();
  const userEmail = sessionClaims?.email;
  
  if (!userId || !userEmail) {
    throw new Error('Unauthorized');
  }

  try {
    if (completionPercentage < 0 || completionPercentage > 100) {
      throw new Error('Completion percentage must be between 0 and 100');
    }

    const taskRef = adminDb
      .collection('projects').doc(projId)
      .collection('stages').doc(stageId)
      .collection('tasks').doc(taskId);

    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    const taskData = taskDoc.data();
    if (taskData?.assignee !== userEmail) {
      throw new Error('Task not assigned to this user');
    }

    const isCompleted = completionPercentage >= 100;
    
    // 更新任务状态
    await taskRef.update({
      isCompleted: isCompleted,
      status: isCompleted ? 'completed' : 'in_progress',
      completion_percentage: completionPercentage,
      ...(isCompleted && { completed_at: Timestamp.now() })
    });

    // 如果任务完成，更新阶段进度和用户积分
    if (isCompleted) {
      // 更新阶段统计
      const stageRef = adminDb
        .collection('projects').doc(projId)
        .collection('stages').doc(stageId);

      const stageDoc = await stageRef.get();
      const stageData = stageDoc.data();
      
      if (stageData) {
        const tasksCompleted = stageData.tasksCompleted + 1;
        await stageRef.update({ tasksCompleted });
      }

      // 更新用户积分
      const points = taskData?.points || 10;
      await updateUserScore(userEmail, projId, points, true);
      await updateUserTaskStats(userEmail, projId, 'completed');

      // 检查是否解锁下一阶段
      await checkAndUnlockNextStage(projId, stageId);
    }

    return { 
      success: true, 
      points_earned: isCompleted ? (taskData?.points || 10) : 0 
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: (error as Error).message };
  }
}

// ================ 任务提交功能 ================

export async function submitTask(
  projId: string,
  stageId: string,
  taskId: string, 
  content: string
) {
  const { userId, sessionClaims } = await auth();
  const userEmail = sessionClaims?.email;
  
  if (!userId || !userEmail) {
    throw new Error('Unauthorized');
  }

  try {
    if (!content || content.trim().length === 0) {
      throw new Error('Submission content cannot be empty');
    }

    const taskRef = adminDb
      .collection('projects').doc(projId)
      .collection('stages').doc(stageId)
      .collection('tasks').doc(taskId);

    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      throw new Error('Task not found');
    }

    const taskData = taskDoc.data();
    if (taskData?.assignee !== userEmail) {
      throw new Error('You can only submit your own assigned tasks');
    }

    // 创建提交记录
    const submissionRef = taskRef.collection('submissions').doc();
    await submissionRef.set({
      user_email: userEmail,
      content: content.trim(),
      submitted_at: Timestamp.now()
    });

    return { success: true, submission_id: submissionRef.id };
  } catch (error) {
    console.error(error);
    return { success: false, message: (error as Error).message };
  }
}

// ================ 获取过期任务（悬赏面板） ================

export async function getOverdueTasks(projId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  try {
    const now = new Date();
    const stages = await adminDb
      .collection('projects').doc(projId)
      .collection('stages')
      .orderBy('order')
      .get();

    const overdueTasks: any[] = [];

    for (const stageDoc of stages.docs) {
      const tasks = await stageDoc.ref
        .collection('tasks')
        .orderBy('order')
        .get();
      
      for (const taskDoc of tasks.docs) {
        const taskData = taskDoc.data();
        
        if (
          !taskData.isCompleted && 
          taskData.soft_deadline && 
          new Date(taskData.soft_deadline) < now
        ) {
          overdueTasks.push({
            id: taskDoc.id,
            stage_id: stageDoc.id,
            stage_title: stageDoc.data()?.title,
            ...taskData
          });
        }
      }
    }

    return { success: true, tasks: overdueTasks };
  } catch (error) {
    console.error(error);
    return { success: false, message: (error as Error).message };
  }
}

// ================ 项目排行榜功能 ================

export async function getProjectLeaderboard(projId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  try {
    const scores = await adminDb
      .collection('user_scores')
      .where('project_id', '==', projId)
      .orderBy('total_points', 'desc')
      .get();

    const leaderboard = scores.docs.map(doc => ({
      userId: doc.id,
      email: doc.data().user_email,
      ...doc.data()
    }));

    return { success: true, leaderboard };
  } catch (error) {
    console.error(error);
    return { success: false, message: (error as Error).message };
  }
}

// ================ 辅助函数 ================

// 更新用户积分
async function updateUserScore(
  userEmail: string,
  projectId: string, 
  points: number, 
  taskCompleted: boolean
) {
  try {
    const scoresQuery = await adminDb
      .collection('user_scores')
      .where('user_email', '==', userEmail)
      .where('project_id', '==', projectId)
      .get();

    let scoreRef;
    let currentData = {
      total_points: 0,
      tasks_completed: 0,
      tasks_assigned: 0,
      streak: 0
    };

    if (scoresQuery.empty) {
      scoreRef = adminDb.collection('user_scores').doc();
    } else {
      scoreRef = scoresQuery.docs[0].ref;
      currentData = { ...currentData, ...scoresQuery.docs[0].data() };
    }

    const updateData = {
      user_email: userEmail,
      project_id: projectId,
      total_points: currentData.total_points + points,
      tasks_completed: taskCompleted ? currentData.tasks_completed + 1 : currentData.tasks_completed,
      last_updated: Timestamp.now()
    };

    await scoreRef.set(updateData, { merge: true });
    return { success: true, new_total: updateData.total_points };
  } catch (error) {
    console.error('Failed to update user score:', error);
  }
}

// 更新用户任务统计
async function updateUserTaskStats(
  userEmail: string,
  projectId: string, 
  action: 'assigned' | 'completed'
) {
  try {
    const scoresQuery = await adminDb
      .collection('user_scores')
      .where('user_email', '==', userEmail)
      .where('project_id', '==', projectId)
      .get();

    let scoreRef;
    let currentData = {
      tasks_completed: 0,
      tasks_assigned: 0,
      streak: 0
    };

    if (scoresQuery.empty) {
      scoreRef = adminDb.collection('user_scores').doc();
    } else {
      scoreRef = scoresQuery.docs[0].ref;
      currentData = { ...currentData, ...scoresQuery.docs[0].data() };
    }

    const updateData = {
      user_email: userEmail,
      project_id: projectId,
      ...(action === 'assigned' && { 
        tasks_assigned: currentData.tasks_assigned + 1 
      }),
      ...(action === 'completed' && { 
        tasks_completed: currentData.tasks_completed + 1,
        streak: currentData.streak + 1
      }),
      last_updated: Timestamp.now()
    };

    await scoreRef.set(updateData, { merge: true });
  } catch (error) {
    console.error('Failed to update user task stats:', error);
  }
}

// 检查并解锁下一阶段
async function checkAndUnlockNextStage(projId: string, currentStageId: string) {
  try {
    const currentStageDoc = await adminDb
      .collection('projects').doc(projId)
      .collection('stages').doc(currentStageId)
      .get();

    const currentStageData = currentStageDoc.data();
    if (!currentStageData) return;

    if (currentStageData.tasksCompleted >= currentStageData.totalTasks) {
      const nextStageOrder = currentStageData.order + 1;
      const nextStageQuery = await adminDb
        .collection('projects').doc(projId)
        .collection('stages')
        .where('order', '==', nextStageOrder)
        .get();

      if (!nextStageQuery.empty) {
        const nextStageDoc = nextStageQuery.docs[0];
        await nextStageDoc.ref.update({ 
          is_locked: false 
        });
      }
    }
  } catch (error) {
    console.error('Failed to check/unlock next stage:', error);
  }
}
```

## 4. QUICK_START_GUIDE.md

```markdown
# 🚀 Afora Firebase 后端快速开始指南

## ⚡ 15分钟快速实施

### 第1步：复制必需的文件 (5分钟)

```bash
# 1. 复制类型定义
cp types/firebase-types.ts your-project/types/

# 2. 创建新的action文件
mkdir -p actions
cp actions/taskActionsExample.ts your-project/actions/taskActions.ts
```

### 第2步：安装额外依赖 (2分钟)

```bash
# 安装AI功能依赖
npm install openai

# 安装数据验证依赖  
npm install zod
```

### 第3步：更新环境变量 (2分钟)

```env
# 添加到现有 .env.local
OPENAI_API_KEY=sk-your_openai_api_key
```

### 第4步：在前端集成新功能 (3分钟)

```typescript
// 在您的React组件中使用新的actions
import { assignTask, completeTaskWithProgress } from '@/actions/taskActions';

// 任务分配示例
const handleAssignTask = async () => {
  const result = await assignTask(projId, stageId, taskId, 'user@example.com');
  if (result.success) {
    toast.success('Task assigned!');
  }
};

// 任务完成示例
const handleCompleteTask = async () => {
  const result = await completeTaskWithProgress(projId, stageId, taskId, 100);
  if (result.success) {
    toast.success(`Task completed! Earned ${result.points_earned} points`);
  }
};
```

## 🎯 立即可以实现的功能

### ✅ 现在就可以添加的功能

1. **任务分配系统**
   - 复制 `taskActionsExample.ts` 中的 `assignTask` 函数
   - 在前端添加分配按钮

2. **任务完成进度**
   - 使用 `completeTaskWithProgress` 函数
   - 支持0-100%的完成进度

3. **任务提交系统**
   - 使用 `submitTask` 函数
   - 允许用户提交任务内容

4. **悬赏任务面板**
   - 使用 `getOverdueTasks` 函数
   - 显示过期可领取的任务

## 📊 数据库扩展

您需要在Firestore中添加这些新集合：

```javascript
// 新增集合结构
user_scores/                    // 用户积分统计
team_compatibility_scores/      // 团队兼容性评分

// 现有任务的子集合扩展
projects/{projId}/stages/{stageId}/tasks/{taskId}/
├── submissions/               // 任务提交记录
└── (评论集合已存在)
```

## 🔧 现有代码兼容性

✅ **完全兼容** - 所有新功能都基于您现有的代码风格：

- 使用相同的 `'use server'` 模式
- 保持现有的身份验证方式 (`auth()` from Clerk)
- 继续使用 `adminDb` 进行数据库操作
- 保持相同的错误处理模式
- 兼容现有的数据结构

## 🎯 推荐的实施顺序

### 阶段1：核心任务功能 (第1天)
1. 实现任务分配 (`assignTask`)
2. 实现任务完成 (`completeTaskWithProgress`)
3. 更新前端任务卡片组件

### 阶段2：提交和评论 (第2天)
1. 实现任务提交 (`submitTask`)
2. 获取提交记录 (`getTaskSubmissions`)
3. 前端提交界面

### 阶段3：悬赏和排行 (第3天)
1. 实现过期任务获取 (`getOverdueTasks`)
2. 实现用户积分系统
3. 创建排行榜页面

---

**开始实施：建议从 `taskActionsExample.ts` 开始，它包含了最常用的功能，并且与您现有代码完全兼容！** 🎉
```
