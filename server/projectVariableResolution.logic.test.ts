import { describe, expect, it } from "vitest";
import { resolveProjectQuantity, resolveProjectText } from "../shared/projectVariableResolution";

describe("Variablenauflösung beim Projektstart", () => {
  const variables = [
    { name: "Laenge", value: "1.250", unit: "m" },
    { name: "Bretter", value: "VARLaenge / 0.25", unit: "Stück" },
  ];

  it("setzt Werte und Einheiten in Aufgabentexten ein", () => {
    expect(resolveProjectText("VARLaenge Holz und VARBretter", variables)).toBe("1.25 m Holz und 5 Stück");
  });

  it("berechnet Mengenformeln ohne Einheit für das Mengenfeld", () => {
    expect(resolveProjectQuantity("VARLaenge x 2", variables)).toBe("2.5");
  });
});
