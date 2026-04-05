/**
 * Demo Router
 *
 * Provides isolated, temporary demo sessions for unauthenticated users.
 * Each session gets its own household with realistic seed data.
 * Sessions expire after 24 hours and are cleaned up by a cron job.
 * Users can claim their demo household upon registration.
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  demoSessions,
  households,
  householdMembers,
  shoppingCategories,
  shoppingItems,
  tasks,
  inventoryItems,
  calendarEvents,
  activityHistory,
  projects,
  projectHouseholds,
} from "../../drizzle/schema";
import { eq, lt, and, isNull, inArray } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const DEMO_EXPIRY_HOURS = 24;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

function expiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + DEMO_EXPIRY_HOURS);
  return d;
}

/**
 * Seed a fresh demo household with realistic example data.
 * Returns { householdId, memberId } of the "primary" demo member.
 */
async function seedDemoHousehold(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const demoHouseholdName = `Demo-Haushalt ${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  // ── 1. Haushalt anlegen ──────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo-password-not-used", 10);
  const [hhResult] = await db.insert(households).values({
    name: demoHouseholdName,
    passwordHash,
    createdBy: null, // no user yet for demo households
    language: "de",
    inviteCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
  });
  const householdId = Number(hhResult.insertId);

  // ── 2. Mitglieder anlegen ────────────────────────────────────────────────
  const memberNames = ["Alex", "Maria", "Jonas", "Sophie"];
  const memberIds: number[] = [];
  for (const name of memberNames) {
    const [mResult] = await db.insert(householdMembers).values({
      householdId,
      userId: null,
      memberName: name,
      passwordHash: await bcrypt.hash("demo", 10),
    });
    memberIds.push(Number(mResult.insertId));
  }
  const [alexId, mariaId, jonasId, sophieId] = memberIds;


  // ── 3. Einkaufskategorien ────────────────────────────────────────────────
  const catData = [
    { name: "Lebensmittel", color: "#22c55e" },
    { name: "Haushalt", color: "#3b82f6" },
    { name: "Pflege", color: "#a855f7" },
    { name: "Sonstiges", color: "#f59e0b" },
  ];
  const catIds: number[] = [];
  for (const cat of catData) {
    const [cResult] = await db.insert(shoppingCategories).values({ householdId, ...cat });
    catIds.push(Number(cResult.insertId));
  }
  const [lebensmittelCat, haushaltCat, pflegeCat, sonstigesCat] = catIds;

  // ── 4. Einkaufsliste ─────────────────────────────────────────────────────
  const shoppingData = [
    { name: "Milch (2 Liter)", categoryId: lebensmittelCat, addedBy: mariaId, notes: "Bitte Vollmilch" },
    { name: "Brot (Vollkorn)", categoryId: lebensmittelCat, addedBy: alexId },
    { name: "Äpfel (1 kg)", categoryId: lebensmittelCat, addedBy: sophieId },
    { name: "Käse (Gouda)", categoryId: lebensmittelCat, addedBy: mariaId },
    { name: "Nudeln (500 g)", categoryId: lebensmittelCat, addedBy: jonasId },
    { name: "Spülmittel", categoryId: haushaltCat, addedBy: alexId },
    { name: "Toilettenpapier (8er)", categoryId: haushaltCat, addedBy: mariaId },
    { name: "Müllbeutel (groß)", categoryId: haushaltCat, addedBy: alexId },
    { name: "Shampoo", categoryId: pflegeCat, addedBy: sophieId },
    { name: "Zahnpasta", categoryId: pflegeCat, addedBy: jonasId },
    { name: "Batterien (AA)", categoryId: sonstigesCat, addedBy: alexId, notes: "Für die Fernbedienung" },
  ];
  for (const item of shoppingData) {
    await db.insert(shoppingItems).values({ householdId, ...item });
  }

  // ── 5. Aufgaben ──────────────────────────────────────────────────────────
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const in3days = new Date(now); in3days.setDate(now.getDate() + 3);
  const in7days = new Date(now); in7days.setDate(now.getDate() + 7);
  const in14days = new Date(now); in14days.setDate(now.getDate() + 14);

  const taskData = [
    {
      name: "Küche putzen",
      description: "Herd, Arbeitsflächen und Boden reinigen",
      assignedTo: [alexId],
      frequency: "weekly" as const,
      repeatInterval: 1,
      repeatUnit: "weeks" as const,
      enableRotation: true,
      requiredPersons: 1,
      dueDate: yesterday,
      createdBy: alexId,
    },
    {
      name: "Einkaufen",
      description: "Wocheneinkauf im Supermarkt",
      assignedTo: [mariaId],
      frequency: "weekly" as const,
      repeatInterval: 1,
      repeatUnit: "weeks" as const,
      enableRotation: true,
      requiredPersons: 1,
      dueDate: tomorrow,
      createdBy: mariaId,
    },
    {
      name: "Wäsche waschen",
      description: "Wäsche waschen, trocknen und zusammenlegen",
      assignedTo: [jonasId, sophieId],
      frequency: "weekly" as const,
      repeatInterval: 1,
      repeatUnit: "weeks" as const,
      enableRotation: true,
      requiredPersons: 2,
      dueDate: in3days,
      createdBy: jonasId,
    },
    {
      name: "Bad reinigen",
      description: "Toilette, Waschbecken, Dusche und Spiegel putzen",
      assignedTo: [sophieId],
      frequency: "weekly" as const,
      repeatInterval: 1,
      repeatUnit: "weeks" as const,
      enableRotation: true,
      requiredPersons: 1,
      dueDate: in7days,
      createdBy: sophieId,
    },
    {
      name: "Müll rausbringen",
      description: "Restmüll, Papier und Gelber Sack",
      assignedTo: [alexId, jonasId],
      frequency: "weekly" as const,
      repeatInterval: 1,
      repeatUnit: "weeks" as const,
      enableRotation: true,
      requiredPersons: 1,
      dueDate: tomorrow,
      createdBy: alexId,
    },
    {
      name: "Staubsaugen",
      description: "Alle Zimmer saugen",
      assignedTo: [mariaId],
      frequency: "weekly" as const,
      repeatInterval: 1,
      repeatUnit: "weeks" as const,
      enableRotation: true,
      requiredPersons: 1,
      dueDate: in3days,
      createdBy: mariaId,
    },
    {
      name: "Fenster putzen",
      description: "Alle Fenster von innen und außen reinigen",
      assignedTo: [alexId, mariaId],
      frequency: "monthly" as const,
      repeatInterval: 1,
      repeatUnit: "months" as const,
      enableRotation: false,
      dueDate: in14days,
      createdBy: alexId,
    },
    {
      name: "Kühlschrank aufräumen",
      description: "Abgelaufene Produkte entfernen und Kühlschrank reinigen",
      assignedTo: [sophieId],
      frequency: "monthly" as const,
      repeatInterval: 2,
      repeatUnit: "weeks" as const,
      enableRotation: true,
      requiredPersons: 1,
      dueDate: in7days,
      createdBy: sophieId,
    },
  ];

  const taskIds: number[] = [];
  for (const task of taskData) {
    const [tResult] = await db.insert(tasks).values({
      householdId,
      name: task.name,
      description: task.description,
      assignedTo: task.assignedTo,
      frequency: task.frequency,
      repeatInterval: task.repeatInterval,
      repeatUnit: task.repeatUnit,
      enableRotation: task.enableRotation ?? false,
      requiredPersons: task.requiredPersons,
      dueDate: task.dueDate,
      createdBy: task.createdBy,
    });
    taskIds.push(Number(tResult.insertId));
  }

  // ── 6. Inventar ──────────────────────────────────────────────────────────
  const inventoryData = [
    {
      name: "Bohrmaschine",
      details: "Bosch Professional 18V, mit 2 Akkus und Koffer",
      ownershipType: "household" as const,
    },
    {
      name: "Staubsauger",
      details: "Dyson V11, Beutellos",
      ownershipType: "household" as const,
    },
    {
      name: "Fahrrad (Alex)",
      details: "Trek FX3, 28 Zoll, schwarz",
      ownershipType: "personal" as const,
    },
    {
      name: "Campingzelt",
      details: "4-Personen-Zelt, wasserdicht bis 3000 mm",
      ownershipType: "household" as const,
    },
    {
      name: "Kaffeemaschine",
      details: "DeLonghi Magnifica, Vollautomat",
      ownershipType: "household" as const,
    },
    {
      name: "Leiter (3 m)",
      details: "Aluminium-Mehrzweckleiter",
      ownershipType: "household" as const,
    },
  ];

  for (const item of inventoryData) {
    const [iResult] = await db.insert(inventoryItems).values({
      householdId,
      name: item.name,
      details: item.details,
      categoryId: haushaltCat, // reuse household category for inventory
      ownershipType: item.ownershipType,
      createdBy: alexId,
    });
    if (item.ownershipType === "personal") {
      // No ownership record needed for demo
    }
  }

  // ── 7. Kalender-Ereignisse ───────────────────────────────────────────────
  const calendarData = [
    {
      title: "Familienessen",
      description: "Gemeinsames Abendessen mit allen Haushaltsmitgliedern",
      startDate: in3days,
      eventType: "other" as const,
      icon: "🍽️",
      createdBy: mariaId,
    },
    {
      title: "Handwerker Termin",
      description: "Sanitär-Reparatur im Bad",
      startDate: in7days,
      eventType: "other" as const,
      icon: "🔧",
      createdBy: alexId,
    },
    {
      title: "Geburtstag Sophie",
      description: "Sophie wird 28!",
      startDate: in14days,
      eventType: "other" as const,
      icon: "🎂",
      createdBy: jonasId,
    },
  ];

  for (const event of calendarData) {
    await db.insert(calendarEvents).values({
      householdId,
      ...event,
    });
  }

  // ── 8. Aktivitätsverlauf (letzte 7 Tage) ────────────────────────────────
  type ActivityType = "shopping" | "task" | "project" | "member" | "inventory" | "calendar" | "borrow" | "other";
  const historyData: Array<{ activityType: ActivityType; action: string; memberId: number; description: string; createdAt: Date }> = [
    {
      activityType: "task",
      action: "task_completed",
      memberId: alexId,
      description: "Küche putzen",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      activityType: "shopping",
      action: "shopping_completed",
      memberId: mariaId,
      description: "Wocheneinkauf erledigt (14 Artikel)",
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      activityType: "task",
      action: "task_completed",
      memberId: jonasId,
      description: "Müll rausgebracht",
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      activityType: "task",
      action: "task_completed",
      memberId: sophieId,
      description: "Bad gereinigt",
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      activityType: "shopping",
      action: "item_added",
      memberId: alexId,
      description: "Batterien (AA) zur Einkaufsliste hinzugefügt",
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const entry of historyData) {
    await db.insert(activityHistory).values({
      householdId,
      memberId: entry.memberId,
      activityType: entry.activityType,
      action: entry.action,
      description: entry.description,
      createdAt: entry.createdAt,
    });
  }

  return { householdId, memberId: alexId, memberIds };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const demoRouter = router({
  /**
   * Create a new isolated demo session with a fresh household and seed data.
   * Returns a demo JWT token that grants access to the demo household.
   */
  createSession: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

     const { householdId, memberId } = await seedDemoHousehold(db);
    const token = generateToken();
    const expires = expiresAt();
    await db.insert(demoSessions).values({
      token,
      householdId,
      memberId,
      expiresAt: expires,
    });
    // Fetch names for the client
    const [household] = await db.select({ name: households.name }).from(households).where(eq(households.id, householdId)).limit(1);
    const [member] = await db.select({ memberName: householdMembers.memberName }).from(householdMembers).where(eq(householdMembers.id, memberId)).limit(1);
    // Issue a demo JWT – same structure as regular auth token but with isDemo flag
    const demoJwt = jwt.sign(
      { demoToken: token, householdId, memberId, isDemo: true },
      JWT_SECRET,
      { expiresIn: `${DEMO_EXPIRY_HOURS}h` }
    );
    return {
      success: true,
      demoToken: token,
      demoJwt,
      householdId,
      householdName: household?.name ?? "Demo-Haushalt",
      memberId,
      memberName: member?.memberName ?? "Alex",
      expiresAt: expires.toISOString(),
    };
  }),

  /**
   * Get the current status of a demo session.
   */
  getSession: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [session] = await db
        .select()
        .from(demoSessions)
        .where(eq(demoSessions.token, input.token))
        .limit(1);

      if (!session) return null;

      const now = new Date();
      const isExpired = session.expiresAt < now;
      const isClaimed = session.claimedByUserId !== null;
      const minutesLeft = Math.max(
        0,
        Math.floor((session.expiresAt.getTime() - now.getTime()) / 60000)
      );

      return {
        token: session.token,
        householdId: session.householdId,
        memberId: session.memberId,
        isExpired,
        isClaimed,
        expiresAt: session.expiresAt.toISOString(),
        minutesLeft,
      };
    }),

  /**
   * Claim a demo session: link the demo household to a newly registered user.
   * Called during registration when a demoToken is present.
   */
  claimSession: publicProcedure
    .input(
      z.object({
        demoToken: z.string(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [session] = await db
        .select()
        .from(demoSessions)
        .where(
          and(
            eq(demoSessions.token, input.demoToken),
            isNull(demoSessions.claimedByUserId)
          )
        )
        .limit(1);

      if (!session) {
        return { success: false, reason: "Session not found or already claimed" };
      }

      const now = new Date();
      if (session.expiresAt < now) {
        return { success: false, reason: "Demo session has expired" };
      }

      // Mark session as claimed
      await db
        .update(demoSessions)
        .set({ claimedByUserId: input.userId })
        .where(eq(demoSessions.token, input.demoToken));

      // Link the demo member to the new user
      await db
        .update(householdMembers)
        .set({ userId: input.userId })
        .where(eq(householdMembers.id, session.memberId));

      // Extend expiry to 30 days (now it's a real household)
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
      await db
        .update(demoSessions)
        .set({ expiresAt: newExpiry })
        .where(eq(demoSessions.token, input.demoToken));

      return {
        success: true,
        householdId: session.householdId,
        memberId: session.memberId,
      };
    }),

  /**
   * Get onboarding data for a newly claimed demo household.
   * Returns tasks (with project info) and members for the post-claim setup dialog.
   */
  getOnboardingData: protectedProcedure
    .input(z.object({ householdId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify the user owns this household
      const [hh] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId))
        .limit(1);
      if (!hh || hh.createdBy !== ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      // Fetch all tasks
      const allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.householdId, input.householdId));

      // Fetch all projects for this household via project_households join
      const projectLinks = await db
        .select({ projectId: projectHouseholds.projectId })
        .from(projectHouseholds)
        .where(eq(projectHouseholds.householdId, input.householdId));
      const projectIds = projectLinks.map((l) => l.projectId);
      const allProjects = projectIds.length > 0
        ? await db.select().from(projects).where(inArray(projects.id, projectIds))
        : [];

      const projectMap = new Map(allProjects.map((p) => [p.id, p.name]));

      // Build task list with project names and duplicate-project flag
      const taskList = allTasks.map((t) => {
        const pIds: number[] = Array.isArray(t.projectIds) ? (t.projectIds as number[]) : [];
        const projectNames = pIds.map((id) => projectMap.get(id) ?? null).filter(Boolean) as string[];
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          projectIds: pIds,
          projectNames,
          isDuplicated: pIds.length > 1, // assigned to multiple projects
          dueDate: t.dueDate?.toISOString() ?? null,
        };
      });

      // Fetch members
      const members = await db
        .select()
        .from(householdMembers)
        .where(and(eq(householdMembers.householdId, input.householdId), eq(householdMembers.isActive, true)));

      // Fetch shopping categories
      const allCategories = await db
        .select()
        .from(shoppingCategories)
        .where(eq(shoppingCategories.householdId, input.householdId));
      const categoryMap = new Map(allCategories.map((c) => [c.id, { name: c.name, color: c.color }]));

      // Fetch shopping items
      const allShoppingItems = await db
        .select()
        .from(shoppingItems)
        .where(eq(shoppingItems.householdId, input.householdId));

      const shoppingList = allShoppingItems.map((item) => ({
        id: item.id,
        name: item.name,
        details: item.details ?? null,
        isCompleted: item.isCompleted,
        categoryId: item.categoryId,
        categoryName: categoryMap.get(item.categoryId)?.name ?? "Sonstige",
        categoryColor: categoryMap.get(item.categoryId)?.color ?? "#6B7280",
      }));

      return {
        householdName: hh.name,
        tasks: taskList,
        projects: allProjects.map((p) => ({ id: p.id, name: p.name })),
        members: members.map((m) => ({
          id: m.id,
          memberName: m.memberName,
          isOwner: m.userId === ctx.user?.id,
        })),
        shoppingItems: shoppingList,
      };
    }),

  /**
   * Apply post-claim onboarding changes:
   * - Rename the household
   * - Delete selected tasks
   * - Rename or remove demo members
   */
  applyOnboarding: protectedProcedure
    .input(
      z.object({
        householdId: z.number(),
        householdName: z.string().min(1).max(100),
        deleteTaskIds: z.array(z.number()),
        deleteShoppingItemIds: z.array(z.number()).default([]),
        members: z.array(
          z.object({
            id: z.number(),
            action: z.enum(["keep", "rename", "remove"]),
            newName: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const [hh] = await db
        .select()
        .from(households)
        .where(eq(households.id, input.householdId))
        .limit(1);
      if (!hh || hh.createdBy !== ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      // 1. Rename household
      await db
        .update(households)
        .set({ name: input.householdName })
        .where(eq(households.id, input.householdId));

      // 2. Delete selected tasks
      if (input.deleteTaskIds.length > 0) {
        await db.delete(tasks).where(inArray(tasks.id, input.deleteTaskIds));
      }

      // 2b. Delete selected shopping items
      if (input.deleteShoppingItemIds.length > 0) {
        await db.delete(shoppingItems).where(inArray(shoppingItems.id, input.deleteShoppingItemIds));
      }

      // 3. Process members
      for (const m of input.members) {
        if (m.action === "remove") {
          await db
            .update(householdMembers)
            .set({ isActive: false })
            .where(eq(householdMembers.id, m.id));
        } else if (m.action === "rename" && m.newName) {
          await db
            .update(householdMembers)
            .set({ memberName: m.newName })
            .where(eq(householdMembers.id, m.id));
        }
      }

      return { success: true };
    }),

  /**
   * Admin: manually trigger cleanup of expired demo sessions.
   * Also called by the internal cron job.
   */
  cleanup: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();

    // Find expired, unclaimed sessions
    const expired = await db
      .select({ householdId: demoSessions.householdId })
      .from(demoSessions)
      .where(
        and(
          lt(demoSessions.expiresAt, now),
          isNull(demoSessions.claimedByUserId)
        )
      );

    let deleted = 0;
    for (const s of expired) {
      // Deleting the household cascades to all related data (members, tasks, shopping, etc.)
      await db.delete(households).where(eq(households.id, s.householdId));
      deleted++;
    }

    return { deleted, checkedAt: now.toISOString() };
  }),
});

// ─── Cron Job ────────────────────────────────────────────────────────────────

/**
 * Start the demo cleanup cron job.
 * Runs every hour to delete expired, unclaimed demo sessions and their households.
 */
export function startDemoCleanupCron() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  async function runCleanup() {
    try {
      const db = await getDb();
      if (!db) return;

      const now = new Date();
      const expired = await db
        .select({ householdId: demoSessions.householdId, token: demoSessions.token })
        .from(demoSessions)
        .where(
          and(
            lt(demoSessions.expiresAt, now),
            isNull(demoSessions.claimedByUserId)
          )
        );

      if (expired.length > 0) {
        for (const s of expired) {
          await db.delete(households).where(eq(households.id, s.householdId));
        }
        console.log(`[DemoCron] Cleaned up ${expired.length} expired demo session(s)`);
      }
    } catch (err) {
      console.error("[DemoCron] Cleanup error:", err);
    }
  }

  // Run immediately on startup, then every hour
  runCleanup();
  setInterval(runCleanup, INTERVAL_MS);
  console.log("[DemoCron] Demo cleanup cron started (interval: 1h)");
}
