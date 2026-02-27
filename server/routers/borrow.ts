import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { borrowRequests, inventoryItems } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  getDb,
  createBorrowRequest,
  getBorrowRequestsByItem,
  getBorrowRequestsByBorrower,
  getBorrowRequestsByOwner,
  getBorrowRequestById,
  updateBorrowRequestStatus,
  getInventoryItemById,
  getHouseholdMemberById,
  createActivityLog,
  createBorrowGuideline,
  getBorrowGuidelineByItemId,
  updateBorrowGuideline,
  deleteBorrowGuideline,
  createBorrowReturnPhoto,
  getBorrowReturnPhotosByRequestId,
  createCalendarEvent,
  deleteCalendarEventsByBorrowRequest,
  markCalendarEventCompleted,
  getCalendarEventsByBorrowRequest,
} from "../db";
import { notifyOwner } from "../_core/notification";
import { createNotification } from "../notificationHelpers";
import { taskOccurrenceItems, tasks as tasksTable } from "../../drizzle/schema";

export const borrowRouter = router({
  // Create a new borrow request
  request: publicProcedure
    .input(
      z.object({
        inventoryItemId: z.number(),
        borrowerHouseholdId: z.number(),
        borrowerMemberId: z.number(),
        startDate: z.string(), // ISO date string
        endDate: z.string(), // ISO date string
        requestMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get item details to determine ownership
      const item = await getInventoryItemById(input.inventoryItemId);
      if (!item) {
        throw new Error("Item not found");
      }

      // Create borrow request
      const requestId = await createBorrowRequest({
        inventoryItemId: input.inventoryItemId,
        borrowerHouseholdId: input.borrowerHouseholdId,
        borrowerMemberId: input.borrowerMemberId,
        ownerHouseholdId: item.householdId,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        requestMessage: input.requestMessage,
        // Auto-approve for household items, pending for personal items
        status: item.ownershipType === "household" ? "approved" : "pending",
      });

      // Create activity log
      await createActivityLog({
        householdId: input.borrowerHouseholdId,
        memberId: input.borrowerMemberId,
        activityType: "inventory",
        action: "borrow_requested",
        description: `Ausleih-Anfrage für "${item.name}"`,
        metadata: {
          itemId: input.inventoryItemId,
          requestId,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });

      // TODO: Notify owner if personal item (requires approval)
      // This will be implemented when notification system is ready
      if (item.ownershipType === "personal") {
        // await notifyOwner({
        //   title: "Neue Ausleih-Anfrage",
        //   content: `Jemand möchte "${item.name}" ausleihen vom ${new Date(input.startDate).toLocaleDateString()} bis ${new Date(input.endDate).toLocaleDateString()}`,
        // });
      }

      return { 
        success: true, 
        requestId,
        autoApproved: item.ownershipType === "household",
      };
    }),

  // Get borrow requests for a specific item
  listByItem: publicProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ input }) => {
      return await getBorrowRequestsByItem(input.itemId);
    }),

  // Get borrow requests made by a member
  listByBorrower: publicProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ input }) => {
      return await getBorrowRequestsByBorrower(input.memberId);
    }),

  // Get borrow requests for items owned by household
  listByOwner: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      return await getBorrowRequestsByOwner(input.householdId);
    }),

  // Get single borrow request details
  get: publicProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      return await getBorrowRequestById(input.requestId);
    }),

  // Approve a borrow request
  approve: publicProcedure
    .input(
      z.object({
        requestId: z.number(),
        approverId: z.number(),
        responseMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const request = await getBorrowRequestById(input.requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      // Get item details to validate ownership
      const item = await getInventoryItemById(request.inventoryItemId);
      if (!item) {
        throw new Error("Item not found");
      }

      // Validate that approver is an owner (for personal items)
      if (item.ownershipType === 'personal') {
        const isOwner = item.owners?.some((owner: any) => owner.memberId === input.approverId);
        if (!isOwner) {
          throw new Error("Nur Eigentümer können diese Anfrage genehmigen");
        }
      }

      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "approved",
        approvedBy: input.approverId,
        approvedAt: new Date(),
        responseMessage: input.responseMessage,
      });

      // Check if this borrow is linked to a task
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [linkedOccurrence] = await db
        .select({
          taskId: taskOccurrenceItems.taskId,
          occurrenceNumber: taskOccurrenceItems.occurrenceNumber,
          taskName: tasksTable.name,
        })
        .from(taskOccurrenceItems)
        .leftJoin(tasksTable, eq(taskOccurrenceItems.taskId, tasksTable.id))
        .where(eq(taskOccurrenceItems.borrowRequestId, input.requestId))
        .limit(1);
      
      // Create activity log
      const metadata: any = {
        itemId: request.inventoryItemId,
        itemName: item.name,
        requestId: input.requestId,
        borrowerName: (await getHouseholdMemberById(request.borrowerMemberId))?.memberName,
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
      };

      if (linkedOccurrence) {
        metadata.taskId = linkedOccurrence.taskId;
        metadata.taskName = linkedOccurrence.taskName;
        metadata.occurrenceNumber = linkedOccurrence.occurrenceNumber;
      }

      await createActivityLog({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        activityType: linkedOccurrence ? "task" : "inventory",
        action: "borrow_approved",
        description: linkedOccurrence
          ? `Ausleih-Anfrage für "${item.name}" (Aufgabe "${linkedOccurrence.taskName}", Termin ${linkedOccurrence.occurrenceNumber}) wurde genehmigt`
          : `Ausleih-Anfrage für "${item.name}" wurde genehmigt`,
        relatedItemId: linkedOccurrence?.taskId,
        metadata,
      });

      // Create calendar events for borrow start and return
      const borrowerMember = await getHouseholdMemberById(request.borrowerMemberId);
      const borrowerName = borrowerMember?.memberName || "Ausleiher";

      // Borrow start event
      await createCalendarEvent({
        householdId: request.borrowerHouseholdId,
        title: `📥 ${item.name} ausleihen`,
        description: `${borrowerName} leiht "${item.name}" aus`,
        startDate: request.startDate,
        endDate: request.startDate,
        eventType: "borrow_start",
        icon: "📥",
        relatedBorrowId: input.requestId,
        createdBy: input.approverId,
      });

      // Return event
      await createCalendarEvent({
        householdId: request.borrowerHouseholdId,
        title: `📤 ${item.name} zurückgeben`,
        description: `${borrowerName} gibt "${item.name}" zurück`,
        startDate: request.endDate,
        endDate: request.endDate,
        eventType: "borrow_return",
        icon: "📤",
        relatedBorrowId: input.requestId,
        createdBy: input.approverId,
      });

      return { success: true };
    }),

  // Reject a borrow request
  reject: publicProcedure
    .input(
      z.object({
        requestId: z.number(),
        approverId: z.number(),
        responseMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const request = await getBorrowRequestById(input.requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      // Get item details to validate ownership
      const item = await getInventoryItemById(request.inventoryItemId);
      if (!item) {
        throw new Error("Item not found");
      }

      // Validate that approver is an owner (for personal items)
      if (item.ownershipType === 'personal') {
        const isOwner = item.owners?.some((owner: any) => owner.memberId === input.approverId);
        if (!isOwner) {
          throw new Error("Nur Eigentümer können diese Anfrage ablehnen");
        }
      }

      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "rejected",
        approvedBy: input.approverId,
        approvedAt: new Date(),
        responseMessage: input.responseMessage,
      });

      // Item already fetched above for validation
      
      // Create activity log
      await createActivityLog({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        activityType: "inventory",
        action: "borrow_rejected",
        description: `Ausleih-Anfrage für "${item?.name}" wurde abgelehnt`,
        metadata: {
          itemId: request.inventoryItemId,
          requestId: input.requestId,
        },
      });

      return { success: true };
    }),

  // Mark item as picked up (borrowed)
  markBorrowed: publicProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input }) => {
      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "active",
        borrowedAt: new Date(),
      });

      return { success: true };
    }),

  // Mark item as returned
  markReturned: publicProcedure
    .input(z.object({
      requestId: z.number(),
      returnPhotos: z.array(z.object({
        requirementId: z.string(),
        photoUrl: z.string(),
      })).optional(),
      conditionReport: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const request = await getBorrowRequestById(input.requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      // Get item details for activity log
      const item = await getInventoryItemById(request.inventoryItemId);

      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "completed",
        returnedAt: new Date(),
      });

      // Save return photos if provided
      if (input.returnPhotos && input.returnPhotos.length > 0) {
        for (const photo of input.returnPhotos) {
          await createBorrowReturnPhoto({
            borrowRequestId: input.requestId,
            photoRequirementId: photo.requirementId,
            photoUrl: photo.photoUrl,
            uploadedBy: request.borrowerMemberId,
          });
        }
      }

      // Item already fetched above for validation
      
      // Create activity log
      await createActivityLog({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        activityType: "inventory",
        action: "borrow_returned",
        description: `"${item?.name}" wurde zurückgegeben`,
        metadata: {
          itemId: request.inventoryItemId,
          requestId: input.requestId,
        },
      });

      // Mark calendar events as completed
      const events = await getCalendarEventsByBorrowRequest(input.requestId);
      for (const event of events) {
        await markCalendarEventCompleted(event.id);
      }

      return { success: true };
    }),

  // Revoke an approved/active borrow request (with mandatory reason)
  revoke: publicProcedure
    .input(
      z.object({
        requestId: z.number(),
        revokerId: z.number(),
        revokerHouseholdId: z.number(),
        reason: z.string().min(1, "Begründung ist erforderlich"),
      })
    )
    .mutation(async ({ input }) => {
      const request = await getBorrowRequestById(input.requestId);
      if (!request) {
        throw new Error("Ausleih-Anfrage nicht gefunden");
      }

      // Only approved or active requests can be revoked
      if (request.status !== "approved" && request.status !== "active") {
        throw new Error("Nur genehmigte oder aktive Ausleihen können widerrufen werden");
      }

      // Get item and member details
      const item = await getInventoryItemById(request.inventoryItemId);
      if (!item) {
        throw new Error("Gegenstand nicht gefunden");
      }

      const revokerMember = await getHouseholdMemberById(input.revokerId);
      const revokerName = revokerMember?.memberName || "Unbekannt";
      const borrowerMember = await getHouseholdMemberById(request.borrowerMemberId);
      const borrowerName = borrowerMember?.memberName || "Unbekannt";

      // Update borrow request status to cancelled with reason
      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "cancelled",
        responseMessage: `Widerrufen von ${revokerName}: ${input.reason}`,
      });

      // Delete calendar events for revoked borrow
      await deleteCalendarEventsByBorrowRequest(input.requestId);

      // Check if this borrow is linked to a task occurrence
      const db = await getDb();
      if (db) {
        const linkedOccurrences = await db
          .select()
          .from(taskOccurrenceItems)
          .where(eq(taskOccurrenceItems.borrowRequestId, input.requestId));

        // For each linked task occurrence, create an activity log and reset borrow status
        for (const occ of linkedOccurrences) {
          // Get task name for the activity log
          const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, occ.taskId));
          const taskName = task?.name || `Aufgabe #${occ.taskId}`;

          // Send notification to the borrower with task info and link
          await createNotification({
            householdId: request.borrowerHouseholdId,
            memberId: request.borrowerMemberId,
            type: "general",
            title: "Ausleihgenehmigung widerrufen",
            message: `Die Genehmigung für "${item.name}" (${new Date(request.startDate).toLocaleDateString("de-DE")} - ${new Date(request.endDate).toLocaleDateString("de-DE")}) für Aufgabe "${taskName}" (Termin ${occ.occurrenceNumber}) wurde von ${revokerName} widerrufen. Begründung: ${input.reason}`,
            relatedTaskId: occ.taskId,
          });

          // Create activity log entry with full details
          await createActivityLog({
            householdId: input.revokerHouseholdId,
            memberId: input.revokerId,
            activityType: "inventory",
            action: "borrow_revoked",
            description: `Ausleihgenehmigung für "${item.name}" widerrufen`,
            metadata: {
              itemId: request.inventoryItemId,
              itemName: item.name,
              requestId: input.requestId,
              taskId: occ.taskId,
              taskName,
              occurrenceNumber: occ.occurrenceNumber,
              borrowerName,
              borrowerMemberId: request.borrowerMemberId,
              startDate: request.startDate.toISOString(),
              endDate: request.endDate.toISOString(),
              reason: input.reason,
              revokedBy: revokerName,
            },
          });

          // Reset the occurrence item's borrow status
          await db.update(taskOccurrenceItems)
            .set({
              borrowStatus: "pending",
              borrowRequestId: null,
            })
            .where(eq(taskOccurrenceItems.id, occ.id));
        }

        // If no task-linked occurrences, send notification without task info and create a general activity log
        if (linkedOccurrences.length === 0) {
          await createNotification({
            householdId: request.borrowerHouseholdId,
            memberId: request.borrowerMemberId,
            type: "general",
            title: "Ausleihgenehmigung widerrufen",
            message: `Die Genehmigung für "${item.name}" (${new Date(request.startDate).toLocaleDateString("de-DE")} - ${new Date(request.endDate).toLocaleDateString("de-DE")}) wurde von ${revokerName} widerrufen. Begründung: ${input.reason}`,
          });

          await createActivityLog({
            householdId: input.revokerHouseholdId,
            memberId: input.revokerId,
            activityType: "inventory",
            action: "borrow_revoked",
            description: `Ausleihgenehmigung für "${item.name}" widerrufen`,
            metadata: {
              itemId: request.inventoryItemId,
              itemName: item.name,
              requestId: input.requestId,
              borrowerName,
              borrowerMemberId: request.borrowerMemberId,
              startDate: request.startDate.toISOString(),
              endDate: request.endDate.toISOString(),
              reason: input.reason,
              revokedBy: revokerName,
            },
          });
        }
      }

      return { success: true };
    }),

  // Cancel a borrow request
  cancel: publicProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input }) => {
      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "cancelled",
      });

      // Delete calendar events for cancelled borrow
      await deleteCalendarEventsByBorrowRequest(input.requestId);

      return { success: true };
    }),

  // ===== Guidelines Management =====

  // Create or update guidelines for an item
  saveGuidelines: publicProcedure
    .input(
      z.object({
        inventoryItemId: z.number(),
        instructionsText: z.string().optional(),
        checklistItems: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            required: z.boolean(),
          })
        ).optional(),
        photoRequirements: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            examplePhotoUrl: z.string().optional(),
            required: z.boolean(),
          })
        ).optional(),
        createdBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if guidelines already exist
      const existing = await getBorrowGuidelineByItemId(input.inventoryItemId);

      if (existing) {
        // Update existing guidelines
        await updateBorrowGuideline({
          id: existing.id,
          instructionsText: input.instructionsText,
          checklistItems: input.checklistItems,
          photoRequirements: input.photoRequirements,
        });
        return { success: true, id: existing.id };
      } else {
        // Create new guidelines
        const id = await createBorrowGuideline({
          inventoryItemId: input.inventoryItemId,
          instructionsText: input.instructionsText,
          checklistItems: input.checklistItems,
          photoRequirements: input.photoRequirements,
          createdBy: input.createdBy,
        });
        return { success: true, id };
      }
    }),

  // Get guidelines for an item
  getGuidelines: publicProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ input }) => {
      return await getBorrowGuidelineByItemId(input.itemId);
    }),

  // Delete guidelines
  deleteGuidelines: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBorrowGuideline(input.id);
      return { success: true };
    }),

  // ===== Return Workflow =====

  // Complete return with checklist and photos
  completeReturn: publicProcedure
    .input(
      z.object({
        requestId: z.number(),
        returnerId: z.number(),
        checklistCompleted: z.record(z.string(), z.boolean()), // { checklistItemId: completed }
        photos: z.array(
          z.object({
            photoRequirementId: z.string().optional(),
            photoUrl: z.string(),
            filename: z.string().optional(),
          })
        ),
        conditionReport: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const request = await getBorrowRequestById(input.requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      // Get guidelines to validate checklist and photos
      const guidelines = await getBorrowGuidelineByItemId(request.inventoryItemId);

      if (guidelines) {
        // Validate required checklist items
        if (guidelines.checklistItems) {
          const requiredItems = (guidelines.checklistItems as any[]).filter(item => item.required);
          for (const item of requiredItems) {
            if (!input.checklistCompleted[item.id]) {
              throw new Error(`Pflicht-Checklistenpunkt nicht erfüllt: ${item.label}`);
            }
          }
        }

        // Validate required photos
        if (guidelines.photoRequirements) {
          const requiredPhotos = (guidelines.photoRequirements as any[]).filter(req => req.required);
          for (const req of requiredPhotos) {
            const hasPhoto = input.photos.some(p => p.photoRequirementId === req.id);
            if (!hasPhoto) {
              throw new Error(`Pflicht-Foto fehlt: ${req.label}`);
            }
          }
        }
      }

      // Save return photos
      for (const photo of input.photos) {
        await createBorrowReturnPhoto({
          borrowRequestId: input.requestId,
          photoRequirementId: photo.photoRequirementId,
          photoUrl: photo.photoUrl,
          filename: photo.filename,
          uploadedBy: input.returnerId,
        });
      }

      // Update request status to completed
      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "completed",
        returnedAt: new Date(),
      });

      // Get item details for activity log
      const item = await getInventoryItemById(request.inventoryItemId);

      // Create activity log
      await createActivityLog({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        activityType: "inventory",
        action: "borrow_returned",
        description: `"${item?.name}" wurde zurückgegeben`,
        metadata: {
          itemId: request.inventoryItemId,
          requestId: input.requestId,
          conditionReport: input.conditionReport,
        },
      });

      return { success: true };
    }),

  // Get return photos for a request
  getReturnPhotos: publicProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      return await getBorrowReturnPhotosByRequestId(input.requestId);
    }),

  // Get all borrows as borrower
  getMyBorrows: publicProcedure
    .input(z.object({ householdId: z.number(), borrowerId: z.number() }))
    .query(async ({ input }) => {
      const requests = await getBorrowRequestsByBorrower(input.borrowerId);
      
      // Enrich with item and owner names
      const enriched = await Promise.all(
        requests.map(async (req) => {
          const item = await getInventoryItemById(req.inventoryItemId);
          
          // Get owner names from inventory item
          let ownerName = "Haushalt";
          if (item?.owners && item.owners.length > 0) {
            ownerName = item.owners.map(o => o.memberName).join(", ");
          }
          
          return {
            id: req.id,
            itemId: req.inventoryItemId,
            itemName: item?.name || "Unknown",
            ownerName,
            status: req.status,
            startDate: req.startDate,
            endDate: req.endDate,
            responseMessage: req.responseMessage,
          };
        })
      );
      
      return enriched;
    }),

  // Get all lent items as owner
  getLentItems: publicProcedure
    .input(z.object({ householdId: z.number(), ownerId: z.number() }))
    .query(async ({ input }) => {
      const requests = await getBorrowRequestsByOwner(input.householdId);
      
      // Enrich with item and borrower names
      const enriched = await Promise.all(
        requests.map(async (req) => {
          const item = await getInventoryItemById(req.inventoryItemId);
          
          // Get borrower name
          const borrower = await getHouseholdMemberById(req.borrowerMemberId);
          const borrowerName = borrower?.memberName || "Unbekannt";
          
          return {
            id: req.id,
            itemId: req.inventoryItemId,
            itemName: item?.name || "Unknown",
            borrowerName,
            status: req.status,
            startDate: req.startDate,
            endDate: req.endDate,
          };
        })
      );
      
      return enriched;
    }),

  // Get count of pending borrow requests for owner
  getPendingRequestsCount: publicProcedure
    .input(z.object({ householdId: z.number(), ownerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { count: 0 };

      // Get all pending requests for items owned by this member
      const { inventoryOwnership } = await import("../../drizzle/schema");
      const { eq, and, or } = await import("drizzle-orm");

      const pendingRequests = await db
        .select({ requestId: borrowRequests.id })
        .from(borrowRequests)
        .innerJoin(inventoryItems, eq(borrowRequests.inventoryItemId, inventoryItems.id))
        .leftJoin(inventoryOwnership, eq(inventoryItems.id, inventoryOwnership.inventoryItemId))
        .where(
          and(
            eq(borrowRequests.status, "pending"),
            // Item is either household-owned (no ownership record) or personally owned by this member
            or(
              and(
                eq(inventoryItems.householdId, input.householdId),
                eq(inventoryItems.ownershipType, "household")
              ),
              and(
                eq(inventoryItems.ownershipType, "personal"),
                eq(inventoryOwnership.memberId, input.ownerId)
              )
            )
          )
        );

      return { count: pendingRequests.length };
    }),

  // Get pending request counts per item
  getPendingRequestsByItem: publicProcedure
    .input(z.object({ householdId: z.number(), ownerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const { inventoryOwnership } = await import("../../drizzle/schema");
      const { eq, and, or, count } = await import("drizzle-orm");

      // Get pending request counts grouped by item
      const itemCounts = await db
        .select({
          itemId: borrowRequests.inventoryItemId,
          count: count(borrowRequests.id)
        })
        .from(borrowRequests)
        .innerJoin(inventoryItems, eq(borrowRequests.inventoryItemId, inventoryItems.id))
        .leftJoin(inventoryOwnership, eq(inventoryItems.id, inventoryOwnership.inventoryItemId))
        .where(
          and(
            eq(borrowRequests.status, "pending"),
            // Item is either household-owned or personally owned by this member
            or(
              and(
                eq(inventoryItems.householdId, input.householdId),
                eq(inventoryItems.ownershipType, "household")
              ),
              and(
                eq(inventoryItems.ownershipType, "personal"),
                eq(inventoryOwnership.memberId, input.ownerId)
              )
            )
          )
        )
        .groupBy(borrowRequests.inventoryItemId);

      return itemCounts;
    }),
});
