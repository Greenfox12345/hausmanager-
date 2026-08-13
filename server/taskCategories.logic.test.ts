import { describe, expect, it } from "vitest";
import { getTaskCategoryIds, normalizeTaskCategoryIds } from "../shared/taskCategories";

describe("Aufgaben-Kategorien", () => {
  it("entfernt doppelte und ungültige Kategorie-IDs vor dem Speichern", () => {
    expect(normalizeTaskCategoryIds([4, 4, 0, -2, 7, 7, 3.5])).toEqual([4, 7]);
  });

  it("übernimmt vorhandene Kategorien einer Aufgabe in stabiler Reihenfolge", () => {
    expect(getTaskCategoryIds([{ id: 8 }, { id: 2 }, { id: 8 }])).toEqual([8, 2]);
  });
});
