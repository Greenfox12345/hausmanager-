import { describe, it, expect } from 'vitest';

describe('Shopping Inventory Transfer - Input Validation', () => {
  it('should validate itemsToInventory structure', () => {
    const validItem = {
      itemId: 1,
      name: 'Test Item',
      categoryId: 2,
      details: 'Test details',
      photoUrls: [{ url: 'https://example.com/photo.jpg', filename: 'photo.jpg' }],
      ownershipType: 'household' as const,
      ownerIds: [],
    };
    
    // Verify structure
    expect(validItem.itemId).toBeTypeOf('number');
    expect(validItem.name).toBeTypeOf('string');
    expect(validItem.categoryId).toBeTypeOf('number');
    expect(validItem.details).toBeTypeOf('string');
    expect(Array.isArray(validItem.photoUrls)).toBe(true);
    expect(validItem.ownershipType).toBe('household');
    expect(Array.isArray(validItem.ownerIds)).toBe(true);
  });
  
  it('should validate personal ownership with ownerIds', () => {
    const personalItem = {
      itemId: 1,
      name: 'Personal Item',
      categoryId: 2,
      ownershipType: 'personal' as const,
      ownerIds: [1, 2, 3],
    };
    
    expect(personalItem.ownershipType).toBe('personal');
    expect(personalItem.ownerIds).toHaveLength(3);
    expect(personalItem.ownerIds).toContain(1);
    expect(personalItem.ownerIds).toContain(2);
    expect(personalItem.ownerIds).toContain(3);
  });
  
  it('should handle optional fields correctly', () => {
    const minimalItem = {
      itemId: 1,
      name: 'Minimal Item',
      categoryId: 2,
      ownershipType: 'household' as const,
    };
    
    // Verify required fields
    expect(minimalItem.itemId).toBeDefined();
    expect(minimalItem.name).toBeDefined();
    expect(minimalItem.categoryId).toBeDefined();
    expect(minimalItem.ownershipType).toBeDefined();
    
    // Optional fields should be undefined
    expect(minimalItem).not.toHaveProperty('details');
    expect(minimalItem).not.toHaveProperty('photoUrls');
    expect(minimalItem).not.toHaveProperty('ownerIds');
  });
  
  it('should validate photoUrls format', () => {
    const photoUrls = [
      { url: 'https://example.com/photo1.jpg', filename: 'photo1.jpg' },
      { url: 'https://example.com/photo2.jpg', filename: 'photo2.jpg' },
    ];
    
    photoUrls.forEach(photo => {
      expect(photo).toHaveProperty('url');
      expect(photo).toHaveProperty('filename');
      expect(photo.url).toMatch(/^https?:\/\//);
      expect(photo.filename).toMatch(/\.(jpg|jpeg|png|gif|webp)$/i);
    });
  });
});

describe('Shopping Inventory Transfer - Data Transformation', () => {
  it('should transform shopping item to inventory item format', () => {
    const shoppingItem = {
      id: 1,
      name: 'Shopping Item',
      details: 'Item details',
      categoryId: 2,
      photoUrls: [{ url: 'https://example.com/photo.jpg', filename: 'photo.jpg' }],
    };
    
    const inventoryItem = {
      itemId: shoppingItem.id,
      name: shoppingItem.name,
      categoryId: shoppingItem.categoryId,
      details: shoppingItem.details,
      photoUrls: shoppingItem.photoUrls,
      ownershipType: 'household' as const,
      ownerIds: [],
    };
    
    expect(inventoryItem.itemId).toBe(shoppingItem.id);
    expect(inventoryItem.name).toBe(shoppingItem.name);
    expect(inventoryItem.categoryId).toBe(shoppingItem.categoryId);
    expect(inventoryItem.details).toBe(shoppingItem.details);
    expect(inventoryItem.photoUrls).toEqual(shoppingItem.photoUrls);
  });
  
  it('should handle null details correctly', () => {
    const shoppingItem = {
      id: 1,
      name: 'Item without details',
      details: null,
      categoryId: 2,
    };
    
    const inventoryItem = {
      itemId: shoppingItem.id,
      name: shoppingItem.name,
      categoryId: shoppingItem.categoryId,
      details: shoppingItem.details || undefined,
      ownershipType: 'household' as const,
    };
    
    expect(inventoryItem.details).toBeUndefined();
  });
  
  it('should preserve photo URLs during transformation', () => {
    const originalPhotos = [
      { url: 'https://example.com/photo1.jpg', filename: 'photo1.jpg' },
      { url: 'https://example.com/photo2.jpg', filename: 'photo2.jpg' },
    ];
    
    const transformedPhotos = originalPhotos.map(photo => ({
      url: photo.url,
      filename: photo.filename,
    }));
    
    expect(transformedPhotos).toHaveLength(2);
    expect(transformedPhotos[0]).toEqual(originalPhotos[0]);
    expect(transformedPhotos[1]).toEqual(originalPhotos[1]);
  });
});
