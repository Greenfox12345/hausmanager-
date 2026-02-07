import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
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

      // Item already fetched above for validation
      
      // Create activity log
      await createActivityLog({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        activityType: "inventory",
        action: "borrow_approved",
        description: `Ausleih-Anfrage für "${item?.name}" wurde genehmigt`,
        metadata: {
          itemId: request.inventoryItemId,
          requestId: input.requestId,
        },
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
      const requests = await getBorrowRequestsByOwner(input.householdId);
      const pendingCount = requests.filter(req => req.status === "pending").length;
      return { count: pendingCount };
    }),
});
