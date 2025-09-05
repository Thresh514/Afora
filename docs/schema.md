明白了 ✅ 你希望的结构是这样：

* `users/{userId}/orgs` →  **subcollection** ，每个文档代表该用户在某个 org 的身份
* 在这个 `org` 文档里：
  * 有一个 `joinedProjs` 数组，**只存项目的 ID**
  * 还有一个  **`projects` subcollection** ，里面按 projectId 存放该用户在每个项目下的 **score / detail**

这样 `joinedProjs` 是“索引”，`projects` 才是详细数据。

---

# 🔑 新 Schema（你要求的方式）

## 1. `users` collection

```json
// users/{userId}
{
  "email": "xxx@gmail.com",
  "name": "Tony",
  "onboardingSurveyResponse": [ "Q1: ...", "Q2: ..." ],
  "createdAt": "Timestamp"
}
```

### 1.1 Subcollection: `orgs`

```json
// users/{userId}/orgs/{orgId}
{
  "orgId": "o1",
  "roles": ["member"],             // org 层级角色
  "joinedProjs": ["p1", "p2"]      // 仅存 projectId
}
```

### 1.2 Nested Subcollection: `projects`

```json
// users/{userId}/orgs/{orgId}/projects/{projId}
{
  "projId": "p1",
  "joinedAt": "2025-09-04T02:00:00Z",

  "score": {
    "total_points": 120,
    "tasks_assigned": 15,
    "tasks_completed": 12,
    "streak": 3,
    "last_updated": "2025-09-05T20:00:00Z"
  },

  "projOnboardingSurveyResponse": [ "Q1: ...", "Q2: ..." ]
}
```

---

## 2. `organizations` collection

和之前一样，存 org 下的项目、阶段和任务。

```json
// organizations/{orgId}
{
  "title": "Boston CSSA",
  "description": "Student association",
  "createdAt": "Timestamp",
  "backgroundImage": "https://..."
}
```

### 2.1 Subcollection: `projects`

```json
// organizations/{orgId}/projects/{projId}
{
  "title": "Launch a Rocket",
  "createdAt": "Timestamp",
  "teamCharterResponse": [ "Q1: ...", "Q2: ..." ]
}
```

### 2.2 Subcollection: `stages`

```json
// organizations/{orgId}/projects/{projId}/stages/{stageId}
{
  "id": "s1",
  "title": "Design Phase",
  "order": 1,
  "tasksCompleted": 3,
  "totalTasks": 5
}
```

### 2.3 Subcollection: `tasks`

```json
// organizations/{orgId}/projects/{projId}/stages/{stageId}/tasks/{taskId}
{
  "id": "t1",
  "title": "Build prototype",
  "description": "Initial draft",
  "assignee": "userId",
  "status": "in-progress",
  "isCompleted": false,
  "points": 10,
  "completion_percentage": 50,
  "soft_deadline": "2025-09-15",
  "hard_deadline": "2025-09-30",
  "assigned_at": "Timestamp",
  "completed_at": "Timestamp"
}
```

---

## 3. `function_logs` collection

保持原样。

```json
// function_logs/{logId}
{
  "functionName": "assignTasks",
  "executedAt": "Timestamp",
  "executedBy": "system",
  "status": "success",
  "error": "",
  "tasksProcessed": 25,
  "taskDetails": [ { "taskId": "t1", "status": "done" } ]
}
```

---

# ✅ 总结

* **users/{userId}/orgs/{orgId}**
  * 存放用户在某个 org 的角色
  * `joinedProjs`：仅仅是项目 ID 数组（快速索引）
  * `projects` subcollection：每个项目的详细数据（score、joinedAt、survey）

这种设计的优点：

* 查询用户在某个 org 下所有项目的 ID → 直接看 `joinedProjs`
* 查询用户在某个项目下的详细分数 → 直接读 `users/{userId}/orgs/{orgId}/projects/{projId}`
* 清晰分离了 **索引 (joinedProjs)** 和 **详情 (projects)**


太好了 ✅ 你已经定下了新的 schema，那接下来就要把 **旧的结构 → 新的结构** 做一个对照表，这样迁移代码的时候就不容易漏掉。

我给你总结一个  **新旧对照表** ，涵盖最核心的用户 / 组织 / 项目 / 任务 / 积分信息：

---

# 🔄 Firestore 新旧 Schema 对照表

| 功能                                      | 旧 Schema                                                                                | 新 Schema                                                                        | 说明                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 获取用户在 org 的角色                     | `users/{userId}/orgs/{orgId}/role`(string)                                             | `users/{userId}/orgs/{orgId}/roles[]`(array)                                   | 旧版只能单角色，新版支持多角色（`["member","admin"]`） |
| 获取用户加入的项目                        | `users/{userId}/orgs/{orgId}/projects/{projId}`(subcollection 或直接字段)              | `users/{userId}/orgs/{orgId}/joinedProjs[]`(数组，仅存 projectId)              | 新版把项目 ID 单独放在数组里做索引                       |
| 获取用户在某项目的详细信息（积分/任务数） | `user_scores/{docId}`(独立 collection，字段有 user_email, project_id, total_points...) | `users/{userId}/orgs/{orgId}/projects/{projId}/score`(嵌套对象)                | 旧版分散在 user_scores，新版合并进用户的 org → projects |
| 获取用户在项目的 onboarding 回答          | `users/{userId}/orgs/{orgId}/projOnboardingSurveyResponse[]`                           | `users/{userId}/orgs/{orgId}/projects/{projId}/projOnboardingSurveyResponse[]` | 从 org 层挪到 project 层，粒度更细                       |
| 获取 org 的项目                           | `organizations/{orgId}/projects/{projId}`                                              | `organizations/{orgId}/projects/{projId}`                                      | 基本不变                                                 |
| 获取项目的阶段                            | `organizations/{orgId}/projects/{projId}/stages/{stageId}`                             | `organizations/{orgId}/projects/{projId}/stages/{stageId}`                     | 基本不变                                                 |
| 获取阶段的任务                            | `organizations/{orgId}/projects/{projId}/stages/{stageId}/tasks/{taskId}`              | `organizations/{orgId}/projects/{projId}/stages/{stageId}/tasks/{taskId}`      | 基本不变，注意 `assignee`/`status`的字段定义保持一致 |

---

# ✅ 核心变化总结

1. **角色** ：`role` → `roles[]`（单角色 → 多角色）。
2. **项目索引** ：用户文档里新增 `joinedProjs` 数组（只放 ID）。
3. **项目详情** ：用户文档下的 `projects` subcollection 专门放  **score + survey** 。
4. **user_scores** ：废弃顶层 collection，合并进 `users → orgs → projects`。
5. **org → project → stage → task** 这条链保持不变，只是字段要对齐新定义。

---

这样做以后，迁移 checklist 里你只要：

* 找到所有旧的 query（特别是 `user_scores` 和 `role`）
* 对照表里替换路径和数据结构
* 最后在 emulator 跑测试验证

---

要不要我帮你把这个表再加一列  **「迁移示例代码」** （比如旧 query 的 Firestore 写法 vs 新 query 的写法），这样你在改 action 方法时就能直接参考？
