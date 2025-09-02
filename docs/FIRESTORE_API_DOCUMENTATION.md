# Afora Firebase/Firestore API Documentation

## Overview

Afora uses Firebase/Firestore as the database, Clerk as the authentication system, and Next.js Server Actions to handle business logic.

## Firestore Database Structure

### Collection Structure Design
afora-firestore/
├── users/ # User collection
│ └── {userEmail}/ # Document ID: User email
│ ├── email: string
│ ├── username: string
│ ├── userImage: string
│ ├── onboardingSurveyResponse: string[]
│ ├── orgs/ # Subcollection: User's organizations
│ │ └── {orgId}/
│ │ ├── userId: string
│ │ ├── role: "admin" | "member"
│ │ ├── orgId: string
│ │ └── projOnboardingSurveyResponse: string[]
│ └── projs/ # Subcollection: User's projects
│ └── {projId}/
│ └── orgId: string
│
├── organizations/ # Organization collection
│ └── {orgId}/ # Document ID: Auto-generated
│ ├── title: string
│ ├── description: string
│ ├── backgroundImage?: string
│ ├── createdAt: Timestamp
│ └── projs/ # Subcollection: Organization projects
│ └── {projId}/
│ ├── projId: string
│ └── members: string[]

# Note: Organization member management has been migrated to user collection
# Organization member information is now stored in users/{userEmail}/orgs/{orgId}
# Contains fields: userId, role, orgId, createdAt
│
├── projects/ # Project collection
│ └── {projId}/ # Document ID: Auto-generated
│ ├── orgId: string
│ ├── title: string
│ ├── members: string[]
│ ├── admins: string[]
│ ├── teamCharterResponse?: string[]
│ ├── createdAt: Timestamp
│ └── stages/ # Subcollection: Project stages
│ └── {stageId}/ # Document ID: Auto-generated
│ ├── id: string
│ ├── title: string
│ ├── order: number
│ ├── totalTasks: number
│ ├── tasksCompleted: number
│ └── tasks/ # Subcollection: Stage tasks
│ └── {taskId}/ # Document ID: Auto-generated
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
│ ├── public/ # Subcollection: Public comments
│ │ └── {commentId}/
│ │ ├── msgId: string
│ │ ├── message: string
│ │ ├── time: Timestamp
│ │ └── uid: string
│ ├── private/ # Subcollection: Private comments
│ │ └── {commentId}/
│ │ ├── msgId: string
│ │ ├── message: string
│ │ ├── time: Timestamp
│ │ └── uid: string
│ └── submissions/ # Subcollection: Task submissions
│ └── {submissionId}/
│ ├── user_email: string
│ ├── content: string
│ └── submitted_at: Timestamp
│
├── user_scores/ # User scores collection
│ └── {scoreId}/ # Document ID: Auto-generated
│ ├── user_email: string
│ ├── project_id: string
│ ├── total_points: number
│ ├── tasks_completed: number
│ ├── tasks_assigned: number
│ ├── average_completion_time: number
│ ├── streak: number
│ └── last_updated: Timestamp
│
└── team_compatibility_scores/ # Team compatibility scores collection
└── {scoreId}/ # Document ID: Auto-generated
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

### Existing Actions (already in actions/actions.ts)

#### User Management
- `createNewUser(userEmail, username, userImage)`
- `setUserOnboardingSurvey(selectedTags)`

#### Organization Management
- `createNewOrganization(orgName, orgDescription)`
- `deleteOrg(orgId)`
- `inviteUserToOrg(orgId, email, access)`
- `getOrganizationMembersResponses(orgId)`
- `setBgImage(orgId, imageUrl)`

#### Project Management
- `updateProjects(orgId, groups)`
- `setTeamCharter(projId, teamCharterResponse)`
- `updateProjectTitle(projId, newTitle)`

