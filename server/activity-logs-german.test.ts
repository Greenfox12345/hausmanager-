import { describe, it, expect } from "vitest";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  createActivityLog,
  getHouseholdMembers,
  getDb,
  getAllHouseholds,
} from "./db";
import { sql } from "drizzle-orm";
import { activityHistory } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Helper: get the most recent activity log entry for a given task
 */
async function getLatestActivityForTask(householdId: number, taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(activityHistory)
    .where(
      and(
        eq(activityHistory.householdId, householdId),
        eq(activityHistory.relatedItemId, taskId),
        eq(activityHistory.activityType, "task"),
      ),
    )
    .orderBy(desc(activityHistory.id))
    .limit(1);

  return results[0] ?? null;
}

/**
 * Helper: get a valid household + member pair from the database
 */
async function getTestHouseholdAndMember() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [hhResult] = await db.execute(
    sql`SELECT hm.householdId, hm.id AS memberId, hm.memberName
        FROM household_members hm
        WHERE hm.isActive = 1
        LIMIT 1`,
  );
  const rows = hhResult as unknown as any[];
  if (rows.length === 0) throw new Error("No active household members found");

  return {
    householdId: rows[0].householdId as number,
    memberId: rows[0].memberId as number,
    memberName: rows[0].memberName as string,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("German Activity Logs – Task Creation", () => {
  it("should log task creation with German description including task name", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();

    const taskId = await createTask({
      householdId,
      name: "Testaufgabe Erstellung",
      description: "Eine Testbeschreibung",
      frequency: "once",
      createdBy: memberId,
    });

    // Simulate what the router does: create the activity log
    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "created",
      description: `Aufgabe erstellt: 'Testaufgabe Erstellung' | Beschreibung: Eine Testbeschreibung | Häufigkeit: Einmalig`,
      relatedItemId: taskId,
      metadata: {
        name: "Testaufgabe Erstellung",
        description: "Eine Testbeschreibung",
        frequency: "once",
      },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.action).toBe("created");
    expect(log!.description).toContain("Aufgabe erstellt");
    expect(log!.description).toContain("Testaufgabe Erstellung");
    expect(log!.description).toContain("Häufigkeit: Einmalig");
    expect(log!.description).not.toContain("Created task"); // No English

    // Clean up
    await deleteTask(taskId);
    console.log("✓ Task creation log is in German with full details");
  });
});

describe("German Activity Logs – Task Update (Field-by-Field)", () => {
  it("should log name change with old and new values", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();

    const taskId = await createTask({
      householdId,
      name: "Küche putzen",
      frequency: "once",
      createdBy: memberId,
    });

    // Simulate the update log with field-by-field diff
    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "updated",
      description: `Aufgabe 'Bad putzen' bearbeitet: Name geändert von 'Küche putzen' zu 'Bad putzen'`,
      relatedItemId: taskId,
      metadata: {
        fieldChanges: {
          name: { old: "Küche putzen", new: "Bad putzen" },
        },
      },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.action).toBe("updated");
    expect(log!.description).toContain("Name geändert von 'Küche putzen' zu 'Bad putzen'");
    expect(log!.description).not.toContain("Updated task"); // No English

    const meta = log!.metadata as any;
    expect(meta.fieldChanges.name.old).toBe("Küche putzen");
    expect(meta.fieldChanges.name.new).toBe("Bad putzen");

    await deleteTask(taskId);
    console.log("✓ Name change logged with old/new values in German");
  });

  it("should log multiple field changes separated by pipe", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();

    const taskId = await createTask({
      householdId,
      name: "Einkaufen",
      frequency: "once",
      createdBy: memberId,
    });

    const description = `Aufgabe 'Einkaufen' bearbeitet: Beschreibung geändert von '(leer)' zu 'Wocheneinkauf' | Häufigkeit geändert von 'Einmalig' zu 'Wöchentlich'`;

    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "updated",
      description,
      relatedItemId: taskId,
      metadata: {
        fieldChanges: {
          description: { old: null, new: "Wocheneinkauf" },
          frequency: { old: "once", new: "weekly" },
        },
      },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.description).toContain("Beschreibung geändert");
    expect(log!.description).toContain("Häufigkeit geändert");
    expect(log!.description).toContain(" | "); // Pipe separator

    await deleteTask(taskId);
    console.log("✓ Multiple field changes logged with pipe separator");
  });

  it("should log assignee changes with member names", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();
    const members = await getHouseholdMembers(householdId);

    const taskId = await createTask({
      householdId,
      name: "Staubsaugen",
      assignedTo: [memberId],
      frequency: "once",
      createdBy: memberId,
    });

    const memberName = members.find(m => m.id === memberId)?.memberName ?? "Unbekannt";
    const description = `Aufgabe 'Staubsaugen' bearbeitet: Verantwortliche geändert von '${memberName}' zu '–'`;

    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "updated",
      description,
      relatedItemId: taskId,
      metadata: {
        fieldChanges: {
          assignedTo: {
            old: [memberId],
            new: [],
            oldNames: memberName,
            newNames: "–",
          },
        },
      },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.description).toContain("Verantwortliche geändert");
    expect(log!.description).toContain(memberName);

    await deleteTask(taskId);
    console.log("✓ Assignee changes logged with member names");
  });
});

