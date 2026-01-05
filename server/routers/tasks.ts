import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  createActivityLog,
  getHouseholdMembers,
  createTaskRotationExclusions,
  getDb,
} from "../db";
import { notifyTaskAssigned, notifyTaskCompleted } from "../notificationHelpers";
import { taskRotationExclusions } from "../../drizzle/schema";

export const tasksRouter = router({
  // Get all tasks for a household
  list: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      return await getTasks(input.householdId);
    }),

  // Add new task
  add: publicProcedure
    .input(
      z.object({
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        assignedTo: z.number().optional(),
        frequency: z.enum(["once", "daily", "weekly", "monthly", "custom"]).default("once"),
        customFrequencyDays: z.number().optional(),
        repeatInterval: z.number().optional(),
        repeatUnit: z.enum(["days", "weeks", "months"]).optional(),
        enableRotation: z.boolean().default(false),
        requiredPersons: z.number().optional(),
        excludedMembers: z.array(z.number()).optional(),
        dueDate: z.string().optional(),
        dueTime: z.string().optional(),
        projectIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Combine date and time if both provided
      let dueDatetime: Date | undefined;
      if (input.dueDate) {
        if (input.dueTime) {
          dueDatetime = new Date(`${input.dueDate}T${input.dueTime}`);
        } else {
          dueDatetime = new Date(input.dueDate);
        }
      }

      const taskId = await createTask({
        householdId: input.householdId,
        name: input.name,
        description: input.description,
        assignedTo: input.assignedTo,
        frequency: input.frequency,
        customFrequencyDays: input.customFrequencyDays,
        repeatInterval: input.repeatInterval,
        repeatUnit: input.repeatUnit,
        enableRotation: input.enableRotation,
        requiredPersons: input.requiredPersons,
        dueDate: dueDatetime,
        projectIds: input.projectIds || [],
        createdBy: input.memberId,
      });

      // Save rotation exclusions if provided
      if (input.excludedMembers && input.excludedMembers.length > 0) {
        await createTaskRotationExclusions(taskId, input.excludedMembers);
      }

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "created",
        description: `Created task: ${input.name}`,
        relatedItemId: taskId,
      });

      // Send notification if task is assigned to someone
      if (input.assignedTo && input.assignedTo !== input.memberId) {
        await notifyTaskAssigned(
          input.householdId,
          input.assignedTo,
          taskId,
          input.name
        );
      }

      return { id: taskId };
    }),

  // Update task
  update: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        assignedTo: z.number().optional(),
        frequency: z.enum(["once", "daily", "weekly", "monthly", "custom"]).optional(),
        customFrequencyDays: z.number().optional(),
        repeatInterval: z.number().optional(),
        repeatUnit: z.enum(["days", "weeks", "months"]).optional(),
        enableRotation: z.boolean().optional(),
        requiredPersons: z.number().optional(),
        excludedMembers: z.array(z.number()).optional(),
        dueDate: z.string().optional(),
        projectIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { taskId, householdId, memberId, dueDate, ...updates } = input;
      
      // Get current task to check if recurrence settings changed
      const tasks = await getTasks(householdId);
      const currentTask = tasks.find(t => t.id === taskId);
      
      if (!currentTask) {
        throw new Error("Task not found");
      }
      
      // Update the task with new values
      await updateTask(taskId, {
        ...updates,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      
      // If this is a recurring task and interval/unit changed, we don't need to recalculate
      // The next occurrence will be calculated correctly when the task is completed
      // The new repeatInterval and repeatUnit are already saved above

      await createActivityLog({
        householdId,
        memberId,
        activityType: "task",
        action: "updated",
        description: `Updated task`,
        relatedItemId: taskId,
      });

      return { success: true };
    }),

  // Toggle task completion and handle rotation
  toggleComplete: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        isCompleted: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const tasks = await getTasks(input.householdId);
      const task = tasks.find(t => t.id === input.taskId);
      
      if (!task) {
        throw new Error("Task not found");
      }

      // Store original due date for activity log
      const originalDueDate = task.dueDate;

      // Check if task is recurring
      const isRecurring = task.repeatInterval && task.repeatUnit;

      if (input.isCompleted && isRecurring) {
        // For recurring tasks: move to next occurrence instead of marking as completed
        const currentDueDate = task.dueDate ? new Date(task.dueDate) : new Date();
        let nextDueDate = new Date(currentDueDate);

        // Calculate next due date based on repeat interval
        if (task.repeatUnit === "days") {
          nextDueDate.setDate(nextDueDate.getDate() + (task.repeatInterval || 1));
        } else if (task.repeatUnit === "weeks") {
          nextDueDate.setDate(nextDueDate.getDate() + ((task.repeatInterval || 1) * 7));
        } else if (task.repeatUnit === "months") {
          nextDueDate.setMonth(nextDueDate.getMonth() + (task.repeatInterval || 1));
        }

        // Handle rotation if enabled
        let nextAssignee = task.assignedTo;
        if (task.enableRotation && task.assignedTo) {
          const members = await getHouseholdMembers(input.householdId);
          const activeMembers = members.filter(m => m.isActive);
          
          if (activeMembers.length > 1) {
            const currentIndex = activeMembers.findIndex(m => m.id === task.assignedTo);
            const nextIndex = (currentIndex + 1) % activeMembers.length;
            const nextMember = activeMembers[nextIndex];
            
            if (nextMember) {
              nextAssignee = nextMember.id;
              
              await createActivityLog({
                householdId: input.householdId,
                memberId: input.memberId,
                activityType: "task",
                action: "rotated",
                description: `Task rotated to ${nextMember.memberName}`,
                relatedItemId: input.taskId,
              });
            }
          }
        }

        // Update task to next occurrence (NOT completed)
        await updateTask(input.taskId, {
          dueDate: nextDueDate,
          assignedTo: nextAssignee,
          isCompleted: false,
          completedBy: null,
          completedAt: null,
        });

        // Log completion of THIS occurrence with ORIGINAL due date
        await createActivityLog({
          householdId: input.householdId,
          memberId: input.memberId,
          activityType: "task",
          action: "completed",
          description: `Completed recurring task occurrence`,
          relatedItemId: input.taskId,
          metadata: { originalDueDate: originalDueDate?.toString() },
        });
      } else {
        // For non-recurring tasks: normal completion logic
        await updateTask(input.taskId, {
          isCompleted: input.isCompleted,
          completedBy: input.isCompleted ? input.memberId : null,
          completedAt: input.isCompleted ? new Date() : null,
        });

        await createActivityLog({
          householdId: input.householdId,
          memberId: input.memberId,
          activityType: "task",
          action: input.isCompleted ? "completed" : "uncompleted",
          description: `${input.isCompleted ? "Completed" : "Uncompleted"} task`,
          relatedItemId: input.taskId,
        });
      }

      return { success: true };
    }),

  // Delete task
  delete: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await deleteTask(input.taskId);

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "deleted",
        description: `Deleted task`,
        relatedItemId: input.taskId,
      });

      return { success: true };
    }),

  // Complete task with comment and photos
  completeTask: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        comment: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tasks = await getTasks(input.householdId);
      const task = tasks.find(t => t.id === input.taskId);
      
      if (!task) {
        throw new Error("Task not found");
      }

      // Save original due date before updating (for activity history)
      const originalDueDate = task.dueDate;

      // Mark task as completed
      await updateTask(input.taskId, {
        isCompleted: true,
        completedBy: input.memberId,
        completedAt: new Date(),
      });

      // Update due date if recurring
      if (task.frequency !== "once" && task.dueDate) {
        let nextDueDate = new Date(task.dueDate);
        
        switch (task.frequency) {
          case "daily":
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case "weekly":
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case "monthly":
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case "custom":
            // Use new repeatInterval and repeatUnit fields
            if (task.repeatInterval && task.repeatUnit) {
              switch (task.repeatUnit) {
                case "days":
                  nextDueDate.setDate(nextDueDate.getDate() + task.repeatInterval);
                  break;
                case "weeks":
                  nextDueDate.setDate(nextDueDate.getDate() + (task.repeatInterval * 7));
                  break;
                case "months":
                  nextDueDate.setMonth(nextDueDate.getMonth() + task.repeatInterval);
                  break;
              }
            } else if (task.customFrequencyDays) {
              // Fallback to old field for compatibility
              nextDueDate.setDate(nextDueDate.getDate() + task.customFrequencyDays);
            }
            break;
        }
        
        await updateTask(input.taskId, {
          dueDate: nextDueDate,
          isCompleted: false,
          completedBy: null,
          completedAt: null,
        });
      }

      // Handle rotation if enabled
      if (task.enableRotation && task.assignedTo) {
        const members = await getHouseholdMembers(input.householdId);
        const activeMembers = members.filter(m => m.isActive);
        
        // Get excluded members from task_rotation_exclusions table
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const exclusions = await db.select()
          .from(taskRotationExclusions)
          .where(eq(taskRotationExclusions.taskId, input.taskId));
        
        const excludedMemberIds = new Set(exclusions.map(e => e.memberId));
        
        // Filter out excluded members
        const eligibleMembers = activeMembers.filter(m => !excludedMemberIds.has(m.id));
        
        if (eligibleMembers.length > 0) {
          const currentIndex = eligibleMembers.findIndex(m => m.id === task.assignedTo);
          const nextIndex = (currentIndex + 1) % eligibleMembers.length;
          const nextMember = eligibleMembers[nextIndex];
          
          if (nextMember) {
            await updateTask(input.taskId, {
              assignedTo: nextMember.id,
            });
          }
        }
      }

      // Create activity log with original due date
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "completed",
        description: `Aufgabe abgeschlossen: ${task.name}`,
        relatedItemId: input.taskId,
        comment: input.comment,
        photoUrls: input.photoUrls,
        metadata: originalDueDate ? { originalDueDate: originalDueDate.toISOString() } : undefined,
      });

      // Send notification to task creator if different from completer
      if (task.createdBy && task.createdBy !== input.memberId) {
        const members = await getHouseholdMembers(input.householdId);
        const completer = members.find(m => m.id === input.memberId);
        if (completer) {
          await notifyTaskCompleted(
            input.householdId,
            task.createdBy,
            input.taskId,
            task.name,
            completer.memberName
          );
        }
      }

      return { success: true };
    }),

  // Add milestone (intermediate goal)
  addMilestone: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        comment: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tasks = await getTasks(input.householdId);
      const task = tasks.find(t => t.id === input.taskId);
      
      if (!task) {
        throw new Error("Task not found");
      }

      // Create activity log for milestone
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "milestone",
        description: `Zwischensieg bei Aufgabe: ${task.name}`,
        relatedItemId: input.taskId,
        comment: input.comment,
        photoUrls: input.photoUrls,
      });

      return { success: true };
    }),

  // Send reminder
  sendReminder: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        householdId: z.number(),
        memberId: z.number(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tasks = await getTasks(input.householdId);
      const task = tasks.find(t => t.id === input.taskId);
      
      if (!task) {
        throw new Error("Task not found");
      }

      // Create activity log for reminder
      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "reminder",
        description: `Erinnerung gesendet für Aufgabe: ${task.name}`,
        relatedItemId: input.taskId,
        comment: input.comment,
      });

      return { success: true };
    }),

  // Batch delete tasks
  batchDelete: publicProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const deletedCount = await Promise.all(
        input.taskIds.map(async (taskId) => {
          try {
            await deleteTask(taskId);
            return 1;
          } catch (error) {
            console.error(`Failed to delete task ${taskId}:`, error);
            return 0;
          }
        })
      );

      const successCount = deletedCount.reduce((a: number, b: number) => a + b, 0);
      return { success: true, deletedCount: successCount };
    }),

  // Batch assign tasks
  batchAssign: publicProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()),
        householdId: z.number(),
        memberId: z.number(),
        assignedTo: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const updatedCount = await Promise.all(
        input.taskIds.map(async (taskId) => {
          try {
            await updateTask(taskId, {
              assignedTo: input.assignedTo,
            });
            return 1;
          } catch (error) {
            console.error(`Failed to assign task ${taskId}:`, error);
            return 0;
          }
        })
      );

      const successCount = updatedCount.reduce((a: number, b: number) => a + b, 0);
      return { success: true, updatedCount: successCount };
    }),

  // Batch complete tasks
  batchComplete: publicProcedure
    .input(
      z.object({
        taskIds: z.array(z.number()),
        householdId: z.number(),
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const tasks = await getTasks(input.householdId);
      const completedCount = await Promise.all(
        input.taskIds.map(async (taskId) => {
          try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return 0;

            await updateTask(taskId, {
              isCompleted: true,
              completedBy: input.memberId,
              completedAt: new Date(),
            });

            await createActivityLog({
              householdId: input.householdId,
              memberId: input.memberId,
              activityType: "task",
              action: "completed",
              description: `Aufgabe abgeschlossen: ${task.name}`,
              relatedItemId: taskId,
            });

            return 1;
          } catch (error) {
            console.error(`Failed to complete task ${taskId}:`, error);
            return 0;
          }
        })
      );

      const successCount = completedCount.reduce((a: number, b: number) => a + b, 0);
      return { success: true, completedCount: successCount };
    }),
});
