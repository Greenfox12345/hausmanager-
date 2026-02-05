import { describe, it, expect } from "vitest";

describe("Borrow Return Workflow with Guidelines", () => {
  it("should validate return photos against guidelines", () => {
    // Mock guidelines with photo requirements
    const guidelines = {
      photoRequirements: [
        { id: "req1", label: "Kilometerzähler", required: true },
        { id: "req2", label: "Seitenansicht", required: false },
      ],
    };

    // Mock return photos
    const returnPhotos = [
      { requirementId: "req1", photoUrl: "https://example.com/photo1.jpg" },
    ];

    // Validate that required photos are provided
    const requiredReqs = guidelines.photoRequirements.filter((r) => r.required);
    const providedReqIds = returnPhotos.map((p) => p.requirementId);
    const allRequiredProvided = requiredReqs.every((req) =>
      providedReqIds.includes(req.id)
    );

    expect(allRequiredProvided).toBe(true);
  });

  it("should fail validation when required photos are missing", () => {
    const guidelines = {
      photoRequirements: [
        { id: "req1", label: "Kilometerzähler", required: true },
        { id: "req2", label: "Seitenansicht", required: true },
      ],
    };

    const returnPhotos = [
      { requirementId: "req1", photoUrl: "https://example.com/photo1.jpg" },
    ];

    const requiredReqs = guidelines.photoRequirements.filter((r) => r.required);
    const providedReqIds = returnPhotos.map((p) => p.requirementId);
    const allRequiredProvided = requiredReqs.every((req) =>
      providedReqIds.includes(req.id)
    );

    expect(allRequiredProvided).toBe(false);
  });

  it("should validate checklist items", () => {
    const guidelines = {
      checklistItems: [
        { id: "item1", label: "Tank voll", required: true },
        { id: "item2", label: "Sauber", required: true },
        { id: "item3", label: "Schlüssel vorhanden", required: false },
      ],
    };

    const checklistState = {
      item1: true,
      item2: true,
      item3: false,
    };

    const requiredItems = guidelines.checklistItems.filter((i) => i.required);
    const allRequiredChecked = requiredItems.every(
      (item) => checklistState[item.id] === true
    );

    expect(allRequiredChecked).toBe(true);
  });

  it("should fail validation when required checklist items are not checked", () => {
    const guidelines = {
      checklistItems: [
        { id: "item1", label: "Tank voll", required: true },
        { id: "item2", label: "Sauber", required: true },
      ],
    };

    const checklistState = {
      item1: true,
      item2: false,
    };

    const requiredItems = guidelines.checklistItems.filter((i) => i.required);
    const allRequiredChecked = requiredItems.every(
      (item) => checklistState[item.id] === true
    );

    expect(allRequiredChecked).toBe(false);
  });

  it("should allow return when all validations pass", () => {
    const guidelines = {
      checklistItems: [
        { id: "item1", label: "Tank voll", required: true },
      ],
      photoRequirements: [
        { id: "req1", label: "Kilometerzähler", required: true },
      ],
    };

    const checklistState = { item1: true };
    const returnPhotos = [
      { requirementId: "req1", photoUrl: "https://example.com/photo1.jpg" },
    ];

    // Validate checklist
    const requiredItems = guidelines.checklistItems.filter((i) => i.required);
    const allRequiredChecked = requiredItems.every(
      (item) => checklistState[item.id] === true
    );

    // Validate photos
    const requiredReqs = guidelines.photoRequirements.filter((r) => r.required);
    const providedReqIds = returnPhotos.map((p) => p.requirementId);
    const allRequiredProvided = requiredReqs.every((req) =>
      providedReqIds.includes(req.id)
    );

    expect(allRequiredChecked).toBe(true);
    expect(allRequiredProvided).toBe(true);
  });

  it("should allow return when no guidelines are defined", () => {
    const guidelines = {
      checklistItems: [],
      photoRequirements: [],
    };

    const checklistState = {};
    const returnPhotos: any[] = [];

    // Should pass validation when no requirements exist
    const requiredItems = guidelines.checklistItems.filter((i) => i.required);
    const allRequiredChecked = requiredItems.every(
      (item) => checklistState[item.id] === true
    );

    const requiredReqs = guidelines.photoRequirements.filter((r) => r.required);
    const providedReqIds = returnPhotos.map((p) => p.requirementId);
    const allRequiredProvided = requiredReqs.every((req) =>
      providedReqIds.includes(req.id)
    );

    expect(allRequiredChecked).toBe(true);
    expect(allRequiredProvided).toBe(true);
  });
});
