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
  createActivityLog,
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

      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "approved",
        approvedBy: input.approverId,
        approvedAt: new Date(),
        responseMessage: input.responseMessage,
      });

      // Get item details for activity log
      const item = await getInventoryItemById(request.inventoryItemId);
      
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

      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "rejected",
        approvedBy: input.approverId,
        approvedAt: new Date(),
        responseMessage: input.responseMessage,
      });

      // Get item details for activity log
      const item = await getInventoryItemById(request.inventoryItemId);
      
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
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input }) => {
      const request = await getBorrowRequestById(input.requestId);
      if (!request) {
        throw new Error("Request not found");
      }

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
        },
      });

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

      return { success: true };
    }),
});
