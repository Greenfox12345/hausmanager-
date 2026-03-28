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
import {
  borrowRequested,
  borrowAutoApproved,
  borrowApproved,
  borrowRejected,
  borrowReturned,
  borrowRevoked,
  borrowCancelled,
} from "../activityTexts";
import { getHouseholdById } from "../db";

type BorrowLang = "de" | "en" | "es" | "fr" | "zh" | "tr" | "ar";
async function getBorrowLang(householdId: number): Promise<BorrowLang> {
  const hh = await getHouseholdById(householdId);
  const l = hh?.language ?? "de";
  return (l === "en" || l === "es" || l === "fr" || l === "zh" || l === "tr" || l === "ar") ? l as BorrowLang : "de";
}

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
        // Optional task context for activity log
        taskId: z.number().optional(),
        taskName: z.string().optional(),
        occurrenceNumber: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get item details to determine ownership
      const item = await getInventoryItemById(input.inventoryItemId);
      if (!item) {
        throw new Error("Item not found");
      }

      const autoApproved = item.ownershipType === "household";

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
        status: autoApproved ? "approved" : "pending",
      });

      // Build shared metadata
      const baseMetadata: Record<string, unknown> = {
        itemId: input.inventoryItemId,
        itemName: item.name,
        requestId,
        startDate: input.startDate,
        endDate: input.endDate,
      };
      if (input.taskId) baseMetadata.taskId = input.taskId;
      if (input.taskName) baseMetadata.taskName = input.taskName;
      if (input.occurrenceNumber) baseMetadata.occurrenceNumber = input.occurrenceNumber;

      // Activity log: Anfrage abgeschickt (multilingual)
      const borrowerMemberObj = await getHouseholdMemberById(input.borrowerMemberId);
      const borrowerMemberName = borrowerMemberObj?.memberName ?? `#${input.borrowerMemberId}`;
      const reqLang = await getBorrowLang(input.borrowerHouseholdId);
      const taskSuffix = input.taskName
        ? (reqLang === "en" ? ` (task: ${input.taskName}${input.occurrenceNumber ? `, occurrence ${input.occurrenceNumber}` : ""})`
          : reqLang === "es" ? ` (tarea: ${input.taskName}${input.occurrenceNumber ? `, cita ${input.occurrenceNumber}` : ""})`
          : ` (Aufgabe: ${input.taskName}${input.occurrenceNumber ? `, Termin ${input.occurrenceNumber}` : ""})`)
        : undefined;
      const requestDescription = borrowRequested(reqLang, item.name, borrowerMemberName, taskSuffix ?? "");

      await createActivityLog({
        householdId: input.borrowerHouseholdId,
        memberId: input.borrowerMemberId,
        activityType: "borrow",
        action: "borrow_requested",
        description: requestDescription,
        relatedItemId: input.taskId,
        metadata: baseMetadata,
      });

      // If auto-approved, also log the approval
      if (autoApproved) {
        await createActivityLog({
          householdId: input.borrowerHouseholdId,
          memberId: input.borrowerMemberId,
          activityType: "borrow",
          action: "borrow_auto_approved",
          description: borrowAutoApproved(reqLang, item.name, borrowerMemberName),
          relatedItemId: input.taskId,
          metadata: baseMetadata,
        });
      }

      // Notify owner if personal item (requires approval)
      if (!autoApproved) {
        const borrowerMember = await getHouseholdMemberById(input.borrowerMemberId);
        const borrowerName = borrowerMember?.memberName ?? "Unbekannt";
        const startFormatted = new Date(input.startDate).toLocaleDateString("de-DE");
        const endFormatted = new Date(input.endDate).toLocaleDateString("de-DE");
        const taskInfo = input.taskName
          ? ` für Aufgabe "${input.taskName}"${
              input.occurrenceNumber ? ` (Termin ${input.occurrenceNumber})` : ""
            }`
          : "";

        // We need a memberId to send the notification - use the item owner's memberId if available
        // For household items this won't be reached (autoApproved=true), so this is for personal items
        const ownerMemberId = item.owners?.[0]?.memberId;
        if (ownerMemberId) {
          const reqLang = await getBorrowLang(item.householdId);
          const reqTitle = reqLang === "en" ? "New borrow request" : reqLang === "es" ? "Nueva solicitud de préstamo" : reqLang === "fr" ? "Nouvelle demande d'emprunt" : reqLang === "zh" ? "新借用申请" : reqLang === "tr" ? "Yeni ödünç alma isteği" : "Neue Ausleih-Anfrage";
          const reqMsg = reqLang === "en" ? `${borrowerName} wants to borrow "${item.name}" from ${startFormatted} to ${endFormatted}${taskInfo}.`
            : reqLang === "es" ? `${borrowerName} quiere tomar prestado "${item.name}" del ${startFormatted} al ${endFormatted}${taskInfo}.`
            : reqLang === "fr" ? `${borrowerName} souhaite emprunter « ${item.name} » du ${startFormatted} au ${endFormatted}${taskInfo}.`
            : `${borrowerName} möchte "${item.name}" ausleihen vom ${startFormatted} bis ${endFormatted}${taskInfo}.`;
          await createNotification({
            householdId: item.householdId,
            memberId: ownerMemberId,
            title: reqTitle,
            message: reqMsg,
            type: "general",
            relatedTaskId: input.taskId,
          });
        }
      }

      return { 
        success: true, 
        requestId,
        autoApproved,
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

      const approveLang = await getBorrowLang(request.borrowerHouseholdId);
      const approverMemberObj = await getHouseholdMemberById(input.approverId);
      const approverMemberName = approverMemberObj?.memberName ?? `#${input.approverId}`;
      const borrowerMemberObj2 = await getHouseholdMemberById(request.borrowerMemberId);
      const borrowerMemberName2 = borrowerMemberObj2?.memberName ?? `#${request.borrowerMemberId}`;
      await createActivityLog({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        activityType: "borrow",
        action: "borrow_approved",
        description: borrowApproved(approveLang, item.name, borrowerMemberName2, approverMemberName),
        relatedItemId: linkedOccurrence?.taskId,
        metadata,
      });

      // Notify borrower about approval
      const approverMember = await getHouseholdMemberById(input.approverId);
      const approverName = approverMember?.memberName || "Eigentümer";
      const startFormatted = new Date(request.startDate).toLocaleDateString("de-DE");
      const endFormatted = new Date(request.endDate).toLocaleDateString("de-DE");
      const approvalTaskInfo = linkedOccurrence
        ? ` für Aufgabe "${linkedOccurrence.taskName}" (Termin ${linkedOccurrence.occurrenceNumber})`
        : "";
      const approveLangNotif = await getBorrowLang(request.borrowerHouseholdId);
      const approveTitle = approveLangNotif === "en" ? "Borrow request approved" : approveLangNotif === "es" ? "Solicitud de préstamo aprobada" : approveLangNotif === "fr" ? "Demande d'emprunt approuvée" : approveLangNotif === "zh" ? "借用申请已批准" : approveLangNotif === "tr" ? "Ödünç alma isteği onaylandı" : "Ausleih-Anfrage genehmigt";
      const approveMsg = approveLangNotif === "en" ? `${approverName} approved your request for "${item.name}" (${startFormatted} – ${endFormatted})${approvalTaskInfo}.`
        : approveLangNotif === "es" ? `${approverName} aprobó tu solicitud para "${item.name}" (${startFormatted} – ${endFormatted})${approvalTaskInfo}.`
        : approveLangNotif === "fr" ? `${approverName} a approuvé votre demande pour « ${item.name} » (${startFormatted} – ${endFormatted})${approvalTaskInfo}.`
        : `${approverName} hat deine Anfrage für "${item.name}" (${startFormatted} – ${endFormatted})${approvalTaskInfo} genehmigt.`;
      await createNotification({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        type: "general",
        title: approveTitle,
        message: approveMsg,
        relatedTaskId: linkedOccurrence?.taskId,
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
      
      // Create activity log (multilingual)
      const rejecterMember = await getHouseholdMemberById(input.approverId);
      const rejecterName = rejecterMember?.memberName || "Eigentümer";
      const rejectLang = await getBorrowLang(request.borrowerHouseholdId);
      const rejectBorrowerObj = await getHouseholdMemberById(request.borrowerMemberId);
      const rejectBorrowerName = rejectBorrowerObj?.memberName ?? `#${request.borrowerMemberId}`;
      await createActivityLog({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        activityType: "borrow",
        action: "borrow_rejected",
        description: borrowRejected(rejectLang, item?.name ?? "?", rejectBorrowerName, input.responseMessage ?? ""),
        metadata: {
          itemId: request.inventoryItemId,
          itemName: item?.name,
          requestId: input.requestId,
          startDate: request.startDate.toISOString(),
          endDate: request.endDate.toISOString(),
          rejectedBy: rejecterName,
          responseMessage: input.responseMessage,
        },
      });

      // Notify borrower about rejection
      const rejectStartFormatted = new Date(request.startDate).toLocaleDateString("de-DE");
      const rejectEndFormatted = new Date(request.endDate).toLocaleDateString("de-DE");
      const rejectLangNotif = await getBorrowLang(request.borrowerHouseholdId);
      const rejectTitle = rejectLangNotif === "en" ? "Borrow request rejected" : rejectLangNotif === "es" ? "Solicitud de préstamo rechazada" : rejectLangNotif === "fr" ? "Demande d'emprunt refusée" : rejectLangNotif === "zh" ? "借用申请已拒绝" : rejectLangNotif === "tr" ? "Ödünç alma isteği reddedildi" : "Ausleih-Anfrage abgelehnt";
      const rejectMessage = input.responseMessage
        ? (rejectLangNotif === "en" ? `${rejecterName} rejected your request for "${item.name}" (${rejectStartFormatted} – ${rejectEndFormatted}). Reason: ${input.responseMessage}`
          : rejectLangNotif === "es" ? `${rejecterName} rechazó tu solicitud para "${item.name}" (${rejectStartFormatted} – ${rejectEndFormatted}). Motivo: ${input.responseMessage}`
          : rejectLangNotif === "fr" ? `${rejecterName} a refusé votre demande pour « ${item.name} » (${rejectStartFormatted} – ${rejectEndFormatted}). Raison : ${input.responseMessage}`
          : `${rejecterName} hat deine Anfrage für "${item.name}" (${rejectStartFormatted} – ${rejectEndFormatted}) abgelehnt. Begründung: ${input.responseMessage}`)
        : (rejectLangNotif === "en" ? `${rejecterName} rejected your request for "${item.name}" (${rejectStartFormatted} – ${rejectEndFormatted}).`
          : rejectLangNotif === "es" ? `${rejecterName} rechazó tu solicitud para "${item.name}" (${rejectStartFormatted} – ${rejectEndFormatted}).`
          : rejectLangNotif === "fr" ? `${rejecterName} a refusé votre demande pour « ${item.name} » (${rejectStartFormatted} – ${rejectEndFormatted}).`
          : `${rejecterName} hat deine Anfrage für "${item.name}" (${rejectStartFormatted} – ${rejectEndFormatted}) abgelehnt.`);
      await createNotification({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        type: "general",
        title: rejectTitle,
        message: rejectMessage,
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
      
      // Create activity log (multilingual)
      const returnLang = await getBorrowLang(request.borrowerHouseholdId);
      const returnMemberObj = await getHouseholdMemberById(request.borrowerMemberId);
      const returnMemberName = returnMemberObj?.memberName ?? `#${request.borrowerMemberId}`;
      await createActivityLog({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        activityType: "borrow",
        action: "borrow_returned",
        description: borrowReturned(returnLang, item?.name ?? "?", returnMemberName),
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
          const revokeLangNotif1 = await getBorrowLang(request.borrowerHouseholdId);
          const revokeTitle1 = revokeLangNotif1 === "en" ? "Borrow approval revoked" : revokeLangNotif1 === "es" ? "Aprobación de préstamo revocada" : revokeLangNotif1 === "fr" ? "Approbation d'emprunt révoquée" : revokeLangNotif1 === "zh" ? "借用批准已撤销" : revokeLangNotif1 === "tr" ? "Ödünç onayı iptal edildi" : "Ausleihgenehmigung widerrufen";
          const revokeMsg1 = revokeLangNotif1 === "en" ? `The approval for "${item.name}" (${new Date(request.startDate).toLocaleDateString("en-GB")} - ${new Date(request.endDate).toLocaleDateString("en-GB")}) for task "${taskName}" (occurrence ${occ.occurrenceNumber}) was revoked by ${revokerName}. Reason: ${input.reason}`
            : revokeLangNotif1 === "es" ? `La aprobación para "${item.name}" (${new Date(request.startDate).toLocaleDateString("es-ES")} - ${new Date(request.endDate).toLocaleDateString("es-ES")}) para la tarea "${taskName}" (cita ${occ.occurrenceNumber}) fue revocada por ${revokerName}. Motivo: ${input.reason}`
            : revokeLangNotif1 === "fr" ? `L'approbation pour « ${item.name} » (${new Date(request.startDate).toLocaleDateString("fr-FR")} - ${new Date(request.endDate).toLocaleDateString("fr-FR")}) pour la tâche « ${taskName} » (occurrence ${occ.occurrenceNumber}) a été révoquée par ${revokerName}. Raison : ${input.reason}`
            : `Die Genehmigung für "${item.name}" (${new Date(request.startDate).toLocaleDateString("de-DE")} - ${new Date(request.endDate).toLocaleDateString("de-DE")}) für Aufgabe "${taskName}" (Termin ${occ.occurrenceNumber}) wurde von ${revokerName} widerrufen. Begründung: ${input.reason}`;
          await createNotification({
            householdId: request.borrowerHouseholdId,
            memberId: request.borrowerMemberId,
            type: "general",
            title: revokeTitle1,
            message: revokeMsg1,
            relatedTaskId: occ.taskId,
          });

          // Create activity log entry with full details (multilingual)
          const revokeLang = await getBorrowLang(input.revokerHouseholdId);
          await createActivityLog({
            householdId: input.revokerHouseholdId,
            memberId: input.revokerId,
            activityType: "borrow",
            action: "borrow_revoked",
            description: borrowRevoked(revokeLang, item.name, revokerName, input.reason),
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
          const revokeLangNotif2 = await getBorrowLang(request.borrowerHouseholdId);
          const revokeTitle2 = revokeLangNotif2 === "en" ? "Borrow approval revoked" : revokeLangNotif2 === "es" ? "Aprobación de préstamo revocada" : revokeLangNotif2 === "fr" ? "Approbation d'emprunt révoquée" : revokeLangNotif2 === "zh" ? "借用批准已撤销" : revokeLangNotif2 === "tr" ? "Ödünç onayı iptal edildi" : "Ausleihgenehmigung widerrufen";
          const revokeMsg2 = revokeLangNotif2 === "en" ? `The approval for "${item.name}" (${new Date(request.startDate).toLocaleDateString("en-GB")} - ${new Date(request.endDate).toLocaleDateString("en-GB")}) was revoked by ${revokerName}. Reason: ${input.reason}`
            : revokeLangNotif2 === "es" ? `La aprobación para "${item.name}" (${new Date(request.startDate).toLocaleDateString("es-ES")} - ${new Date(request.endDate).toLocaleDateString("es-ES")}) fue revocada por ${revokerName}. Motivo: ${input.reason}`
            : revokeLangNotif2 === "fr" ? `L'approbation pour « ${item.name} » (${new Date(request.startDate).toLocaleDateString("fr-FR")} - ${new Date(request.endDate).toLocaleDateString("fr-FR")}) a été révoquée par ${revokerName}. Raison : ${input.reason}`
            : `Die Genehmigung für "${item.name}" (${new Date(request.startDate).toLocaleDateString("de-DE")} - ${new Date(request.endDate).toLocaleDateString("de-DE")}) wurde von ${revokerName} widerrufen. Begründung: ${input.reason}`;
          await createNotification({
            householdId: request.borrowerHouseholdId,
            memberId: request.borrowerMemberId,
            type: "general",
            title: revokeTitle2,
            message: revokeMsg2,
          });

          const revokeLang2 = await getBorrowLang(input.revokerHouseholdId);
          await createActivityLog({
            householdId: input.revokerHouseholdId,
            memberId: input.revokerId,
            activityType: "borrow",
            action: "borrow_revoked",
            description: borrowRevoked(revokeLang2, item.name, revokerName, input.reason),
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

  // Cancel a borrow request (by the borrower themselves)
  cancel: publicProcedure
    .input(z.object({
      requestId: z.number(),
      borrowerMemberId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const request = await getBorrowRequestById(input.requestId);
      if (!request) {
        throw new Error("Ausleih-Anfrage nicht gefunden");
      }

      // Only the borrower can cancel their own request
      if (request.borrowerMemberId !== input.borrowerMemberId) {
        throw new Error("Nur der Ausleiher kann seine eigene Anfrage stornieren");
      }

      // Only pending or approved requests can be cancelled by the borrower
      if (request.status !== "pending" && request.status !== "approved") {
        throw new Error("Nur ausstehende oder genehmigte Anfragen können storniert werden");
      }

      const item = await getInventoryItemById(request.inventoryItemId);
      const borrowerMember = await getHouseholdMemberById(input.borrowerMemberId);
      const borrowerName = borrowerMember?.memberName ?? "Unbekannt";

      const reasonSuffix = input.reason?.trim() ? `: ${input.reason.trim()}` : "";

      await updateBorrowRequestStatus({
        requestId: input.requestId,
        status: "cancelled",
        responseMessage: `Storniert von ${borrowerName}${reasonSuffix}`,
      });

      // Delete calendar events for cancelled borrow
      await deleteCalendarEventsByBorrowRequest(input.requestId);

      // Notify the item owner (for approved requests or pending personal-item requests)
      if (item) {
        const startFormatted = new Date(request.startDate).toLocaleDateString("de-DE");
        const endFormatted = new Date(request.endDate).toLocaleDateString("de-DE");
        const ownerMemberId = item.owners?.[0]?.memberId;
        // Notify for approved (owner already knew) or pending personal items (owner had a pending request)
        const shouldNotify = request.status === "approved" || item.ownershipType === "personal";
        if (ownerMemberId && shouldNotify) {
          const cancelLangNotif = await getBorrowLang(item.householdId);
          const cancelTitle = cancelLangNotif === "en" ? "Borrow cancelled" : cancelLangNotif === "es" ? "Préstamo cancelado" : cancelLangNotif === "fr" ? "Emprunt annulé" : cancelLangNotif === "zh" ? "借用已取消" : cancelLangNotif === "tr" ? "Ödünç iptal edildi" : "Ausleihe storniert";
          const reasonText = input.reason?.trim()
            ? (cancelLangNotif === "en" ? ` Reason: ${input.reason.trim()}` : cancelLangNotif === "es" ? ` Motivo: ${input.reason.trim()}` : cancelLangNotif === "fr" ? ` Raison : ${input.reason.trim()}` : cancelLangNotif === "zh" ? ` 原因：${input.reason.trim()}` : cancelLangNotif === "tr" ? ` Neden: ${input.reason.trim()}` : ` Begründung: ${input.reason.trim()}`)
            : "";
          const cancelMsg = cancelLangNotif === "en" ? `${borrowerName} cancelled the borrow of "${item.name}" (${startFormatted} – ${endFormatted}).${reasonText}`
            : cancelLangNotif === "es" ? `${borrowerName} canceló el préstamo de "${item.name}" (${startFormatted} – ${endFormatted}).${reasonText}`
            : cancelLangNotif === "fr" ? `${borrowerName} a annulé l'emprunt de « ${item.name} » (${startFormatted} – ${endFormatted}).${reasonText}`
            : cancelLangNotif === "zh" ? `${borrowerName} 取消了对"${item.name}"的借用（${startFormatted} – ${endFormatted}）。${reasonText}`
            : cancelLangNotif === "tr" ? `${borrowerName}, "${item.name}" ödüncünü iptal etti (${startFormatted} – ${endFormatted}).${reasonText}`
            : `${borrowerName} hat die Ausleihe von "${item.name}" (${startFormatted} – ${endFormatted}) storniert.${reasonText}`;
          await createNotification({
            householdId: item.householdId,
            memberId: ownerMemberId,
            type: "general",
            title: cancelTitle,
            message: cancelMsg,
          });
        }
      }

      // Activity log (multilingual)
      if (item) {
        const cancelLang = await getBorrowLang(request.borrowerHouseholdId);
        await createActivityLog({
          householdId: request.borrowerHouseholdId,
          memberId: input.borrowerMemberId,
          activityType: "borrow",
          action: "borrow_cancelled",
          description: borrowCancelled(cancelLang, item.name, borrowerName),
          metadata: {
            itemId: request.inventoryItemId,
            itemName: item.name,
            requestId: input.requestId,
            startDate: request.startDate.toISOString(),
            endDate: request.endDate.toISOString(),
            previousStatus: request.status,
            reason: input.reason?.trim() || undefined,
          },
        });
      }

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

      // Create activity log (multilingual)
      const ownerReturnLang = await getBorrowLang(request.borrowerHouseholdId);
      const ownerReturnMemberObj = await getHouseholdMemberById(request.borrowerMemberId);
      const ownerReturnMemberName = ownerReturnMemberObj?.memberName ?? `#${request.borrowerMemberId}`;
      await createActivityLog({
        householdId: request.borrowerHouseholdId,
        memberId: request.borrowerMemberId,
        activityType: "borrow",
        action: "borrow_returned",
        description: borrowReturned(ownerReturnLang, item?.name ?? "?", ownerReturnMemberName),
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
          
          // Load guideline for this item
          const guideline = await getBorrowGuidelineByItemId(req.inventoryItemId);

          return {
            id: req.id,
            itemId: req.inventoryItemId,
            itemName: item?.name || "Unknown",
            itemPhotoUrl: (item as any)?.photoUrl ?? null,
            itemDescription: (item as any)?.description ?? null,
            ownerName,
            status: req.status,
            startDate: req.startDate,
            endDate: req.endDate,
            requestMessage: req.requestMessage,
            responseMessage: req.responseMessage,
            pickupComment: req.pickupComment ?? null,
            pickupPhotoUrl: req.pickupPhotoUrl ?? null,
            returnComment: req.returnComment ?? null,
            returnPhotoUrl: req.returnPhotoUrl ?? null,
            guideline: guideline ? {
              instructionsText: guideline.instructionsText ?? null,
              checklistItems: (guideline.checklistItems as any) ?? null,
              photoRequirements: (guideline.photoRequirements as any) ?? null,
            } : null,
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

  // Get ALL requests for a household (admin view) enriched with borrower household name
  getAllHouseholdRequests: publicProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input }) => {
      const requests = await getBorrowRequestsByOwner(input.householdId);
      const db = await getDb();
      const { households } = await import("../../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const enriched = await Promise.all(
        requests.map(async (req) => {
          const item = await getInventoryItemById(req.inventoryItemId);
          const borrower = await getHouseholdMemberById(req.borrowerMemberId);
          let borrowerHouseholdName = "Unbekannt";
          if (db && req.borrowerHouseholdId) {
            const [hh] = await db.select({ name: households.name })
              .from(households).where(eqOp(households.id, req.borrowerHouseholdId));
            borrowerHouseholdName = hh?.name || "Unbekannt";
          }
          return {
            id: req.id,
            itemId: req.inventoryItemId,
            itemName: item?.name || "Unknown",
            borrowerName: borrower?.memberName || "Unbekannt",
            borrowerHouseholdName,
            borrowerHouseholdId: req.borrowerHouseholdId,
            ownerHouseholdId: req.ownerHouseholdId,
            isExternal: req.borrowerHouseholdId !== input.householdId,
            status: req.status,
            startDate: req.startDate,
            endDate: req.endDate,
            message: req.requestMessage,
            responseMessage: req.responseMessage,
          };
        })
      );
      return enriched;
    }),

  // Get pending requests the current member can handle
  getPendingForMember: publicProcedure
    .input(z.object({ householdId: z.number(), memberId: z.number() }))
    .query(async ({ input }) => {
      const allRequests = await getBorrowRequestsByOwner(input.householdId);
      const now = new Date();
      const pending = allRequests.filter(r => {
        if (r.status === "pending") return true;
        // Genehmigte Anfragen mit zukünftigem oder heutigem Enddatum anzeigen
        if (r.status === "approved" && r.endDate && new Date(r.endDate) >= now) return true;
        return false;
      });
      const db = await getDb();
      const { households } = await import("../../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const enriched = await Promise.all(
        pending.map(async (req) => {
          const item = await getInventoryItemById(req.inventoryItemId);
          const borrower = await getHouseholdMemberById(req.borrowerMemberId);
          let borrowerHouseholdName = "Unbekannt";
          if (db && req.borrowerHouseholdId) {
            const [hh] = await db.select({ name: households.name })
              .from(households).where(eqOp(households.id, req.borrowerHouseholdId));
            borrowerHouseholdName = hh?.name || "Unbekannt";
          }
          return {
            id: req.id,
            itemId: req.inventoryItemId,
            itemName: item?.name || "Unknown",
            borrowerName: borrower?.memberName || "Unbekannt",
            borrowerHouseholdName,
            borrowerHouseholdId: req.borrowerHouseholdId,
            ownerHouseholdId: req.ownerHouseholdId,
            isExternal: req.borrowerHouseholdId !== input.householdId,
            status: req.status,
            startDate: req.startDate,
            endDate: req.endDate,
            message: req.requestMessage,
          };
        })
      );
      return enriched;
    }),

  // Confirm pickup: borrower confirms they picked up the item
  confirmPickup: publicProcedure
    .input(
      z.object({
        requestId: z.number(),
        memberId: z.number(),
        comment: z.string().optional(),
        photoBase64: z.string().optional(),
        photoFilename: z.string().optional(),
        requirementPhotos: z.array(z.object({
          requirementId: z.string(),
          photoBase64: z.string(),
          photoFilename: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const request = await getBorrowRequestById(input.requestId);
      if (!request) throw new Error("Borrow request not found");
      if (request.borrowerMemberId !== input.memberId) throw new Error("Not authorized");
      if (request.status !== "approved") throw new Error("Request must be approved before pickup");

      let photoUrl: string | undefined;
      if (input.photoBase64 && input.photoFilename) {
        const { storagePut } = await import("../storage");
        const { nanoid } = await import("nanoid");
        const matches = input.photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const ext = input.photoFilename.split(".").pop() || "jpg";
          const { url } = await storagePut(`borrow-pickup/${nanoid()}.${ext}`, buffer, mimeType);
          photoUrl = url;
        }
      }

      await db.update(borrowRequests)
        .set({
          status: "active",
          borrowedAt: new Date(),
          pickupComment: input.comment ?? null,
          pickupPhotoUrl: photoUrl ?? null,
        } as any)
        .where(eq(borrowRequests.id, input.requestId));

      // Save requirement photos
      if (input.requirementPhotos && input.requirementPhotos.length > 0) {
        const { storagePut: sp2 } = await import("../storage");
        const { nanoid: nanoid2 } = await import("nanoid");
        const { borrowReturnPhotos: brpTable } = await import("../../drizzle/schema");
        for (const reqPhoto of input.requirementPhotos) {
          const m = reqPhoto.photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (m) {
            const buf = Buffer.from(m[2], "base64");
            const ext = reqPhoto.photoFilename.split(".").pop() || "jpg";
            const { url: rUrl } = await sp2(`borrow-req-photos/${nanoid2()}.${ext}`, buf, m[1]);
            await db.insert(brpTable).values({
              borrowRequestId: input.requestId,
              photoRequirementId: reqPhoto.requirementId,
              photoUrl: rUrl,
              filename: reqPhoto.photoFilename,
              uploadedBy: input.memberId,
              uploadedAt: new Date(),
            } as any);
          }
        }
      }

      return { success: true };
    }),

  // Confirm return: borrower confirms they returned the item
  confirmReturn: publicProcedure
    .input(
      z.object({
        requestId: z.number(),
        memberId: z.number(),
        comment: z.string().optional(),
        photoBase64: z.string().optional(),
        photoFilename: z.string().optional(),
        requirementPhotos: z.array(z.object({
          requirementId: z.string(),
          photoBase64: z.string(),
          photoFilename: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const request = await getBorrowRequestById(input.requestId);
      if (!request) throw new Error("Borrow request not found");
      if (request.borrowerMemberId !== input.memberId) throw new Error("Not authorized");
      if (request.status !== "active") throw new Error("Request must be active to return");

      let photoUrl: string | undefined;
      if (input.photoBase64 && input.photoFilename) {
        const { storagePut } = await import("../storage");
        const { nanoid } = await import("nanoid");
        const matches = input.photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const ext = input.photoFilename.split(".").pop() || "jpg";
          const { url } = await storagePut(`borrow-return/${nanoid()}.${ext}`, buffer, mimeType);
          photoUrl = url;
        }
      }

      await db.update(borrowRequests)
        .set({
          status: "completed",
          returnedAt: new Date(),
          returnComment: input.comment ?? null,
          returnPhotoUrl: photoUrl ?? null,
        } as any)
        .where(eq(borrowRequests.id, input.requestId));

      // Save requirement photos
      if (input.requirementPhotos && input.requirementPhotos.length > 0) {
        const { storagePut: sp3 } = await import("../storage");
        const { nanoid: nanoid3 } = await import("nanoid");
        const { borrowReturnPhotos: brpTable2 } = await import("../../drizzle/schema");
        for (const reqPhoto of input.requirementPhotos) {
          const m = reqPhoto.photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (m) {
            const buf = Buffer.from(m[2], "base64");
            const ext = reqPhoto.photoFilename.split(".").pop() || "jpg";
            const { url: rUrl } = await sp3(`borrow-ret-req-photos/${nanoid3()}.${ext}`, buf, m[1]);
            await db.insert(brpTable2).values({
              borrowRequestId: input.requestId,
              photoRequirementId: reqPhoto.requirementId,
              photoUrl: rUrl,
              filename: reqPhoto.photoFilename,
              uploadedBy: input.memberId,
              uploadedAt: new Date(),
            } as any);
          }
        }
      }

      // Notify item owner about the return
      try {
        const item = await getInventoryItemById(request.inventoryItemId);
        const borrower = await getHouseholdMemberById(request.borrowerMemberId);
        const borrowerName = borrower?.memberName ?? "Unbekannt";
        const returnDateFormatted = new Date().toLocaleDateString("de-DE");
        const commentPart = input.comment ? ` Kommentar: "${input.comment}"` : "";

        if (item?.owners && item.owners.length > 0) {
          for (const owner of item.owners as any[]) {
            if (owner.memberId && owner.memberId !== input.memberId) {
              const returnLangNotif = await getBorrowLang(item.householdId);
              const returnTitle = returnLangNotif === "en" ? "Item returned" : returnLangNotif === "es" ? "Objeto devuelto" : returnLangNotif === "fr" ? "Objet rendu" : returnLangNotif === "zh" ? "物品已归还" : returnLangNotif === "tr" ? "Eşya iade edildi" : "Gegenstand zurückgegeben";
              const returnMsg = returnLangNotif === "en" ? `${borrowerName} returned "${item.name}" on ${returnDateFormatted}.${commentPart}`
                : returnLangNotif === "es" ? `${borrowerName} devolvió "${item.name}" el ${returnDateFormatted}.${commentPart}`
                : returnLangNotif === "fr" ? `${borrowerName} a rendu « ${item.name} » le ${returnDateFormatted}.${commentPart}`
                : `${borrowerName} hat "${item.name}" am ${returnDateFormatted} zurückgegeben.${commentPart}`;
              await createNotification({
                householdId: item.householdId,
                memberId: owner.memberId,
                type: "general",
                title: returnTitle,
                message: returnMsg,
              });
            }
          }
        } else if (item?.householdId) {
          // Household item – notify the household owner via notifyOwner
          await notifyOwner({
            title: "Gegenstand zurückgegeben",
            content: `${borrowerName} hat "${item?.name ?? "Unbekannt"}" am ${returnDateFormatted} zurückgegeben.${commentPart}`,
          });
        }
      } catch (_notifyErr) {
        // Non-critical – don't fail the mutation if notification fails
      }

      return { success: true };
    }),

  // Get full borrow request details including item info and guideline (for dialogs)
  getBorrowRequestDetail: publicProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const request = await getBorrowRequestById(input.requestId);
      if (!request) return null;

      const item = await getInventoryItemById(request.inventoryItemId);
      const borrower = await getHouseholdMemberById(request.borrowerMemberId);
      const { borrowGuidelines } = await import("../../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const [guideline] = await db.select().from(borrowGuidelines)
        .where(eqOp(borrowGuidelines.inventoryItemId, request.inventoryItemId));

      return {
        ...request,
        itemName: item?.name ?? "Unbekannt",
        itemPhotoUrl: (item as any)?.photoUrl ?? null,
        itemDescription: (item as any)?.description ?? null,
        borrowerName: borrower?.memberName ?? "Unbekannt",
        guideline: guideline ?? null,
      };
    }),
});
