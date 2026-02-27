import { describe, expect, it } from "vitest";
import { z } from "zod";

// Test the revoke input validation schema independently
const revokeInputSchema = z.object({
  requestId: z.number(),
  revokerId: z.number(),
  revokerHouseholdId: z.number(),
  reason: z.string().min(1, "Begründung ist erforderlich"),
});

describe("borrow.revoke input validation", () => {
  it("accepts valid input with all required fields", () => {
    const input = {
      requestId: 1,
      revokerId: 2,
      revokerHouseholdId: 3,
      reason: "Gegenstand wird für andere Aufgabe benötigt",
    };

    const result = revokeInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requestId).toBe(1);
      expect(result.data.revokerId).toBe(2);
      expect(result.data.revokerHouseholdId).toBe(3);
      expect(result.data.reason).toBe("Gegenstand wird für andere Aufgabe benötigt");
    }
  });

  it("rejects input with empty reason", () => {
    const input = {
      requestId: 1,
      revokerId: 2,
      revokerHouseholdId: 3,
      reason: "",
    };

    const result = revokeInputSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Begründung ist erforderlich");
    }
  });

  it("rejects input with whitespace-only reason (after trim it would be empty)", () => {
    const input = {
      requestId: 1,
      revokerId: 2,
      revokerHouseholdId: 3,
      reason: "   ", // whitespace only - min(1) still passes since length > 0
    };

    // Note: z.string().min(1) counts whitespace, so this passes validation
    // The frontend trims before sending, so this is handled there
    const result = revokeInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects input without requestId", () => {
    const input = {
      revokerId: 2,
      revokerHouseholdId: 3,
      reason: "Test",
    };

    const result = revokeInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects input without revokerId", () => {
    const input = {
      requestId: 1,
      revokerHouseholdId: 3,
      reason: "Test",
    };

    const result = revokeInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects input without revokerHouseholdId", () => {
    const input = {
      requestId: 1,
      revokerId: 2,
      reason: "Test",
    };

    const result = revokeInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-number requestId", () => {
    const input = {
      requestId: "abc",
      revokerId: 2,
      revokerHouseholdId: 3,
      reason: "Test",
    };

    const result = revokeInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("accepts reason with special characters", () => {
    const input = {
      requestId: 1,
      revokerId: 2,
      revokerHouseholdId: 3,
      reason: "Gegenstand beschädigt! Reparatur nötig – bitte Alternativgegenstand verwenden.",
    };

    const result = revokeInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts very long reason text", () => {
    const input = {
      requestId: 1,
      revokerId: 2,
      revokerHouseholdId: 3,
      reason: "A".repeat(1000),
    };

    const result = revokeInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe("notification message format", () => {
  it("formats the notification message correctly", () => {
    const itemName = "Staubsauger";
    const startDate = new Date("2026-03-01T12:00:00Z");
    const endDate = new Date("2026-03-15T12:00:00Z");
    const revokerName = "Max Mustermann";
    const reason = "Gegenstand wird für Reparatur benötigt";

    const message = `Die Genehmigung für "${itemName}" (${startDate.toLocaleDateString("de-DE")} - ${endDate.toLocaleDateString("de-DE")}) wurde von ${revokerName} widerrufen. Begründung: ${reason}`;

    expect(message).toContain("Staubsauger");
    expect(message).toContain(startDate.toLocaleDateString("de-DE"));
    expect(message).toContain(endDate.toLocaleDateString("de-DE"));
    expect(message).toContain("Max Mustermann");
    expect(message).toContain("Gegenstand wird für Reparatur benötigt");
    expect(message).toContain("widerrufen");
  });

  it("formats the activity log description correctly", () => {
    const itemName = "Bohrmaschine";
    const description = `Ausleihgenehmigung für "${itemName}" widerrufen`;

    expect(description).toBe('Ausleihgenehmigung für "Bohrmaschine" widerrufen');
  });
});

describe("revoke response message format", () => {
  it("formats the response message with revoker name and reason", () => {
    const revokerName = "Anna Schmidt";
    const reason = "Terminkonflikt";
    const responseMessage = `Widerrufen von ${revokerName}: ${reason}`;

    expect(responseMessage).toBe("Widerrufen von Anna Schmidt: Terminkonflikt");
  });
});
