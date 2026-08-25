import { describe, expect, it } from "vitest";
import { buildTemplateVariableInputTaskUpdates } from "../shared/templateVariableInputTask";

describe("buildTemplateVariableInputTaskUpdates", () => {
  it("ordnet eine Planvariable ausschließlich der ausgewählten Aufgabe zu", () => {
    expect(buildTemplateVariableInputTaskUpdates([
      { id: 1, variableInputNames: ["Breite"] },
      { id: 2, variableInputNames: ["Höhe"] },
      { id: 3, variableInputNames: ["Breite", "Material"] },
    ], "Breite", 2)).toEqual([
      { id: 1, variableInputNames: [] },
      { id: 2, variableInputNames: ["Höhe", "Breite"] },
      { id: 3, variableInputNames: ["Material"] },
    ]);
  });

  it("hebt die Zuordnung vollständig auf, wenn keine Aufgabe ausgewählt ist", () => {
    expect(buildTemplateVariableInputTaskUpdates([
      { id: 1, variableInputNames: ["Breite"] },
      { id: 2, variableInputNames: ["Höhe"] },
    ], "Breite", null)).toEqual([
      { id: 1, variableInputNames: [] },
    ]);
  });
});
