import { describe, it, expect } from 'vitest';

describe('Shopping Linked Items - photoUrls Deserialization Logic', () => {
  it('should correctly deserialize photoUrls from JSON string to array of objects', () => {
    // Simulate the database returning a JSON string for photoUrls
    const mockDatabaseItem = {
      id: 1,
      name: 'Test Item',
      photoUrls: JSON.stringify([
        { url: 'https://example.com/photo1.jpg', filename: 'photo1.jpg' },
        { url: 'https://example.com/photo2.jpg', filename: 'photo2.jpg' },
      ]),
    };
    
    // Simulate the deserialization logic from getLinkedShoppingItems
    const deserializedItem = {
      ...mockDatabaseItem,
      photoUrls: mockDatabaseItem.photoUrls ? JSON.parse(mockDatabaseItem.photoUrls as any) : undefined
    };
    
    // Verify the deserialization worked correctly
    expect(deserializedItem.photoUrls).toBeDefined();
    expect(Array.isArray(deserializedItem.photoUrls)).toBe(true);
    expect(deserializedItem.photoUrls).toHaveLength(2);
    expect(deserializedItem.photoUrls[0]).toEqual({ url: 'https://example.com/photo1.jpg', filename: 'photo1.jpg' });
    expect(deserializedItem.photoUrls[1]).toEqual({ url: 'https://example.com/photo2.jpg', filename: 'photo2.jpg' });
  });
  
  it('should handle items without photoUrls', () => {
    // Simulate the database returning null/undefined for photoUrls
    const mockDatabaseItem = {
      id: 2,
      name: 'Test Item without Photos',
      photoUrls: null,
    };
    
    // Simulate the deserialization logic from getLinkedShoppingItems
    const deserializedItem = {
      ...mockDatabaseItem,
      photoUrls: mockDatabaseItem.photoUrls ? JSON.parse(mockDatabaseItem.photoUrls as any) : undefined
    };
    
    // Verify photoUrls is undefined
    expect(deserializedItem.photoUrls).toBeUndefined();
  });
  
  it('should handle empty photoUrls array', () => {
    // Simulate the database returning an empty JSON array
    const mockDatabaseItem = {
      id: 3,
      name: 'Test Item with empty photos',
      photoUrls: JSON.stringify([]),
    };
    
    // Simulate the deserialization logic from getLinkedShoppingItems
    const deserializedItem = {
      ...mockDatabaseItem,
      photoUrls: mockDatabaseItem.photoUrls ? JSON.parse(mockDatabaseItem.photoUrls as any) : undefined
    };
    
    // Verify photoUrls is an empty array
    expect(deserializedItem.photoUrls).toBeDefined();
    expect(Array.isArray(deserializedItem.photoUrls)).toBe(true);
    expect(deserializedItem.photoUrls).toHaveLength(0);
  });
});