#### Task Management
- `createTask(projId, stageId, taskId, title, description, soft_deadline, hard_deadline, points)`
- `deleteTask(projId, stageId, taskId)`
- `updateTask(projId, stageId, taskId, title, description, soft_deadline, hard_deadline)`
- `setTaskComplete(projId, stageId, taskId, isCompleted)`
- `postComment(isPublic, projId, stageId, taskId, message, time, uid)`

### Actions to be Added

#### Task Assignment and Completion
```typescript
// Task assignment
export async function assignTask(
  projId: string,
  stageId: string, 
  taskId: string, 
  assigneeEmail: string
): Promise<{success: boolean; message?: string}>

// Task completion (with progress)
export async function completeTaskWithProgress(
  projId: string,
  stageId: string,
  taskId: string, 
  completionPercentage: number
): Promise<{success: boolean; points_earned?: number; message?: string}>

// Task submission
export async function submitTask(
  projId: string,
  stageId: string,
  taskId: string, 
  content: string
): Promise<{success: boolean; submission_id?: string; message?: string}>

// Get overdue tasks
export async function getOverdueTasks(
  projId: string
): Promise<{success: boolean; tasks?: any[]; message?: string}>
```

#### Scoring and Leaderboards
```typescript
// Get project leaderboard
export async function getProjectLeaderboard(
  projId: string
): Promise<{success: boolean; leaderboard?: any[]; message?: string}>

// Update user score
export async function updateUserScore(
  userEmail: string,
  projectId: string, 
  points: number, 
  taskCompleted: boolean
): Promise<{success: boolean; new_total?: number; message?: string}>
```

## Environment Configuration

```env
# Firebase configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# External APIs
PEXELS_API_KEY=your_pexels_api_key
OPENAI_API_KEY=your_openai_api_key
```
```

## 2. types/firebase-types.ts

```typescript
// Firebase/Firestore specific TypeScript type definitions

import { Timestamp } from 'firebase/firestore';

// ================ Extend existing types ================

// Extend based on existing Task type
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

// User scores
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

// Task submissions
export interface TaskSubmission {
  id: string;
  task_id: string;
  user_email: string;
  content: string;
  submitted_at: Timestamp;
}

// Comments
export interface TaskComment {
  msgId: string;
  message: string;
  time: Timestamp;
  uid: string;
}

// ================ Server Actions types ================

// Standard response
export interface ActionResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Task assignment request
export interface AssignTaskRequest {
  projId: string;
  stageId: string;
  taskId: string;
  assigneeEmail: string;
}

// Task completion response
export interface CompleteTaskResponse extends ActionResponse {
  points_earned?: number;
}

// Task submission response
export interface SubmitTaskResponse extends ActionResponse {
  submission_id?: string;
}

// Leaderboard response
export interface LeaderboardResponse extends ActionResponse {
  leaderboard?: UserScore[];
}

// Overdue tasks response
export interface OverdueTasksResponse extends ActionResponse {
  tasks?: FirestoreTask[];
}
```

## 3. actions/taskActionsExample.ts

```typescript
'use server'

// Task management extensions based on existing actions/actions.ts style

import { adminDb } from "@/firebase-admin";
import { auth } from "@clerk/nextjs/server";
import { Timestamp } from "firebase/firestore";

// ================ Task assignment functionality ================

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

    // Update user task statistics
    await updateUserTaskStats(assigneeEmail, projId, 'assigned');

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: (error as Error).message };
  }
}

