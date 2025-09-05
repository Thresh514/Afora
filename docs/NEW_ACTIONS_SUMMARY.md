# New Actions Summary - Based on Updated Schema

## 📋 概述

`actions/newActions.ts` 文件已经完全根据新的数据库 schema 进行了更新，支持以下核心功能：

### 🗄️ 数据库结构支持

1. **用户-组织关系**: `users/{email}/orgs/{orgId}`
2. **项目成员索引**: `joinedProjs` 数组（只存储项目ID）
3. **项目详细信息**: `users/{email}/orgs/{orgId}/projects/{projId}` subcollection
4. **积分系统**: 每个项目都有完整的积分追踪
5. **项目级 onboarding survey**: 存储在项目 subcollection 中

## 🔧 函数分类 (25个函数)

### 1. 用户管理 (4个函数)
- `createNewUser` - 创建新用户
- `setUserOnboardingSurvey` - 设置用户入门调查
- `updateUserMatchingPreference` - 更新用户匹配偏好
- `getUserMatchingPreference` - 获取用户匹配偏好

### 2. 组织管理 (7个函数)
- `createNewOrganization` - 创建新组织
- `deleteOrg` - 删除组织
- `inviteUserToOrg` - 邀请用户到组织
- `upgradeUserRole` - 升级用户角色
- `removeUserFromOrg` - 从组织移除用户
- `getOrganizationMembers` - 获取组织成员
- `setBgImage` - 设置组织背景图片

### 3. 项目管理 (7个函数)
- `createProject` - 创建项目
- `deleteProject` - 删除项目
- `updateProjectTitle` - 更新项目标题
- `setTeamCharter` - 设置团队章程
- `updateProjectTeamSize` - 更新项目团队大小
- `getProjectMembers` - 获取项目成员
- `getProjectTeamCharter` - 获取项目团队章程

### 4. 项目成员管理 (2个函数)
- `addProjectMember` - 添加项目成员
- `removeProjectMember` - 移除项目成员

### 5. 项目积分管理 (4个函数) - **新增**
- `getUserProjectScore` - 获取用户项目积分
- `updateUserProjectScore` - 更新用户项目积分
- `setUserProjectOnboardingSurvey` - 设置项目入门调查
- `getUserProjectOnboardingSurvey` - 获取项目入门调查

### 6. 任务管理 (1个函数)
- `createTask` - 创建任务

## 🆕 新功能特性

### 1. 完整的积分系统
```typescript
interface UserProjectData {
    projId: string;
    joinedAt: string;
    score: {
        total_points: number;
        tasks_assigned: number;
        tasks_completed: number;
        streak: number;
        last_updated: string;
    };
    projOnboardingSurveyResponse: string[];
}
```

### 2. 项目成员管理优化
- **添加成员**: 同时更新 `joinedProjs` 数组和创建 `projects` subcollection 文档
- **移除成员**: 同时从 `joinedProjs` 数组移除和删除 `projects` subcollection 文档

### 3. 项目级 onboarding survey
- 每个项目都有独立的入门调查
- 存储在 `users/{email}/orgs/{orgId}/projects/{projId}` 中

## 🔍 查询优化

### 组织成员查询
```typescript
// 使用 collectionGroup 查询所有组织的成员
const query = await adminDb
    .collectionGroup("orgs")
    .where("orgId", "==", orgId)
    .get();
```

### 项目成员查询
```typescript
// 通过 joinedProjs 数组查询项目成员
const query = await adminDb
    .collectionGroup("orgs")
    .where("joinedProjs", "array-contains", projectId)
    .get();
```

## 🛡️ 权限系统

### 角色层级
- **Owner**: 可以执行所有操作
- **Admin**: 可以管理项目和成员，但不能删除组织或升级为owner
- **Member**: 只能查看和参与项目

### 权限检查
所有需要权限的操作都会检查用户的角色：
```typescript
const hasPermission = hasAdminPermissions(userOrgData.roles || []);
```

## 📊 数据结构对比

| 功能 | 旧结构 | 新结构 |
|------|--------|--------|
| 用户角色 | `role` (string) | `roles` (array) |
| 项目索引 | 直接字段 | `joinedProjs` (array) |
| 项目详情 | 分散存储 | `projects` subcollection |
| 积分系统 | `user_scores` collection | `score` 对象 |
| 项目调查 | org 级别 | project 级别 |

## ✅ 使用建议

1. **迁移现有数据**: 需要将现有的 `user_scores` 数据迁移到新的 `projects` subcollection 结构
2. **更新前端组件**: 确保前端组件使用新的函数和数据结构
3. **测试权限系统**: 验证 owner/admin/member 权限是否正确工作
4. **积分系统集成**: 在任务完成时调用 `updateUserProjectScore` 更新积分

## 🚀 下一步

1. 更新前端组件以使用新的 actions
2. 创建数据迁移脚本
3. 测试所有功能
4. 部署到生产环境
