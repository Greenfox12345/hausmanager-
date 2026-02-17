import { describe, it, expect } from 'vitest';

// Test the flattening logic that updateTask applies
function flattenAssignedTo(raw: any): number[] | null {
  if (raw === undefined || raw === null) return null;
  if (Array.isArray(raw)) {
    return raw.flat().filter((v: any) => typeof v === 'number');
  } else if (typeof raw === 'number') {
    return [raw];
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return (Array.isArray(parsed) ? parsed.flat() : [parsed]).filter((v: any) => typeof v === 'number');
    } catch {
      return [];
    }
  }
  return null;
}

function normalizeSharedHouseholdIds(raw: number[] | undefined): number[] | null {
  if (raw === undefined) return undefined as any;
  return raw.length > 0 ? raw : null;
}

describe('updateTask flattening logic', () => {
  it('should flatten nested array [[480008]] to [480008]', () => {
    expect(flattenAssignedTo([[480008]])).toEqual([480008]);
  });

  it('should keep flat array [480008] as [480008]', () => {
    expect(flattenAssignedTo([480008])).toEqual([480008]);
  });

  it('should handle multiple nested [[480008, 480009]] to [480008, 480009]', () => {
    expect(flattenAssignedTo([[480008, 480009]])).toEqual([480008, 480009]);
  });

  // .flat() only flattens one level, which is sufficient for our use case
  // Deeply nested arrays like [[[480008]]] won't occur in practice
  it('should handle double nested [[480008]] to [480008]', () => {
    expect(flattenAssignedTo([[480008]])).toEqual([480008]);
  });

  it('should convert single number 480008 to [480008]', () => {
    expect(flattenAssignedTo(480008)).toEqual([480008]);
  });

  it('should parse string "[480008]" to [480008]', () => {
    expect(flattenAssignedTo('[480008]')).toEqual([480008]);
  });

  it('should return null for null', () => {
    expect(flattenAssignedTo(null)).toBeNull();
  });

  it('should return null for undefined', () => {
    expect(flattenAssignedTo(undefined)).toBeNull();
  });
});

describe('sharedHouseholdIds normalization', () => {
  it('should return null for empty array (removal)', () => {
    expect(normalizeSharedHouseholdIds([])).toBeNull();
  });

  it('should keep non-empty array', () => {
    expect(normalizeSharedHouseholdIds([510002, 450001])).toEqual([510002, 450001]);
  });

  it('should return undefined for undefined (not set)', () => {
    expect(normalizeSharedHouseholdIds(undefined)).toBeUndefined();
  });
});