// ================ Enhanced task completion functionality ================

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
    
    // Update task status
    await taskRef.update({
      isCompleted: isCompleted,
      status: isCompleted ? 'completed' : 'in_progress',
      completion_percentage: completionPercentage,
      ...(isCompleted && { completed_at: Timestamp.now() })
    });

    // If task is completed, update stage progress and user points
    if (isCompleted) {
      // Update stage statistics
      const stageRef = adminDb
        .collection('projects').doc(projId)
        .collection('stages').doc(stageId);

      const stageDoc = await stageRef.get();
      const stageData = stageDoc.data();
      
      if (stageData) {
        const tasksCompleted = stageData.tasksCompleted + 1;
        await stageRef.update({ tasksCompleted });
      }

      // Update user points
      const points = taskData?.points || 10;
      await updateUserScore(userEmail, projId, points, true);
      await updateUserTaskStats(userEmail, projId, 'completed');

      // Check if next stage should be unlocked
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

// ================ Task submission functionality ================

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

    // Create submission record
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

// ================ Get overdue tasks (bounty board) ================

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

// ================ Project leaderboard functionality ================

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

// ================ Helper functions ================

// Update user score
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

// Update user task statistics
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

// Check and unlock next stage
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
# 🚀 Afora Firebase Backend Quick Start Guide

## ⚡ 15-minute Quick Implementation

### Step 1: Copy Required Files (5 minutes)

```bash
# 1. Copy type definitions
cp types/firebase-types.ts your-project/types/

# 2. Create new action files
mkdir -p actions
cp actions/taskActionsExample.ts your-project/actions/taskActions.ts
```

### Step 2: Install Additional Dependencies (2 minutes)

```bash
# Install AI functionality dependencies
npm install openai

# Install data validation dependencies  
npm install zod
```

### Step 3: Update Environment Variables (2 minutes)

```env
# Add to existing .env.local
OPENAI_API_KEY=sk-your_openai_api_key
```

### Step 4: Integrate New Features in Frontend (3 minutes)

```typescript
// Use new actions in your React components
import { assignTask, completeTaskWithProgress } from '@/actions/taskActions';

// Task assignment example
const handleAssignTask = async () => {
  const result = await assignTask(projId, stageId, taskId, 'user@example.com');
  if (result.success) {
    toast.success('Task assigned!');
  }
};

// Task completion example
const handleCompleteTask = async () => {
  const result = await completeTaskWithProgress(projId, stageId, taskId, 100);
  if (result.success) {
    toast.success(`Task completed! Earned ${result.points_earned} points`);
  }
};
```

## 🎯 Features You Can Implement Immediately

### ✅ Features You Can Add Right Now

1. **Task Assignment System**
   - Copy `assignTask` function from `taskActionsExample.ts`
   - Add assignment button in frontend

2. **Task Completion Progress**
   - Use `completeTaskWithProgress` function
   - Support 0-100% completion progress

3. **Task Submission System**
   - Use `submitTask` function
   - Allow users to submit task content

4. **Bounty Task Board**
   - Use `getOverdueTasks` function
   - Display overdue tasks available for claiming

## 📊 Database Extensions

You need to add these new collections to Firestore:

```javascript
// New collection structure
user_scores/                    // User score statistics
team_compatibility_scores/      // Team compatibility scores

// Existing task subcollection extensions
projects/{projId}/stages/{stageId}/tasks/{taskId}/
├── submissions/               // Task submission records
└── (comment collections already exist)
```

## 🔧 Existing Code Compatibility

✅ **Fully Compatible** - All new features are based on your existing code style:

- Uses the same `'use server'` pattern
- Maintains existing authentication method (`auth()` from Clerk)
- Continues using `adminDb` for database operations
- Keeps the same error handling pattern
- Compatible with existing data structures

## 🎯 Recommended Implementation Order

### Phase 1: Core Task Features (Day 1)
1. Implement task assignment (`assignTask`)
2. Implement task completion (`completeTaskWithProgress`)
3. Update frontend task card components

### Phase 2: Submissions and Comments (Day 2)
1. Implement task submission (`submitTask`)
2. Get submission records (`getTaskSubmissions`)
3. Frontend submission interface

### Phase 3: Bounty and Leaderboards (Day 3)
1. Implement overdue task retrieval (`getOverdueTasks`)
2. Implement user scoring system
3. Create leaderboard page

---

**Start Implementation: We recommend starting with `taskActionsExample.ts`, which contains the most commonly used features and is fully compatible with your existing code!** 🎉
```
