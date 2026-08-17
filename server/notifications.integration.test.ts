import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Notifications System", () => {
  // Use existing test household (Buchenbühl, ID: 3)
  const householdId = 3;
  const member1Id = 10; // Basti
  const member2Id = 11; // Anton

  it("should list notifications for a member", async () => {
    const caller = appRouter.createCaller(createTestContext());

    const notifications = await caller.notifications.list({
      householdId,
      memberId: member1Id,
    });

    expect(Array.isArray(notifications)).toBe(true);
  });

  it("should get unread notification count", async () => {
    const caller = appRouter.createCaller(createTestContext());

    const count = await caller.notifications.getUnreadCount({
      householdId,
      memberId: member1Id,
    });

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should create a test notification and mark it as read", async () => {
    const caller = appRouter.createCaller(createTestContext());

    // Create a test notification using the helper
    const { notifyReminder } = await import("./notificationHelpers");
    await notifyReminder(
      householdId,
      member1Id,
      "Test Notification",
      "This is a test notification"
    );

    // Get notifications
    const notifications = await caller.notifications.list({
      householdId,
      memberId: member1Id,
    });

    const testNotification = notifications.find(
      (n) => n.title === "Test Notification"
    );
    expect(testNotification).toBeDefined();

    if (testNotification) {
      // Mark as read
      await caller.notifications.markAsRead({
        notificationId: testNotification.id,
        householdId,
        memberId: member1Id,
      });

      // Verify it's marked as read
      const updatedNotifications = await caller.notifications.list({
        householdId,
        memberId: member1Id,
      });

      const readNotification = updatedNotifications.find(
        (n) => n.id === testNotification.id
      );
      expect(readNotification?.isRead).toBe(true);
    }
  });

  it("should mark all notifications as read", async () => {
    const caller = appRouter.createCaller(createTestContext());

    // Mark all as read
    await caller.notifications.markAllAsRead({
      householdId,
      memberId: member1Id,
    });

    // Verify all are read
    const count = await caller.notifications.getUnreadCount({
      householdId,
      memberId: member1Id,
    });

    expect(count).toBe(0);
  });

  it("should delete a notification", async () => {
    const caller = appRouter.createCaller(createTestContext());

    // Create a test notification
    const { notifyReminder } = await import("./notificationHelpers");
    await notifyReminder(
      householdId,
      member1Id,
      "Test Delete Notification",
      "This notification will be deleted"
    );

    // Get notifications
    const notifications = await caller.notifications.list({
      householdId,
      memberId: member1Id,
    });

    const notificationToDelete = notifications.find(
      (n) => n.title === "Test Delete Notification"
    );
    expect(notificationToDelete).toBeDefined();

    if (notificationToDelete) {
      // Delete notification
      await caller.notifications.delete({
        notificationId: notificationToDelete.id,
        householdId,
        memberId: member1Id,
      });

      // Verify it's deleted
      const updatedNotifications = await caller.notifications.list({
        householdId,
        memberId: member1Id,
      });

      const deletedNotification = updatedNotifications.find(
        (n) => n.id === notificationToDelete.id
      );
      expect(deletedNotification).toBeUndefined();
    }
  });
});