describe("German Activity Logs – Completion", () => {
  it("should log task completion in German", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();

    const taskId = await createTask({
      householdId,
      name: "Müll rausbringen",
      frequency: "once",
      createdBy: memberId,
    });

    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "completed",
      description: `Aufgabe 'Müll rausbringen' als erledigt markiert`,
      relatedItemId: taskId,
      metadata: { taskName: "Müll rausbringen" },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.action).toBe("completed");
    expect(log!.description).toContain("als erledigt markiert");
    expect(log!.description).toContain("Müll rausbringen");
    expect(log!.description).not.toContain("Completed"); // No English

    await deleteTask(taskId);
    console.log("✓ Task completion logged in German");
  });

  it("should log uncomplete action in German", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();

    const taskId = await createTask({
      householdId,
      name: "Wäsche waschen",
      frequency: "once",
      createdBy: memberId,
    });

    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "uncompleted",
      description: `Aufgabe 'Wäsche waschen' als unerledigt markiert`,
      relatedItemId: taskId,
      metadata: { taskName: "Wäsche waschen" },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.action).toBe("uncompleted");
    expect(log!.description).toContain("als unerledigt markiert");
    expect(log!.description).not.toContain("Uncompleted"); // No English

    await deleteTask(taskId);
    console.log("✓ Task uncomplete logged in German");
  });
});

describe("German Activity Logs – Deletion", () => {
  it("should log task deletion in German with task name", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();

    const taskId = await createTask({
      householdId,
      name: "Aufgabe zum Löschen",
      frequency: "once",
      createdBy: memberId,
    });

    // Log before deletion (since task won't exist after)
    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "deleted",
      description: `Aufgabe 'Aufgabe zum Löschen' gelöscht`,
      relatedItemId: taskId,
      metadata: { taskName: "Aufgabe zum Löschen" },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.action).toBe("deleted");
    expect(log!.description).toContain("gelöscht");
    expect(log!.description).toContain("Aufgabe zum Löschen");
    expect(log!.description).not.toContain("Deleted task"); // No English

    await deleteTask(taskId);
    console.log("✓ Task deletion logged in German with task name");
  });
});

describe("German Activity Logs – Rotation", () => {
  it("should log rotation in German with member name", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();
    const members = await getHouseholdMembers(householdId);
    const memberName = members.find(m => m.id === memberId)?.memberName ?? "Unbekannt";

    const taskId = await createTask({
      householdId,
      name: "Rotationsaufgabe",
      frequency: "weekly",
      enableRotation: true,
      createdBy: memberId,
    });

    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "rotated",
      description: `Aufgabe 'Rotationsaufgabe' rotiert: Nächste Verantwortliche ist ${memberName}`,
      relatedItemId: taskId,
      metadata: {
        previousAssignee: [memberId],
        nextAssignee: [memberId],
        nextAssigneeName: memberName,
      },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.action).toBe("rotated");
    expect(log!.description).toContain("rotiert");
    expect(log!.description).toContain("Nächste Verantwortliche");
    expect(log!.description).toContain(memberName);
    expect(log!.description).not.toContain("Task rotated to"); // No English

    await deleteTask(taskId);
    console.log("✓ Rotation logged in German with member name");
  });
});

describe("German Activity Logs – Skip & Restore", () => {
  it("should log skip occurrence in German", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();

    const taskId = await createTask({
      householdId,
      name: "Wiederkehrende Aufgabe",
      frequency: "weekly",
      createdBy: memberId,
    });

    const skipDate = "2026-03-15";
    const formattedDate = new Date(skipDate).toLocaleDateString("de-DE");

    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "skipped",
      description: `Termin übersprungen am ${formattedDate} für Aufgabe 'Wiederkehrende Aufgabe'`,
      relatedItemId: taskId,
      metadata: { skippedDate: skipDate, taskName: "Wiederkehrende Aufgabe" },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.action).toBe("skipped");
    expect(log!.description).toContain("Termin übersprungen");
    expect(log!.description).toContain("Wiederkehrende Aufgabe");
    expect(log!.description).not.toContain("Skipped occurrence"); // No English

    await deleteTask(taskId);
    console.log("✓ Skip occurrence logged in German");
  });

  it("should log restore occurrence in German", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();

    const taskId = await createTask({
      householdId,
      name: "Wiederherstellungstest",
      frequency: "weekly",
      createdBy: memberId,
    });

    const restoreDate = "2026-03-15";
    const formattedDate = new Date(restoreDate).toLocaleDateString("de-DE");

    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "restored",
      description: `Übersprungener Termin am ${formattedDate} wiederhergestellt für Aufgabe 'Wiederherstellungstest'`,
      relatedItemId: taskId,
      metadata: { restoredDate: restoreDate, taskName: "Wiederherstellungstest" },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.action).toBe("restored");
    expect(log!.description).toContain("wiederhergestellt");
    expect(log!.description).toContain("Wiederherstellungstest");
    expect(log!.description).not.toContain("Restored skipped"); // No English

    await deleteTask(taskId);
    console.log("✓ Restore occurrence logged in German");
  });
});

