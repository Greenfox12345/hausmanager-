# Mutation Flow Analysis - Task Updates

## Problem
Task detail dialog and list view don't update reliably after creating/editing tasks.

## Current Flow Analysis

### 1. TaskDetailDialog - handleSave (Edit Task)

**Sequence:**
1. `updateTask.mutateAsync()` is called
2. `updateTask.onSuccess` runs:
   - Shows toast
   - Sets `setIsEditing(false)`
   - Invalidates 3 queries:
     * `utils.tasks.list.invalidate()`
     * `utils.projects.getTaskDependencies.invalidate()`
     * `utils.projects.getDependencies.invalidate()`
   - Calls `onTaskUpdated()` callback
3. If project task, `updateDependenciesMutation.mutateAsync()` is called
4. After dependencies update, invalidates 2 queries again:
   - `utils.projects.getTaskDependencies.invalidate()`
   - `utils.projects.getDependencies.invalidate()`

**Issues:**
- ❌ **REDUNDANT**: Dependency queries invalidated TWICE (in updateTask.onSuccess AND after updateDependencies)
- ❌ **RACE CONDITION**: `onTaskUpdated()` is called BEFORE dependencies are updated
- ❌ **TIMING**: Parent callback runs while dependencies mutation is still in progress

### 2. Tasks.tsx - onTaskUpdated Callback

**Sequence:**
1. Called from TaskDetailDialog after updateTask completes
2. Fetches fresh tasks: `utils.tasks.list.fetch()`
3. Finds updated task by ID
4. Updates `selectedTask` state

**Issues:**
- ⚠️ **RACE**: May fetch tasks BEFORE dependencies are fully updated
- ⚠️ **NO DEPENDENCY REFRESH**: Doesn't invalidate dependency queries

### 3. Projects.tsx - onTaskUpdated Callback

**Sequence:**
1. Called from TaskDetailDialog after updateTask completes
2. Fetches fresh tasks: `utils.tasks.list.fetch()`
3. Finds updated task by ID
4. Updates `selectedTask` state

**Issues:**
- ⚠️ **RACE**: May fetch tasks BEFORE dependencies are fully updated
- ⚠️ **NO DEPENDENCY REFRESH**: Doesn't invalidate dependency queries

### 4. Tasks.tsx - addMutation (Create Task)

**Sequence:**
1. Task created successfully
2. `onSuccess` runs:
   - Invalidates 4 queries:
     * `utils.tasks.list.invalidate()`
     * `utils.projects.list.invalidate()`
     * `utils.projects.getAvailableTasks.invalidate()`
     * `utils.projects.getTaskDependencies.invalidate()`
   - Resets form
   - Fetches fresh tasks: `utils.tasks.list.fetch()`
   - Finds new task and opens detail dialog

**Issues:**
- ✅ Works reliably because everything happens in sequence

### 5. Projects.tsx - addTaskMutation (Create Task)

**Sequence:**
1. Task created successfully
2. `onSuccess` runs:
   - Calls `refetchTasks()` (what does this do?)
   - Invalidates: `utils.projects.getTaskDependencies.invalidate()`
   - Closes dialog and resets form
   - Fetches fresh tasks: `utils.tasks.list.fetch()`
   - Finds new task and opens detail dialog

**Issues:**
- ⚠️ **UNCLEAR**: What is `refetchTasks()`? Is it redundant with `utils.tasks.list.fetch()`?

## Root Causes

### 1. Race Condition in Edit Flow
```
updateTask completes → onTaskUpdated() called → fetches tasks
                    ↓
                    updateDependencies starts → completes later
```
The parent fetches tasks BEFORE dependencies are updated, so the detail dialog shows stale dependency data.

### 2. Redundant Query Invalidations
- Dependency queries invalidated in `updateTask.onSuccess`
- Same queries invalidated again after `updateDependencies`
- This is wasteful and can cause timing issues

### 3. Inconsistent Patterns
- Create flow: Everything in one onSuccess handler (works)
- Edit flow: Split across mutation onSuccess + parent callback (broken)

## Proposed Solution

### Option A: Move Everything to onSuccess (Recommended)
Make edit flow match create flow - do everything in the mutation's onSuccess:

```typescript
const updateTask = trpc.tasks.update.useMutation({
  onSuccess: async (data, variables) => {
    // 1. Update dependencies first if needed
    if (isProjectTask) {
      await updateDependenciesMutation.mutateAsync({...});
    }
    
    // 2. Invalidate all queries once
    await utils.tasks.list.invalidate();
    await utils.projects.getTaskDependencies.invalidate({...});
    await utils.projects.getDependencies.invalidate({...});
    
    // 3. Fetch fresh task and update parent
    const refreshedTasks = await utils.tasks.list.fetch({...});
    const updatedTask = refreshedTasks.find(t => t.id === task.id);
    if (updatedTask && onTaskUpdated) {
      onTaskUpdated(updatedTask); // Pass task directly
    }
    
    // 4. Update UI state
    setIsEditing(false);
    toast.success("Aufgabe aktualisiert");
  }
});
```

**Benefits:**
- ✅ No race conditions - everything sequential
- ✅ No redundant invalidations
- ✅ Parent gets the updated task directly
- ✅ Matches working create flow pattern

### Option B: Fix Callback Timing
Keep current structure but fix the timing:

```typescript
const handleSave = async () => {
  // 1. Update task
  await updateTask.mutateAsync({...});
  
  // 2. Update dependencies if needed
  if (isProjectTask) {
    await updateDependenciesMutation.mutateAsync({...});
  }
  
  // 3. Now call parent callback (after everything is done)
  if (onTaskUpdated) {
    onTaskUpdated();
  }
};
```

**Issues:**
- ⚠️ Still has redundant invalidations
- ⚠️ More complex flow split across multiple places

## Recommendation

**Use Option A** - consolidate everything into updateTask.onSuccess to match the working create flow pattern.

## Questions for User

1. **refetchTasks() in Projects.tsx**: What is this function? Can we remove it and just use `utils.tasks.list.invalidate()`?

2. **Redundant invalidations**: Can we remove the duplicate dependency query invalidations in handleSave (lines 262-263)?

3. **Callback signature**: Should we change `onTaskUpdated()` to `onTaskUpdated(updatedTask)` so the parent doesn't need to fetch again?
