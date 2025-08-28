# Database Migration Guide: From Flat to Hierarchical Structure

## Overview

This document describes the complete migration from a flat Firestore database structure to a hierarchical structure for the Afora application.

## Database Structure Changes

### Before (Flat Structure)
```
organizations/{orgId} - organization data
projects/{projId} - project data with orgId field
stages/{stageId} - stage data
tasks/{taskId} - task data
```

### After (Hierarchical Structure)
```
organizations/{orgId}/
├── projects/{projId}/
│   ├── stages/{stageId}/
│   │   └── tasks/{taskId}/
│   └── ...
└── ...
```

## Key Changes Made

### 1. Database Path Updates
- **Old**: `collection("projects").doc(projId)`
- **New**: `collection("organizations").doc(orgId).collection("projects").doc(projId)`

- **Old**: `collection("projects").doc(projId).collection("stages")`
- **New**: `collection("organizations").doc(orgId).collection("projects").doc(projId).collection("stages")`

- **Old**: `collection("projects").doc(projId).collection("stages").doc(stageId).collection("tasks")`
- **New**: `collection("organizations").doc(orgId).collection("projects").doc(projId).collection("stages").doc(stageId).collection("tasks")`

### 2. Function Signature Updates
All Server Actions now require `orgId: string` parameter:
```typescript
// Before
export async function createTask(projId: string, stageId: string, ...)

// After  
export async function createTask(projId: string, stageId: string, ..., orgId: string)
```

### 3. Component Updates
- Components now read `orgId` directly from route parameters using `useParams()`
- No more prop drilling for `orgId`
- All function calls updated to include `orgId` parameter

## Migration Process

### Phase 1: Data Migration
- Migrated existing projects from top-level `projects` collection to `organizations/{orgId}/projects/{projId}`
- Migrated stages and tasks to new hierarchical structure
- Preserved all existing data relationships

### Phase 2: Code Refactoring
- Updated all Server Actions in `actions/actions.ts`
- Updated all frontend components and pages
- Fixed function signatures and parameter orders
- Resolved TypeScript compilation errors

### Phase 3: Cleanup
- Removed old top-level `projects` collection
- Removed old `projs` subcollections from organizations
- Verified new hierarchical structure integrity

## Updated Functions

### Project Management
- `createProject(orgId, title, description, ...)`
- `updateProject(projId, updates, orgId)`
- `deleteProject(projId, orgId)`
- `getProject(projId, orgId)`

### Stage Management  
- `updateStages(projId, stageUpdates, stagesToDelete, orgId)`
- `updateStagesTasks(projId, generatedOutput, orgId)`

### Task Management
- `createTask(projId, stageId, title, description, softDeadline, hardDeadline, orgId, points)`
- `updateTask(projId, stageId, taskId, title, description, softDeadline, hardDeadline, orgId, points, completion_percentage)`
- `deleteTask(projId, stageId, taskId, orgId)`
- `assignTask(projId, stageId, taskId, userEmail, orgId)`
- `unassignTask(projId, stageId, taskId, orgId)`
- `reassignTask(projId, stageId, currentTaskId, swapAssigneeEmail, orgId)`
- `completeTaskWithProgress(projId, stageId, taskId, completion_percentage, orgId)`

### Comments
- `postComment(isPublic, projId, stageId, taskId, content, timestamp, userEmail, orgId)`

### Analytics & Reports
- `getProjectMembersResponses(projectFilter, orgId)`
- `getProjectLeaderboard(projectFilter, orgId)`
- `getProjectStats(projectFilter, orgId)`
- `getProjectAnalytics(projectFilter, orgId)`

## Benefits of New Structure

1. **Better Data Organization**: Clear parent-child relationships
2. **Improved Security**: Easier to implement organization-level access control
3. **Better Performance**: More efficient queries within organization scope
4. **Scalability**: Easier to manage large numbers of projects per organization
5. **Data Integrity**: Prevents cross-organization data contamination

## Current Status

✅ **Migration Complete**
✅ **All Code Updated**  
✅ **Database Cleaned**
✅ **TypeScript Compilation Successful**
✅ **Project Build Successful**

## Testing

After migration, verify that:
- Adding new stages works correctly
- Adding new tasks works correctly  
- All CRUD operations function properly
- Data is stored in correct hierarchical paths
- No errors in browser console or server logs

## Notes

- The `orgId` parameter is now required for all database operations
- Components automatically extract `orgId` from route parameters
- Old database paths have been completely removed
- All existing data has been preserved in the new structure
