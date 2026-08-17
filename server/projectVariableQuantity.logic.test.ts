import { describe, expect, it } from "vitest";
import { resolveProjectVariableQuantity } from "../shared/projectVariableQuantity";

describe("numerische Projektmengen", () => {
  it("berechnet direkte und voneinander abhängige Variablen für Datenbankmengen", () => {
    const variables = [
      { name: "GitterLänge", value: "4.5", unit: "m" },
      { name: "Stücke", description: "VARStücke = VARGitterLänge / 1.5 !Runden" },
    ];
    expect(resolveProjectVariableQuantity("VARGitterLänge", variables)).toBe("4.5");
    expect(resolveProjectVariableQuantity("VARStücke", variables)).toBe("3");
  });

  it("gibt bei nicht berechenbaren Mengen null zurück, statt einen VAR-Text ins Zahlenfeld zu schreiben", () => {
    expect(resolveProjectVariableQuantity("VARFehlt", [])).toBeNull();
  });
});
