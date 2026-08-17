import { describe, expect, it } from "vitest";
import { resolveProjectVariableDisplay } from "../shared/projectVariableDisplay";

describe("Projektvariablen in Anzeigen", () => {
  it("löst bekannte Variablen mit Einheit auf und lässt unbekannte unverändert", () => {
    expect(resolveProjectVariableDisplay("VARBreite und VAROffen", [{ name: "Breite", value: "1.000", unit: "m" }])).toBe("1 m und VAROffen");
  });

  it("berechnet voneinander abhängige Variablen für die Anzeige", () => {
    expect(resolveProjectVariableDisplay("VARBretter", [{ name: "Laenge", value: "1.25", unit: "m" }, { name: "Bretter", value: "VARLaenge / 0.25", unit: "Stück" }])).toBe("5 Stück");
  });
});
