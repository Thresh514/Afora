# 🚀 Afora Firebase 后端快速开始指南

## ⚡ 15分钟快速实施

### 第1步：复制必需的文件 (2分钟)

```bash
# 1. 复制类型定义
cp types/firebase-types.ts your-project/types/

# 2. 所有新增的 actions 已经在 actions/actions.ts 中
# 无需额外操作，所有功能都已经集成在主文件中！
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
import { assignTask, completeTaskWithProgress } from '@/actions/actions';

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
   - 直接使用 `actions/actions.ts` 中的 `assignTask` 函数
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

**开始实施：所有功能都已集成在 `actions/actions.ts` 中，直接使用即可！** 🎉

## 🔄 数据库迁移步骤

### 迁移现有数据到新结构

如果您已经有现有的任务数据，需要运行迁移脚本：

```typescript
// 1. 迁移任务数据
import { migrateTasksToTaskPool } from '@/actions/actions';

const result = await migrateTasksToTaskPool();
// console.log(result.message);

// 2. 初始化用户积分
import { initializeUserScores } from '@/actions/actions';

const scoreResult = await initializeUserScores();
// console.log(scoreResult.message);
```

### 数据库结构变更总结

#### 任务 (Tasks) 新增字段：
- `status`: 'available' | 'assigned' | 'in_progress' | 'completed' | 'overdue'
- `points`: number (积分)
- `completion_percentage`: number (0-100)
- `can_be_reassigned`: boolean
- `assigned_at`: Timestamp (分配时间)
- `completed_at`: Timestamp (完成时间)
- 字段重命名：`assignedTo` → `assignee`

#### 新增集合：
```
user_scores/
├── user_email: string
├── project_id: string
├── total_points: number
├── tasks_completed: number
├── tasks_assigned: number
├── average_completion_time: number
├── streak: number
└── last_updated: Timestamp

team_compatibility_scores/
├── org_id: string
├── project_id: string
├── user_email: string
├── communication_score: number
├── collaboration_score: number
├── technical_score: number
├── leadership_score: number
├── overall_score: number
└── last_updated: Timestamp

tasks/{taskId}/submissions/
├── user_email: string
├── content: string
└── submitted_at: Timestamp
```

### 前端集成示例

```typescript
// 在 React 组件中使用新功能
import { 
  assignTask, 
  completeTaskWithProgress, 
  getOverdueTasks,
  getProjectLeaderboard 
} from '@/actions/actions';

// 任务分配
const handleAssign = async (taskId: string, userEmail: string) => {
  const result = await assignTask(projId, stageId, taskId, userEmail);
  if (result.success) {
    toast.success('任务分配成功！');
  }
};

// 任务完成
const handleComplete = async (taskId: string) => {
  const result = await completeTaskWithProgress(projId, stageId, taskId, 100);
  if (result.success) {
    toast.success(`任务完成！获得 ${result.points_earned} 积分`);
  }
};

// 获取过期任务
const loadOverdueTasks = async () => {
  const result = await getOverdueTasks(projId);
  if (result.success) {
    setOverdueTasks(result.tasks);
  }
};

// 获取排行榜
const loadLeaderboard = async () => {
  const result = await getProjectLeaderboard(projId);
  if (result.success) {
    setLeaderboard(result.leaderboard);
  }
};
```

## 📝 实施检查清单

- [ ] 复制类型定义文件 (`types/firebase-types.ts`)
- [ ] 确认 `actions/actions.ts` 包含所有新功能
- [ ] 运行数据库迁移脚本（从 `actions/actions.ts` 导入）
- [ ] 更新前端组件以使用新的 actions
- [ ] 测试任务分配功能
- [ ] 测试任务完成和积分系统
- [ ] 测试悬赏任务面板
- [ ] 测试排行榜功能
- [ ] 配置团队兼容性评分（可选）

## 🚀 立即开始

**强烈建议按以下顺序实施：**
1. 先运行数据库迁移
2. 测试基础任务分配功能
3. 逐步添加高级功能

这样可以确保您的现有数据不受影响，同时平滑过渡到新的任务池系统！