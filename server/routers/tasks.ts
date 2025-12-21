import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  createActivityLog,
  getHouseholdMembers,
} from "../db";

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
        enableRotation: z.boolean().default(false),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const taskId = await createTask({
        householdId: input.householdId,
        name: input.name,
        description: input.description,
        assignedTo: input.assignedTo,
        frequency: input.frequency,
        customFrequencyDays: input.customFrequencyDays,
        enableRotation: input.enableRotation,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        createdBy: input.memberId,
      });

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: "created",
        description: `Created task: ${input.name}`,
        relatedItemId: taskId,
      });

      return { taskId };
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
        enableRotation: z.boolean().optional(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { taskId, householdId, memberId, dueDate, ...updates } = input;
      
      await updateTask(taskId, {
        ...updates,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

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

      await updateTask(input.taskId, {
        isCompleted: input.isCompleted,
        completedBy: input.isCompleted ? input.memberId : null,
        completedAt: input.isCompleted ? new Date() : null,
      });

      // Handle rotation if enabled and task is completed
      if (input.isCompleted && task.enableRotation && task.assignedTo) {
        const members = await getHouseholdMembers(input.householdId);
        const activeMembers = members.filter(m => m.isActive);
        
        if (activeMembers.length > 1) {
          const currentIndex = activeMembers.findIndex(m => m.id === task.assignedTo);
          const nextIndex = (currentIndex + 1) % activeMembers.length;
          const nextMember = activeMembers[nextIndex];
          
          if (nextMember) {
            await updateTask(input.taskId, {
              assignedTo: nextMember.id,
              isCompleted: false,
              completedBy: null,
              completedAt: null,
            });

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

      await createActivityLog({
        householdId: input.householdId,
        memberId: input.memberId,
        activityType: "task",
        action: input.isCompleted ? "completed" : "uncompleted",
        description: `${input.isCompleted ? "Completed" : "Uncompleted"} task`,
        relatedItemId: input.taskId,
      });

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
});
