import { describe, expect, it } from "vitest";
import { analyseProjectVariableAvailability, getRequiredInputVariableNames } from "../shared/projectVariableAvailability";

describe("Projektvariablen-Verfügbarkeit", () => {
  const variables = [
    { name: "Hoehe", value: "" },
    { name: "Brettbreite", value: "" },
    { name: "Bretter", description: "VARBretter = VARHoehe / VARBrettbreite" },
  ];

  it("ordnet die Eingaben der ersten Aufgabe zu, die eine abhängige Formel verwendet", () => {
    const analysis = analyseProjectVariableAvailability(variables, [{ id: "vorbereitung", order: 0 }], [
      { id: 11, name: "Bretter berechnen", description: "Benötigt VARBretter", phaseId: "vorbereitung", sortOrder: 1 },
      { id: 12, name: "Bretter montieren", description: "Nutze VARBretter", phaseId: "vorbereitung", sortOrder: 2 },
    ]);

    expect(analysis.taskInputNamesByKey["id:11"]).toEqual(["Hoehe", "Brettbreite"]);
    expect(analysis.prerequisiteInputTaskKeysByKey["id:12"]).toEqual(["id:11"]);
  });

  it("erkennt fehlende Eingabeaufgaben für Variablen, die nur in Einkaufsartikeln vorkommen", () => {
    const analysis = analyseProjectVariableAvailability(variables, [{ id: "bau", order: 0 }], [], [
      { name: "Holz", quantity: "VARHoehe", phaseId: "bau" },
    ]);
    expect(analysis.unassignableInputsByPhase.bau).toEqual(["Hoehe"]);
  });

  it("liefert die direkten Eingaben einer Rechenvariable", () => {
    expect(getRequiredInputVariableNames("Bretter", variables)).toEqual({ inputNames: ["Hoehe", "Brettbreite"], unresolved: [] });
  });

  it("akzeptiert eine manuelle Überschreibung einer Rechenvariable ohne erneute Eingabe", () => {
    const overridden = variables.map((variable) => variable.name === "Bretter" ? { ...variable, overrideValue: "4" } : variable);
    expect(getRequiredInputVariableNames("Bretter", overridden)).toEqual({ inputNames: [], unresolved: [] });
  });
});