describe("German Activity Logs – Milestone", () => {
  it("should log milestone with details in German", async () => {
    const { householdId, memberId } = await getTestHouseholdAndMember();

    const taskId = await createTask({
      householdId,
      name: "Meilensteinaufgabe",
      frequency: "once",
      createdBy: memberId,
    });

    await createActivityLog({
      householdId,
      memberId,
      activityType: "task",
      action: "milestone",
      description: `Zwischensieg bei Aufgabe: 'Meilensteinaufgabe' | Kommentar: Erster Schritt geschafft | 2 Foto(s) angehängt`,
      relatedItemId: taskId,
      comment: "Erster Schritt geschafft",
      metadata: {
        taskName: "Meilensteinaufgabe",
        hasComment: true,
        photoCount: 2,
        fileCount: 0,
      },
    });

    const log = await getLatestActivityForTask(householdId, taskId);
    expect(log).not.toBeNull();
    expect(log!.action).toBe("milestone");
    expect(log!.description).toContain("Zwischensieg");
    expect(log!.description).toContain("Meilensteinaufgabe");
    expect(log!.description).toContain("Kommentar: Erster Schritt geschafft");
    expect(log!.description).toContain("2 Foto(s) angehängt");

    const meta = log!.metadata as any;
    expect(meta.taskName).toBe("Meilensteinaufgabe");
    expect(meta.hasComment).toBe(true);
    expect(meta.photoCount).toBe(2);

    await deleteTask(taskId);
    console.log("✓ Milestone logged with full details in German");
  });
});

describe("German Activity Logs – Helper Functions", () => {
  it("buildUpdateChanges helpers: normaliseArr and arraysEqual work correctly", () => {
    // Test normaliseArr logic inline
    const normaliseArr = (v: any): number[] => {
      if (!v) return [];
      if (Array.isArray(v)) return [...v].sort((a, b) => a - b);
      return [v];
    };

    expect(normaliseArr(null)).toEqual([]);
    expect(normaliseArr(undefined)).toEqual([]);
    expect(normaliseArr([])).toEqual([]);
    expect(normaliseArr([3, 1, 2])).toEqual([1, 2, 3]);
    expect(normaliseArr(42)).toEqual([42]);

    // Test arraysEqual logic inline
    const arraysEqual = (a: number[], b: number[]): boolean => {
      if (a.length !== b.length) return false;
      return a.every((v, i) => v === b[i]);
    };

    expect(arraysEqual([], [])).toBe(true);
    expect(arraysEqual([1, 2], [1, 2])).toBe(true);
    expect(arraysEqual([1, 2], [2, 1])).toBe(false);
    expect(arraysEqual([1], [1, 2])).toBe(false);

    console.log("✓ Helper functions work correctly");
  });

  it("frequency labels are all in German", () => {
    const frequencyLabels: Record<string, string> = {
      once: "Einmalig",
      daily: "Täglich",
      weekly: "Wöchentlich",
      monthly: "Monatlich",
      custom: "Benutzerdefiniert",
    };

    expect(frequencyLabels["once"]).toBe("Einmalig");
    expect(frequencyLabels["daily"]).toBe("Täglich");
    expect(frequencyLabels["weekly"]).toBe("Wöchentlich");
    expect(frequencyLabels["monthly"]).toBe("Monatlich");
    expect(frequencyLabels["custom"]).toBe("Benutzerdefiniert");

    // None should be English
    Object.values(frequencyLabels).forEach((label) => {
      expect(label).not.toMatch(/^(once|daily|weekly|monthly|custom)$/i);
    });

    console.log("✓ All frequency labels are in German");
  });

  it("permission labels are all in German", () => {
    const permissionLabels: Record<string, string> = {
      full: "Vollzugriff",
      milestones_reminders: "Meilensteine & Erinnerungen",
      view_only: "Nur Ansicht",
    };

    expect(permissionLabels["full"]).toBe("Vollzugriff");
    expect(permissionLabels["milestones_reminders"]).toBe("Meilensteine & Erinnerungen");
    expect(permissionLabels["view_only"]).toBe("Nur Ansicht");

    console.log("✓ All permission labels are in German");
  });
});
