import { describe, it, expect } from "vitest";

/**
 * Test the getMemberNames logic that is shared across all frontend components.
 * This tests the parsing logic in isolation to ensure it handles all data types.
 */

function parseAssignedTo(memberIds: any): number[] {
  if (memberIds === null || memberIds === undefined) return [];
  if (Array.isArray(memberIds)) return memberIds;
  if (typeof memberIds === 'number') return [memberIds];
  if (typeof memberIds === 'string') {
    try {
      const parsed = JSON.parse(memberIds);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }
  return [];
}

describe("parseAssignedTo (getMemberNames helper)", () => {
  it("handles null", () => {
    expect(parseAssignedTo(null)).toEqual([]);
  });

  it("handles undefined", () => {
    expect(parseAssignedTo(undefined)).toEqual([]);
  });

  it("handles proper array", () => {
    expect(parseAssignedTo([480008, 480009])).toEqual([480008, 480009]);
  });

  it("handles empty array", () => {
    expect(parseAssignedTo([])).toEqual([]);
  });

  it("handles single number (legacy data)", () => {
    expect(parseAssignedTo(480008)).toEqual([480008]);
  });

  it("handles JSON string array", () => {
    expect(parseAssignedTo("[480008, 480009]")).toEqual([480008, 480009]);
  });

  it("handles JSON string single number", () => {
    expect(parseAssignedTo("480008")).toEqual([480008]);
  });

  it("handles invalid string", () => {
    expect(parseAssignedTo("not-a-number")).toEqual([]);
  });

  it("handles zero", () => {
    expect(parseAssignedTo(0)).toEqual([0]);
  });
});
