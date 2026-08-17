import { describe, expect, it } from "vitest";
import { formatBalanceActivityText } from "../shared/balanceActivityText";

describe("Lokalisierte Bilanz-Verlaufsbeschreibungen", () => {
  it("formuliert Zahlungen in der Haushaltssprache", () => {
    expect(formatBalanceActivityText({ language: "en", event: "created", memberName: "Basti", entryType: "payment", amount: 12.5, description: "wood" }))
      .toBe("Basti paid €12.50: wood");
    expect(formatBalanceActivityText({ language: "de", event: "created", memberName: "Basti", entryType: "work", minutes: 90, description: "Hochbeet" }))
      .toBe("Basti hat 1 Std. 30 Min. gearbeitet: Hochbeet");
  });

  it("nennt die Quelle und konkrete Einkaufsartikel verständlich", () => {
    expect(formatBalanceActivityText({ language: "de", event: "created", memberName: "Basti", entryType: "payment", amount: 12.5, description: "Material", sourceType: "shopping", sourceLabel: "Holz, Schrauben" }))
      .toBe("Basti hat 12,50 € bezahlt: Material · Einkauf: Holz, Schrauben");
  });

  it("formuliert Änderungen und Löschungen ohne technische Codes", () => {
    expect(formatBalanceActivityText({ language: "fr", event: "updated", description: "matériel" })).toContain("mis à jour");
    expect(formatBalanceActivityText({ language: "zh", event: "deleted", description: "材料" })).toContain("已删除");
  });
});
