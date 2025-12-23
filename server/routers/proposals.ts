import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { 
  taskEditProposals, 
  dependencyProposals, 
  tasks,
  notifications,
  notificationSettings,
  householdMembers
} from "../../drizzle/schema";

export const proposalsRouter = router({
  // Create task edit proposal
  createEditProposal: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        proposedBy: z.number(),
        proposedChanges: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get task details to find assignee
      const task = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
      if (!task[0]) {
        throw new Error("Task not found");
      }

      // Create proposal
      const result = await db.insert(taskEditProposals).values({
        taskId: input.taskId,
        proposedBy: input.proposedBy,
        proposedChanges: input.proposedChanges,
        status: "pending",
      });
      const proposalId = Number(result[0].insertId);

      // Create notification for assignee
      if (task[0].assignedTo) {
        // Check notification settings
        const settings = await db
          .select()
          .from(notificationSettings)
          .where(eq(notificationSettings.memberId, task[0].assignedTo))
          .limit(1);

        if (!settings[0] || settings[0].editProposal) {
          await db.insert(notifications).values({
            householdId: task[0].householdId,
            memberId: task[0].assignedTo,
            type: "edit_proposal",
            title: "Bearbeitungsvorschlag erhalten",
            message: `Ein Bearbeitungsvorschlag für die Aufgabe "${task[0].name}" wurde eingereicht.`,
            relatedItemType: "proposal",
            relatedItemId: proposalId,
            isRead: false,
          });
        }
      }

      return { proposalId };
    }),

  // Get edit proposals for a task
  getEditProposals: publicProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return await db
        .select()
        .from(taskEditProposals)
        .where(eq(taskEditProposals.taskId, input.taskId));
    }),

  // Get all pending proposals for a member (as assignee)
  getPendingEditProposals: publicProcedure
    .input(z.object({ memberId: z.number(), householdId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get all tasks assigned to this member
      const assignedTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.assignedTo, input.memberId),
            eq(tasks.householdId, input.householdId)
          )
        );

      const taskIds = assignedTasks.map(t => t.id);
      if (taskIds.length === 0) return [];

      // Get pending proposals for these tasks
      const proposals = await db
        .select()
        .from(taskEditProposals)
        .where(eq(taskEditProposals.status, "pending"));

      return proposals.filter(p => taskIds.includes(p.taskId));
    }),

  // Approve edit proposal
  approveEditProposal: publicProcedure
    .input(
      z.object({
        proposalId: z.number(),
        reviewedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get proposal
      const proposal = await db
        .select()
        .from(taskEditProposals)
        .where(eq(taskEditProposals.id, input.proposalId))
        .limit(1);

      if (!proposal[0]) {
        throw new Error("Proposal not found");
      }

      // Update task with proposed changes
      await db
        .update(tasks)
        .set(proposal[0].proposedChanges)
        .where(eq(tasks.id, proposal[0].taskId));

      // Update proposal status
      await db
        .update(taskEditProposals)
        .set({
          status: "approved",
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date(),
        })
        .where(eq(taskEditProposals.id, input.proposalId));

      // Get task for notification
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, proposal[0].taskId))
        .limit(1);

      // Notify proposer
      const settings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.memberId, proposal[0].proposedBy))
        .limit(1);

      if (!settings[0] || settings[0].proposalApproved) {
        await db.insert(notifications).values({
          householdId: task[0].householdId,
          memberId: proposal[0].proposedBy,
          type: "proposal_approved",
          title: "Bearbeitungsvorschlag genehmigt",
          message: `Ihr Bearbeitungsvorschlag für die Aufgabe "${task[0].name}" wurde genehmigt.`,
          relatedItemType: "task",
          relatedItemId: proposal[0].taskId,
          isRead: false,
        });
      }

      return { success: true };
    }),

  // Reject edit proposal
  rejectEditProposal: publicProcedure
    .input(
      z.object({
        proposalId: z.number(),
        reviewedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get proposal
      const proposal = await db
        .select()
        .from(taskEditProposals)
        .where(eq(taskEditProposals.id, input.proposalId))
        .limit(1);

      if (!proposal[0]) {
        throw new Error("Proposal not found");
      }

      // Update proposal status
      await db
        .update(taskEditProposals)
        .set({
          status: "rejected",
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date(),
        })
        .where(eq(taskEditProposals.id, input.proposalId));

      // Get task for notification
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, proposal[0].taskId))
        .limit(1);

      // Notify proposer
      const settings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.memberId, proposal[0].proposedBy))
        .limit(1);

      if (!settings[0] || settings[0].proposalRejected) {
        await db.insert(notifications).values({
          householdId: task[0].householdId,
          memberId: proposal[0].proposedBy,
          type: "proposal_rejected",
          title: "Bearbeitungsvorschlag abgelehnt",
          message: `Ihr Bearbeitungsvorschlag für die Aufgabe "${task[0].name}" wurde abgelehnt.`,
          relatedItemType: "task",
          relatedItemId: proposal[0].taskId,
          isRead: false,
        });
      }

      return { success: true };
    }),

  // Create dependency proposal
  createDependencyProposal: publicProcedure
    .input(
      z.object({
        taskId: z.number(),
        dependsOnTaskId: z.number(),
        dependencyType: z.enum(["prerequisite", "followup"]),
        proposedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get task details
      const task = await db.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);
      if (!task[0]) {
        throw new Error("Task not found");
      }

      // Create proposal
      const result2 = await db.insert(dependencyProposals).values({
        taskId: input.taskId,
        dependsOnTaskId: input.dependsOnTaskId,
        dependencyType: input.dependencyType,
        proposedBy: input.proposedBy,
        status: "pending",
      });
      const proposalId = Number(result2[0].insertId);

      // Notify assignee
      if (task[0].assignedTo) {
        const settings = await db
          .select()
          .from(notificationSettings)
          .where(eq(notificationSettings.memberId, task[0].assignedTo))
          .limit(1);

        if (!settings[0] || settings[0].dependencyProposal) {
          await db.insert(notifications).values({
            householdId: task[0].householdId,
            memberId: task[0].assignedTo,
            type: "dependency_proposal",
            title: "Abhängigkeitsvorschlag erhalten",
            message: `Ein Vorschlag für eine Aufgabenabhängigkeit wurde für "${task[0].name}" eingereicht.`,
            relatedItemType: "proposal",
            relatedItemId: proposalId,
            isRead: false,
          });
        }
      }

      return { proposalId };
    }),

  // Get dependency proposals
  getDependencyProposals: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get all tasks in household
      const householdTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.householdId, input.householdId));

      const taskIds = householdTasks.map(t => t.id);
      if (taskIds.length === 0) return [];

      // Get proposals for these tasks
      const proposals = await db.select().from(dependencyProposals);
      return proposals.filter(p => taskIds.includes(p.taskId));
    }),

  // Approve dependency proposal
  approveDependencyProposal: publicProcedure
    .input(
      z.object({
        proposalId: z.number(),
        reviewedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get proposal
      const proposal = await db
        .select()
        .from(dependencyProposals)
        .where(eq(dependencyProposals.id, input.proposalId))
        .limit(1);

      if (!proposal[0]) {
        throw new Error("Proposal not found");
      }

      // Create actual dependency (import taskDependencies)
      const { taskDependencies } = await import("../../drizzle/schema");
      await db.insert(taskDependencies).values({
        taskId: proposal[0].taskId,
        dependsOnTaskId: proposal[0].dependsOnTaskId,
        dependencyType: proposal[0].dependencyType,
      });

      // Update proposal status
      await db
        .update(dependencyProposals)
        .set({
          status: "approved",
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date(),
        })
        .where(eq(dependencyProposals.id, input.proposalId));

      // Get task for notification
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, proposal[0].taskId))
        .limit(1);

      // Notify proposer
      const settings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.memberId, proposal[0].proposedBy))
        .limit(1);

      if (!settings[0] || settings[0].proposalApproved) {
        await db.insert(notifications).values({
          householdId: task[0].householdId,
          memberId: proposal[0].proposedBy,
          type: "proposal_approved",
          title: "Abhängigkeitsvorschlag genehmigt",
          message: `Ihr Vorschlag für eine Aufgabenabhängigkeit wurde genehmigt.`,
          relatedItemType: "task",
          relatedItemId: proposal[0].taskId,
          isRead: false,
        });
      }

      return { success: true };
    }),

  // Reject dependency proposal
  rejectDependencyProposal: publicProcedure
    .input(
      z.object({
        proposalId: z.number(),
        reviewedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get proposal
      const proposal = await db
        .select()
        .from(dependencyProposals)
        .where(eq(dependencyProposals.id, input.proposalId))
        .limit(1);

      if (!proposal[0]) {
        throw new Error("Proposal not found");
      }

      // Update proposal status
      await db
        .update(dependencyProposals)
        .set({
          status: "rejected",
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date(),
        })
        .where(eq(dependencyProposals.id, input.proposalId));

      // Get task for notification
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, proposal[0].taskId))
        .limit(1);

      // Notify proposer
      const settings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.memberId, proposal[0].proposedBy))
        .limit(1);

      if (!settings[0] || settings[0].proposalRejected) {
        await db.insert(notifications).values({
          householdId: task[0].householdId,
          memberId: proposal[0].proposedBy,
          type: "proposal_rejected",
          title: "Abhängigkeitsvorschlag abgelehnt",
          message: `Ihr Vorschlag für eine Aufgabenabhängigkeit wurde abgelehnt.`,
          relatedItemType: "task",
          relatedItemId: proposal[0].taskId,
          isRead: false,
        });
      }

      return { success: true };
    }),
});
