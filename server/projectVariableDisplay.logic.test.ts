import { describe, expect, it } from "vitest";
import { resolveProjectVariableDisplay } from "../shared/projectVariableDisplay";

describe("Projektvariablen in Anzeigen", () => {
  it("löst bekannte Variablen mit Einheit auf und lässt unbekannte unverändert", () => {
    expect(resolveProjectVariableDisplay("VARBreite und VAROffen", [{ name: "Breite", value: "1.000", unit: "m" }])).toBe("1 m und VAROffen");
  });
});
